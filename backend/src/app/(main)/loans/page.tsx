"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, RotateCcw, CheckCircle, Clock, AlertCircle, Loader2, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

type Borrowing = {
  id: string;
  status: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  renewalCount: number;
  lateFee: number | null;
  book: {
    id: string;
    title: string;
    authors: string[];
    coverUrl: string | null;
    isbn: string;
  };
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   "bg-green-500/20 text-green-400",
  RENEWED:  "bg-blue-500/20 text-blue-400",
  OVERDUE:  "bg-red-500/20 text-red-400",
  RETURNED: "bg-gray-500/20 text-gray-400",
};

export default function LoansPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "history">("active");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/borrowings/me");
    if (res.ok) {
      const data = await res.json();
      setBorrowings(data.borrowings || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBorrowings(); }, [fetchBorrowings]);

  const active = borrowings.filter((b) => ["ACTIVE", "RENEWED", "OVERDUE"].includes(b.status));
  const history = borrowings.filter((b) => b.status === "RETURNED");
  const shown = filter === "active" ? active : history;

  async function handleRenew(id: string) {
    setActionId(id);
    const res = await fetch(`/api/borrowings/${id}/renew`, { method: "PATCH" });
    if (res.ok) {
      showToast("Borrowing renewed for 14 more days ✓");
      fetchBorrowings();
    } else {
      const data = await res.json();
      showToast(data.error || "Could not renew", "error");
    }
    setActionId(null);
  }

  async function handleReturn(id: string) {
    setActionId(id);
    const res = await fetch(`/api/borrowings/${id}/return`, { method: "PATCH" });
    if (res.ok) {
      const data = await res.json();
      showToast(`Book returned! ${data.lateFee ? `Late fee: £${data.lateFee}` : "No late fees ✓"}`);
      fetchBorrowings();
    } else {
      const data = await res.json();
      showToast(data.error || "Could not return", "error");
    }
    setActionId(null);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-white">My Loans</h1>
        <p className="text-gray-400 mt-1">
          {active.length} active · {history.length} returned
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["active", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === tab
                ? "bg-indigo-600 text-white"
                : "bg-gray-800/60 text-gray-400 hover:text-gray-100"
            }`}
          >
            {tab === "active" ? `Active (${active.length})` : `History (${history.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-lg">
            {filter === "active" ? "No active loans" : "No borrowing history yet"}
          </p>
          {filter === "active" && (
            <a href="/catalogue" className="btn-primary mt-4 inline-flex text-sm px-5 py-2">
              Browse Catalogue
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((b) => {
            const due = new Date(b.dueDate);
            const now = new Date();
            const daysLeft = differenceInDays(due, now);
            const isOverdue = b.status !== "RETURNED" && daysLeft < 0;
            const busy = actionId === b.id;

            return (
              <div key={b.id} className="glass-card p-5 flex gap-4">
                {/* Cover */}
                <div className="w-14 h-20 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {b.book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.book.coverUrl} alt={b.book.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-gray-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white truncate">{b.book.title}</p>
                      <p className="text-sm text-gray-400">{b.book.authors.join(", ")}</p>
                    </div>
                    <span className={`badge text-xs shrink-0 ${STATUS_STYLES[b.status] || "badge-gray"}`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Borrowed {format(new Date(b.borrowedAt), "dd MMM yyyy")}
                    </span>
                    <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : daysLeft <= 3 && b.status !== "RETURNED" ? "text-yellow-400" : ""}`}>
                      <Clock className="w-3 h-3" />
                      {b.status === "RETURNED"
                        ? `Returned ${format(new Date(b.returnedAt!), "dd MMM yyyy")}`
                        : isOverdue
                        ? `${Math.abs(daysLeft)}d overdue`
                        : `Due ${format(due, "dd MMM yyyy")} (${daysLeft}d left)`}
                    </span>
                    {b.renewalCount > 0 && (
                      <span className="text-blue-400">{b.renewalCount}/2 renewals used</span>
                    )}
                    {b.lateFee && (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> £{b.lateFee} fee
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  {["ACTIVE", "RENEWED", "OVERDUE"].includes(b.status) && (
                    <div className="flex gap-2 mt-3">
                      {b.status !== "OVERDUE" && (
                        <button
                          onClick={() => handleRenew(b.id)}
                          disabled={busy || b.renewalCount >= 2}
                          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                        >
                          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Renew
                        </button>
                      )}
                      <button
                        onClick={() => handleReturn(b.id)}
                        disabled={busy}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-40"
                      >
                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Return
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
