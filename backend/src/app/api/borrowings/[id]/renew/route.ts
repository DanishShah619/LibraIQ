import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";

// PATCH /api/borrowings/[id]/renew
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const borrowing = await prisma.borrowing.findFirst({
      where: { id: params.id, userId: session.user.id, status: { in: ["ACTIVE", "RENEWED"] } },
    });

    if (!borrowing) return NextResponse.json({ error: "Borrowing not found" }, { status: 404 });
    if (borrowing.renewalCount >= 2) {
      return NextResponse.json({ error: "Maximum renewals (2) reached" }, { status: 409 });
    }

    // Check no reservation queue for this book
    const reservations = await prisma.reservation.count({ where: { bookId: borrowing.bookId } });
    if (reservations > 0) {
      return NextResponse.json(
        { error: "Cannot renew — another member has reserved this book" },
        { status: 409 }
      );
    }

    const newDueDate = addDays(borrowing.dueDate, 14);
    const updated = await prisma.borrowing.update({
      where: { id: params.id },
      data: { dueDate: newDueDate, renewalCount: { increment: 1 }, status: "RENEWED" },
    });

    return NextResponse.json({ borrowing: updated });
  } catch (err) {
    console.error("[PATCH /api/borrowings/[id]/renew]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
