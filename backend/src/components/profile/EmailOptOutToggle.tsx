"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

export default function EmailOptOutToggle({ initialOptedOut }: { initialOptedOut: boolean }) {
  const [optedOut, setOptedOut] = useState(initialOptedOut);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    setLoading(true);
    setMessage("");
    const method = optedOut ? "DELETE" : "POST";
    const res = await fetch("/api/profile/email-optout", { method });
    if (res.ok) {
      const data = await res.json();
      setOptedOut(data.optedOut);
      setMessage(data.message);
    } else {
      setMessage("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/40">
        <div className="flex items-center gap-3">
          {optedOut ? (
            <BellOff className="w-5 h-5 text-gray-500" />
          ) : (
            <Bell className="w-5 h-5 text-indigo-400" />
          )}
          <div>
            <p className="text-sm font-medium text-white">Email Reminders</p>
            <p className="text-xs text-gray-500">
              {optedOut
                ? "You have opted out — no reminder emails will be sent"
                : "You will receive due-date and overdue reminder emails"}
            </p>
          </div>
        </div>

        <button
          onClick={toggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
            optedOut ? "bg-gray-700" : "bg-indigo-600"
          }`}
          aria-label="Toggle email reminders"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              optedOut ? "translate-x-1" : "translate-x-6"
            }`}
          />
          {loading && <Loader2 className="absolute inset-0 m-auto w-3 h-3 text-white animate-spin" />}
        </button>
      </div>

      {message && (
        <p className="text-xs text-gray-400 px-1">{message}</p>
      )}
    </div>
  );
}
