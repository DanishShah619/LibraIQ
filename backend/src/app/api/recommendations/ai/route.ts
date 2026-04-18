import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAIRecommendations } from "@/lib/openai";

// GET /api/recommendations/ai
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bookIds = await getAIRecommendations(session.user.id);

    if (bookIds.length === 0) {
      return NextResponse.json({ recommendations: [], message: "Borrow some books to get personalised recommendations!" });
    }

    const books = await prisma.book.findMany({
      where: { id: { in: bookIds }, isDeleted: false },
      include: { genres: { include: { genre: true } } },
    });

    // Preserve order
    const ordered = bookIds.map((id) => books.find((b: typeof books[number]) => b.id === id)).filter(Boolean);

    return NextResponse.json({ recommendations: ordered });
  } catch (err) {
    console.error("[GET /api/recommendations/ai]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
