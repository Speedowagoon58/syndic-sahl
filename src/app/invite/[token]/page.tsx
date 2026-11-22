"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Building2, CheckCircle2, Lock, Moon, ShieldAlert, Sun } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useApp } from "@/context/AppContext";
import { useAuthEnabled } from "@/components/AuthAvailability";
import type { MemberRole, MemberStatus } from "@/lib/types";

interface InviteMetadata {
  buildingName: string;
  city: string;
  shareSlug: string;
  role: MemberRole;
  status: MemberStatus;
  maskedEmail: string;
  displayName: string;
}

function ClerkInviteAcceptor({
  token,
  meta,
}: {
  token: string;
  meta: InviteMetadata;
}) {
  const router = useRouter();
  const { locale, t } = useApp();
  const isAr = locale === "ar";
  const { isLoaded, isSignedIn, user } = useUser();

  const attemptedRef = useRef(false);
  const [state, setState] = useState<
    "idle" | "accepting" | "accepted" | "mismatch" | "error"
  >("idle");
  const [mismatchInfo, setMismatchInfo] = useState<{
    expectedEmail: string;
    currentEmail: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || attemptedRef.current) return;
    attemptedRef.current = true;
    queueMicrotask(() => setState("accepting"));

    fetch(`/api/invite/${encodeURIComponent(token)}`, { method: "POST" })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.ok) {
          setState("accepted");
          const dest =
            json.role === "tenant" ? `/r/${json.shareSlug}` : "/";
          router.replace(dest);
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
  }, [isLoaded, isSignedIn, meta.maskedEmail, router, token]);

  if (!isLoaded) {
    return (
      <p className="mt-5 text-center text-xs text-zinc-400">{t.common.loading}</p>
    );
  }

  if (!isSignedIn) {
    const redirectParam = encodeURIComponent(`/invite/${token}`);
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
            ? "البريد الإلكتروني المتصل غير مطابق للدعوة"
            : "Adresse e-mail différente de l'invitation"}
        </p>
        <p className="text-amber-800 dark:text-amber-200/90">
          {isAr
            ? `الدعوة مخصصة لـ ${mismatchInfo.expectedEmail} بينما أنت متصل بـ ${mismatchInfo.currentEmail}. غيّر الحساب للدخول.`
            : `Cette invitation est réservée à ${mismatchInfo.expectedEmail}, mais vous êtes connecté avec ${mismatchInfo.currentEmail}. Changez de compte ci-dessous.`}
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

  if (state === "accepted") {
    return (
      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>{isAr ? "تم تفعيل الولوج، جاري التوجيه..." : "Accès activé, redirection..."}</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="mt-5 text-center text-xs text-red-600 dark:text-red-400">
        {isAr
          ? "تعذر قبول الدعوة. تأكد من صلاحية الرابط."
          : "Impossible d'accepter cette invitation."}
      </p>
    );
  }

  return (
    <p className="mt-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
      {isAr ? "جاري تفعيل الدعوة..." : "Activation de votre accès..."}
    </p>
  );
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const authEnabled = useAuthEnabled();
  const { locale, setLocale, theme, toggleTheme, t } = useApp();
  const isAr = locale === "ar";

  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<"none" | "not_found" | "revoked">(
    "none"
  );
  const [meta, setMeta] = useState<InviteMetadata | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch(`/api/invite/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 410) {
          setErrorKind("revoked");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setErrorKind("not_found");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as InviteMetadata;
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
          <span>SyndicSahl</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.header.lightMode : t.header.darkMode}
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

      <main className="mx-auto w-full max-w-md py-8">
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          {loading ? (
            <p className="py-6 text-center text-xs text-zinc-400">
              {t.common.loading}
            </p>
          ) : errorKind !== "none" || !meta ? (
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h1 className="mt-4 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                {errorKind === "revoked"
                  ? isAr
                    ? "تم إلغاء هذه الدعوة"
                    : "Invitation révoquée"
                  : isAr
                  ? "رابط الدعوة غير صالح"
                  : "Invitation introuvable"}
              </h1>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {isAr
                  ? "اطلب من السانديك أو مساعده إرسال دعوة جديدة."
                  : "Demandez au syndic ou à son adjoint un nouveau lien d'invitation."}
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
              >
                {t.portal.backHome}
              </Link>
            </div>
          ) : (
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <Building2 className="h-4 w-4" />
              </div>
              <h1 className="mt-4 text-center text-base font-semibold text-zinc-950 dark:text-zinc-100">
                {meta.buildingName}
              </h1>
              {meta.city && (
                <p className="mt-0.5 text-center text-xs text-zinc-400">
                  {meta.city}
                </p>
              )}

              <div className="mt-4 space-y-2 rounded-lg border border-zinc-200/80 bg-zinc-50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {t.settings.inviteRoleLabel}
                  </span>
                  <span className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
                    {t.header.roleBadge[meta.role]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {isAr ? "البريد المدعو" : "Compte invité"}
                  </span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {meta.maskedEmail}
                  </span>
                </div>
              </div>

              {authEnabled ? (
                <ClerkInviteAcceptor token={token} meta={meta} />
              ) : (
                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <Lock className="h-3.5 w-3.5" />
                  <span>
                    {isAr
                      ? "تفعيل الحساب متاح على النسخة السحابية."
                      : "Connexion requise sur l'environnement cloud."}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <div />
    </div>
  );
}
