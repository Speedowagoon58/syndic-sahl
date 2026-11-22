"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Moon,
  Receipt,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { AuthControls } from "@/components/AuthControls";
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
import type { Apartment, Building, Expense, MemberRole, Payment } from "@/lib/types";

interface CloudPortalPayload {
  building: Building;
  apartments: Apartment[];
  payments: Payment[];
  expenses: Expense[];
  viewerRole?: MemberRole;
  viewerApartmentId?: string | null;
}

export default function PublicResidentPortalPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const { hydrated, data, locale, setLocale, theme, toggleTheme, t } = useApp();

  const [monthKey, setMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [pinInput, setPinInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [lightbox, setLightbox] = useState<{
    url: string;
    caption: string;
  } | null>(null);

  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudMode, setCloudMode] = useState<"unknown" | "local" | "cloud">(
    "unknown"
  );
  const [cloudData, setCloudData] = useState<CloudPortalPayload | null>(null);
  const [cloudNotFound, setCloudNotFound] = useState(false);
  const [cloudAuthGate, setCloudAuthGate] = useState<{
    kind: "auth_required" | "access_denied";
    buildingName: string;
    city: string;
    userEmail?: string;
  } | null>(null);
  const [cloudPinRequired, setCloudPinRequired] = useState<{
    buildingName: string;
    city: string;
  } | null>(null);

  const verifyCloudPin = useCallback(
    async (pin: string) => {
      if (!slug) return;
      try {
        const res = await fetch(`/api/public/${encodeURIComponent(slug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (res.status === 404) {
          setCloudMode("cloud");
          setCloudNotFound(true);
          setCloudPinRequired(null);
          return;
        }
        const json = await res.json();
        if (json.mode === "local") {
          setCloudMode("local");
          return;
        }
        if (res.status === 401 && json.requiresPin) {
          setCloudMode("cloud");
          setCloudPinRequired({
            buildingName: json.buildingName ?? slug,
            city: json.city ?? "",
          });
          setPinError(Boolean(json.pinInvalid ?? true));
          return;
        }
        if (res.ok && json.building) {
          setCloudMode("cloud");
          setCloudPinRequired(null);
          setCloudNotFound(false);
          setUnlocked(true);
          setPinError(false);
          setCloudData({
            building: json.building,
            apartments: json.apartments ?? [],
            payments: json.payments ?? [],
            expenses: json.expenses ?? [],
          });
        }
      } catch {
        setCloudMode("local");
      } finally {
        setCloudLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    if (!hydrated || !slug) return;
    let active = true;
    fetch(`/api/public/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 404) {
          setCloudMode("cloud");
          setCloudNotFound(true);
          setCloudLoading(false);
          return;
        }
        const json = await res.json();
        if (!active) return;
        if (json.mode === "local") {
          setCloudMode("local");
          setCloudLoading(false);
          return;
        }
        if (json.requiresAuth) {
          setCloudMode("cloud");
          setCloudAuthGate({
            kind: "auth_required",
            buildingName: json.buildingName ?? slug,
            city: json.city ?? "",
          });
          setCloudLoading(false);
          return;
        }
        if (res.status === 403 && json.accessDenied) {
          setCloudMode("cloud");
          setCloudAuthGate({
            kind: "access_denied",
            buildingName: json.buildingName ?? slug,
            city: json.city ?? "",
            userEmail: json.userEmail ?? "",
          });
          setCloudLoading(false);
          return;
        }
        if (json.requiresPin) {
          setCloudMode("cloud");
          setCloudPinRequired({
            buildingName: json.buildingName ?? slug,
            city: json.city ?? "",
          });
          setCloudLoading(false);
          return;
        }
        if (res.ok && json.building) {
          setCloudMode("cloud");
          setUnlocked(true);
          setCloudData({
            building: json.building,
            apartments: json.apartments ?? [],
            payments: json.payments ?? [],
            expenses: json.expenses ?? [],
            viewerRole: json.viewerRole,
            viewerApartmentId: json.viewerApartmentId ?? null,
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
  }, [hydrated, slug]);

  const localBuilding = useMemo(
    () => data.buildings.find((b) => b.shareSlug === slug) ?? null,
    [data.buildings, slug]
  );

  const building =
    cloudMode === "cloud" ? cloudData?.building ?? null : localBuilding;

  const apartments = useMemo(() => {
    if (cloudMode === "cloud") {
      return cloudData?.apartments ?? [];
    }
    if (!localBuilding) return [];
    return data.apartments
      .filter((a) => a.buildingId === localBuilding.id && a.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [cloudMode, cloudData, data.apartments, localBuilding]);

  const payments = useMemo(() => {
    if (cloudMode === "cloud") {
      return cloudData?.payments ?? [];
    }
    if (!localBuilding) return [];
    return data.payments.filter((p) => p.buildingId === localBuilding.id);
  }, [cloudMode, cloudData, data.payments, localBuilding]);

  const expenses = useMemo(() => {
    if (cloudMode === "cloud") {
      return cloudData?.expenses ?? [];
    }
    if (!localBuilding) return [];
    return data.expenses
      .filter((e) => e.buildingId === localBuilding.id)
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  }, [cloudMode, cloudData, data.expenses, localBuilding]);

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

  if (!hydrated || (cloudLoading && cloudMode === "unknown")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F6F4] text-xs text-zinc-400 dark:bg-[#09090B]">
        {t.common.loading}
      </div>
    );
  }

  if (cloudMode === "cloud" && cloudAuthGate) {
    const redirectParam = encodeURIComponent(`/r/${slug}`);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F6F4] p-4 dark:bg-[#09090B]">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            <Lock className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs font-medium text-zinc-400">
            {cloudAuthGate.buildingName}
            {cloudAuthGate.city ? ` • ${cloudAuthGate.city}` : ""}
          </p>
          <h1 className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-100">
            {cloudAuthGate.kind === "auth_required"
              ? t.portal.privateLockTitle
              : t.portal.accessDeniedTitle}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {cloudAuthGate.kind === "auth_required"
              ? t.portal.privateLockDesc
              : t.portal.accessDeniedDesc}
          </p>

          {cloudAuthGate.kind === "auth_required" ? (
            <div className="mt-5 space-y-2">
              <Link
                href={`/sign-in?redirect_url=${redirectParam}`}
                className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {t.portal.privateLockBtn}
              </Link>
              <Link
                href={`/sign-up?redirect_url=${redirectParam}`}
                className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t.common.signUpBtn}
              </Link>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-3">
              {cloudAuthGate.userEmail && (
                <p className="font-mono text-[11px] text-zinc-400">
                  {cloudAuthGate.userEmail}
                </p>
              )}
              <AuthControls variant="header" />
              <Link
                href="/"
                className="text-xs font-medium text-zinc-700 underline hover:text-zinc-950 dark:text-zinc-300"
              >
                {t.portal.backHome}
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (cloudMode === "cloud" && cloudPinRequired && !unlocked) {
    const handleCloudPinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      void verifyCloudPin(pinInput.trim());
    };

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F6F4] p-4 dark:bg-[#09090B]">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            <Lock className="h-4 w-4" />
          </div>
          <h1 className="mt-4 text-center text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            {cloudPinRequired.buildingName}
          </h1>
          <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t.portal.pinDesc}
          </p>

          <form onSubmit={handleCloudPinSubmit} className="mt-5 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder={t.portal.pinPlaceholder}
              className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-center font-mono text-base tracking-widest focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            {pinError && (
              <p className="text-center text-xs font-medium text-red-600 dark:text-red-400">
                {t.portal.pinError}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
            >
              {t.portal.unlockBtn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (cloudNotFound || !building || !summary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F6F4] p-6 text-center dark:bg-[#09090B]">
        <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
          <h1 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
            {t.portal.notFoundTitle}
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {t.portal.notFoundDesc}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
          >
            {t.portal.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const requiresLocalPin =
    cloudMode !== "cloud" && Boolean(building.sharePin.trim());
  if (requiresLocalPin && !unlocked) {
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F6F4] p-4 dark:bg-[#09090B]">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            <Lock className="h-4 w-4" />
          </div>
          <h1 className="mt-4 text-center text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            {building.name}
          </h1>
          <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
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
              className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-center font-mono text-base tracking-widest focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            {pinError && (
              <p className="text-center text-xs font-medium text-red-600 dark:text-red-400">
                {t.portal.pinError}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
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
    <div className="min-h-screen bg-[#F6F6F4] pb-12 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
      <header className="border-b border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-[#111113]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                  {building.name}
                </h1>
                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                  {t.portal.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{building.city}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AuthControls variant="header" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t.header.lightMode : t.header.darkMode}
              title={theme === "dark" ? t.header.lightMode : t.header.darkMode}
              className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setLocale("fr")}
                className={`rounded-xs px-2.5 py-0.5 ${
                  locale === "fr"
                    ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
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
                    ? "bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                العربية
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-1 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#111113] sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.kpi.treasuryBalance}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
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
              <span className="tabular-nums text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {collectionPct}%
              </span>
            </div>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {formatMAD(summary.monthCollected, locale)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
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
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {formatMAD(summary.totalExpensesAllTime, locale)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {expenses.length} {t.report.countUnit}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.payments.title}
            </h2>
            <div className="inline-flex items-center rounded-lg border border-zinc-200/90 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                aria-label={locale === "ar" ? "الشهر السابق" : "Mois précédent"}
                onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-32 px-2 text-center text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {formatMonthLabel(monthKey, locale)}
              </span>
              <button
                type="button"
                aria-label={locale === "ar" ? "الشهر التالي" : "Mois suivant"}
                onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {apartments.map((apt) => {
              const isPaid = paidSet.has(apt.id);
              const isViewerUnit = cloudData?.viewerApartmentId === apt.id;
              const arrears = computeApartmentArrears(
                apt,
                payments,
                monthKey,
                building.startMonth
              );
              return (
                <div
                  key={apt.id}
                  className={`rounded-lg border p-3 ${
                    isViewerUnit
                      ? "border-zinc-900 bg-white ring-1 ring-zinc-900 dark:border-zinc-200 dark:bg-zinc-900 dark:ring-zinc-200"
                      : "border-zinc-200/80 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {apt.unitLabel}
                      </span>
                      {isViewerUnit && (
                        <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
                          {t.portal.yourUnitBadge}
                        </span>
                      )}
                    </div>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        isPaid ? "bg-emerald-600" : "bg-red-500"
                      }`}
                    />
                  </div>
                  {building.showNamesPublicly && apt.residentName && (
                    <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {apt.residentName}
                    </p>
                  )}
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      isPaid
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
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

        <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.portal.expensesFeed}
            </h2>
            <p className="text-xs text-zinc-400">{t.portal.tapPhoto}</p>
          </div>

          {expenses.length === 0 ? (
            <p className="p-8 text-center text-xs text-zinc-400">
              {t.expenses.noExpenses}
            </p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50"
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
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700"
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                        <Receipt className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
                    <span className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
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
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white px-5 py-4 text-xs dark:border-zinc-800 dark:bg-[#111113]">
          <span className="text-zinc-500 dark:text-zinc-400">
            {t.portal.poweredBy}{" "}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
              {locale === "ar" ? APP_NAME_AR : APP_NAME}
            </strong>
          </span>
          <Link
            href="/"
            className="font-medium text-zinc-900 underline hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
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
