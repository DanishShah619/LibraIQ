import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/gamification/me
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        totalPoints: true,
        level: true,
        badges:   { include: { badge: true }, orderBy: { awardedAt: "desc" } },
        pointTxns: {
          take: 20,
          orderBy: { createdAt: "desc" },
          select: { delta: true, reason: true, createdAt: true },
        },
        notifications: {
          where: { isRead: false },
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ ...user });
  } catch (err) {
    console.error("[GET /api/gamification/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
