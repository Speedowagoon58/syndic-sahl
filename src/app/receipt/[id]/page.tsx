"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Moon, Printer, Sun } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { APP_NAME } from "@/lib/config";
import {
  formatDateShort,
  formatMAD,
  formatMonthLabel,
} from "@/lib/calculations";
import type { Payment } from "@/lib/types";

interface CloudReceiptPayload {
  payment: Payment;
  building: { id: string; name: string; city: string };
  apartment: { id: string; unitLabel: string; residentName: string };
}

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const paymentId = typeof params?.id === "string" ? params.id : "";

  const { hydrated, data, locale, theme, toggleTheme, t } = useApp();
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudMode, setCloudMode] = useState<"unknown" | "local" | "cloud">(
    "unknown"
  );
  const [cloudReceipt, setCloudReceipt] = useState<CloudReceiptPayload | null>(
    null
  );

  useEffect(() => {
    if (!hydrated || !paymentId) return;
    let active = true;
    fetch(`/api/receipt/${encodeURIComponent(paymentId)}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 404) {
          setCloudMode("cloud");
          setCloudReceipt(null);
          setCloudLoading(false);
          return;
        }
        const json = await res.json();
        if (!active) return;
        if (json.mode === "local") {
          setCloudMode("local");
        } else if (res.ok && json.payment) {
          setCloudMode("cloud");
          setCloudReceipt({
            payment: json.payment,
            building: json.building,
            apartment: json.apartment,
          });
        }
        setCloudLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setCloudMode("local");
        setCloudLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated, paymentId]);

  if (!hydrated || (cloudLoading && cloudMode === "unknown")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F6F4] text-xs text-zinc-400 dark:bg-[#09090B]">
        {t.common.loading}
      </div>
    );
  }

  const localPayment = data.payments.find((p) => p.id === paymentId);
  const localBuilding = localPayment
    ? data.buildings.find((b) => b.id === localPayment.buildingId)
    : null;
  const localApartment = localPayment
    ? data.apartments.find((a) => a.id === localPayment.apartmentId)
    : null;

  const payment =
    cloudMode === "cloud" ? cloudReceipt?.payment ?? null : localPayment ?? null;
  const building =
    cloudMode === "cloud"
      ? cloudReceipt?.building ?? null
      : localBuilding ?? null;
  const apartment =
    cloudMode === "cloud"
      ? cloudReceipt?.apartment ?? null
      : localApartment ?? null;

  if (!payment || !building || !apartment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F6F4] p-6 text-center dark:bg-[#09090B]">
        <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-[#111113]">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {t.receipt.notFound}
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.receipt.backBtn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F6F4] py-8 px-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
      {/* Action Bar */}
      <div className="no-print mx-auto mb-6 flex max-w-xl items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.receipt.backBtn}
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.header.lightMode : t.header.darkMode}
            title={theme === "dark" ? t.header.lightMode : t.header.darkMode}
            className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
          >
            <Printer className="h-3.5 w-3.5" />
            {t.receipt.printBtn}
          </button>
        </div>
      </div>

      {/* Printable Quittance Sheet */}
      <div className="print-sheet mx-auto max-w-xl overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-8 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
        <div className="flex items-start justify-between border-b border-zinc-900 pb-6 dark:border-zinc-700">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              {t.receipt.subtitleAr}
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {t.receipt.title}
            </h1>
            <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {building.name} — {building.city}
            </p>
          </div>
          <div className="text-end">
            <span className="block text-[10px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.receipt.receiptNo}
            </span>
            <span className="mt-0.5 block font-mono text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {payment.receiptNumber}
            </span>
            <span className="mt-1 block tabular-nums text-xs text-zinc-400">
              {formatDateShort(payment.paidAt, locale)}
            </span>
          </div>
        </div>

        <div className="mt-6 divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
          <div className="flex justify-between py-3">
            <span className="text-zinc-500 dark:text-zinc-400">
              {t.receipt.unit}
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {apartment.unitLabel}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-zinc-500 dark:text-zinc-400">
              {t.receipt.resident}
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {apartment.residentName || "—"}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-zinc-500 dark:text-zinc-400">
              {t.receipt.period}
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatMonthLabel(payment.monthKey, locale)}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-zinc-500 dark:text-zinc-400">
              {t.receipt.method}
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {t.payments.methods[payment.method]}
            </span>
          </div>
          {payment.note && (
            <div className="flex justify-between py-3">
              <span className="text-zinc-500 dark:text-zinc-400">
                {t.receipt.note}
              </span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {payment.note}
              </span>
            </div>
          )}
        </div>

        {/* Amount Paid Box */}
        <div className="mt-6 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500 dark:text-zinc-400">
            {t.receipt.amount}
          </span>
          <span className="tabular-nums text-2xl font-bold text-zinc-950 dark:text-zinc-100">
            {formatMAD(payment.amount, locale)}
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 text-[11px] text-zinc-400 dark:border-zinc-800">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            {t.receipt.certified}
          </span>
          <span>{APP_NAME} • Maroc</span>
        </div>
      </div>
    </div>
  );
}
