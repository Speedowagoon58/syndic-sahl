"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { APP_NAME, APP_NAME_AR } from "@/lib/config";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale } = useApp();
  const cloudConfigured = isSupabaseConfigured();

  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAr = locale === "ar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      router.push("/");
      return;
    }

    setLoading(true);
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/`
                : undefined,
          },
        });
        if (error) throw error;
        setStatusMsg(
          isAr
            ? "تم إرسال رابط الدخول إلى بريدك الإلكتروني."
            : "Un lien de connexion a été envoyé à votre adresse e-mail."
        );
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setStatusMsg(
          isAr
            ? "تم إنشاء الحساب بنجاح! يمكنك الدخول الآن."
            : "Compte créé avec succès. Redirection vers votre espace..."
        );
        router.push("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isAr
          ? "حدث خطأ أثناء تسجيل الدخول."
          : "Erreur lors de l'authentification."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950">
      {/* Top Bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-3">
        <Link
          href="/landing"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{isAr ? "صفحة التقديم" : "Présentation"}</span>
        </Link>

        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setLocale("fr")}
            className={`rounded-xs px-2.5 py-0.5 ${
              locale === "fr" ? "bg-zinc-900 text-white" : "text-zinc-500"
            }`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLocale("ar")}
            className={`rounded-xs px-2.5 py-0.5 ${
              locale === "ar" ? "bg-zinc-900 text-white" : "text-zinc-500"
            }`}
          >
            العربية
          </button>
        </div>
      </header>

      {/* Main Auth Card */}
      <main className="mx-auto w-full max-w-sm py-8">
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
              S
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-950">
                {isAr ? APP_NAME_AR : APP_NAME}
              </h1>
              <p className="text-xs text-zinc-400">
                {isAr ? "فضاء السانديك المسير" : "Espace Syndic & Gestionnaire"}
              </p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="mt-5 grid grid-cols-3 rounded-lg border border-zinc-200/80 bg-zinc-100/80 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-md py-1.5 ${
                mode === "signin"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-500"
              }`}
            >
              {isAr ? "دخول" : "Connexion"}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-md py-1.5 ${
                mode === "signup"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-500"
              }`}
            >
              {isAr ? "حساب جديد" : "Créer compte"}
            </button>
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={`rounded-md py-1.5 ${
                mode === "magic"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-500"
              }`}
            >
              {isAr ? "رابط سريع" : "Lien e-mail"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                {isAr ? "البريد الإلكتروني" : "Adresse e-mail"}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="syndic@residence.ma"
                  className="w-full rounded-lg border border-zinc-200 ps-8 pe-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                />
              </div>
            </div>

            {mode !== "magic" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  {isAr ? "كلمة المرور" : "Mot de passe"}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-200 ps-8 pe-3 py-2 text-xs focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorMsg}
              </p>
            )}

            {statusMsg && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {statusMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading
                ? "..."
                : mode === "signup"
                ? isAr
                  ? "إنشاء حساب السانديك"
                  : "Créer mon espace syndic"
                : mode === "magic"
                ? isAr
                  ? "إرسال رابط الدخول"
                  : "Recevoir le lien par e-mail"
                : isAr
                ? "تسجيل الدخول"
                : "Se connecter"}
            </button>
          </form>

          <div className="mt-5 border-t border-zinc-100 pt-4">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <span>
                {isAr
                  ? "الدخول المباشر للنسخة التجريبية (بدون حساب)"
                  : "Accéder directement au tableau de bord (Mode Démo)"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            {!cloudConfigured && (
              <p className="mt-2.5 text-center text-[11px] text-zinc-400">
                {isAr
                  ? "وضع التخزين المحلي مفعل حالياً. أضف مفاتيح Supabase في .env.local لتفعيل السحابة."
                  : "Mode local actif (0 MAD). Ajoutez NEXT_PUBLIC_SUPABASE_URL dans .env.local pour activer Supabase Cloud."}
              </p>
            )}
          </div>
        </div>
      </main>

      <footer className="py-3 text-center text-[11px] text-zinc-400">
        {APP_NAME} • Maroc
      </footer>
    </div>
  );
}
