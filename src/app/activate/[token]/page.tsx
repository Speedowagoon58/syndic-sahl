"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Lock, Moon, ShieldAlert, Sun } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useApp } from "@/context/AppContext";
import { useAuthEnabled } from "@/components/AuthAvailability";
import { APP_NAME, APP_NAME_AR } from "@/lib/config";

interface ActivateMetadata {
  maskedEmail: string;
  fullName: string;
  buildingName: string;
  city: string;
  trialDays: number;
  maxBuildings: number;
  status: string;
}

function ClerkAccessActivator({
  token,
  meta,
}: {
  token: string;
  meta: ActivateMetadata;
}) {
  const router = useRouter();
  const { locale, refreshWorkspace, t } = useApp();
  const isAr = locale === "ar";
  const { isLoaded, isSignedIn, user } = useUser();

  const attemptedRef = useRef(false);
  const [state, setState] = useState<
    "idle" | "activating" | "activated" | "mismatch" | "error"
  >("idle");
  const [mismatchInfo, setMismatchInfo] = useState<{
    expectedEmail: string;
    currentEmail: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || attemptedRef.current) return;
    attemptedRef.current = true;
    queueMicrotask(() => setState("activating"));

    fetch(`/api/activate/${encodeURIComponent(token)}`, { method: "POST" })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.ok) {
          setState("activated");
          await refreshWorkspace();
          router.replace("/");
          return;
        }
        if (res.status === 403 && json.error === "email_mismatch") {
          setMismatchInfo({
            expectedEmail: json.expectedEmail ?? meta.maskedEmail,
            currentEmail: json.currentEmail ?? "",
          });
          setState("mismatch");
          return;
        }
        setState("error");
      })
      .catch(() => {
        setState("error");
      });
  }, [isLoaded, isSignedIn, meta.maskedEmail, refreshWorkspace, router, token]);

  if (!isLoaded) {
    return (
      <p className="mt-5 text-center text-xs text-zinc-400">{t.common.loading}</p>
    );
  }

  if (!isSignedIn) {
    const redirectParam = encodeURIComponent(`/activate/${token}`);
    return (
      <div className="mt-5 space-y-2.5">
        <Link
          href={`/sign-in?redirect_url=${redirectParam}`}
          className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {t.common.signInBtn}
        </Link>
        <Link
          href={`/sign-up?redirect_url=${redirectParam}`}
          className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t.common.signUpBtn}
        </Link>
      </div>
    );
  }

  if (state === "mismatch" && mismatchInfo) {
    return (
      <div className="mt-5 space-y-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/40">
        <p className="font-semibold text-amber-900 dark:text-amber-300">
          {isAr
            ? "البريد الإلكتروني غير مطابق للدعوة"
            : "Adresse e-mail différente de l'invitation"}
        </p>
        <p className="text-amber-800 dark:text-amber-200/90">
          {isAr
            ? `هذه الدعوة مخصصة لـ ${mismatchInfo.expectedEmail} بينما أنت متصل بـ ${mismatchInfo.currentEmail}. غيّر الحساب للمتابعة.`
            : `Cet accès essai est réservé à ${mismatchInfo.expectedEmail}, mais vous êtes connecté avec ${mismatchInfo.currentEmail}. Changez de compte ci-dessous.`}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="truncate font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
          <UserButton />
        </div>
      </div>
    );
  }

  if (state === "activated") {
    return (
      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          {isAr
            ? "تم تفعيل الولوج التجريبي، جاري التوجيه..."
            : "Accès essai activé, redirection..."}
        </span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="mt-5 text-center text-xs text-red-600 dark:text-red-400">
        {isAr
          ? "تعذر تفعيل هذا الرابط."
          : "Impossible d'activer cet accès."}
      </p>
    );
  }

  return (
    <p className="mt-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
      {isAr ? "جاري تفعيل الولوج..." : "Activation de votre accès essai..."}
    </p>
  );
}

export default function ActivateTrialPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const authEnabled = useAuthEnabled();
  const { locale, setLocale, theme, toggleTheme, t } = useApp();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<
    "none" | "not_found" | "revoked" | "pending"
  >("none");
  const [meta, setMeta] = useState<ActivateMetadata | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch(`/api/activate/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 410) {
          setErrorKind("revoked");
          setLoading(false);
          return;
        }
        if (res.status === 409) {
          setErrorKind("pending");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setErrorKind("not_found");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as ActivateMetadata;
        if (!active) return;
        setMeta(json);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setErrorKind("not_found");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between py-2">
        <Link
          href="/landing"
          className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
            S
          </span>
          <span>{isAr ? APP_NAME_AR : APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.header.lightMode : t.header.darkMode}
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setLocale(isAr ? "fr" : "ar")}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {isAr ? "FR" : "العربية"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md py-8">
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          {loading ? (
            <p className="text-center text-xs text-zinc-400">{t.common.loading}</p>
          ) : errorKind !== "none" || !meta ? (
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h1 className="mt-4 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                {errorKind === "revoked"
                  ? isAr
                    ? "تم إلغاء هذا الولوج"
                    : "Accès révoqué"
                  : errorKind === "pending"
                  ? isAr
                    ? "الطلب قيد المراجعة"
                    : "Demande en attente de validation"
                  : isAr
                  ? "رابط التفعيل غير صالح"
                  : "Lien d'activation introuvable"}
              </h1>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
              >
                {t.portal.backHome}
              </Link>
            </div>
          ) : (
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                {authEnabled ? (
                  <KeyRound className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              <h1 className="mt-4 text-center text-base font-semibold text-zinc-950 dark:text-zinc-100">
                {meta.buildingName || (isAr ? "تفعيل التجربة المجانية" : "Activation essai gratuit")}
              </h1>
              {meta.city && (
                <p className="mt-0.5 text-center text-xs text-zinc-400">{meta.city}</p>
              )}

              <div className="mt-4 space-y-2 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">{isAr ? "المدة التجريبية" : "Essai offert"}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {meta.trialDays} {isAr ? "يوماً" : "jours"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">{isAr ? "البريد المدعو" : "E-mail invité"}</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {meta.maskedEmail}
                  </span>
                </div>
              </div>

              {authEnabled ? (
                <ClerkAccessActivator token={token} meta={meta} />
              ) : (
                <Link
                  href="/"
                  className="mt-5 flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
                >
                  {isAr ? "متابعة في الوضع المحلي" : "Continuer en mode local"}
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
      <div />
    </div>
  );
}
