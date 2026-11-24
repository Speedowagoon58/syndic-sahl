"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useApp } from "@/context/AppContext";

interface ReceiptLightboxProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export function ReceiptLightbox({
  imageUrl,
  caption,
  onClose,
}: ReceiptLightboxProps) {
  const { t } = useApp();

  useEffect(() => {
    if (!imageUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="ss-animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ss-animate-modal relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {caption || t.expenses.viewPhoto}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <X className="h-3.5 w-3.5" />
            <span>{t.common.close}</span>
          </button>
        </div>
        <div className="flex max-h-[78vh] items-center justify-center overflow-auto bg-zinc-50 p-4 dark:bg-zinc-950">
          <Image
            src={imageUrl}
            alt={caption || "Receipt"}
            width={720}
            height={520}
            unoptimized
            className="h-auto max-h-[72vh] w-auto rounded-lg border border-zinc-200 object-contain shadow-2xs dark:border-zinc-800"
          />
        </div>
      </div>
    </div>
  );
}
