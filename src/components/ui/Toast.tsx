"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export type ToastMsg = { type: "success" | "error"; text: string } | null;

export default function Toast({ toast, onDone }: { toast: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;

  const ok = toast.type === "success";

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md px-4 py-3
        text-xs font-medium shadow-lg border animate-fade-up
        ${ok ? "bg-ok/10 text-ok border-ok/20" : "bg-signal/10 text-signal border-signal/20"}`}
    >
      {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {toast.text}
    </div>
  );
}
