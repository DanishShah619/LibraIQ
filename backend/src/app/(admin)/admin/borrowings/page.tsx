"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Search, Filter, Loader2, AlertCircle, Clock, CheckCircle2, BookOpen } from "lucide-react";

type Borrowing = {
  id: string;
  status: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  renewalCount: number;
  lateFee: number | null;
  book: { title: string; isbn: string };
  user: { firstName: string; lastName: string; email: string };
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   "badge-green",
  RENEWED:  "badge-indigo",
  OVERDUE:  "badge-red",
  RETURNED: "badge-gray",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  ACTIVE:   CheckCircle2,
  RENEWED:  Clock,
  OVERDUE:  AlertCircle,
  RETURNED: CheckCircle2,
};

export default function AdminBorrowingsPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/borrowings?${params}`);
    if (res.ok) {
      const data = await res.json();
      setBorrowings(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchBorrowings(); }, [fetchBorrowings]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  async function handleExport() {
    setExporting(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/borrowings/export${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `borrowings-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  // Client-side filter by member name (searches already-loaded page)
  const filtered = q
    ? borrowings.filter(
        (b) =>
          `${b.user.firstName} ${b.user.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
          b.user.email.toLowerCase().includes(q.toLowerCase()) ||
          b.book.title.toLowerCase().includes(q.toLowerCase())
      )
    : borrowings;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Borrowings</h1>
          <p className="text-gray-400 mt-1">{total.toLocaleString()} total records</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by member or book title…"
            className="input-base pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500 shrink-0" />
          {["", "ACTIVE", "RENEWED", "OVERDUE", "RETURNED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`badge text-xs transition-all ${
                statusFilter === s
                  ? s === "OVERDUE" ? "badge-red" : "badge-indigo"
                  : "badge-gray hover:badge-indigo"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Member</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Book</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Borrowed</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Due</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((b) => {
                  const Icon = STATUS_ICONS[b.status] || BookOpen;
                  return (
                    <tr key={b.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">{b.user.firstName} {b.user.lastName}</p>
                        <p className="text-xs text-gray-500">{b.user.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-white line-clamp-1">{b.book.title}</p>
                        <p className="text-xs text-gray-500">{b.book.isbn}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge text-xs flex items-center gap-1 w-fit ${STATUS_STYLES[b.status] || "badge-gray"}`}>
                          <Icon className="w-3 h-3" />
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {new Date(b.borrowedAt).toLocaleDateString()}
                      </td>
                      <td className={`px-5 py-4 text-xs font-medium ${b.status === "OVERDUE" ? "text-red-400" : "text-gray-300"}`}>
                        {new Date(b.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {b.lateFee ? (
                          <span className="text-red-400">£{b.lateFee}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">No borrowings found</div>
          )}
        </div>
      )}

      {/* Pagination */}
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
