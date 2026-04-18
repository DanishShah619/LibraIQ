import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { UserWithStats } from "@/types";

// GET /api/gamification/leaderboard
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = 20;

    const [leaders, total] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, role: "MEMBER" },
        select: {
          id: true, firstName: true, lastName: true, avatarUrl: true,
          totalPoints: true, level: true,
          _count: { select: { badges: true } },
        },
        orderBy: { totalPoints: "desc" },
        take: Math.min(pageSize, 50),
        skip: (page - 1) * pageSize,
      }),
      prisma.user.count({ where: { isActive: true, role: "MEMBER" } }),
    ]);

    const ranked = (leaders as UserWithStats[]).map((u, i) => ({
      ...u,
      rank: (page - 1) * pageSize + i + 1,
    }));

    return NextResponse.json({ data: ranked, total, page, pageSize, totalPages: Math.ceil(Math.min(total, 50) / pageSize) });
  } catch (err) {
    console.error("[GET /api/gamification/leaderboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
