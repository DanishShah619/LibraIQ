import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/gamification/badges — all badges with earned status
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [allBadges, earned] = await Promise.all([
      prisma.badge.findMany({ orderBy: { key: "asc" } }),
      prisma.userBadge.findMany({
        where: { userId: session.user.id },
        include: { badge: true },
      }),
    ]);


    // Types for badge and userBadge
    type Badge = typeof allBadges[number];
    type UserBadge = typeof earned[number];

    const earnedIds = new Set(earned.map((e: UserBadge) => e.badgeId));
    const result = allBadges.map((b: Badge) => ({
      ...b,
      earned: earnedIds.has(b.id),
      awardedAt: earned.find((e: UserBadge) => e.badgeId === b.id)?.awardedAt ?? null,
    }));

    return NextResponse.json({ badges: result });
  } catch (err) {
    console.error("[GET /api/gamification/badges]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
