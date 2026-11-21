"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
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
  shiftMonthKey,
} from "@/lib/calculations";
import {
  buildReceiptMessage,
  buildReminderMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import type { Apartment, PaymentMethod, WhatsAppLang } from "@/lib/types";

export function PaymentsTab() {
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
    cancelPayment,
  } = useApp();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [modalApartment, setModalApartment] = useState<Apartment | null>(null);
  const [payAmount, setPayAmount] = useState<number>(250);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payNote, setPayNote] = useState("");

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

  const monthPaymentByApt = useMemo(() => {
    const map = new Map<string, (typeof buildingPayments)[number]>();
    for (const p of buildingPayments) {
      if (p.monthKey === selectedMonthKey) {
        map.set(p.apartmentId, p);
      }
    }
    return map;
  }, [buildingPayments, selectedMonthKey]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeApartments
      .map((apt) => {
        const payment = monthPaymentByApt.get(apt.id) ?? null;
        const arrears = computeApartmentArrears(
          apt,
          buildingPayments,
          selectedMonthKey,
          activeBuilding.startMonth
        );
        return { apt, payment, arrears };
      })
      .filter(({ apt, payment }) => {
        if (filter === "paid" && !payment) return false;
        if (filter === "unpaid" && payment) return false;
        if (!q) return true;
        return (
          apt.unitLabel.toLowerCase().includes(q) ||
          apt.residentName.toLowerCase().includes(q) ||
          apt.phone.toLowerCase().includes(q)
        );
      });
  }, [
    activeApartments,
    monthPaymentByApt,
    buildingPayments,
    selectedMonthKey,
    activeBuilding.startMonth,
    filter,
    search,
  ]);

  const collectionPct =
    summary.monthExpected > 0
      ? Math.min(
          100,
          Math.round((summary.monthCollected / summary.monthExpected) * 100)
        )
      : 0;

  const openMarkPaidModal = (apt: Apartment) => {
    setModalApartment(apt);
    setPayAmount(apt.monthlyFee);
    setPayMethod("cash");
    setPayNote("");
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalApartment) return;
    recordPayment({
      apartmentId: modalApartment.id,
      monthKey: selectedMonthKey,
      amount: payAmount,
      method: payMethod,
      note: payNote,
    });
    setModalApartment(null);
  };

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const portalUrl = `${origin}/r/${activeBuilding.shareSlug}`;

  return (
    <div className="space-y-6">
      {/* Page Title & Month Stepper Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            {t.payments.title}
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {activeBuilding.name} • {summary.totalActiveUnits}{" "}
            {locale === "ar" ? "شقة نشطة" : "lots actifs"}
          </p>
        </div>

        {/* Sleek Month Navigator */}
        <div className="inline-flex items-center rounded-lg border border-zinc-200/90 bg-white p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() =>
              setSelectedMonthKey(shiftMonthKey(selectedMonthKey, -1))
            }
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 px-3 text-center text-xs font-semibold text-zinc-900">
            {formatMonthLabel(selectedMonthKey, locale)}
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedMonthKey(shiftMonthKey(selectedMonthKey, 1))
            }
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Unified Financial Metrics Ledger Strip (No floating AI icon boxes) */}
      <div className="grid grid-cols-1 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {/* 1. Net Treasury */}
        <div className="p-5">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
            {t.kpi.treasuryBalance}
          </span>
          <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
            {formatMAD(summary.currentBalance, locale)}
          </p>
          <p className="mt-1.5 tabular-nums text-xs text-zinc-400">
            {t.kpi.openingShort} : {formatMAD(summary.openingBalance, locale)}
          </p>
        </div>

        {/* 2. Monthly Collection */}
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
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <span className="tabular-nums text-[11px] text-zinc-500">
              {summary.paidCount}/{summary.totalActiveUnits}
            </span>
          </div>
        </div>

        {/* 3. Month Expenses */}
        <div className="p-5">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
            {t.kpi.expensesMonth}
          </span>
          <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
            {formatMAD(summary.monthExpensesTotal, locale)}
          </p>
          <p className="mt-1.5 tabular-nums text-xs text-zinc-400">
            {t.expenses.totalAllTime} :{" "}
            {formatMAD(summary.totalExpensesAllTime, locale)}
          </p>
        </div>

        {/* 4. Cumulative Arrears */}
        <div className="p-5">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
            {t.kpi.cumulativeArrears}
          </span>
          <p
            className={`mt-2 tabular-nums text-2xl font-semibold tracking-tight ${
              summary.totalArrears > 0 ? "text-red-600" : "text-zinc-950"
            }`}
          >
            {formatMAD(summary.totalArrears, locale)}
          </p>
          <p className="mt-1.5 text-xs text-zinc-400">{t.kpi.arrearsHint}</p>
        </div>
      </div>

      {/* High-Density Financial Ledger Container */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 bg-zinc-50/50 px-4 py-3">
          {/* Segmented filter tabs */}
          <div className="inline-flex items-center rounded-lg border border-zinc-200/80 bg-zinc-100/80 p-0.5">
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
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`tabular-nums rounded-xs px-1 text-[10px] ${
                    filter === f.id
                      ? "bg-zinc-100 text-zinc-800"
                      : "text-zinc-400"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search input */}
            <div className="relative min-w-52 sm:w-64">
              <Search className="pointer-events-none absolute start-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.payments.searchPlaceholder}
                className="w-full rounded-lg border border-zinc-200/90 bg-white ps-8 pe-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
            </div>

            {/* WhatsApp Template Language Pill */}
            <div className="inline-flex items-center rounded-lg border border-zinc-200/80 bg-white p-0.5">
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
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ledger Rows */}
        {rows.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            {t.payments.noResults}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/40 text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400">
                  <th className="py-2.5 ps-4 pe-3 text-start">{t.report.unitCol}</th>
                  <th className="px-3 py-2.5 text-start">{t.report.residentCol}</th>
                  <th className="px-3 py-2.5 text-end">Cotisation</th>
                  <th className="px-3 py-2.5 text-start">Statut</th>
                  <th className="py-2.5 ps-3 pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
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
                      });

                  const waUrl = buildWhatsAppUrl(apt.phone, waMessage);

                  return (
                    <tr
                      key={apt.id}
                      className="group transition-colors hover:bg-zinc-50/80"
                    >
                      {/* Unit Label */}
                      <td className="py-3 ps-4 pe-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-800">
                          {apt.unitLabel}
                        </span>
                      </td>

                      {/* Resident Name & Phone */}
                      <td className="px-3 py-3">
                        <div className="font-medium text-zinc-900">
                          {apt.residentName || "—"}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-400">
                          {apt.phone || t.payments.noPhone}
                        </div>
                      </td>

                      {/* Monthly Fee */}
                      <td className="px-3 py-3 text-end tabular-nums whitespace-nowrap font-medium text-zinc-700">
                        {formatMAD(apt.monthlyFee, locale)}
                      </td>

                      {/* Status & Arrears */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {isPaid ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              <span>{t.payments.statusPaid}</span>
                              {payment && (
                                <span className="font-mono text-[11px] text-zinc-400">
                                  • {payment.receiptNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              <span>{t.payments.statusLate}</span>
                            </div>
                          )}

                          {arrears.unpaidMonths.length > 0 && (
                            <span className="tabular-nums text-[11px] text-zinc-500">
                              {arrears.unpaidMonths.length}{" "}
                              {arrears.unpaidMonths.length === 1
                                ? t.payments.monthLateSingular
                                : t.payments.monthsLate}{" "}
                              ({formatMAD(arrears.totalOwed, locale)})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 ps-3 pe-4 text-end whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {payment ? (
                            <>
                              <Link
                                href={`/receipt/${payment.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50"
                              >
                                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                                <span>{t.payments.viewReceipt}</span>
                              </Link>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">
                                  {t.payments.sendReceiptWa}
                                </span>
                              </a>
                              <button
                                type="button"
                                onClick={() => cancelPayment(payment.id)}
                                title={t.payments.cancelPayment}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openMarkPaidModal(apt)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-zinc-800 transition-colors"
                              >
                                <span>{t.payments.markPaid}</span>
                              </button>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-zinc-500" />
                                <span className="hidden sm:inline">
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

      {/* Mark Paid Modal */}
      {modalApartment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-xs"
          onClick={() => setModalApartment(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">
                  {t.payments.modalTitle}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {modalApartment.unitLabel} — {modalApartment.residentName} (
                  {formatMonthLabel(selectedMonthKey, locale)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalApartment(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  {t.payments.amountLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 tabular-nums text-sm font-semibold text-zinc-950 focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
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
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {t.payments.methods[m]}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  {t.payments.noteLabel}
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder={t.payments.notePlaceholder}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalApartment(null)}
                  className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  {t.payments.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
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
