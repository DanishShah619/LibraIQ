import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/genres — list all genres (public, for filter chips and forms)
export async function GET() {
  try {
    const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ genres });
  } catch (err) {
    console.error("[GET /api/genres]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
