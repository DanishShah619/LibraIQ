import Link from "next/link";
import { BookOpen, Users, Calendar } from "lucide-react";
import clsx from "clsx";
import type { BookWithGenres } from "@/types";

interface BookCardProps {
  book: BookWithGenres & { availableCopies?: number };
  compact?: boolean;
}

export default function BookCard({ book, compact = false }: BookCardProps) {
  const available = book.availableCopies ?? book.totalCopies;
  const isAvailable = available > 0;
  const genres: string[] = (book.genres as Array<{ genre: { name: string } }>).map((bg) => bg.genre.name);

  return (
    <Link href={`/books/${book.id}`} className="block group">
      <article className="glass-card overflow-hidden hover:border-indigo-500/40 hover:glow-indigo transition-all duration-300 h-full flex flex-col">
        {/* Cover */}
        <div className="relative aspect-[3/4] bg-gray-800 overflow-hidden">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-gray-600" />
            </div>
          )}
          {/* Availability badge */}
          <div className="absolute top-2 right-2">
            <span className={clsx("badge text-xs", isAvailable ? "badge-green" : "badge-red")}>
              {isAvailable ? `${available} left` : "Borrowed"}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 p-4 flex flex-col gap-2">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-indigo-300 transition-colors">
            {book.title}
          </h3>

          {!compact && (
            <>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {book.authors.join(", ")}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {book.publishedYear} · {book.language}
              </p>
            </>
          )}

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto">
              {genres.slice(0, 2).map((g) => (
                <span key={g} className="badge-indigo text-[10px] px-2 py-0.5 rounded-full">
                  {g}
                </span>
              ))}
              {genres.length > 2 && (
                <span className="badge-gray text-[10px] px-2 py-0.5 rounded-full">
                  +{genres.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
