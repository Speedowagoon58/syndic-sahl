"use client";

import React, { useMemo, useState } from "react";
import { FileCheck2, MessageCircle, Printer } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  computeAllTimeCategoryTotals,
  computeApartmentArrears,
  computeBuildingSummary,
  formatDateShort,
  formatMAD,
  formatMonthLabel,
} from "@/lib/calculations";
import { buildReportSummaryMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import type { ExpenseCategory } from "@/lib/types";

const CATEGORIES: ExpenseCategory[] = [
  "gardiennage",
  "eau_electricite",
  "ascenseur",
  "nettoyage",
  "reparation",
  "autre",
];

// Official 7-class copropriété chart of accounts codes (Décret n° 2.23.700)
const DECRET_ACCOUNT_CODES: Record<ExpenseCategory, string> = {
  gardiennage: "6171",
  eau_electricite: "6125",
  ascenseur: "6133",
  nettoyage: "6136",
  reparation: "6131",
  autre: "6180",
};

export function ReportTab() {
  const {
    t,
    locale,
    whatsappLang,
    activeBuilding,
    buildingApartments,
    buildingPayments,
    buildingExpenses,
    selectedMonthKey,
  } = useApp();

  const [mode, setMode] = useState<"decret" | "all" | "month">("decret");

  const summary = useMemo(
    () =>
      computeBuildingSummary(
        activeBuilding,
        buildingApartments,
        buildingPayments,
        buildingExpenses,
        selectedMonthKey
      ),
    [
      activeBuilding,
      buildingApartments,
      buildingPayments,
      buildingExpenses,
      selectedMonthKey,
    ]
  );

  const allTimeCategories = useMemo(
    () => computeAllTimeCategoryTotals(buildingExpenses, activeBuilding.id),
    [buildingExpenses, activeBuilding.id]
  );

  const totalCollected =
    mode === "month" ? summary.monthCollected : summary.totalCollectedAllTime;
  const totalExpenses =
    mode === "month"
      ? summary.monthExpensesTotal
      : summary.totalExpensesAllTime;

  const arrearsRows = useMemo(() => {
    return buildingApartments
      .filter((a) => a.active)
      .map((apt) => {
        const arr = computeApartmentArrears(
          apt,
          buildingPayments,
          selectedMonthKey,
          activeBuilding.startMonth
        );
        return { apt, ...arr };
      })
      .filter((r) => r.unpaidMonths.length > 0);
  }, [
    buildingApartments,
    buildingPayments,
    selectedMonthKey,
    activeBuilding.startMonth,
  ]);

  const periodLabel =
    mode === "month"
      ? formatMonthLabel(selectedMonthKey, locale)
      : `${formatMonthLabel(activeBuilding.startMonth, locale)} → ${formatMonthLabel(
          selectedMonthKey,
          locale
        )}`;

  const expectedAnnualReceipts = summary.monthExpected * 12;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const portalUrl = `${origin}/r/${activeBuilding.shareSlug}`;

  const waSummaryUrl = buildWhatsAppUrl(
    null,
    buildReportSummaryMessage({
      lang: whatsappLang,
      buildingName: activeBuilding.name,
      periodLabel,
      totalCollected,
      totalExpenses,
      closingBalance: summary.currentBalance,
      portalUrl,
    })
  );

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            {t.report.title}
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {t.report.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-200/90 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setMode("decret")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "decret"
                  ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {t.report.modeDecret}
            </button>
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "all"
                  ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {t.report.modeAll}
            </button>
            <button
              type="button"
              onClick={() => setMode("month")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "month"
                  ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {t.report.modeMonth}
            </button>
          </div>

          <a
            href={waSummaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.report.shareWaBtn}</span>
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{t.report.printBtn}</span>
          </button>
        </div>
      </div>

      {/* Formal Accounting Sheet */}
      <div className="print-sheet rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs sm:p-10">
        {/* Document Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-900 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              {t.report.buildingLabel}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
              {activeBuilding.name}
            </h2>
            <p className="text-xs text-zinc-500">{activeBuilding.city}</p>
            {mode === "decret" && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-700" />
                <span>{t.report.decretBadge}</span>
              </div>
            )}
          </div>

          <div className="text-end text-xs text-zinc-500 space-y-0.5">
            <p className="font-semibold uppercase tracking-wider text-zinc-900">
              {mode === "decret" ? t.report.modeDecret : t.report.title}
            </p>
            <p>
              <span className="text-zinc-400">{t.report.periodLabel} :</span>{" "}
              <span className="font-medium text-zinc-800">{periodLabel}</span>
            </p>
            <p>
              <span className="text-zinc-400">{t.report.generatedOn} :</span>{" "}
              <span className="tabular-nums font-medium text-zinc-800">
                {formatDateShort(new Date().toISOString(), locale)}
              </span>
            </p>
          </div>
        </div>

        {/* 4-Column Financial Balance Strip */}
        <div className="mt-6 grid grid-cols-2 divide-y divide-zinc-200/80 rounded-lg border border-zinc-200/90 sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          <div className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400">
              {t.report.openingBalance}
            </span>
            <p className="mt-1.5 tabular-nums text-base font-semibold text-zinc-900">
              {formatMAD(summary.openingBalance, locale)}
            </p>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400">
              {t.report.totalCollected}
            </span>
            <p className="mt-1.5 tabular-nums text-base font-semibold text-emerald-700">
              +{formatMAD(totalCollected, locale)}
            </p>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400">
              {t.report.totalExpenses}
            </span>
            <p className="mt-1.5 tabular-nums text-base font-semibold text-zinc-900">
              -{formatMAD(totalExpenses, locale)}
            </p>
          </div>

          <div className="bg-zinc-50/70 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
              {t.report.closingBalance}
            </span>
            <p className="mt-1.5 tabular-nums text-lg font-bold text-zinc-950">
              {formatMAD(summary.currentBalance, locale)}
            </p>
          </div>
        </div>

        {/* Expenses Breakdown Table (with Décret 2.23.700 4-digit codes) */}
        <div className="mt-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
            {t.report.expensesBreakdown}
          </h3>
          <div className="overflow-hidden rounded-lg border border-zinc-200/90">
            <table className="w-full text-start text-xs">
              {mode === "decret" && (
                <thead className="border-b border-zinc-200/80 bg-zinc-50/60 text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400">
                  <tr>
                    <th className="py-2 ps-4 pe-2 text-start w-20">
                      {t.report.codeCol}
                    </th>
                    <th className="px-3 py-2 text-start">{t.report.postCol}</th>
                    <th className="px-3 py-2 text-end">%</th>
                    <th className="py-2 ps-3 pe-4 text-end">{t.report.colAmount}</th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-zinc-100">
                {mode === "decret" && (
                  <tr className="bg-emerald-50/30">
                    <td className="py-2.5 ps-4 pe-2 font-mono text-xs font-semibold text-emerald-800">
                      7111
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-900">
                      {t.report.totalCollected}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums text-zinc-400">
                      100%
                    </td>
                    <td className="py-2.5 ps-3 pe-4 text-end tabular-nums font-semibold text-emerald-700">
                      +{formatMAD(totalCollected, locale)}
                    </td>
                  </tr>
                )}
                {CATEGORIES.map((cat) => {
                  const amount =
                    mode === "month"
                      ? summary.expensesByCategory[cat]
                      : allTimeCategories[cat].total;
                  const pct =
                    totalExpenses > 0
                      ? Math.round((amount / totalExpenses) * 100)
                      : 0;
                  return (
                    <tr key={cat}>
                      {mode === "decret" && (
                        <td className="py-2.5 ps-4 pe-2 font-mono text-xs text-zinc-500">
                          {DECRET_ACCOUNT_CODES[cat]}
                        </td>
                      )}
                      <td className="py-2.5 ps-4 pe-3 font-medium text-zinc-800 w-1/3">
                        {t.expenses.categories[cat]}
                      </td>
                      {mode !== "decret" && (
                        <td className="px-3 py-2.5 w-1/3">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-zinc-800"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-end tabular-nums text-zinc-400">
                        {pct}%
                      </td>
                      <td className="py-2.5 ps-3 pe-4 text-end tabular-nums font-semibold text-zinc-900">
                        {formatMAD(amount, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Arrears Table (Annexe des créances copropriétaires) */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
              {t.report.unpaidSummaryTitle}
            </h3>
            <span className="tabular-nums text-xs font-semibold text-red-600">
              {formatMAD(summary.totalArrears, locale)}
            </span>
          </div>

          {arrearsRows.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs font-medium text-zinc-700">
              {t.report.allPaidMessage}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200/90">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-zinc-200/80 bg-zinc-50/60 text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400">
                  <tr>
                    <th className="px-3.5 py-2.5 text-start">
                      {t.report.unitCol}
                    </th>
                    <th className="px-3.5 py-2.5 text-start">
                      {t.report.residentCol}
                    </th>
                    <th className="px-3.5 py-2.5 text-start">
                      {t.report.lateMonthsCol}
                    </th>
                    <th className="px-3.5 py-2.5 text-end">
                      {t.report.amountOwedCol}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {arrearsRows.map(({ apt, unpaidMonths, totalOwed }) => (
                    <tr key={apt.id}>
                      <td className="px-3.5 py-2.5 font-semibold text-zinc-900">
                        {apt.unitLabel}
                      </td>
                      <td className="px-3.5 py-2.5 text-zinc-700">
                        {apt.residentName || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-zinc-500">
                        {unpaidMonths
                          .map((m) => formatMonthLabel(m, locale))
                          .join(", ")}
                      </td>
                      <td className="px-3.5 py-2.5 text-end tabular-nums font-semibold text-red-600">
                        {formatMAD(totalOwed, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Budget Prévisionnel N+1 (Mandatory under Loi 18-00 & Décret 2.23.700) */}
        {mode === "decret" && (
          <div className="mt-8">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
              {t.report.budgetNextYearTitle}
            </h3>
            <div className="grid grid-cols-1 divide-y divide-zinc-200/80 rounded-lg border border-zinc-200/90 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              <div className="p-4">
                <span className="text-xs text-zinc-500">
                  {t.report.expectedAnnualReceipts}
                </span>
                <p className="mt-1 tabular-nums text-base font-semibold text-zinc-950">
                  {formatMAD(expectedAnnualReceipts, locale)}
                </p>
              </div>
              <div className="p-4">
                <span className="text-xs text-zinc-500">
                  {t.report.estimatedAnnualCharges}
                </span>
                <p className="mt-1 tabular-nums text-base font-semibold text-zinc-950">
                  {formatMAD(
                    Math.round(expectedAnnualReceipts * 0.9),
                    locale
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signatures block for AG */}
        <div className="mt-10 grid grid-cols-2 gap-6 border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          <div className="h-24 rounded-lg border border-dashed border-zinc-300 p-3">
            <p className="font-medium text-zinc-700">
              {t.report.syndicSignature}
            </p>
          </div>
          <div className="h-24 rounded-lg border border-dashed border-zinc-300 p-3">
            <p className="font-medium text-zinc-700">
              {t.report.councilSignature}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
