"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Link2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { APP_NAME, APP_NAME_AR, PLANS } from "@/lib/config";

export default function LandingPage() {
  const { locale, setLocale } = useApp();
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-[#F6F6F4] text-zinc-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
              S
            </div>
            <span className="text-sm font-semibold tracking-tight">
              {isAr ? APP_NAME_AR : APP_NAME}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLocale("fr")}
                className={`rounded-xs px-2 py-0.5 ${
                  locale === "fr"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-500"
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLocale("ar")}
                className={`rounded-xs px-2 py-0.5 ${
                  locale === "ar"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-500"
                }`}
              >
                العربية
              </button>
            </div>

            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {isAr ? "دخول" : "Connexion"}
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              <span>{isAr ? "فتح التطبيق" : "Ouvrir l'application"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:px-6 sm:pt-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            <span>
              {isAr
                ? "مصمم خصيصاً لإقامات وعمارات المغرب (القانون 18-00)"
                : "Conçu pour les copropriétés au Maroc (Loi 18-00 / 106-12)"}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl sm:leading-[1.12]">
            {isAr
              ? "تسيير السانديك بكل شفافية، بلا خلافات في مجموعات واتساب."
              : "La gestion de syndic claire, sans conflits dans le groupe WhatsApp."}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            {isAr
              ? "سجل الأداءات الشهرية، أرسل وصولات PDF وتذكيرات ودية بالدارجة أو الفرنسية عبر واتساب، وشارك رابطاً واحداً مع الجيران للاطلاع على رصيد الصندوق وصور الفواتير بدون تحميل أي تطبيق."
              : "Enregistrez les cotisations, envoyez des quittances PDF et rappels courtois en Darija ou Français sur WhatsApp, et partagez un lien unique où chaque voisin consulte la caisse et les photos des factures sans installer d'application."}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-zinc-800"
            >
              <span>
                {isAr
                  ? "تجربة التطبيق مجاناً (30 يوماً)"
                  : "Démarrer gratuitement (Essai 30 jours)"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/r/residence-atlas"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-4 py-2.5 text-xs font-medium text-zinc-800 shadow-2xs hover:bg-zinc-50"
            >
              <span>
                {isAr
                  ? "معاينة رابط السكان (Résidence Atlas)"
                  : "Voir un exemple de lien résidents"}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>
          </div>
        </div>

        {/* Live Product Preview Strip */}
        <div className="mt-12 grid grid-cols-1 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
              <Link2 className="h-4 w-4 text-zinc-400" />
              <span>
                {isAr
                  ? "1. صفر تطبيق للجيران"
                  : "1. Zéro application à installer"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {isAr
                ? "لا حاجة لحسابات أو كلمات سر. رابط واحد في مجموعة واتساب يعرض الرصيد وصور فواتير الماء والكهرباء والحراسة."
                : "Aucun voisin ne veut télécharger une application pour son immeuble. Un simple lien Web affiche le solde et les photos des factures en direct."}
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span>
                {isAr
                  ? "2. تذكيرات ووصولات واتساب بالدارجة"
                  : "2. WhatsApp en Darija, Français & Arabe"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {isAr
                ? "تخلص من إحراج طلب المساهمة وجهاً لوجه. أرسل تذكيراً مهذباً أو وصل أداء رقمي بضغطة واحدة."
                : "Évitez la gêne (hchouma) de réclamer les cotisations à la porte. Envoyez un rappel courtois ou une quittance PDF en un clic sur WhatsApp."}
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
              <FileText className="h-4 w-4 text-zinc-400" />
              <span>
                {isAr
                  ? "3. تقارير جاهزة للجمع العام"
                  : "3. Bilan prêt pour l'Assemblée Générale"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {isAr
                ? "اطبع التقرير المالي الشهري أو السنوي مع جدول المتأخرات وتوزيع المصاريف في ثانية واحدة."
                : "Imprimez ou exportez en PDF le bilan des encaissements, la répartition des charges et l'état des arriérés par lot."}
            </p>
          </div>
        </div>
      </section>

      {/* Before vs After Comparison */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
              {isAr ? "الطريقة التقليدية" : "Gestion classique"}
            </span>
            <h2 className="mt-1 text-base font-semibold text-zinc-950">
              {isAr
                ? "دفتر ورقي + فوضى واتساب"
                : "Cahier papier & groupe WhatsApp"}
            </h2>
            <ul className="mt-4 space-y-2.5 text-xs text-zinc-500">
              <li>
                •{" "}
                {isAr
                  ? "شكوك مستمرة حول أين تذهب أموال العمارة"
                  : "Suspicions sur l'utilisation de la caisse commune"}
              </li>
              <li>
                •{" "}
                {isAr
                  ? "فواتير ضائعة وصعوبة في تحصيل المتأخرات"
                  : "Factures égarées dans des centaines de messages"}
              </li>
              <li>
                •{" "}
                {isAr
                  ? "إحراج السانديك المتطوع عند مطالبة الجيران بالأداء"
                  : "Usure rapide du syndic bénévole face aux impayés"}
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-900 bg-white p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-700">
              {isAr ? "مع سانديك ساهل" : `Avec ${APP_NAME}`}
            </span>
            <h2 className="mt-1 text-base font-semibold text-zinc-950">
              {isAr
                ? "شفافية كاملة وثقة بين الجيران"
                : "Comptes clairs & confiance immédiate"}
            </h2>
            <ul className="mt-4 space-y-2.5 text-xs text-zinc-700">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>
                  {isAr
                    ? "كل درهم مصروف موثق بصورة الفاتورة"
                    : "Chaque dirham dépensé est justifié par la photo du reçu"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>
                  {isAr
                    ? "وصولات PDF مرقمة فورية لكل ساكن"
                    : "Quittances PDF numérotées envoyées sur WhatsApp"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>
                  {isAr
                    ? "ارتفاع نسبة التحصيل بفضل الشفافية"
                    : "Hausse immédiate du taux de recouvrement des cotisations"}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Transparent Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            {isAr
              ? "تسعيرة واضحة تؤدى من صندوق العمارة"
              : "Tarification simple, prise en charge par la caisse de l'immeuble"}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {isAr
              ? "الأداء عبر تحويل بنكي (RIB) أو CashPlus — بدون بطاقة بنكية."
              : "Règlement par virement bancaire ou CashPlus — aucune carte bancaire requise."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-6">
            <span className="text-xs font-semibold text-zinc-500">
              {isAr ? "عمارات صغيرة" : "Petits immeubles"}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950">
              0 MAD
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isAr ? "حتى 8 شقق مجاناً مدى الحياة" : "Jusqu'à 8 lots gratuit à vie"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white p-6">
            <span className="text-xs font-semibold text-zinc-700">
              {isAr ? PLANS.semi_annual.labelAr : PLANS.semi_annual.labelFr}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950">
              {PLANS.semi_annual.priceMAD} MAD
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isAr ? "شقق غير محدودة لمدة 6 أشهر" : "Lots illimités pendant 6 mois"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-900 bg-white p-6 ring-1 ring-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">
                {isAr ? PLANS.annual.labelAr : PLANS.annual.labelFr}
              </span>
              <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">
                {isAr ? "الأكثر اختياراً" : "Recommandé"}
              </span>
            </div>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950">
              {PLANS.annual.priceMAD} MAD
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-700">
              {isAr
                ? "~5 دراهم فقط للشقة في الشهر (لعمارة من 20 شقة)"
                : "Soit ~5 MAD / appartement / mois (pour 20 lots)"}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t border-zinc-200/80 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-zinc-500 sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
            <span>{APP_NAME} — Maroc</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-zinc-900">
              {isAr ? "التطبيق" : "Tableau de bord"}
            </Link>
            <Link href="/r/residence-atlas" className="hover:text-zinc-900">
              {isAr ? "بوابة السكان" : "Portail résidents"}
            </Link>
            <Link href="/login" className="hover:text-zinc-900">
              {isAr ? "دخول" : "Connexion"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
