"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Lock, Moon, Plus, Sun } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { AppShell } from "@/components/AppShell";
import { AuthControls } from "@/components/AuthControls";
import { ExpensesTab } from "@/components/ExpensesTab";
import { OnboardingModal } from "@/components/OnboardingModal";
import { PaymentsTab } from "@/components/PaymentsTab";
import { ReportTab } from "@/components/ReportTab";
import { SettingsTab } from "@/components/SettingsTab";
import { SubscriptionTab } from "@/components/SubscriptionTab";
import { APP_NAME, APP_NAME_AR } from "@/lib/config";

export default function HomePage() {
  const {
    hydrated,
    workspaceReady,
    authRequired,
    hasBuildings,
    activeBuilding,
    activeBuildingRole,
    data,
    setActiveBuildingId,
    activeTab,
    locale,
    setLocale,
    theme,
    toggleTheme,
    toast,
    t,
  } = useApp();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  if (!hydrated || !workspaceReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F6F4] text-xs font-medium text-zinc-500 dark:bg-[#09090B] dark:text-zinc-400">
        {t.common.loading}
      </div>
    );
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
          <div className="rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
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
          <div className="rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              <Building2 className="h-4 w-4" />
            </div>
            <h1 className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-100">
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
          <div className="rounded-xl border border-zinc-200/90 bg-white p-6 text-center shadow-xs dark:border-zinc-800 dark:bg-[#111113]">
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
        {activeTab === "payments" && <PaymentsTab />}
        {activeTab === "expenses" && <ExpensesTab />}
        {activeTab === "report" && <ReportTab />}
        {activeTab === "subscription" && <SubscriptionTab />}
        {activeTab === "settings" && <SettingsTab />}
      </AppShell>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

      {toast && (
        <div className="no-print fixed bottom-20 end-4 z-50 max-w-sm rounded-lg bg-zinc-900 px-4 py-3 text-xs font-semibold text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-950 lg:bottom-6">
          {toast}
        </div>
      )}
    </>
  );
}
