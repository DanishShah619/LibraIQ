import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDel, KEYS } from "@/lib/redis";

let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required to generate AI recommendations");
  }

  openai ??= new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
  });

  return openai;
}

export async function getAIRecommendations(userId: string): Promise<string[]> {
  // Check Redis cache first
  const cached = await cacheGet<string[]>(KEYS.aiRecs(userId));
  if (cached) return cached;

  // Get member reading history
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      borrowings: {
        where: { status: { in: ["RETURNED", "ACTIVE"] } },
        take: 20,
        orderBy: { borrowedAt: "desc" },
        include: { book: { include: { genres: { include: { genre: true } } } } },
      },
    },
  });

  if (!user || user.borrowings.length === 0) return [];

  // Build prompt context
  const recentTitles = user.borrowings.slice(0, 5).map((b) => b.book.title);
  const genreCounts: Record<string, number> = {};
  const authorCounts: Record<string, number> = {};

  for (const b of user.borrowings) {
    for (const bg of b.book.genres) genreCounts[bg.genre.name] = (genreCounts[bg.genre.name] || 0) + 1;
    for (const a of b.book.authors) authorCounts[a] = (authorCounts[a] || 0) + 1;
  }

  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a);

  // Collect IDs to exclude: already borrowed + negatively rated
  const borrowedBookIds = user.borrowings.map((b) => b.bookId);

  const latestRec = await prisma.aIRecommendation.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
    include: { feedback: true },
  });
  const negativeFeedbackBookIds = latestRec?.feedback.filter((f) => !f.isPositive).map((f) => f.bookId) ?? [];
  const excludeIds = Array.from(new Set([...borrowedBookIds, ...negativeFeedbackBookIds]));

  // Pull up to 60 real candidate books from the DB the user hasn't read
  const candidates = await getCandidateBooks(topGenres, excludeIds, 60);

  if (candidates.length === 0) return [];

  // Ask the LLM to rank the candidates by number, not hallucinate ISBNs
  const prompt = buildRerankPrompt(candidates, topGenres, topAuthors, recentTitles);

  const completion = await getOpenAIClient().chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 100,
    temperature: 0.7,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "";
  const ranked = parseRankedNumbers(raw, candidates);

  // Fallback: if the LLM returns garbage, use first 10 candidates as-is
  const finalIds = ranked.length > 0 ? ranked : candidates.slice(0, 10).map((c) => c.id);

  // Persist to DB + cache
  const expiresAt = new Date(Date.now() + 86400 * 1000);
  await prisma.aIRecommendation.create({ data: { userId, bookIds: finalIds, expiresAt } });
  await cacheSet(KEYS.aiRecs(userId), finalIds, 86400);

  return finalIds;
}

export async function invalidateAICache(userId: string) {
  await cacheDel(KEYS.aiRecs(userId));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type CandidateBook = {
  id: string;
  title: string;
  authors: string[];
  genres: { genre: { name: string } }[];
};

async function getCandidateBooks(
  topGenres: string[],
  excludeIds: string[],
  poolSize: number
): Promise<CandidateBook[]> {
  const select = {
    id: true,
    title: true,
    authors: true,
    genres: { include: { genre: true } },
  } as const;

  // Priority 1: user's preferred genres
  const genreCandidates = await prisma.book.findMany({
    where: {
      isDeleted: false,
      id: { notIn: excludeIds },
      genres: { some: { genre: { name: { in: topGenres } } } },
    },
    select,
    take: poolSize,
    orderBy: { createdAt: "desc" },
  });

  // Priority 2: backfill with other books if not enough
  if (genreCandidates.length < poolSize) {
    const seen = new Set(genreCandidates.map((b) => b.id));
    const backfill = await prisma.book.findMany({
      where: {
        isDeleted: false,
        id: { notIn: [...excludeIds, ...Array.from(seen)] },
      },
      select,
      take: poolSize - genreCandidates.length,
      orderBy: { createdAt: "desc" },
    });
    return [...genreCandidates, ...backfill];
  }

  return genreCandidates;
}

function buildRerankPrompt(
  candidates: CandidateBook[],
  topGenres: string[],
  topAuthors: string[],
  recentTitles: string[]
): string {
  const bookList = candidates
    .map((book, i) => {
      const genres = book.genres.map((bg) => bg.genre.name).join(", ");
      return `${i + 1}. "${book.title}" by ${book.authors.join(", ")} [${genres}]`;
    })
    .join("\n");

  return `You are a library recommendation engine. A member has this reading profile:
- Top genres: ${topGenres.join(", ")}
- Favourite authors: ${topAuthors.join(", ") || "N/A"}
- Recently read: ${recentTitles.join("; ")}

From the numbered list below, pick the 10 best matches for this reader.
Return ONLY the numbers, comma-separated, best first. No other text.

${bookList}`;
}

function parseRankedNumbers(raw: string, candidates: CandidateBook[]): string[] {
  const numbers = raw.match(/\d+/g)?.map(Number) ?? [];
  const seen = new Set<number>();
  const ids: string[] = [];

  for (const n of numbers) {
    if (n >= 1 && n <= candidates.length && !seen.has(n)) {
      seen.add(n);
      ids.push(candidates[n - 1].id);
    }
    if (ids.length >= 10) break;
  }

  return ids;
}
