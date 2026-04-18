import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { awardPoints, awardFirstGenreBonuses, checkAndAwardBadges } from "@/lib/gamification";
import { Resend } from "resend";
import { invalidateAICache } from "@/lib/openai";

const resend = new Resend(process.env.RESEND_API_KEY);

// PATCH /api/borrowings/[id]/return
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const borrowing = await prisma.borrowing.findFirst({
      where: { id: params.id, userId: session.user.id, status: { in: ["ACTIVE", "RENEWED", "OVERDUE"] } },
      include: { book: true },
    });

    if (!borrowing) return NextResponse.json({ error: "Borrowing not found" }, { status: 404 });

    const returnedAt = new Date();
    const isOnTime = returnedAt <= borrowing.dueDate;

    // Calculate late fee (£0.50/day, stored only)
    let lateFee = null;
    if (!isOnTime) {
      const daysOverdue = Math.ceil(
        (returnedAt.getTime() - borrowing.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      lateFee = (daysOverdue * 0.5).toFixed(2);
    }

    await prisma.borrowing.update({
      where: { id: params.id },
      data: { status: "RETURNED", returnedAt, lateFee: lateFee ? parseFloat(lateFee) : null },
    });

    // Award return points
    if (isOnTime) {
      await awardPoints(session.user.id, 20, "RETURN_ONTIME", params.id);
    }
    await awardFirstGenreBonuses(session.user.id, borrowing.bookId);
    await checkAndAwardBadges(session.user.id);

    // Invalidate AI recommendation cache so next request reflects updated history (FR-AI-01)
    invalidateAICache(session.user.id).catch(console.error);

    // Notify first queued reservation
    const nextReservation = await prisma.reservation.findFirst({
      where: { bookId: borrowing.bookId, notifiedAt: null },
      orderBy: { reservedAt: "asc" },
      include: { user: true },
    });

    if (nextReservation) {
      await prisma.reservation.update({
        where: { id: nextReservation.id },
        data: { notifiedAt: new Date() },
      });
      // Notify via email
      const optOut = await prisma.emailOptOut.findUnique({ where: { userId: nextReservation.userId } });
      if (!optOut) {
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: nextReservation.user.email,
          subject: `LibraIQ — "${borrowing.book.title}" is now available!`,
          html: `<p>Great news! <strong>${borrowing.book.title}</strong> is now available for borrowing. Head to the catalogue to borrow it before someone else does!</p>`,
        }).catch(console.error);
      }
      await prisma.notification.create({
        data: {
          userId: nextReservation.userId,
          type: "RESERVATION_READY",
          message: `📚 "${borrowing.book.title}" is now available to borrow!`,
        },
      });
    }

    return NextResponse.json({ message: "Book returned", lateFee });
  } catch (err) {
    console.error("[PATCH /api/borrowings/[id]/return]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
