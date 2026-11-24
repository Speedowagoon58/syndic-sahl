"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Clock, Lock, MessageCircle, Moon, Plus, ShieldAlert, Sun } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { AppShell } from "@/components/AppShell";
import { AuthControls } from "@/components/AuthControls";
import { CommunityTab } from "@/components/CommunityTab";
import { ExpensesTab } from "@/components/ExpensesTab";
import { LoadingScreen } from "@/components/LoadingScreen";
import { OnboardingModal } from "@/components/OnboardingModal";
import { PaymentsTab } from "@/components/PaymentsTab";
import { ReportTab } from "@/components/ReportTab";
import { SettingsTab } from "@/components/SettingsTab";
import { SubscriptionTab } from "@/components/SubscriptionTab";
import { APP_NAME, APP_NAME_AR, FOUNDER_WHATSAPP, TRIAL_DAYS } from "@/lib/config";
import { buildAccessRequestMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export default function HomePage() {
  const {
    hydrated,
    workspaceReady,
    authRequired,
    cloudConnected,
    canCreateBuilding,
    accessGrant,
    hasBuildings,
    activeBuilding,
    activeBuildingRole,
    data,
    setActiveBuildingId,
    activeTab,
    locale,
    setLocale,
    whatsappLang,
    theme,
    toggleTheme,
    requestPlatformAccess,
    showToast,
    toast,
    t,
  } = useApp();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqBuilding, setReqBuilding] = useState("");
  const [reqCity, setReqCity] = useState("Casablanca");
  const [reqUnits, setReqUnits] = useState(12);
  const [reqPhone, setReqPhone] = useState("");
  const [reqSubmitting, setReqSubmitting] = useState(false);

  if (!hydrated || !workspaceReady) {
    return <LoadingScreen locale={locale} statusText={t.common.loading} />;
  }

  if (authRequired) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              S
            </div>
            <span className="text-sm font-semibold tracking-tight">
              {locale === "ar" ? APP_NAME_AR : APP_NAME}
            </span>
          </div>

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
          <div className="ss-animate-fade-up rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              <Lock className="h-4 w-4" />
            </div>
            <h1 className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-100">
              {t.common.authGateTitle}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t.common.authGateDesc}
            </p>
            <div className="mt-6 space-y-2.5">
              <Link
                href="/sign-in"
                className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {t.common.signInBtn}
              </Link>
              <Link
                href="/sign-up"
                className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t.common.signUpBtn}
              </Link>
            </div>
            <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Link
                href="/landing"
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t.common.viewLandingBtn} →
              </Link>
            </div>
          </div>
        </main>
        <div />
      </div>
    );
  }

  if (!hasBuildings) {
    const canCreate = !cloudConnected || canCreateBuilding;
    const trialDaysLabel = accessGrant?.trialDays ?? TRIAL_DAYS;

    const handleRequestAccess = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reqBuilding.trim() || reqSubmitting) return;
      setReqSubmitting(true);
      const res = await requestPlatformAccess({
        fullName: reqName.trim(),
        buildingName: reqBuilding.trim(),
        city: reqCity.trim(),
        unitsEstimate: Number(reqUnits) || 12,
        phone: reqPhone.trim(),
      });
      setReqSubmitting(false);
      if (res.ok) {
        showToast(t.common.accessPendingTitle);
      } else {
        showToast(t.common.syncErrorToast);
      }
    };

    const whatsappRequestUrl = buildWhatsAppUrl(
      FOUNDER_WHATSAPP,
      buildAccessRequestMessage({
        lang: whatsappLang,
        fullName: accessGrant?.fullName || reqName,
        email: accessGrant?.email || "",
        buildingName: accessGrant?.buildingName || reqBuilding || "Ma Résidence",
        city: accessGrant?.city || reqCity,
        unitsEstimate: accessGrant?.unitsEstimate || reqUnits,
      })
    );

    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              S
            </div>
            <span className="text-sm font-semibold tracking-tight">
              {locale === "ar" ? APP_NAME_AR : APP_NAME}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AuthControls variant="header" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t.header.lightMode : t.header.darkMode}
              className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md py-8">
          {canCreate ? (
            <div className="ss-animate-fade-up rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                {t.common.accessApprovedBadge} • {trialDaysLabel} {t.banners.trialDaysLeft}
              </span>
              <h1 className="mt-3 text-base font-semibold text-zinc-950 dark:text-zinc-100">
                {t.common.noBuildingsTitle}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t.common.noBuildingsDesc}
              </p>
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.common.createFirstBuildingBtn}</span>
              </button>
            </div>
          ) : accessGrant?.status === "revoked" ? (
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h1 className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-100">
                {t.common.accessRevokedTitle}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t.common.accessRevokedDesc}
              </p>
              <p className="mt-4 border-t border-zinc-100 pt-4 text-[11px] leading-relaxed text-zinc-400 dark:border-zinc-800">
                {t.common.residentHint}
              </p>
            </div>
          ) : accessGrant?.status === "pending" ? (
            <div className="rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
              <h1 className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-100">
                {t.common.accessPendingTitle}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t.common.accessPendingDesc}
              </p>
              {accessGrant.buildingName && (
                <div className="mt-4 rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                  {accessGrant.buildingName} {accessGrant.city ? `— ${accessGrant.city}` : ""}
                </div>
              )}
              <a
                href={whatsappRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>{t.admin.sendWhatsAppInvite}</span>
              </a>
              <p className="mt-4 border-t border-zinc-100 pt-4 text-[11px] leading-relaxed text-zinc-400 dark:border-zinc-800">
                {t.common.residentHint}
              </p>
            </div>
          ) : (
            <div className="ss-animate-fade-up rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
              <div className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  <Lock className="h-4 w-4" />
                </div>
                <h1 className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-100">
                  {t.common.accessGateTitle}
                </h1>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {t.common.accessGateDesc}
                </p>
              </div>

              <form onSubmit={handleRequestAccess} className="mt-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.admin.grantNameLabel}
                  </label>
                  <input
                    type="text"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder="Ex: M. Hassan"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.admin.grantBuildingLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqBuilding}
                    onChange={(e) => setReqBuilding(e.target.value)}
                    placeholder={t.onboarding.namePlaceholder}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t.settings.city}
                    </label>
                    <input
                      type="text"
                      value={reqCity}
                      onChange={(e) => setReqCity(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t.admin.lotsCount}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={reqUnits}
                      onChange={(e) => setReqUnits(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 tabular-nums text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.admin.grantPhoneLabel}
                  </label>
                  <input
                    type="tel"
                    value={reqPhone}
                    onChange={(e) => setReqPhone(e.target.value)}
                    placeholder="06..."
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {reqSubmitting ? t.common.loading : t.common.requestAccessBtn}
                </button>
              </form>

              <p className="mt-4 border-t border-zinc-100 pt-4 text-center text-[11px] leading-relaxed text-zinc-400 dark:border-zinc-800">
                {t.common.residentHint}
              </p>
            </div>
          )}
        </main>
        <div />

        <OnboardingModal
          open={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
        />
      </div>
    );
  }

  if (activeBuildingRole === "tenant") {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F6F6F4] p-4 text-zinc-950 dark:bg-[#09090B] dark:text-zinc-100">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              S
            </div>
            <span className="text-sm font-semibold tracking-tight">
              {locale === "ar" ? APP_NAME_AR : APP_NAME}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {data.buildings.length > 1 && (
              <select
                aria-label={t.header.switchBuilding}
                value={activeBuilding.id}
                onChange={(e) => setActiveBuildingId(e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {data.buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <AuthControls variant="header" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t.header.lightMode : t.header.darkMode}
              className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md py-8">
          <div className="ss-animate-fade-up rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {t.header.roleBadge.tenant}
            </span>
            <h1 className="mt-3 text-base font-semibold text-zinc-950 dark:text-zinc-100">
              {activeBuilding.name}
            </h1>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t.common.tenantHubTitle}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t.common.tenantHubDesc}
            </p>
            <Link
              href={`/r/${activeBuilding.shareSlug}`}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <span>{t.common.openTenantPortalBtn}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </main>
        <div />
      </div>
    );
  }

  return (
    <>
      <AppShell onOpenOnboarding={() => setOnboardingOpen(true)}>
        <div key={activeTab} className="ss-animate-tab">
          {activeTab === "payments" && <PaymentsTab />}
          {activeTab === "expenses" && <ExpensesTab />}
          {activeTab === "community" && <CommunityTab />}
          {activeTab === "report" && <ReportTab />}
          {activeTab === "subscription" && <SubscriptionTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </AppShell>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

      {toast && (
        <div className="no-print ss-animate-toast fixed bottom-20 end-4 z-50 max-w-sm rounded-lg bg-zinc-900 px-4 py-3 text-xs font-semibold text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-950 lg:bottom-6">
          {toast}
        </div>
      )}
    </>
  );
}
