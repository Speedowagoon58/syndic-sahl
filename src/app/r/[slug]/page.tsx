"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { APP_NAME, APP_NAME_AR } from "@/lib/config";
import {
  computeApartmentArrears,
  computeBuildingSummary,
  formatDateShort,
  formatMAD,
  formatMonthLabel,
  getCurrentMonthKey,
  shiftMonthKey,
} from "@/lib/calculations";
import { ReceiptLightbox } from "@/components/ReceiptLightbox";

export default function PublicResidentPortalPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const { hydrated, data, locale, setLocale, t } = useApp();

  const [monthKey, setMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [pinInput, setPinInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [lightbox, setLightbox] = useState<{
    url: string;
    caption: string;
  } | null>(null);

  const building = useMemo(
    () => data.buildings.find((b) => b.shareSlug === slug) ?? null,
    [data.buildings, slug]
  );

  const apartments = useMemo(() => {
    if (!building) return [];
    return data.apartments
      .filter((a) => a.buildingId === building.id && a.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data.apartments, building]);

  const payments = useMemo(() => {
    if (!building) return [];
    return data.payments.filter((p) => p.buildingId === building.id);
  }, [data.payments, building]);

  const expenses = useMemo(() => {
    if (!building) return [];
    return data.expenses
      .filter((e) => e.buildingId === building.id)
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  }, [data.expenses, building]);

  const summary = useMemo(() => {
    if (!building) return null;
    return computeBuildingSummary(
      building,
      apartments,
      payments,
      expenses,
      monthKey
    );
  }, [building, apartments, payments, expenses, monthKey]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F6F4] text-xs text-zinc-400">
        {t.common.loading}
      </div>
    );
  }

  if (!building || !summary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F6F4] p-6 text-center">
        <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-2xs">
          <h1 className="text-base font-semibold text-zinc-950">
            {t.portal.notFoundTitle}
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500">
            {t.portal.notFoundDesc}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
          >
            {t.portal.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const requiresPin = Boolean(building.sharePin.trim());
  if (requiresPin && !unlocked) {
    const handlePinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (pinInput.trim() === building.sharePin.trim()) {
        setUnlocked(true);
        setPinError(false);
      } else {
        setPinError(true);
      }
    };

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F6F4] p-4">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
            <Lock className="h-4 w-4" />
          </div>
          <h1 className="mt-4 text-center text-sm font-semibold text-zinc-950">
            {building.name}
          </h1>
          <p className="mt-1 text-center text-xs text-zinc-500">
            {t.portal.pinDesc}
          </p>

          <form onSubmit={handlePinSubmit} className="mt-5 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder={t.portal.pinPlaceholder}
              className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-center font-mono text-base tracking-widest focus:border-zinc-900 focus:outline-none"
            />
            {pinError && (
              <p className="text-center text-xs font-medium text-red-600">
                {t.portal.pinError}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white hover:bg-zinc-800"
            >
              {t.portal.unlockBtn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const paidSet = new Set(
    payments.filter((p) => p.monthKey === monthKey).map((p) => p.apartmentId)
  );
  const collectionPct =
    summary.monthExpected > 0
      ? Math.min(
          100,
          Math.round((summary.monthCollected / summary.monthExpected) * 100)
        )
      : 0;

  return (
    <div className="min-h-screen bg-[#F6F6F4] pb-12 text-zinc-950">
      {/* Top Bar */}
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-zinc-950">
                  {building.name}
                </h1>
                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                  {t.portal.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{building.city}</p>
            </div>
          </div>

          <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLocale("fr")}
              className={`rounded-xs px-2.5 py-0.5 ${
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
              className={`rounded-xs px-2.5 py-0.5 ${
                locale === "ar"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-500"
              }`}
            >
              العربية
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 pt-6 sm:px-6">
        {/* Unified Financial Strip */}
        <div className="grid grid-cols-1 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.kpi.treasuryBalance}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
              {formatMAD(summary.currentBalance, locale)}
            </p>
            <p className="mt-1 tabular-nums text-xs text-zinc-400">
              {t.kpi.openingShort} : {formatMAD(summary.openingBalance, locale)}
            </p>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
                {t.kpi.collectedMonth}
              </span>
              <span className="tabular-nums text-xs font-semibold text-emerald-700">
                {collectionPct}%
              </span>
            </div>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
              {formatMAD(summary.monthCollected, locale)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${collectionPct}%` }}
                />
              </div>
              <span className="tabular-nums text-[11px] text-zinc-400">
                {summary.paidCount}/{summary.totalActiveUnits}
              </span>
            </div>
          </div>

          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.expenses.totalAllTime}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
              {formatMAD(summary.totalExpensesAllTime, locale)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {expenses.length} {t.report.countUnit}
            </p>
          </div>
        </div>

        {/* Apartments Status Grid */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <h2 className="text-sm font-semibold text-zinc-950">
              {t.payments.title}
            </h2>
            <div className="inline-flex items-center rounded-lg border border-zinc-200/90 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-32 px-2 text-center text-xs font-semibold text-zinc-900">
                {formatMonthLabel(monthKey, locale)}
              </span>
              <button
                type="button"
                onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {apartments.map((apt) => {
              const isPaid = paidSet.has(apt.id);
              const arrears = computeApartmentArrears(
                apt,
                payments,
                monthKey,
                building.startMonth
              );
              return (
                <div
                  key={apt.id}
                  className="rounded-lg border border-zinc-200/80 bg-zinc-50/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900">
                      {apt.unitLabel}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isPaid ? "bg-emerald-600" : "bg-red-500"
                      }`}
                    />
                  </div>
                  {building.showNamesPublicly && apt.residentName && (
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {apt.residentName}
                    </p>
                  )}
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      isPaid ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {isPaid
                      ? t.payments.statusPaid
                      : arrears.unpaidMonths.length > 0
                      ? `${arrears.unpaidMonths.length} ${t.payments.monthsLate}`
                      : t.payments.statusLate}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
            {t.portal.privacyNote}
          </p>
        </div>

        {/* Expenses & Receipt Photos Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-950">
              {t.portal.expensesFeed}
            </h2>
            <p className="text-xs text-zinc-400">{t.portal.tapPhoto}</p>
          </div>

          {expenses.length === 0 ? (
            <p className="p-8 text-center text-xs text-zinc-400">
              {t.expenses.noExpenses}
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-zinc-50/70"
                >
                  <div className="flex items-center gap-3">
                    {exp.receiptPhotoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightbox({
                            url: exp.receiptPhotoUrl!,
                            caption: exp.description,
                          })
                        }
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                      >
                        <Image
                          src={exp.receiptPhotoUrl}
                          alt={exp.description}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                        <Receipt className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {exp.description}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                        <span>{t.expenses.categories[exp.category]}</span>
                        <span>•</span>
                        <span className="tabular-nums">
                          {formatDateShort(exp.expenseDate, locale)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="tabular-nums text-sm font-semibold text-zinc-900">
                      -{formatMAD(exp.amount, locale)}
                    </span>
                    {exp.receiptPhotoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightbox({
                            url: exp.receiptPhotoUrl!,
                            caption: exp.description,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        <Eye className="h-3 w-3 text-zinc-400" />
                        <span>{t.expenses.viewPhoto}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minimal Footer CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white px-5 py-4 text-xs">
          <span className="text-zinc-500">
            {t.portal.poweredBy}{" "}
            <strong className="font-semibold text-zinc-900">
              {locale === "ar" ? APP_NAME_AR : APP_NAME}
            </strong>
          </span>
          <Link
            href="/"
            className="font-medium text-zinc-900 underline hover:text-zinc-600"
          >
            {t.portal.tryFree} →
          </Link>
        </div>
      </main>

      <ReceiptLightbox
        imageUrl={lightbox?.url ?? null}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
