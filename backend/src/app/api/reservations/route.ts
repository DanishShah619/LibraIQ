import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/reservations — place reservation
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookId } = await req.json();
    if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

    // Check book exists and is unavailable (otherwise just borrow it)
    const book = await prisma.book.findFirst({ where: { id: bookId, isDeleted: false } });
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

    const active = await prisma.borrowing.count({
      where: { bookId, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
    });
    if (active < book.totalCopies) {
      return NextResponse.json({ error: "Book is available — borrow it directly" }, { status: 409 });
    }

    const reservation = await prisma.reservation.create({
      data: { userId: session.user.id, bookId },
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Already reserved" }, { status: 409 });
    }
    console.error("[POST /api/reservations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
