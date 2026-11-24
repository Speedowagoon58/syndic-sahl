"use client";

import React from "react";
import { APP_NAME, APP_NAME_AR } from "@/lib/config";

export interface LoadingScreenProps {
  progress?: number;
  statusText?: string;
  locale?: "fr" | "ar";
  exiting?: boolean;
  overlay?: boolean;
}

export function LoadingScreen({
  progress,
  statusText,
  locale = "fr",
  exiting = false,
  overlay = false,
}: LoadingScreenProps) {
  const isAr = locale === "ar";
  const hasNumericProgress = typeof progress === "number";
  const clampedProgress = hasNumericProgress
    ? Math.max(0, Math.min(100, Math.round(progress)))
    : null;
  const formattedPct =
    clampedProgress !== null ? String(clampedProgress).padStart(2, "0") : null;

  const defaultStatus = isAr
    ? "تهيئة الفضاء الخاص..."
    : "Initialisation de l'espace...";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={statusText || defaultStatus}
      className={`no-print ss-curtain ${
        overlay ? "fixed inset-0 z-[100]" : "relative min-h-screen w-full"
      } flex flex-col justify-between overflow-hidden bg-[#F6F6F4] text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100 ${
        exiting ? "ss-curtain-exit" : ""
      }`}
    >
      {/* Subtle architectural blueprint grid */}
      <div
        aria-hidden="true"
        className="ss-animate-grid pointer-events-none absolute -inset-6 opacity-[0.38] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15, 118, 110, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 118, 110, 0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Soft centered emerald aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-400/10"
      />

      {/* Editorial top corner hairlines */}
      <header className="relative z-10 flex w-full items-center justify-between px-6 py-5 sm:px-10 sm:py-7">
        <div className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />
          <span>{APP_NAME}</span>
        </div>
        <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          MAROC • LOI 18-00
        </div>
      </header>

      {/* Centerpiece architectural emblem + masked wordmark + hairline progress */}
      <main className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="relative mb-7 flex h-24 w-24 items-center justify-center rounded-3xl border border-zinc-200/80 bg-white/80 shadow-xl shadow-teal-950/5 backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/75 dark:shadow-black/40">
          <svg
            viewBox="0 0 120 120"
            className="h-16 w-16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Building roofline & facade stroke-draw */}
            <path
              d="M28 98V42L60 24L92 42V98H28Z"
              className="ss-animate-draw stroke-[#0F766E] dark:stroke-[#2DD4BF]"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Architectural center ridge */}
            <path
              d="M60 24V98"
              className="stroke-teal-700/20 dark:stroke-teal-300/20"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* 4 apartment windows lighting up sequentially */}
            <rect
              x="38"
              y="49"
              width="13"
              height="13"
              rx="3"
              className="ss-animate-window-1 fill-[#0F766E] dark:fill-[#14B8A6]"
            />
            <rect
              x="69"
              y="49"
              width="13"
              height="13"
              rx="3"
              className="ss-animate-window-2 fill-[#0F766E] dark:fill-[#14B8A6]"
            />
            <rect
              x="38"
              y="68"
              width="13"
              height="13"
              rx="3"
              className="ss-animate-window-3 fill-[#0F766E] dark:fill-[#14B8A6]"
            />
            <rect
              x="69"
              y="68"
              width="13"
              height="13"
              rx="3"
              className="ss-animate-window-4 fill-[#0F766E] dark:fill-[#14B8A6]"
            />
            {/* Arched entrance */}
            <path
              d="M52 98V83C52 78.5817 55.5817 75 60 75C64.4183 75 68 78.5817 68 83V98"
              className="ss-animate-draw stroke-[#0F766E] dark:stroke-[#2DD4BF]"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Signature amber verified seal */}
            <g className="ss-animate-badge">
              <circle cx="91" cy="29" r="13" fill="#F59E0B" />
              <path
                d="M85.5 29.5L89 33L96.5 25.5"
                stroke="#FFFFFF"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>

        {/* Masked wordmark reveal */}
        <div className="overflow-hidden">
          <h1 className="ss-animate-word text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[26px]">
            {isAr ? APP_NAME_AR : APP_NAME}
          </h1>
        </div>

        <p
          dir={isAr ? "rtl" : "ltr"}
          className="mt-2 min-h-[1.25rem] text-xs font-medium text-zinc-500 transition-opacity duration-300 dark:text-zinc-400"
        >
          {statusText || defaultStatus}
        </p>

        {/* Hairline 2px progress track */}
        <div className="mt-7 w-full max-w-[240px]">
          <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            {clampedProgress !== null ? (
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-[#0F766E] via-[#14B8A6] to-[#F59E0B] transition-[width] duration-200 ease-out"
                style={{ width: `${clampedProgress}%` }}
              >
                <span className="ss-animate-shimmer absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              </div>
            ) : (
              <div className="ss-animate-shimmer h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-[#0F766E] to-transparent dark:via-[#2DD4BF]" />
            )}
          </div>
        </div>
      </main>

      {/* Editorial footer with live tabular percentage */}
      <footer className="relative z-10 flex w-full items-center justify-between px-6 py-5 sm:px-10 sm:py-7">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          {isAr ? "إدارة شفافة" : "EXPERIENCE"}
        </span>
        <span className="tabular-nums text-xs font-semibold tracking-wider text-zinc-600 dark:text-zinc-300">
          {formattedPct !== null ? `${formattedPct}%` : "•••"}
        </span>
      </footer>
    </div>
  );
}
