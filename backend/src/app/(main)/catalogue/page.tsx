"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import BookCard from "@/components/books/BookCard";
import { useDebounce } from "@/hooks/useDebounce";

const GENRES = [
  "Fiction", "Non-fiction", "Science Fiction", "Fantasy", "Mystery",
  "Thriller", "Romance", "Historical Fiction", "Biography", "Self-help",
  "Psychology", "Science", "Philosophy", "Young Adult", "Classic",
  "Dystopian", "Adventure", "Horror", "Crime", "Coming-of-Age",
];

export default function CataloguePage() {
  const [books, setBooks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const debouncedQ = useDebounce(q, 400);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    if (debouncedQ) params.set("q", debouncedQ);
    if (genre) params.set("genre", genre);
    if (availableOnly) params.set("available", "true");

    const res = await fetch(`/api/books?${params}`);
    const data = await res.json();
    setBooks(data.data || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [debouncedQ, genre, availableOnly, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);
  useEffect(() => { setPage(1); }, [debouncedQ, genre, availableOnly]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Book Catalogue</h1>
        <p className="text-gray-400 mt-1">{total.toLocaleString()} books available</p>
      </div>

      {/* Search + Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            id="catalogue-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, author, ISBN, or genre…"
            className="input-base pl-11"
          />
          {q && (
            <button onClick={() => setQ("")} title="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500 shrink-0" />
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(genre === g ? "" : g)}
              className={`badge text-xs transition-all ${genre === g ? "badge-indigo" : "badge-gray hover:badge-indigo"}`}
            >
              {g}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-700 accent-indigo-500"
          />
          Available copies only
        </label>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No books found</p>
          <p className="text-sm mt-1">Try a different search or remove filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button title="left" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="btn-secondary px-3 py-2 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button title="right" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="btn-secondary px-3 py-2 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
