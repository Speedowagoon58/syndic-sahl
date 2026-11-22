"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Moon, Sun } from "lucide-react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useApp } from "@/context/AppContext";
import { useAuthEnabled } from "@/components/AuthAvailability";
import { APP_NAME, APP_NAME_AR } from "@/lib/config";

interface AuthPageShellProps {
  mode: "sign-in" | "sign-up";
}

/**
 * Shared bilingual light/dark shell around Clerk SignIn / SignUp (including Google OAuth).
 */
export function AuthPageShell({ mode }: AuthPageShellProps) {
  const authEnabled = useAuthEnabled();
  const { locale, setLocale, theme, toggleTheme } = useApp();
  const isAr = locale === "ar";

  const clerkAppearance = {
    variables:
      theme === "dark"
        ? {
            colorBackground: "#111113",
            colorText: "#f4f4f5",
            colorTextSecondary: "#a1a1aa",
            colorInputBackground: "#09090b",
            colorInputText: "#f4f4f5",
            colorPrimary: "#f4f4f5",
            colorTextOnPrimaryBackground: "#09090b",
            colorNeutral: "#3f3f46",
          }
        : {
            colorBackground: "#ffffff",
            colorText: "#09090b",
            colorPrimary: "#18181b",
          },
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-3">
        <Link
          href="/landing"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{isAr ? "صفحة التقديم" : "Présentation"}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>

          <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setLocale("fr")}
              className={`rounded-xs px-2.5 py-0.5 ${
                locale === "fr"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLocale("ar")}
              className={`rounded-xs px-2.5 py-0.5 ${
                locale === "ar"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              العربية
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col items-center py-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
            S
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {isAr ? APP_NAME_AR : APP_NAME}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isAr
                ? "تسجيل الدخول السريع عبر Google أو البريد الإلكتروني"
                : "Connexion rapide avec Google ou par e-mail"}
            </p>
          </div>
        </div>

        {authEnabled ? (
          <div className="flex w-full justify-center">
            {mode === "sign-up" ? (
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/"
                appearance={clerkAppearance}
              />
            ) : (
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/"
                appearance={clerkAppearance}
              />
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {isAr
                ? "تسجيل الدخول عبر Google جاهز عند الربط مع مفاتيح Clerk."
                : "La connexion Google via Clerk est activée sur l'environnement cloud Vercel."}
            </p>
          </div>
        )}

        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#111113] dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <span>
            {isAr
              ? "الاستمرار نحو فضاء العمارة التجريبي"
              : "Continuer vers le tableau de bord"}
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </main>

      <footer className="py-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        {APP_NAME} • Maroc
      </footer>
    </div>
  );
}
