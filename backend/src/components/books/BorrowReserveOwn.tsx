"use client";

import { useState } from "react";
import { BookOpen, Bell, Star, Loader2, CheckCircle } from "lucide-react";

interface Props {
  bookId: string;
  availableCopies: number;
  userBorrowingId: string | null;
  hasReservation: boolean;
  hasOwnership: boolean;
}

export default function BorrowReserveOwn({
  bookId,
  availableCopies,
  userBorrowingId: initialBorrowingId,
  hasReservation: initialHasReservation,
  hasOwnership: initialHasOwnership,
}: Props) {
  const [borrowingId, setBorrowingId] = useState(initialBorrowingId);
  const [hasReservation, setHasReservation] = useState(initialHasReservation);
  const [hasOwnership, setHasOwnership] = useState(initialHasOwnership);
  const [loading, setLoading] = useState<"borrow" | "reserve" | "own" | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  async function handleBorrow() {
    setLoading("borrow");
    const res = await fetch("/api/borrowings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    const data = await res.json();
    if (res.ok) {
      setBorrowingId(data.borrowing.id);
      showToast("Book borrowed! Check your loans for the due date ✓");
    } else {
      showToast(data.error || "Could not borrow book", "error");
    }
    setLoading(null);
  }

  async function handleReserve() {
    setLoading("reserve");
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    const data = await res.json();
    if (res.ok) {
      setHasReservation(true);
      showToast("Reservation placed! We'll email you when it's available ✓");
    } else {
      showToast(data.error || "Could not place reservation", "error");
    }
    setLoading(null);
  }

  async function handleOwn() {
    setLoading("own");
    const method = hasOwnership ? "DELETE" : "POST";
    const res = await fetch("/api/ownership", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    if (res.ok) {
      setHasOwnership(!hasOwnership);
      showToast(hasOwnership ? "Removed from your owned books" : "Marked as owned ✓");
    } else {
      const data = await res.json();
      showToast(data.error || "Error", "error");
    }
    setLoading(null);
  }

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Already borrowed */}
      {borrowingId ? (
        <div className="glass-card p-4 flex items-center gap-3 border-green-500/30 bg-green-500/10">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-300">Currently borrowed</p>
            <p className="text-xs text-gray-400">Go to My Loans to renew or return</p>
          </div>
          <a href="/loans" className="btn-secondary text-xs px-3 py-1.5 ml-auto shrink-0">
            My Loans
          </a>
        </div>
      ) : availableCopies > 0 ? (
        <button
          onClick={handleBorrow}
          disabled={loading === "borrow"}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading === "borrow" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BookOpen className="w-4 h-4" />
          )}
          Borrow Book
        </button>
      ) : hasReservation ? (
        <div className="glass-card p-4 flex items-center gap-3 border-yellow-500/30 bg-yellow-500/10">
          <Bell className="w-5 h-5 text-yellow-400 shrink-0" />
          <p className="text-sm font-semibold text-yellow-300">Reservation placed — we&apos;ll notify you</p>
        </div>
      ) : (
        <button
          onClick={handleReserve}
          disabled={loading === "reserve"}
          className="btn-secondary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading === "reserve" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          Reserve (All copies out)
        </button>
      )}

      {/* Owned toggle */}
      <button
        onClick={handleOwn}
        disabled={loading === "own"}
        className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
          hasOwnership
            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
            : "bg-gray-800/60 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 border border-gray-700"
        }`}
      >
        {loading === "own" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Star className={`w-4 h-4 ${hasOwnership ? "fill-yellow-400" : ""}`} />
        )}
        {hasOwnership ? "Remove from owned books" : "I own this book"}
      </button>
    </div>
  );
}
