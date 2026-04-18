"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

let listeners: ((toasts: ToastItem[]) => void)[] = [];
let toastList: ToastItem[] = [];

export function toast(type: ToastType, title: string, message?: string) {
  const item: ToastItem = { id: Date.now().toString(), type, title, message };
  toastList = [...toastList, item];
  listeners.forEach((fn) => fn(toastList));
  setTimeout(() => {
    toastList = toastList.filter((t) => t.id !== item.id);
    listeners.forEach((fn) => fn(toastList));
  }, 5000);
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />,
  error:   <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
  info:    <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />,
};

const colors: Record<ToastType, string> = {
  success: "border-green-500/30 bg-green-500/10",
  error:   "border-red-500/30 bg-red-500/10",
  info:    "border-indigo-500/30 bg-indigo-500/10",
  warning: "border-yellow-500/30 bg-yellow-500/10",
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const fn = (t: ToastItem[]) => setToasts([...t]);
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl shadow-2xl animate-slide-up ${colors[t.type]}`}
        >
          {icons[t.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{t.title}</p>
            {t.message && <p className="text-xs text-gray-400 mt-0.5">{t.message}</p>}
          </div>
          <button
        title="x"
            className="text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
