"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  LayoutGrid,
  MessageCircle,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  computeApartmentArrears,
  computeBuildingSummary,
  formatMAD,
  formatMonthLabel,
  getBillingCycleMonths,
  normalizeBillingCycle,
  shiftMonthKey,
} from "@/lib/calculations";
import { exportPaymentsCsv } from "@/lib/export-csv";
import {
  buildReceiptMessage,
  buildReminderMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import type { Apartment, Payment, PaymentMethod, WhatsAppLang } from "@/lib/types";

export function PaymentsTab() {
  const router = useRouter();
  const {
    t,
    locale,
    whatsappLang,
    setWhatsappLang,
    activeBuilding,
    buildingApartments,
    buildingPayments,
    buildingExpenses,
    selectedMonthKey,
    setSelectedMonthKey,
    recordPayment,
    recordPaymentsBatch,
    cancelPayment,
  } = useApp();

  const [viewMode, setViewMode] = useState<"monthly" | "matrix">("monthly");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");

  // Modal state for single or multi-month payment
  const [modalInfo, setModalInfo] = useState<{
    apt: Apartment;
    targetMonthKey: string;
    unpaidMonths: string[];
  } | null>(null);
  const [payAmount, setPayAmount] = useState<number>(250);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payNote, setPayNote] = useState("");
  const [selectedMonthsCount, setSelectedMonthsCount] = useState<number>(1);
  const [clearAllArrears, setClearAllArrears] = useState<boolean>(false);

  const selectedYear = selectedMonthKey.slice(0, 4);
  const yearMonthKeys = useMemo(
    () =>
      Array.from({ length: 12 }, (_, idx) => {
        const m = String(idx + 1).padStart(2, "0");
        return `${selectedYear}-${m}`;
      }),
    [selectedYear]
  );

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

  const activeApartments = useMemo(
    () => buildingApartments.filter((a) => a.active),
    [buildingApartments]
  );

  const paymentLookup = useMemo(() => {
    const map = new Map<string, Payment>();
    for (const p of buildingPayments) {
      map.set(`${p.apartmentId}:${p.monthKey}`, p);
    }
    return map;
  }, [buildingPayments]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeApartments
      .map((apt) => {
        const payment =
          paymentLookup.get(`${apt.id}:${selectedMonthKey}`) ?? null;
        const arrears = computeApartmentArrears(
          apt,
          buildingPayments,
          selectedMonthKey,
          activeBuilding.startMonth
        );
        return { apt, payment, arrears };
      })
      .filter(({ apt, payment }) => {
        if (viewMode === "monthly") {
          if (filter === "paid" && !payment) return false;
          if (filter === "unpaid" && payment) return false;
        }
        if (!q) return true;
        return (
          apt.unitLabel.toLowerCase().includes(q) ||
          apt.residentName.toLowerCase().includes(q) ||
          apt.phone.toLowerCase().includes(q)
        );
      });
  }, [
    activeApartments,
    paymentLookup,
    buildingPayments,
    selectedMonthKey,
    activeBuilding.startMonth,
    filter,
    search,
    viewMode,
  ]);

  const collectionPct =
    summary.monthExpected > 0
      ? Math.min(
          100,
          Math.round((summary.monthCollected / summary.monthExpected) * 100)
        )
      : 0;

  const openMarkPaidModal = (
    apt: Apartment,
    targetMonthKey: string,
    unpaidMonths: string[]
  ) => {
    setModalInfo({ apt, targetMonthKey, unpaidMonths });
    setPayAmount(apt.monthlyFee);
    setPayMethod("cash");
    setPayNote("");
    setSelectedMonthsCount(getBillingCycleMonths(apt.billingCycle));
    setClearAllArrears(false);
  };

  const monthsToSettle = useMemo(() => {
    if (!modalInfo) return [];
    if (clearAllArrears && modalInfo.unpaidMonths.length > 0) {
      return modalInfo.unpaidMonths;
    }
    return Array.from({ length: selectedMonthsCount }, (_, i) =>
      shiftMonthKey(modalInfo.targetMonthKey, i)
    );
  }, [modalInfo, clearAllArrears, selectedMonthsCount]);

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalInfo) return;
    if (monthsToSettle.length === 1) {
      recordPayment({
        apartmentId: modalInfo.apt.id,
        monthKey: monthsToSettle[0],
        amount: payAmount,
        method: payMethod,
        note: payNote,
      });
    } else {
      const trimmedNote = payNote.trim();
      const firstLabel = formatMonthLabel(monthsToSettle[0], locale);
      const lastLabel = formatMonthLabel(
        monthsToSettle[monthsToSettle.length - 1],
        locale
      );
      const batchTotal = formatMAD(payAmount * monthsToSettle.length, locale);
      const periodLabel =
        monthsToSettle.length === 3
          ? t.payments.cycleShort.quarterly
          : monthsToSettle.length === 12
          ? t.payments.cycleShort.annual
          : monthsToSettle.length === 6
          ? locale === "ar"
            ? "نصف سنوي"
            : "Semestriel"
          : `${monthsToSettle.length} ${t.payments.monthsLabel}`;
      const effectiveNote =
        trimmedNote ||
        `${periodLabel} (${monthsToSettle.length} ${t.payments.monthsLabel} : ${firstLabel} → ${lastLabel} — ${batchTotal})`;

      recordPaymentsBatch({
        apartmentId: modalInfo.apt.id,
        monthKeys: monthsToSettle,
        amountPerMonth: payAmount,
        method: payMethod,
        note: effectiveNote,
      });
    }
    setModalInfo(null);
  };

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const portalUrl = `${origin}/r/${activeBuilding.shareSlug}`;

  return (
    <div className="space-y-6">
      {/* Page Title, View Switcher & Month Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            {t.payments.title}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <bdi className="font-medium">{activeBuilding.name}</bdi>
            <span>•</span>
            <span className="tabular-nums">
              {summary.totalActiveUnits} {t.header.lotActivePlural}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              exportPaymentsCsv(
                activeBuilding,
                buildingApartments,
                buildingPayments,
                locale
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            <span className="hidden sm:inline">{t.payments.exportCsv}</span>
          </button>

          {/* Monthly vs 12-Month Matrix View Switcher */}
          <div className="inline-flex rounded-lg border border-zinc-200/90 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "monthly"
                  ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{t.payments.viewMonthly}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "matrix"
                  ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{t.payments.viewMatrix}</span>
            </button>
          </div>

          {/* Month / Year Navigator */}
          <div className="inline-flex items-center rounded-lg border border-zinc-200/90 bg-white p-0.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() =>
                setSelectedMonthKey(
                  shiftMonthKey(selectedMonthKey, viewMode === "matrix" ? -12 : -1)
                )
              }
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-28 px-3 text-center text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {viewMode === "matrix"
                ? selectedYear
                : formatMonthLabel(selectedMonthKey, locale)}
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedMonthKey(
                  shiftMonthKey(selectedMonthKey, viewMode === "matrix" ? 12 : 1)
                )
              }
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Unified Financial Metrics Ledger Strip */}
      <div className="grid grid-cols-1 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#111113] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <div className="p-5">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
            {t.kpi.treasuryBalance}
          </span>
          <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            {formatMAD(summary.currentBalance, locale)}
          </p>
          <p className="mt-1.5 tabular-nums text-xs text-zinc-400 dark:text-zinc-500">
            {t.kpi.openingShort} : {formatMAD(summary.openingBalance, locale)}
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
              {t.kpi.collectedMonth}
            </span>
            <span className="tabular-nums text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {collectionPct}%
            </span>
          </div>
          <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            {formatMAD(summary.monthCollected, locale)}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <span className="tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
              {summary.paidCount}/{summary.totalActiveUnits}
            </span>
          </div>
        </div>

        <div className="p-5">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
            {t.kpi.expensesMonth}
          </span>
          <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            {formatMAD(summary.monthExpensesTotal, locale)}
          </p>
          <p className="mt-1.5 tabular-nums text-xs text-zinc-400 dark:text-zinc-500">
            {t.expenses.totalAllTime} :{" "}
            {formatMAD(summary.totalExpensesAllTime, locale)}
          </p>
        </div>

        <div className="p-5">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
            {t.kpi.cumulativeArrears}
          </span>
          <p
            className={`mt-2 tabular-nums text-2xl font-semibold tracking-tight ${
              summary.totalArrears > 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-950 dark:text-zinc-100"
            }`}
          >
            {formatMAD(summary.totalArrears, locale)}
          </p>
          <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            {t.kpi.arrearsHint}
          </p>
        </div>
      </div>

      {/* Main Ledger Container */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          {viewMode === "monthly" ? (
            <div className="inline-flex items-center rounded-lg border border-zinc-200/80 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              {(
                [
                  {
                    id: "all",
                    label: t.payments.filterAll,
                    count: activeApartments.length,
                  },
                  {
                    id: "paid",
                    label: t.payments.filterPaid,
                    count: summary.paidCount,
                  },
                  {
                    id: "unpaid",
                    label: t.payments.filterUnpaid,
                    count: summary.totalActiveUnits - summary.paidCount,
                  },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filter === f.id
                      ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`tabular-nums rounded-xs px-1 text-[10px] ${
                      filter === f.id
                        ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.payments.matrixHint}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-52 sm:w-64">
              <Search className="pointer-events-none absolute start-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.payments.searchPlaceholder}
                className="w-full rounded-lg border border-zinc-200/90 bg-white ps-8 pe-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
              />
            </div>

            <div className="inline-flex items-center rounded-lg border border-zinc-200/80 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-950">
              <span className="px-2 text-[11px] font-medium text-zinc-400 hidden sm:inline">
                WA:
              </span>
              {(
                [
                  { id: "darija", label: t.payments.waDarija },
                  { id: "fr", label: "FR" },
                  { id: "ar", label: "ع" },
                ] as { id: WhatsAppLang; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWhatsappLang(opt.id)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    whatsappLang === opt.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content: Monthly Table OR Annual 12-Month Matrix */}
        {rows.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            {t.payments.noResults}
          </div>
        ) : viewMode === "matrix" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/40 text-[11px] font-medium uppercase tracking-[0.04em] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-500">
                  <th className="py-2.5 ps-4 pe-3 text-start sticky start-0 bg-zinc-50 dark:bg-zinc-900">
                    {t.report.unitCol}
                  </th>
                  {t.monthsShort.map((label, idx) => (
                    <th key={label} className="px-1.5 py-2.5 text-center">
                      <span
                        className={
                          yearMonthKeys[idx] === selectedMonthKey
                            ? "text-zinc-950 font-bold underline dark:text-zinc-100"
                            : ""
                        }
                      >
                        {label}
                      </span>
                    </th>
                  ))}
                  <th className="py-2.5 ps-3 pe-4 text-end">
                    {t.report.amountOwedCol}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800/80">
                {rows.map(({ apt, arrears }) => (
                  <tr
                    key={apt.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                  >
                    <td className="py-2.5 ps-4 pe-3 whitespace-nowrap sticky start-0 bg-white dark:bg-[#111113]">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {apt.unitLabel}
                      </div>
                      <div className="max-w-32 truncate text-[11px] text-zinc-400">
                        {apt.residentName || "—"}
                      </div>
                    </td>

                    {yearMonthKeys.map((mk) => {
                      const cellPayment = paymentLookup.get(`${apt.id}:${mk}`);
                      const isBeforeStart = mk < activeBuilding.startMonth;
                      return (
                        <td key={mk} className="px-1 py-2 text-center">
                          {cellPayment ? (
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/receipt/${cellPayment.id}`)
                              }
                              title={`${formatMonthLabel(mk, locale)} — ${cellPayment.receiptNumber}`}
                              className="mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-400"
                            >
                              <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openMarkPaidModal(apt, mk, arrears.unpaidMonths)
                              }
                              title={formatMonthLabel(mk, locale)}
                              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md border text-[11px] transition-colors ${
                                isBeforeStart
                                  ? "border-transparent text-zinc-300 hover:border-zinc-300 dark:text-zinc-700"
                                  : "border-zinc-200/80 bg-zinc-50 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
                              }`}
                            >
                              —
                            </button>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2.5 ps-3 pe-4 text-end tabular-nums whitespace-nowrap font-semibold">
                      {arrears.totalOwed > 0 ? (
                        <span className="text-red-600 dark:text-red-400">
                          {formatMAD(arrears.totalOwed, locale)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          0
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/40 text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-500">
                  <th className="py-2.5 ps-4 pe-3 text-start">
                    {t.report.unitCol}
                  </th>
                  <th className="px-3 py-2.5 text-start">
                    {t.report.residentCol}
                  </th>
                  <th className="px-3 py-2.5 text-end">{t.payments.colFee}</th>
                  <th className="px-3 py-2.5 text-start">{t.payments.colStatus}</th>
                  <th className="py-2.5 ps-3 pe-4 text-end">{t.payments.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800/80">
                {rows.map(({ apt, payment, arrears }) => {
                  const isPaid = Boolean(payment);
                  const receiptUrl = payment
                    ? `${origin}/receipt/${payment.id}`
                    : "";

                  const waMessage = payment
                    ? buildReceiptMessage({
                        lang: whatsappLang,
                        buildingName: activeBuilding.name,
                        unitLabel: apt.unitLabel,
                        residentName: apt.residentName,
                        monthKey: selectedMonthKey,
                        amount: payment.amount,
                        receiptNumber: payment.receiptNumber,
                        receiptUrl,
                      })
                    : buildReminderMessage({
                        lang: whatsappLang,
                        buildingName: activeBuilding.name,
                        unitLabel: apt.unitLabel,
                        residentName: apt.residentName,
                        unpaidMonths:
                          arrears.unpaidMonths.length > 0
                            ? arrears.unpaidMonths
                            : [selectedMonthKey],
                        totalOwed:
                          arrears.totalOwed > 0
                            ? arrears.totalOwed
                            : apt.monthlyFee,
                        rib: activeBuilding.rib,
                        portalUrl,
                        billingCycle: apt.billingCycle,
                        monthlyFee: apt.monthlyFee,
                      });

                  const waUrl = buildWhatsAppUrl(apt.phone, waMessage);
                  const cycle = normalizeBillingCycle(apt.billingCycle);
                  const cycleMonths = getBillingCycleMonths(cycle);

                  return (
                    <tr
                      key={apt.id}
                      className="group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                    >
                      <td className="py-3 ps-4 pe-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                          {apt.unitLabel}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {apt.residentName || "—"}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                          {apt.phone || t.payments.noPhone}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-end tabular-nums whitespace-nowrap font-medium text-zinc-700 dark:text-zinc-300">
                        <div>{formatMAD(apt.monthlyFee, locale)}</div>
                        {cycle !== "monthly" && (
                          <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            <span>{t.payments.cycleShort[cycle]}</span>
                            <span>•</span>
                            <span>{formatMAD(apt.monthlyFee * cycleMonths, locale)}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {isPaid ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                              <span>{t.payments.statusPaid}</span>
                              {payment && (
                                <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                                  • {payment.receiptNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              <span>{t.payments.statusLate}</span>
                            </div>
                          )}

                          {arrears.unpaidMonths.length > 0 && (
                            <span className="tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                              {arrears.unpaidMonths.length}{" "}
                              {arrears.unpaidMonths.length === 1
                                ? t.payments.monthLateSingular
                                : t.payments.monthsLate}{" "}
                              ({formatMAD(arrears.totalOwed, locale)})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 ps-3 pe-4 text-end whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {payment ? (
                            <>
                              <Link
                                href={`/receipt/${payment.id}`}
                                title={t.payments.viewReceipt}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                                <span>{t.payments.viewReceipt}</span>
                              </Link>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={t.payments.sendReceiptWa}
                                aria-label={t.payments.sendReceiptWa}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="hidden xl:inline">
                                  {t.payments.sendReceiptWa}
                                </span>
                              </a>
                              <button
                                type="button"
                                onClick={() => cancelPayment(payment.id)}
                                title={t.payments.cancelPayment}
                                aria-label={t.payments.cancelPayment}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openMarkPaidModal(
                                    apt,
                                    selectedMonthKey,
                                    arrears.unpaidMonths
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors"
                              >
                                <span>{t.payments.markPaid}</span>
                              </button>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={t.payments.remindWa}
                                aria-label={t.payments.remindWa}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                                <span className="hidden xl:inline">
                                  {t.payments.remindWa}
                                </span>
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Multi-Month / Clear Arrears Payment Modal */}
      {modalInfo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
          onClick={() => setModalInfo(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <div>
                <h3
                  id="payment-modal-title"
                  className="text-sm font-semibold text-zinc-950 dark:text-zinc-100"
                >
                  {t.payments.modalTitle}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {modalInfo.apt.unitLabel} — {modalInfo.apt.residentName || "—"} (
                  {formatMonthLabel(modalInfo.targetMonthKey, locale)})
                </p>
              </div>
              <button
                type="button"
                aria-label={t.payments.cancel}
                onClick={() => setModalInfo(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 p-5">
              {/* Multi-month & Clear All Arrears Picker */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.payments.monthsCountLabel}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { cnt: 1, label: `1 ${t.payments.monthsLabel}` },
                    { cnt: 3, label: t.payments.presetTrimestriel },
                    { cnt: 6, label: t.payments.presetSemestriel },
                    { cnt: 12, label: t.payments.presetAnnuel },
                  ].map((preset) => (
                    <button
                      key={preset.cnt}
                      type="button"
                      onClick={() => {
                        setClearAllArrears(false);
                        setSelectedMonthsCount(preset.cnt);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        !clearAllArrears && selectedMonthsCount === preset.cnt
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  {modalInfo.unpaidMonths.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setClearAllArrears(true)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        clearAllArrears
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {t.payments.payAllArrears} ({modalInfo.unpaidMonths.length})
                    </button>
                  )}
                </div>

                {monthsToSettle.length > 1 && (
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {monthsToSettle
                      .map((mk) => formatMonthLabel(mk, locale))
                      .join(" • ")}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.payments.amountLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 tabular-nums text-sm font-semibold text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.payments.methodLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "virement", "cheque"] as PaymentMethod[]).map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayMethod(m)}
                        className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                          payMethod === m
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {t.payments.methods[m]}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.payments.noteLabel}
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder={t.payments.notePlaceholder}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-zinc-50 px-3.5 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">
                  {t.payments.totalLabel} ({monthsToSettle.length}{" "}
                  {t.payments.monthsLabel})
                </span>
                <span className="tabular-nums text-sm font-bold text-zinc-950 dark:text-zinc-100">
                  {formatMAD(payAmount * monthsToSettle.length, locale)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalInfo(null)}
                  className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.payments.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {t.payments.confirmPayment}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
