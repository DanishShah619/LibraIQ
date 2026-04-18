import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Minimal CSV parser — handles quoted fields with commas inside
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()]));
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// POST /api/books/import — bulk CSV import (Librarian+)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || !["LIBRARIAN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    const text = await (file as File).text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });
    }

    // Expected CSV columns (case-insensitive, snake_case):
    // isbn, title, authors, publisher, published_year, language, total_copies, synopsis, cover_url, genres
    // authors and genres can be pipe-separated: "Author1|Author2", "Fiction|Sci-Fi"

    const results = { imported: 0, updated: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      const isbn = row.isbn?.trim();
      const title = row.title?.trim();
      const authorsRaw = row.authors?.trim();
      const publisher = row.publisher?.trim() || "Unknown";
      const publishedYear = parseInt(row.published_year || row.publishedyear || "0");
      const language = row.language?.trim() || "English";
      const totalCopies = Math.max(1, parseInt(row.total_copies || row.totalcopies || "1") || 1);
      const synopsis = row.synopsis?.trim() || null;
      const coverUrl = row.cover_url?.trim() || row.coverurl?.trim() || null;
      const genresRaw = row.genres?.trim();

      if (!isbn || !title || !authorsRaw) {
        results.errors.push(`Skipped row: missing isbn/title/authors — "${isbn || "?"}"`);
        results.skipped++;
        continue;
      }

      if (isNaN(publishedYear) || publishedYear < 1000) {
        results.errors.push(`Skipped "${isbn}": invalid published_year`);
        results.skipped++;
        continue;
      }

      const authors = authorsRaw.split("|").map((a) => a.trim()).filter(Boolean);
      const genreNames = genresRaw ? genresRaw.split("|").map((g) => g.trim()).filter(Boolean) : [];

      try {
        // Upsert genres
        const genreRecords = await Promise.all(
          genreNames.map((name) =>
            prisma.genre.upsert({ where: { name }, update: {}, create: { name } })
          )
        );

        // Upsert book by ISBN
        const existing = await prisma.book.findUnique({ where: { isbn } });

        if (existing) {
          // Update existing book
          await prisma.$transaction(async (tx) => {
            await tx.book.update({
              where: { isbn },
              data: { title, authors, publisher, publishedYear, language, totalCopies, synopsis, coverUrl },
            });
            if (genreRecords.length > 0) {
              await tx.bookGenre.deleteMany({ where: { bookId: existing.id } });
              await tx.bookGenre.createMany({
                data: genreRecords.map((g) => ({ bookId: existing.id, genreId: g.id })),
              });
            }
          });
          results.updated++;
        } else {
          // Create new book
          await prisma.book.create({
            data: {
              isbn,
              title,
              authors,
              publisher,
              publishedYear,
              language,
              totalCopies,
              synopsis,
              coverUrl,
              genres: genreRecords.length
                ? { create: genreRecords.map((g) => ({ genreId: g.id })) }
                : undefined,
            },
          });
          results.imported++;
        }
      } catch (rowErr: any) {
        results.errors.push(`Error on "${isbn}": ${rowErr.message}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      message: `Import complete: ${results.imported} new, ${results.updated} updated, ${results.skipped} skipped`,
      ...results,
    });
  } catch (err) {
    console.error("[POST /api/books/import]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
