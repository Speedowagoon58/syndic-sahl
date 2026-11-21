"use client";

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
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <p className="truncate font-semibold text-slate-800">
            {caption || t.expenses.viewPhoto}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
            {t.common.close}
          </button>
        </div>
        <div className="flex max-h-[78vh] items-center justify-center overflow-auto bg-slate-50 p-4">
          <Image
            src={imageUrl}
            alt={caption || "Receipt"}
            width={720}
            height={520}
            unoptimized
            className="h-auto max-h-[72vh] w-auto rounded-lg border border-slate-200 object-contain shadow-xs"
          />
        </div>
      </div>
    </div>
  );
}
