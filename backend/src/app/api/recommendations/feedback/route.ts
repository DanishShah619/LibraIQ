import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { invalidateAICache } from "@/lib/openai";
import { z } from "zod";

const schema = z.object({
  recommendationId: z.string(),
  bookId: z.string(),
  isPositive: z.boolean(),
});

// POST /api/recommendations/feedback
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { recommendationId, bookId, isPositive } = parsed.data;

    await prisma.recommendationFeedback.upsert({
      where: { id: `${recommendationId}:${bookId}` },
      create: { userId: session.user.id, recommendationId, bookId, isPositive },
      update: { isPositive },
    });

    // Invalidate cache so next request uses feedback
    await invalidateAICache(session.user.id);

    return NextResponse.json({ message: "Feedback recorded" });
  } catch (err) {
    console.error("[POST /api/recommendations/feedback]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
