import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { invalidateAICache, getAIRecommendations } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

// POST /api/recommendations/ai/refresh
export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await invalidateAICache(session.user.id);
    const bookIds = await getAIRecommendations(session.user.id);

    const books = await prisma.book.findMany({
      where: { id: { in: bookIds }, isDeleted: false },
      include: { genres: { include: { genre: true } } },
    });

    return NextResponse.json({ recommendations: books });
  } catch (err) {
    console.error("[POST /api/recommendations/ai/refresh]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
