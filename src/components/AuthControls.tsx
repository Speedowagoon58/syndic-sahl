"use client";

import React from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useApp } from "@/context/AppContext";
import { useAuthEnabled } from "@/components/AuthAvailability";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

function ClerkAuthControlsInner({
  variant,
  isAr,
}: {
  variant: "sidebar" | "header";
  isAr: boolean;
}) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div
        className={
          variant === "sidebar"
            ? "h-9 w-full rounded-lg border border-zinc-200/70 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            : "h-7 w-24 rounded-lg border border-zinc-200/70 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
        }
      />
    );
  }

  if (isSignedIn && user) {
    const label =
      user.fullName ||
      user.firstName ||
      user.primaryEmailAddress?.emailAddress ||
      (isAr ? "حسابي" : "Mon compte");

    if (variant === "header") {
      return (
        <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
          <UserButton />
          <span className="hidden md:inline max-w-28 truncate font-medium text-zinc-700 dark:text-zinc-200">
            {label}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/90">
        <UserButton />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {label}
          </p>
          <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
            {user.primaryEmailAddress?.emailAddress ?? "Google / Clerk"}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "header") {
    return (
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <GoogleGlyph />
        <span>{isAr ? "دخول Google" : "Connexion"}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      <GoogleGlyph />
      <span>{isAr ? "الدخول بحساب Google" : "Connexion / Google"}</span>
    </Link>
  );
}

/**
 * Adaptive sign-in / user avatar button for navigation bars and sidebar footers.
 */
export function AuthControls({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "header";
}) {
  const authEnabled = useAuthEnabled();
  const { locale } = useApp();
  const isAr = locale === "ar";

  if (!authEnabled) {
    return (
      <Link
        href="/sign-in"
        className={
          variant === "sidebar"
            ? "flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            : "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        }
      >
        <LogIn className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        <span>{isAr ? "دخول" : "Connexion"}</span>
      </Link>
    );
  }

  return <ClerkAuthControlsInner variant={variant} isAr={isAr} />;
}
