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
        overlay ? "fixed inset-0 z-[100]" : "min-h-screen w-full"
      } flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100 ${
        exiting ? "ss-curtain-exit" : ""
      }`}
    >
      {/* Matching Main Page Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
            S
          </div>
          <span className="text-sm font-semibold tracking-tight">
            {isAr ? APP_NAME_AR : APP_NAME}
          </span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400" />
          <span>{isAr ? "القانون 18-00" : "Loi 18-00"}</span>
        </div>
      </header>

      {/* Matching Centered Card */}
      <main className="mx-auto w-full max-w-md py-8">
        <div className="ss-animate-fade-up rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <svg
              viewBox="0 0 120 120"
              className="h-9 w-9"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Building roofline & facade stroke-draw */}
              <path
                d="M28 98V42L60 24L92 42V98H28Z"
                className="ss-animate-draw stroke-zinc-900 dark:stroke-zinc-100"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 4 apartment windows lighting up sequentially */}
              <rect
                x="39"
                y="49"
                width="12"
                height="12"
                rx="2.5"
                className="ss-animate-window-1 fill-zinc-900 dark:fill-zinc-100"
              />
              <rect
                x="69"
                y="49"
                width="12"
                height="12"
                rx="2.5"
                className="ss-animate-window-2 fill-zinc-900 dark:fill-zinc-100"
              />
              <rect
                x="39"
                y="68"
                width="12"
                height="12"
                rx="2.5"
                className="ss-animate-window-3 fill-zinc-900 dark:fill-zinc-100"
              />
              <rect
                x="69"
                y="68"
                width="12"
                height="12"
                rx="2.5"
                className="ss-animate-window-4 fill-zinc-900 dark:fill-zinc-100"
              />
              {/* Arched entrance */}
              <path
                d="M52 98V83C52 78.5817 55.5817 75 60 75C64.4183 75 68 78.5817 68 83V98"
                className="ss-animate-draw stroke-zinc-900 dark:stroke-zinc-100"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Emerald verified badge */}
              <g className="ss-animate-badge">
                <circle cx="91" cy="29" r="13" fill="#059669" />
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

          <div className="mt-4 overflow-hidden text-center">
            <h1 className="ss-animate-word text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {isAr ? APP_NAME_AR : APP_NAME}
            </h1>
          </div>

          <div
            dir={isAr ? "rtl" : "ltr"}
            className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400"
          >
            <span className="truncate font-medium">
              {statusText || defaultStatus}
            </span>
            <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
              {formattedPct !== null ? `${formattedPct}%` : "•••"}
            </span>
          </div>

          {/* Monochrome Progress Track */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            {clampedProgress !== null ? (
              <div
                className="relative h-full rounded-full bg-zinc-900 transition-[width] duration-200 ease-out dark:bg-zinc-100"
                style={{ width: `${clampedProgress}%` }}
              >
                <span className="ss-animate-shimmer absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-zinc-900/35" />
              </div>
            ) : (
              <div className="ss-animate-shimmer h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-zinc-900 to-transparent dark:via-zinc-100" />
            )}
          </div>

          {/* Mini-Ledger Skeleton Strip matching KPI Cards */}
          <div className="mt-5 grid grid-cols-3 divide-x divide-zinc-100 rounded-lg border border-zinc-100 bg-zinc-50/70 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/60">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="p-2.5">
                <div className="h-2 w-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-1.5 h-3 w-14 animate-pulse rounded bg-zinc-300/80 dark:bg-zinc-700/80" />
              </div>
            ))}
          </div>
        </div>
      </main>

      <div />
    </div>
  );
}
