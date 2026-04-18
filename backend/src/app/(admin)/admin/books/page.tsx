"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, Upload, BookOpen, X, Check } from "lucide-react";

type Book = {
  id: string;
  isbn: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedYear: number;
  language: string;
  totalCopies: number;
  coverUrl: string | null;
  synopsis: string | null;
  genres: { genre: { id: string; name: string } }[];
};

type Genre = { id: string; name: string };

// ── Modal form ────────────────────────────────────────────────────────────────
function BookFormModal({
  book,
  genres,
  onClose,
  onSaved,
}: {
  book?: Book;
  genres: Genre[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    isbn: book?.isbn || "",
    title: book?.title || "",
    authors: book?.authors.join(", ") || "",
    publisher: book?.publisher || "",
    publishedYear: book?.publishedYear || new Date().getFullYear(),
    language: book?.language || "English",
    totalCopies: book?.totalCopies || 1,
    coverUrl: book?.coverUrl || "",
    synopsis: book?.synopsis || "",
    genreIds: book?.genres.map((bg) => bg.genre.id) || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleGenre(id: string) {
    setForm((f) => ({
      ...f,
      genreIds: f.genreIds.includes(id) ? f.genreIds.filter((g) => g !== id) : [...f.genreIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      ...form,
      authors: form.authors.split(",").map((a) => a.trim()).filter(Boolean),
      publishedYear: Number(form.publishedYear),
      totalCopies: Number(form.totalCopies),
    };

    const url = book ? `/api/books/${book.id}` : "/api/books";
    const method = book ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onSaved();
      onClose();
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{book ? "Edit Book" : "Add New Book"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400">Title *</label>
              <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required className="input-base w-full mt-1" placeholder="Book title" />
            </div>
            <div>
              <label className="text-xs text-gray-400">ISBN *</label>
              <input value={form.isbn} onChange={(e) => setForm({...form, isbn: e.target.value})} required className="input-base w-full mt-1" placeholder="978-..." disabled={!!book} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Publisher *</label>
              <input value={form.publisher} onChange={(e) => setForm({...form, publisher: e.target.value})} required className="input-base w-full mt-1" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400">Authors * (comma-separated)</label>
              <input value={form.authors} onChange={(e) => setForm({...form, authors: e.target.value})} required className="input-base w-full mt-1" placeholder="Author One, Author Two" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Published Year *</label>
              <input type="number" value={form.publishedYear} onChange={(e) => setForm({...form, publishedYear: +e.target.value})} required className="input-base w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Total Copies</label>
              <input type="number" min={1} value={form.totalCopies} onChange={(e) => setForm({...form, totalCopies: +e.target.value})} className="input-base w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Language</label>
              <input value={form.language} onChange={(e) => setForm({...form, language: e.target.value})} className="input-base w-full mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Cover URL</label>
              <input value={form.coverUrl} onChange={(e) => setForm({...form, coverUrl: e.target.value})} className="input-base w-full mt-1" placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400">Synopsis</label>
              <textarea value={form.synopsis} onChange={(e) => setForm({...form, synopsis: e.target.value})} rows={3} className="input-base w-full mt-1 resize-none" />
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Genres</label>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGenre(g.id)}
                  className={`badge text-xs transition-all ${form.genreIds.includes(g.id) ? "badge-indigo" : "badge-gray"}`}
                >
                  {form.genreIds.includes(g.id) && <Check className="w-3 h-3 inline mr-1" />}
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {book ? "Save Changes" : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editBook, setEditBook] = useState<Book | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch("/api/genres").then((r) => r.json()).then((d) => setGenres(d.genres || []));
  }, []);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q) params.set("q", q);
    const res = await fetch(`/api/books?${params}`);
    if (res.ok) {
      const data = await res.json();
      setBooks(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    }
    setLoading(false);
  }, [page, q]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);
  useEffect(() => { setPage(1); }, [q]);

  async function handleDelete(id: string) {
    if (!confirm("Soft-delete this book? It will no longer appear in the catalogue.")) return;
    setDeleting(id);
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("Book deleted ✓"); fetchBooks(); }
    setDeleting(null);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/books/import", { method: "POST", body: fd });
    const data = await res.json();
    setImportResult(data.message || data.error || "Done");
    if (res.ok) fetchBooks();
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium bg-green-600 text-white">{toast}</div>
      )}
      {(showForm || editBook) && (
        <BookFormModal
          book={editBook}
          genres={genres}
          onClose={() => { setShowForm(false); setEditBook(undefined); }}
          onSaved={fetchBooks}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Books</h1>
          <p className="text-gray-400 mt-1">{total.toLocaleString()} books in catalogue</p>
        </div>
        <div className="flex gap-2">
          {/* CSV Import */}
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import CSV
            <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={() => { setEditBook(undefined); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Book
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`glass-card p-3 text-sm ${importResult.includes("Error") || importResult.includes("error") ? "text-red-400" : "text-green-400"}`}>
          {importResult}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, author, ISBN, genre…"
          className="input-base pl-11 w-full"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Book</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest hidden md:table-cell">Genres</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Copies</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 rounded bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {book.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white line-clamp-1">{book.title}</p>
                          <p className="text-xs text-gray-500">{book.authors.slice(0, 2).join(", ")}</p>
                          <p className="text-xs text-gray-600">{book.isbn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {book.genres.slice(0, 3).map((bg) => (
                          <span key={bg.genre.id} className="badge badge-gray text-xs">{bg.genre.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-white font-medium">{book.totalCopies}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditBook(book); setShowForm(true); }}
                          className="btn-ghost p-2 text-gray-400 hover:text-indigo-400"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          disabled={deleting === book.id}
                          className="btn-ghost p-2 text-gray-400 hover:text-red-400 disabled:opacity-40"
                          title="Delete"
                        >
                          {deleting === book.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {books.length === 0 && <div className="text-center py-12 text-gray-500">No books found</div>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="btn-secondary px-3 py-2 disabled:opacity-40">←</button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="btn-secondary px-3 py-2 disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  );
}
