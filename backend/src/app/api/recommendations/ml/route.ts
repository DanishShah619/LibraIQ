import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cacheGet, cacheSet, KEYS } from "@/lib/redis";
import axios from "axios";
import { z } from "zod";
import { rateLimitResponse } from "@/lib/rateLimit";

const schema = z.object({
  genre:       z.string().optional(),
  description: z.string().optional(),
  category:    z.string().optional(),
  tone:        z.string().optional(),
  top_k:       z.number().int().min(1).max(50).optional(),
}).refine((d) => d.genre || d.description, { message: "Provide genre or description" });

// POST /api/recommendations/ml
export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse(req);
  if (limited) return limited;

  let parsedData: z.infer<typeof schema> | null = null;

  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    parsedData = parsed.data;

    const query = parsedData.description || parsedData.genre || "";
    const category = parsedData.category || parsedData.genre || "All";
    const tone = parsedData.tone || "All";
    const topK = parsedData.top_k || 10;
    const cacheKey = KEYS.mlRecs(session.user.id, query);

    // Check cache
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return NextResponse.json(cached);

    if (!process.env.ML_SERVICE_URL) {
      return NextResponse.json({ error: "ML service URL is not configured" }, { status: 500 });
    }

    // Call ML microservice
    const mlRes = await axios.post(
      `${process.env.ML_SERVICE_URL}/predict`,
      {
        query,
        category,
        tone,
        top_k: topK,
      },
      {
        headers: { Authorization: `Bearer ${process.env.ML_SERVICE_SECRET}` },
        timeout: 15000,
      }
    );

    const { recommendations: mlRecs = [], model_version } = mlRes.data;

    // Match ISBNs to catalogue
    const isbns = mlRecs.map((r: any) => String(r.isbn13 || r.isbn));
    const books = await prisma.book.findMany({
      where: { isbn: { in: isbns }, isDeleted: false },
      include: { genres: { include: { genre: true } } },
    });

    const bookMap = Object.fromEntries(books.map((b:typeof books[0]) => [b.isbn, b]));
    const ordered = mlRecs
      .map((r: any) => {
        const isbn = String(r.isbn13 || r.isbn);
        return bookMap[isbn] ? { ...bookMap[isbn], confidence: r.confidence } : null;
      })
      .filter(Boolean);

    const result = {
      recommendations: ordered,
      model_version,
      query,
      category,
      tone,
    };

    // Save to DB + cache (1h TTL)
    await prisma.mLRecommendation.create({
      data: {
        userId: session.user.id,
        query,
        bookIds: ordered.map((b: any) => b.id),
        scores: mlRecs.map((r: any) => r.confidence),
      },
    });
    await cacheSet(cacheKey, result, 3600);

    return NextResponse.json(result);
  } catch (err: any) {
    if (err.code === "ECONNREFUSED" || err.code === "ECONNABORTED") {
      // Fallback: return genre-based search from catalogue
      const genre = parsedData?.genre || parsedData?.category;
      if (genre) {
        const books = await prisma.book.findMany({
          where: { genres: { some: { genre: { name: { contains: genre, mode: "insensitive" } } } }, isDeleted: false },
          include: { genres: { include: { genre: true } } },
          take: 10,
        });
        return NextResponse.json({ recommendations: books, fallback: true });
      }
    }
    console.error("[POST /api/recommendations/ml]", err);
    return NextResponse.json({ error: "ML service unavailable" }, { status: 503 });
  }
}
