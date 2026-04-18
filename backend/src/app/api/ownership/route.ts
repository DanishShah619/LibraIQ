import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/rateLimit";
import { z } from "zod";

const schema = z.object({ bookId: z.string().min(1) });

// POST /api/ownership — mark a book as personally owned
export async function POST(req: NextRequest) {
  // Rate limit
  const limited = await rateLimitResponse(req);
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { bookId } = parsed.data;

    // Verify book exists
    const book = await prisma.book.findFirst({ where: { id: bookId, isDeleted: false } });
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

    const ownership = await prisma.ownership.create({
      data: { userId: session.user.id, bookId },
      include: { book: { select: { id: true, title: true, isbn: true, coverUrl: true } } },
    });

    return NextResponse.json({ ownership }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "You already own this book" }, { status: 409 });
    }
    console.error("[POST /api/ownership]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/ownership — remove ownership mark
export async function DELETE(req: NextRequest) {
  const limited = await rateLimitResponse(req);
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookId } = await req.json();
    if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

    await prisma.ownership.deleteMany({
      where: { userId: session.user.id, bookId },
    });

    return NextResponse.json({ message: "Ownership removed" });
  } catch (err) {
    console.error("[DELETE /api/ownership]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/ownership — list current user's owned books
export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req);
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ownerships = await prisma.ownership.findMany({
      where: { userId: session.user.id },
      include: {
        book: {
          include: { genres: { include: { genre: true } } },
        },
      },
      orderBy: { ownedSince: "desc" },
    });

    return NextResponse.json({ ownerships });
  } catch (err) {
    console.error("[GET /api/ownership]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
