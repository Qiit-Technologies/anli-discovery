"use client";

import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-t-3xl border-t border-ink-600 bg-ink-900 p-5 pb-8 sm:rounded-3xl sm:border sm:m-4 animate-[slideUp_.25s_ease-out]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-600 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-100">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-stone-400 hover:text-white"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(24px); opacity: .6; } to { transform: none; opacity: 1; } }`}</style>
    </div>
  );
}
