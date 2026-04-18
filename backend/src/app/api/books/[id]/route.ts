import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateSchema = z.object({
  title:         z.string().min(1).optional(),
  authors:       z.array(z.string()).optional(),
  publisher:     z.string().optional(),
  publishedYear: z.number().int().optional(),
  synopsis:      z.string().optional(),
  coverUrl:      z.string().url().optional().or(z.literal("")),
  language:      z.string().optional(),
  totalCopies:   z.number().int().min(1).optional(),
  genreIds:      z.array(z.string()).optional(),
});

// GET /api/books/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const book = await prisma.book.findFirst({
      where: { id: params.id, isDeleted: false },
      include: { genres: { include: { genre: true } } },
    });

    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

    // Available copies
    const active = await prisma.borrowing.count({
      where: { bookId: book.id, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
    });

    return NextResponse.json({ book: { ...book, availableCopies: Math.max(0, book.totalCopies - active) } });
  } catch (err) {
    console.error("[GET /api/books/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/books/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || !["LIBRARIAN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { genreIds, coverUrl, ...data } = parsed.data;

    const book = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (genreIds) {
        await tx.bookGenre.deleteMany({ where: { bookId: params.id } });
        await tx.bookGenre.createMany({
          data: genreIds.map((genreId) => ({ bookId: params.id, genreId })),
        });
      }
      return tx.book.update({
        where: { id: params.id },
        data: { ...data, coverUrl: coverUrl !== undefined ? (coverUrl || null) : undefined },
        include: { genres: { include: { genre: true } } },
      });
    });

    return NextResponse.json({ book });
  } catch (err) {
    console.error("[PATCH /api/books/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/books/[id] — Super Admin only, soft delete
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.book.update({ where: { id: params.id }, data: { isDeleted: true } });
    return NextResponse.json({ message: "Book deleted" });
  } catch (err) {
    console.error("[DELETE /api/books/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
