import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import type { BookWithGenres } from "@/types";
import { rateLimitResponse } from "@/lib/rateLimit";

const bookSchema = z.object({
  isbn:          z.string().min(1, "ISBN required"),
  title:         z.string().min(1, "Title required"),
  authors:       z.array(z.string()).min(1, "At least one author required"),
  publisher:     z.string().min(1, "Publisher required"),
  publishedYear: z.number().int().min(1000).max(new Date().getFullYear() + 1),
  synopsis:      z.string().optional(),
  coverUrl:      z.string().url().optional().or(z.literal("")),
  language:      z.string().default("English"),
  totalCopies:   z.number().int().min(1).default(1),
  genreIds:      z.array(z.string()).optional(),
});


// GET /api/books — list with search, filter, pagination
export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const q          = searchParams.get("q") || "";
    const genre      = searchParams.get("genre") || "";
    const language   = searchParams.get("language") || "";
    const yearFrom   = searchParams.get("yearFrom") ? parseInt(searchParams.get("yearFrom")!) : undefined;
    const yearTo     = searchParams.get("yearTo")   ? parseInt(searchParams.get("yearTo")!)   : undefined;
    const available  = searchParams.get("available") === "true";
    const page       = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize   = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));

    const where: any = { isDeleted: false };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { authors: { has: q } },
        { isbn: { contains: q, mode: "insensitive" } },
        { genres: { some: { genre: { name: { contains: q, mode: "insensitive" } } } } },
      ];
    }

    if (genre) {
      where.genres = { some: { genre: { name: { equals: genre, mode: "insensitive" } } } };
    }

    if (language) where.language = { equals: language, mode: "insensitive" };
    if (yearFrom)  where.publishedYear = { ...(where.publishedYear || {}), gte: yearFrom };
    if (yearTo)    where.publishedYear = { ...(where.publishedYear || {}), lte: yearTo };

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: { genres: { include: { genre: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.book.count({ where }),
    ]);

    // Attach real-time available copies

    // Type for groupBy result
    type ActiveBorrowingGroup = { bookId: string; _count: { bookId: number } };

    const bookIds = books.map((b: BookWithGenres) => b.id);
    const activeBorrowings = await prisma.borrowing.groupBy({
      by: ["bookId"],
      where: { bookId: { in: bookIds }, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
      _count: { bookId: true },
    });
    const borrowMap = Object.fromEntries(activeBorrowings.map((b: ActiveBorrowingGroup) => [b.bookId, b._count.bookId]));

    const booksWithAvailability = books.map((b: BookWithGenres) => ({
      ...b,
      availableCopies: Math.max(0, b.totalCopies - (borrowMap[b.id] || 0)),
    }));

    if (available) {
      return NextResponse.json({
        data: booksWithAvailability.filter((b: { availableCopies: number }) => b.availableCopies > 0),
        total, page, pageSize, totalPages: Math.ceil(total / pageSize),
      });
    }

    return NextResponse.json({
      data: booksWithAvailability, total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("[GET /api/books]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/books — add book (Librarian+)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || !["LIBRARIAN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { genreIds, coverUrl, ...data } = parsed.data;

    const book = await prisma.book.create({
      data: {
        ...data,
        coverUrl: coverUrl || null,
        genres: genreIds?.length
          ? { create: genreIds.map((genreId) => ({ genreId })) }
          : undefined,
      },
      include: { genres: { include: { genre: true } } },
    });

    return NextResponse.json({ book }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: { isbn: ["ISBN already exists"] } }, { status: 409 });
    }
    console.error("[POST /api/books]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
