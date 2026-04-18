"use client";

import { useState, useEffect } from "react";
import { Sparkles, Zap, ThumbsUp, ThumbsDown, Loader2, BookOpen, RotateCcw, Search } from "lucide-react";

type Book = {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  synopsis: string | null;
  genres: { genre: { name: string } }[];
  confidence?: number;
};


function BookTile({
  book,
  recId,
  onFeedback,
  feedbackGiven,
}: {
  book: Book;
  recId?: string;
  onFeedback?: (bookId: string, isPositive: boolean) => void;
  feedbackGiven?: boolean | null;
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-3 group hover:border-indigo-500/30 transition-all">
      {/* Cover */}
      <div className="w-full h-40 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <BookOpen className="w-8 h-8 text-gray-600" />
        )}
      </div>

      <div className="flex-1">
        <a href={`/books/${book.id}`} className="font-semibold text-white text-sm line-clamp-2 hover:text-indigo-300 transition-colors">
          {book.title}
        </a>
        <p className="text-xs text-gray-400 mt-0.5">{book.authors.slice(0, 2).join(", ")}</p>
        {book.confidence != null && (
          <p className="text-xs text-indigo-400 mt-1">{Math.round(book.confidence * 100)}% match</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {book.genres.slice(0, 2).map((g) => (
            <span key={g.genre.name} className="badge badge-gray text-xs">{g.genre.name}</span>
          ))}
        </div>
      </div>

      {/* Thumbs feedback */}
      {recId && onFeedback && (
        <div className="flex gap-2 pt-2 border-t border-gray-800">
          <button
            onClick={() => onFeedback(book.id, true)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition-all ${
              feedbackGiven === true ? "bg-green-600/30 text-green-400" : "bg-gray-800/60 text-gray-500 hover:text-green-400"
            }`}
          >
            <ThumbsUp className="w-3 h-3" /> Like
          </button>
          <button
            onClick={() => onFeedback(book.id, false)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition-all ${
              feedbackGiven === false ? "bg-red-600/30 text-red-400" : "bg-gray-800/60 text-gray-500 hover:text-red-400"
            }`}
          >
            <ThumbsDown className="w-3 h-3" /> Dislike
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  const [aiBooks, setAiBooks] = useState<Book[]>([]);
  const [aiRecId] = useState<string | null>(null); // populated when API returns rec ID
  const [aiLoading, setAiLoading] = useState(true);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({});

  const [mlBooks, setMlBooks] = useState<Book[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlQuery, setMlQuery] = useState("");
  const [mlType, setMlType] = useState<"genre" | "description">("genre");
  const [mlError, setMlError] = useState("");

  // Load AI recs on mount
  useEffect(() => {
    async function loadAI() {
      setAiLoading(true);
      const res = await fetch("/api/recommendations/ai");
      if (res.ok) {
        const data = await res.json();
        setAiBooks(data.recommendations || []);
        setAiMessage(data.message || "");
        // Find rec ID from most recent AI recommendation (not returned by API, but we store it for feedback)
      }
      setAiLoading(false);
    }
    loadAI();
  }, []);

  async function refreshAI() {
    setAiRefreshing(true);
    const res = await fetch("/api/recommendations/ai/refresh", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setAiBooks(data.recommendations || []);
      setAiMessage("");
    }
    setAiRefreshing(false);
  }

  async function sendFeedback(recId: string, bookId: string, isPositive: boolean) {
    setFeedback((prev) => ({ ...prev, [bookId]: isPositive }));
    await fetch("/api/recommendations/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendationId: recId || "unknown", bookId, isPositive }),
    });
  }

  async function searchML() {
    if (!mlQuery.trim()) return;
    setMlLoading(true);
    setMlError("");
    setMlBooks([]);
    const body = mlType === "genre" ? { genre: mlQuery } : { description: mlQuery };
    const res = await fetch("/api/recommendations/ml", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setMlBooks(data.recommendations || []);
      if (data.fallback) setMlError("ML service unavailable — showing catalogue matches instead.");
    } else {
      const data = await res.json();
      setMlError(data.error || "Error fetching recommendations");
    }
    setMlLoading(false);
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* AI Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" /> For You
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">AI-powered picks based on your reading history</p>
          </div>
          <button
            onClick={refreshAI}
            disabled={aiRefreshing}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${aiRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {aiLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : aiMessage ? (
          <div className="glass-card p-8 text-center">
            <Sparkles className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <p className="text-gray-300">{aiMessage}</p>
            <a href="/catalogue" className="btn-primary mt-4 inline-flex text-sm px-5 py-2">
              Browse Catalogue
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {aiBooks.map((book) => (
              <BookTile
                key={book.id}
                book={book}
                recId={aiRecId || ""}
                onFeedback={(bookId, isPositive) => aiRecId && sendFeedback(aiRecId, bookId, isPositive)}
                feedbackGiven={feedback[book.id] ?? null}
              />
            ))}
          </div>
        )}
      </section>

      {/* ML Discover Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-400" /> Discover
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Enter a genre or describe what you want — our ML model will find the best matches
          </p>
        </div>

        <div className="glass-card p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["genre", "description"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMlType(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mlType === t ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {t === "genre" ? "By Genre" : "By Description"}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={mlQuery}
                onChange={(e) => setMlQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchML()}
                placeholder={
                  mlType === "genre"
                    ? "e.g. Science Fiction, Mystery, Romance…"
                    : "e.g. A thriller about a detective in 1920s Paris…"
                }
                className="input-base pl-10 w-full"
              />
            </div>
            <button
              onClick={searchML}
              disabled={mlLoading || !mlQuery.trim()}
              className="btn-primary px-5 flex items-center gap-2 disabled:opacity-50"
            >
              {mlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Find
            </button>
          </div>

          {mlError && <p className="text-xs text-yellow-400">{mlError}</p>}
        </div>

        {mlBooks.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            {mlBooks.map((book) => (
              <BookTile key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
