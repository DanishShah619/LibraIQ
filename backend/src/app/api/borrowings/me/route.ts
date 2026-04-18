import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/borrowings/me
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const borrowings = await prisma.borrowing.findMany({
      where: { userId: session.user.id },
      include: { book: { include: { genres: { include: { genre: true } } } } },
      orderBy: { borrowedAt: "desc" },
    });

    return NextResponse.json({ borrowings });
  } catch (err) {
    console.error("[GET /api/borrowings/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
