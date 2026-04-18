import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";
import { awardPoints, checkAndAwardBadges } from "@/lib/gamification";
import { Prisma } from "@prisma/client";

const DEFAULT_LENDING_DAYS = 14;
const _MAX_RENEWALS = 2;
const MAX_ACTIVE_BORROWINGS = 5;

// POST /api/borrowings — borrow a book
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookId } = await req.json();
    if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const book = await tx.book.findFirst({
        where: { id: bookId, isDeleted: false },
        select: { id: true, totalCopies: true },
      });
      if (!book) throw new Error("NotFound");

      // Check availability atomically
      const activeCount = await tx.borrowing.count({
        where: { bookId, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
      });
      if (activeCount >= book.totalCopies) throw new Error("Unavailable");

      // Check if user already has this book
      const existing = await tx.borrowing.findFirst({
        where: { userId: session.user!.id, bookId, status: { in: ["ACTIVE", "RENEWED"] } },
      });
      if (existing) throw new Error("AlreadyBorrowed");

      // Check max borrowing limit
      const userActiveCount = await tx.borrowing.count({
        where: { userId: session.user!.id, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
      });
      if (userActiveCount >= MAX_ACTIVE_BORROWINGS) throw new Error("MaxBorrowLimitReached");

      const dueDate = addDays(new Date(), DEFAULT_LENDING_DAYS);
      const userId = session.user!.id as string;
      return tx.borrowing.create({
        data: { userId, bookId, dueDate, status: "ACTIVE" },
        include: { book: { include: { genres: { include: { genre: true } } } } },
      });
    });

    // Award borrow points (async, non-blocking)
    awardPoints(session.user.id, 10, "BORROW", result.id).catch(console.error);
    checkAndAwardBadges(session.user.id).catch(console.error);

    return NextResponse.json({ borrowing: result }, { status: 201 });
  } catch (err: any) {
    if (err.message === "NotFound")      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    if (err.message === "Unavailable")   return NextResponse.json({ error: "No copies available" }, { status: 409 });
    if (err.message === "AlreadyBorrowed") return NextResponse.json({ error: "You already have this book" }, { status: 409 });
    if (err.message === "MaxBorrowLimitReached") return NextResponse.json({ error: `You have reached the maximum limit of ${MAX_ACTIVE_BORROWINGS} borrowed books` }, { status: 403 });
    console.error("[POST /api/borrowings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/borrowings — all borrowings (Librarian+)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || !["LIBRARIAN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status  = searchParams.get("status");
    const page    = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "50"));

    const where: any = {};
    if (status) where.status = status;

    const [borrowings, total] = await Promise.all([
      prisma.borrowing.findMany({
        where,
        include: {
          book: { select: { id: true, title: true, isbn: true, coverUrl: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { borrowedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.borrowing.count({ where }),
    ]);

    return NextResponse.json({ data: borrowings, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error("[GET /api/borrowings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
