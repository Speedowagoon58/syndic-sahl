"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Eye, KeyRound, Lock, MessageCircle, Moon, Plus, ShieldAlert, Sun, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useApp } from "@/context/AppContext";
import { useAuthEnabled } from "@/components/AuthAvailability";
import { AuthControls } from "@/components/AuthControls";
import { PLANS } from "@/lib/config";
import {
  formatDateShort,
  formatMAD,
  getBuildingReferenceCode,
  getPlanAccess,
} from "@/lib/calculations";
import { buildFounderAccessInviteMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { ReceiptLightbox } from "@/components/ReceiptLightbox";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { Building, PlatformAccessGrant, SubscriptionRequest } from "@/lib/types";

function computeFutureTrialIso(days = 30): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function ClerkAdminGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const { workspaceReady, cloudConnected, isFounder, t, theme, toggleTheme } =
    useApp();

  if (!isLoaded || !workspaceReady) {
    return <LoadingScreen statusText={t.common.loading} />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.admin.backToApp}
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.header.lightMode : t.header.darkMode}
            className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
        </header>

        <main className="mx-auto w-full max-w-sm py-12">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              <Lock className="h-4 w-4" />
            </div>
            <h1 className="mt-4 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.admin.protectedTitle}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t.admin.protectedDesc}
            </p>
            <Link
              href="/sign-in?redirect_url=%2Fadmin"
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {t.admin.signInGoogleBtn}
            </Link>
          </div>
        </main>
        <div />
      </div>
    );
  }

  if (cloudConnected && !isFounder) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.admin.backToApp}
          </Link>
          <div className="flex items-center gap-2">
            <AuthControls variant="header" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t.header.lightMode : t.header.darkMode}
              className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md py-12">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h1 className="mt-4 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.admin.founderOnlyTitle}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t.admin.founderOnlyDesc}
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {t.admin.backToApp}
            </Link>
          </div>
        </main>
        <div />
      </div>
    );
  }

  return <>{children}</>;
}

function AdminDashboardContent() {
  const {
    hydrated,
    cloudConnected,
    isFounder,
    data,
    locale,
    whatsappLang,
    theme,
    toggleTheme,
    t,
    adminApproveRequest,
    adminRejectRequest,
    adminActivateBuilding,
    adminSetBuildingExpired,
    adminRestoreBuildingTrial,
    showToast,
    toast,
  } = useApp();

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [globalBuildings, setGlobalBuildings] = useState<Building[] | null>(null);
  const [globalUnitCounts, setGlobalUnitCounts] = useState<Record<string, number> | null>(null);
  const [globalRequests, setGlobalRequests] = useState<SubscriptionRequest[] | null>(null);
  const [accessGrants, setAccessGrants] = useState<PlatformAccessGrant[]>([]);
  const [forbiddenPlatform, setForbiddenPlatform] = useState(false);

  const [grantEmail, setGrantEmail] = useState("");
  const [grantName, setGrantName] = useState("");
  const [grantBuilding, setGrantBuilding] = useState("");
  const [grantPhone, setGrantPhone] = useState("");
  const [grantTrialDays, setGrantTrialDays] = useState(30);
  const [grantMaxBuildings, setGrantMaxBuildings] = useState(1);
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  useEffect(() => {
    if (!hydrated || !cloudConnected || !isFounder) return;
    let active = true;
    fetch("/api/admin")
      .then(async (res) => {
        if (!active) return;
        if (res.status === 403) {
          setForbiddenPlatform(true);
          return;
        }
        if (!res.ok) return;
        const json = await res.json();
        if (!active || json.mode !== "neon") return;
        setGlobalBuildings(json.buildings ?? []);
        setGlobalUnitCounts(json.unitCounts ?? {});
        setGlobalRequests(json.subscriptionRequests ?? []);
        setAccessGrants(json.accessGrants ?? []);
      })
      .catch(() => {
        // Fallback to AppContext workspace state
      });
    return () => {
      active = false;
    };
  }, [cloudConnected, hydrated, isFounder]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F6F4] text-xs text-zinc-400 dark:bg-[#09090B]">
        {t.common.loading}
      </div>
    );
  }

  if (forbiddenPlatform) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F6F4] p-4 dark:bg-[#09090B]">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-[#111113]">
          <ShieldAlert className="mx-auto h-6 w-6 text-red-500" />
          <h1 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            {t.admin.founderOnlyTitle}
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {t.admin.founderOnlyDesc}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
          >
            {t.admin.backToApp}
          </Link>
        </div>
      </div>
    );
  }

  const buildings = globalBuildings ?? data.buildings;
  const requests = globalRequests ?? data.subscriptionRequests;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const paidBuildingsCount = buildings.filter(
    (b) => b.planStatus === "active"
  ).length;
  const estimatedArr = paidBuildingsCount * PLANS.annual.priceMAD;

  const handleApprove = (req: SubscriptionRequest) => {
    const months = PLANS[req.plan].months;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    const expiresIso = expires.toISOString();

    adminApproveRequest(req.id);
    if (!data.buildings.some((b) => b.id === req.buildingId)) {
      adminActivateBuilding(req.buildingId, months);
    }

    if (globalRequests) {
      setGlobalRequests((prev) =>
        prev
          ? prev.map((r) =>
              r.id === req.id ? { ...r, status: "approved" } : r
            )
          : prev
      );
    }
    if (globalBuildings) {
      setGlobalBuildings((prev) =>
        prev
          ? prev.map((b) =>
              b.id === req.buildingId
                ? { ...b, planStatus: "active", planExpiresAt: expiresIso }
                : b
            )
          : prev
      );
    }
  };

  const handleReject = (reqId: string) => {
    adminRejectRequest(reqId);
    if (globalRequests) {
      setGlobalRequests((prev) =>
        prev
          ? prev.map((r) =>
              r.id === reqId ? { ...r, status: "rejected" } : r
            )
          : prev
      );
    }
  };

  const handleActivateBuilding = (buildingId: string, months: number) => {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    const expiresIso = expires.toISOString();
    adminActivateBuilding(buildingId, months);
    if (globalBuildings) {
      setGlobalBuildings((prev) =>
        prev
          ? prev.map((b) =>
              b.id === buildingId
                ? { ...b, planStatus: "active", planExpiresAt: expiresIso }
                : b
            )
          : prev
      );
    }
  };

  const handleExpireBuilding = (buildingId: string) => {
    const pastIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    adminSetBuildingExpired(buildingId);
    if (globalBuildings) {
      setGlobalBuildings((prev) =>
        prev
          ? prev.map((b) =>
              b.id === buildingId
                ? {
                    ...b,
                    planStatus: "expired",
                    trialEndsAt: pastIso,
                    planExpiresAt: pastIso,
                  }
                : b
            )
          : prev
      );
    }
  };

  const handleRestoreTrial = (buildingId: string) => {
    const futureIso = computeFutureTrialIso(30);
    adminRestoreBuildingTrial(buildingId);
    if (globalBuildings) {
      setGlobalBuildings((prev) =>
        prev
          ? prev.map((b) =>
              b.id === buildingId
                ? {
                    ...b,
                    planStatus: "trial",
                    trialEndsAt: futureIso,
                    planExpiresAt: null,
                  }
                : b
            )
          : prev
      );
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim() || grantSubmitting) return;
    setGrantSubmitting(true);
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_access",
          payload: {
            email: grantEmail.trim(),
            fullName: grantName.trim(),
            buildingName: grantBuilding.trim(),
            phone: grantPhone.trim(),
            trialDays: grantTrialDays,
            maxBuildings: grantMaxBuildings,
          },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; grant?: PlatformAccessGrant };
      if (res.ok && json.ok && json.grant) {
        setAccessGrants((prev) => {
          const filtered = prev.filter((g) => g.id !== json.grant!.id);
          return [json.grant!, ...filtered];
        });
        setGrantEmail("");
        setGrantName("");
        setGrantBuilding("");
        setGrantPhone("");
        showToast(t.common.saved);
      } else {
        showToast(t.common.syncErrorToast);
      }
    } catch {
      showToast(t.common.syncErrorToast);
    } finally {
      setGrantSubmitting(false);
    }
  };

  const handleUpdateGrantStatus = async (
    grantId: string,
    status: "approved" | "revoked" | "pending",
    trialDays?: number
  ) => {
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_grant_status",
          payload: { grantId, status, trialDays },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; grant?: PlatformAccessGrant };
      if (res.ok && json.ok && json.grant) {
        setAccessGrants((prev) =>
          prev.map((g) => (g.id === grantId ? json.grant! : g))
        );
        showToast(t.common.saved);
      } else {
        showToast(t.common.syncErrorToast);
      }
    } catch {
      showToast(t.common.syncErrorToast);
    }
  };

  const getActivateUrl = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/activate/${token}` : `/activate/${token}`;

  const handleCopyActivateLink = (token: string) => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(getActivateUrl(token));
    showToast(t.admin.activateLinkCopied);
  };

  const pendingGrants = accessGrants.filter((g) => g.status === "pending");
  const managedGrants = accessGrants.filter((g) => g.status !== "pending");

  return (
    <div className="min-h-screen bg-[#F6F6F4] pb-12 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
      <header className="border-b border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-[#111113]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              S
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                {t.admin.title}
              </h1>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {t.admin.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AuthControls variant="header" />
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
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.admin.backToApp}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-2 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#111113] sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.totalBuildings}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950 dark:text-zinc-100">
              {buildings.length}
            </p>
          </div>
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.paidBuildings}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
              {paidBuildingsCount}
            </p>
          </div>
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.pendingRequests}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950 dark:text-zinc-100">
              {pendingRequests.length}
            </p>
          </div>
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.estimatedArr}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950 dark:text-zinc-100">
              {formatMAD(estimatedArr, locale)}
            </p>
          </div>
        </div>

        {/* Founder Private Access & 30-Day Trial Control */}
        <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                {t.admin.accessControlTitle}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {t.admin.accessControlDesc}
            </p>
          </div>

          <form
            onSubmit={handleGrantAccess}
            className="grid grid-cols-1 gap-3 border-b border-zinc-100 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-950/50 sm:grid-cols-6"
          >
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                {t.admin.grantEmailLabel} *
              </label>
              <input
                type="email"
                required
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="syndic@gmail.com"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                {t.admin.grantNameLabel}
              </label>
              <input
                type="text"
                value={grantName}
                onChange={(e) => setGrantName(e.target.value)}
                placeholder="M. Ahmed"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                {t.admin.grantBuildingLabel}
              </label>
              <input
                type="text"
                value={grantBuilding}
                onChange={(e) => setGrantBuilding(e.target.value)}
                placeholder="Résidence Atlas"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                {t.admin.grantPhoneLabel}
              </label>
              <input
                type="tel"
                value={grantPhone}
                onChange={(e) => setGrantPhone(e.target.value)}
                placeholder="0661..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  {t.admin.grantTrialDaysLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={grantTrialDays}
                  onChange={(e) => setGrantTrialDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 tabular-nums text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  {t.admin.grantMaxBuildingsLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={grantMaxBuildings}
                  onChange={(e) => setGrantMaxBuildings(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 tabular-nums text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="sm:col-span-6">
              <button
                type="submit"
                disabled={grantSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.admin.grantAccessBtn}</span>
              </button>
            </div>
          </form>

          {pendingGrants.length > 0 && (
            <div className="border-b border-zinc-100 dark:border-zinc-800">
              <div className="bg-amber-50/70 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                {t.admin.pendingAccessRequests} ({pendingGrants.length})
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pendingGrants.map((g) => (
                  <div
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {g.fullName || g.email}{" "}
                        <span className="font-mono font-normal text-zinc-500">
                          ({g.email})
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {g.buildingName} {g.city ? `• ${g.city}` : ""} • ~{g.unitsEstimate}{" "}
                        {t.admin.lotsCount} {g.phone ? `• ${g.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateGrantStatus(g.id, "approved", 30)}
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t.admin.approveTrial30}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateGrantStatus(g.id, "revoked")}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                        {t.admin.reject}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.allAccessGrants} ({managedGrants.length})
            </div>
            {managedGrants.length === 0 ? (
              <p className="px-5 pb-5 text-xs text-zinc-400">{t.admin.noAccessGrants}</p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {managedGrants.map((g) => {
                  const activateUrl = g.accessToken ? getActivateUrl(g.accessToken) : "";
                  const waHref = activateUrl
                    ? buildWhatsAppUrl(
                        g.phone,
                        buildFounderAccessInviteMessage({
                          lang: whatsappLang,
                          fullName: g.fullName,
                          buildingName: g.buildingName,
                          trialDays: g.trialDays,
                          activateUrl,
                        })
                      )
                    : "";

                  return (
                    <div
                      key={g.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              g.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                            }`}
                          >
                            {g.status === "approved"
                              ? `${g.trialDays}j`
                              : t.admin.revokeAccess}
                          </span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {g.fullName || g.email}
                          </span>
                          <span className="font-mono text-xs text-zinc-400">{g.email}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {g.buildingName || "—"} • max {g.maxBuildings}{" "}
                          {g.claimedAt ? `• Activé le ${formatDateShort(g.claimedAt, locale)}` : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {g.status === "approved" && g.accessToken && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyActivateLink(g.accessToken)}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                            >
                              <Copy className="h-3 w-3" />
                              <span>{t.admin.copyActivateLink}</span>
                            </button>
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-emerald-400"
                            >
                              <MessageCircle className="h-3 w-3" />
                              <span>{t.admin.sendWhatsAppInvite}</span>
                            </a>
                          </>
                        )}
                        {g.status === "approved" ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateGrantStatus(g.id, "revoked")}
                            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-red-400"
                          >
                            {t.admin.revokeAccess}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateGrantStatus(g.id, "approved", 30)}
                            className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
                          >
                            {t.admin.reactivateAccess}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.admin.pendingQueue} ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="p-6 text-xs text-zinc-400">{t.admin.noPending}</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                        {req.referenceCode}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {req.buildingName}
                      </h3>
                      <span className="tabular-nums text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        • {formatMAD(req.amountMAD, locale)} ({req.channel})
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDateShort(req.createdAt, locale)}
                      {req.note ? ` — "${req.note}"` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {req.proofPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(req.proofPhotoUrl)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        <Eye className="h-3.5 w-3.5 text-zinc-400" />
                        {t.admin.viewProof}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApprove(req)}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t.admin.approve}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(req.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t.admin.reject}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.admin.allBuildings}
            </h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {buildings.map((b) => {
              const unitsCount =
                globalUnitCounts?.[b.id] ??
                data.apartments.filter(
                  (a) => a.buildingId === b.id && a.active
                ).length;
              const access = getPlanAccess(b, unitsCount);
              const refCode = getBuildingReferenceCode(b.id);

              return (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400">
                        {refCode}
                      </span>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {b.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        ({b.city} • {unitsCount} {t.admin.lotsCount})
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          access.mode === "expired"
                            ? "bg-red-500"
                            : access.mode === "trial"
                            ? "bg-amber-500"
                            : "bg-emerald-600"
                        }`}
                      />
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {access.mode === "active" &&
                          `${t.banners.activePlanTitle} (${
                            b.planExpiresAt
                              ? formatDateShort(b.planExpiresAt, locale)
                              : ""
                          })`}
                        {access.mode === "trial" &&
                          `${t.banners.trialTitle} (${access.daysRemaining}j)`}
                        {access.mode === "expired" && t.banners.expiredTitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRestoreTrial(b.id)}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      {t.admin.extendTrial30}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActivateBuilding(b.id, 12)}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
                    >
                      {t.admin.activateYear}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActivateBuilding(b.id, 6)}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      {t.admin.activateSixMonths}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExpireBuilding(b.id)}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-red-400"
                    >
                      {t.admin.markExpired}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 end-4 z-50 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-950">
          {toast}
        </div>
      )}

      <ReceiptLightbox
        imageUrl={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  );
}

export default function AdminPage() {
  const authEnabled = useAuthEnabled();

  if (authEnabled) {
    return (
      <ClerkAdminGate>
        <AdminDashboardContent />
      </ClerkAdminGate>
    );
  }

  return <AdminDashboardContent />;
}
