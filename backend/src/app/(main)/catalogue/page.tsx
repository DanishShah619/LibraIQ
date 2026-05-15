"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import BookCard from "@/components/books/BookCard";
import { useDebounce } from "@/hooks/useDebounce";

const GENRES = [
  "Fiction", "Non-fiction", "Science Fiction", "Fantasy", "Mystery",
  "Thriller", "Romance", "Historical Fiction", "Biography", "Self-help",
  "Psychology", "Science", "Philosophy", "Young Adult", "Classic",
  "Dystopian", "Adventure", "Horror", "Crime", "Coming-of-Age",
];

type CatalogueResponse = {
  data: any[];
  total: number;
  totalPages: number;
};

const catalogueCache = new Map<string, CatalogueResponse>();

function buildBookParams({
  page,
  q,
  genre,
  availableOnly,
}: {
  page: number;
  q: string;
  genre: string;
  availableOnly: boolean;
}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "20",
  });

  if (q) params.set("q", q);
  if (genre) params.set("genre", genre);
  if (availableOnly) params.set("available", "true");

  return params;
}

function BookCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden h-full animate-pulse">
      <div className="aspect-[3/4] bg-gray-800/80" />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded bg-gray-800" />
        <div className="h-3 w-4/5 rounded bg-gray-800/80" />
        <div className="h-3 w-2/3 rounded bg-gray-800/70" />
        <div className="flex gap-2 pt-2">
          <div className="h-5 w-14 rounded-full bg-gray-800/80" />
          <div className="h-5 w-12 rounded-full bg-gray-800/70" />
        </div>
      </div>
    </div>
  );
}

export default function CataloguePage() {
  const [books, setBooks] = useState<any[]>([]);
  const booksRef = useRef<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const debouncedQ = useDebounce(q, 400);

  const params = useMemo(
    () => buildBookParams({ page, q: debouncedQ, genre, availableOnly }),
    [page, debouncedQ, genre, availableOnly],
  );

  const applyCatalogueData = useCallback((data: CatalogueResponse) => {
    const nextBooks = data.data || [];
    booksRef.current = nextBooks;
    setBooks(nextBooks);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, []);

  const fetchBooks = useCallback(async (signal?: AbortSignal) => {
    const cacheKey = params.toString();
    const cached = catalogueCache.get(cacheKey);

    if (cached) {
      applyCatalogueData(cached);
      setInitialLoading(false);
      setRefreshing(true);
    } else if (booksRef.current.length === 0) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const res = await fetch(`/api/books?${cacheKey}`, { signal });
      if (!res.ok) throw new Error("Unable to load catalogue");

      const data = await res.json();
      const nextData = {
        data: data.data || [],
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      };

      catalogueCache.set(cacheKey, nextData);
      applyCatalogueData(nextData);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError("Catalogue could not refresh. Showing the last available results.");
      }
    } finally {
      if (!signal?.aborted) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [applyCatalogueData, params]);

  const prefetchPage = useCallback(async (nextPage: number) => {
    const nextParams = buildBookParams({ page: nextPage, q: debouncedQ, genre, availableOnly });
    const cacheKey = nextParams.toString();
    if (catalogueCache.has(cacheKey)) return;

    try {
      const res = await fetch(`/api/books?${cacheKey}`);
      if (!res.ok) return;
      const data = await res.json();
      catalogueCache.set(cacheKey, {
        data: data.data || [],
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      });
    } catch {
      // Prefetch is opportunistic; foreground loading handles any user-visible errors.
    }
  }, [availableOnly, debouncedQ, genre]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBooks(controller.signal);

    return () => controller.abort();
  }, [fetchBooks]);

  useEffect(() => {
    if (!initialLoading && page < totalPages) {
      prefetchPage(page + 1);
    }
  }, [initialLoading, page, prefetchPage, totalPages]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Book Catalogue</h1>
        <p className="text-gray-400 mt-1">
          {total.toLocaleString()} books available
          {refreshing && <span className="text-indigo-300"> - refreshing</span>}
        </p>
      </div>

      <div className="glass-card p-4 space-y-4 overflow-hidden">
        {refreshing && <div className="catalogue-loading-scroll" aria-hidden="true" />}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            id="catalogue-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search title, author, ISBN, or genre..."
            className="input-base pl-11"
          />
          {q && (
            <button
              onClick={() => {
                setQ("");
                setPage(1);
              }}
              title="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500 shrink-0" />
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => {
                setGenre(genre === g ? "" : g);
                setPage(1);
              }}
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
            onChange={(e) => {
              setAvailableOnly(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 rounded border-gray-700 accent-indigo-500"
          />
          Available copies only
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {error}
        </div>
      )}

      {initialLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <BookCardSkeleton key={index} />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No books found</p>
          <p className="text-sm mt-1">Try a different search or remove filters</p>
        </div>
      ) : (
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 transition-opacity duration-200 ${refreshing ? "opacity-70" : "opacity-100"}`}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

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
