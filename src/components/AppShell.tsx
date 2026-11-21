"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  FileBarChart2,
  Link2,
  Plus,
  Receipt,
  Settings,
  Wallet,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { APP_NAME, APP_NAME_AR } from "@/lib/config";
import { formatDateShort } from "@/lib/calculations";
import type { AppTab } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
  onOpenOnboarding: () => void;
}

export function AppShell({ children, onOpenOnboarding }: AppShellProps) {
  const {
    t,
    locale,
    setLocale,
    data,
    activeBuilding,
    setActiveBuildingId,
    activeTab,
    setActiveTab,
    planAccess,
    showToast,
  } = useApp();

  const navItems: {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "payments", label: t.nav.payments, icon: Wallet },
    { id: "expenses", label: t.nav.expenses, icon: Receipt },
    { id: "report", label: t.nav.report, icon: FileBarChart2 },
    { id: "subscription", label: t.nav.subscription, icon: CreditCard },
    { id: "settings", label: t.nav.settings, icon: Settings },
  ];

  const handleCopyPortalLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/r/${activeBuilding.shareSlug}`;
    navigator.clipboard?.writeText(url);
    showToast(t.header.linkCopied);
  };

  return (
    <div className="min-h-screen flex bg-[#F6F6F4] text-zinc-950">
      {/* Desktop Sidebar — Linear / Qonto / Matera inspired */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:start-0 border-e border-zinc-200/80 bg-[#FBFBF9] z-30">
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-200/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white text-xs font-bold tracking-tight">
              S
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-950">
              {locale === "ar" ? APP_NAME_AR : APP_NAME}
            </span>
          </div>

          <div className="inline-flex rounded-md border border-zinc-200/90 bg-zinc-100/80 p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setLocale("fr")}
              className={`rounded-xs px-2 py-0.5 transition-colors ${
                locale === "fr"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLocale("ar")}
              className={`rounded-xs px-2 py-0.5 transition-colors ${
                locale === "ar"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              ع
            </button>
          </div>
        </div>

        {/* Workspace / Building Switcher */}
        <div className="p-3 border-b border-zinc-200/70 space-y-2">
          <div className="relative">
            <select
              aria-label={t.header.switchBuilding}
              value={activeBuilding.id}
              onChange={(e) => setActiveBuildingId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-zinc-200/90 bg-white ps-3 pe-8 py-2 text-xs font-semibold text-zinc-900 shadow-2xs hover:border-zinc-300 focus:border-zinc-900 focus:outline-none"
            >
              {data.buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.city}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>

          <button
            type="button"
            onClick={onOpenOnboarding}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-transparent px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100/60 hover:text-zinc-900 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.header.newBuilding}</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
            {locale === "ar" ? "التسيير" : "Gestion"}
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-950"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-zinc-200" : "text-zinc-400"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Resident Portal Quick Card & Plan Status Footer */}
        <div className="p-3 border-t border-zinc-200/70 space-y-2.5">
          <div className="rounded-lg border border-zinc-200/80 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-800">
                {t.header.shareLink}
              </span>
              <Link
                href={`/r/${activeBuilding.shareSlug}`}
                target="_blank"
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
              >
                <span>{t.settings.openPortal}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-zinc-400">
              /r/{activeBuilding.shareSlug}
            </p>
            <button
              type="button"
              onClick={handleCopyPortalLink}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 transition-colors"
            >
              <Link2 className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t.settings.copyPortal}</span>
            </button>
          </div>

          {/* Subtle Plan Status */}
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  planAccess.mode === "expired"
                    ? "bg-red-500"
                    : planAccess.mode === "trial"
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                }`}
              />
              <span className="truncate font-medium text-zinc-700">
                {planAccess.mode === "free_tier" && t.banners.freeTierTitle}
                {planAccess.mode === "trial" &&
                  `${planAccess.daysRemaining} ${t.banners.trialDaysLeft}`}
                {planAccess.mode === "active" &&
                  (activeBuilding.planExpiresAt
                    ? `${t.banners.activeUntil} ${formatDateShort(
                        activeBuilding.planExpiresAt,
                        locale
                      )}`
                    : t.banners.activePlanTitle)}
                {planAccess.mode === "expired" && t.banners.expiredTitle}
              </span>
            </div>
            <Link
              href="/landing"
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-800"
            >
              Landing
            </Link>
            <Link
              href="/login"
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-800"
            >
              Login
            </Link>
            <Link
              href="/admin"
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-800"
            >
              {t.header.adminLink}
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ps-64 min-w-0">
        {/* Top bar (Mobile & Desktop Context Header) */}
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile brand + switcher */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white text-xs font-bold">
                S
              </div>
              <select
                aria-label={t.header.switchBuilding}
                value={activeBuilding.id}
                onChange={(e) => setActiveBuildingId(e.target.value)}
                className="max-w-44 truncate rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-900"
              >
                {data.buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="rounded-md border border-zinc-200 p-1 text-zinc-600"
                title={t.header.newBuilding}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Desktop breadcrumb title */}
            <div className="hidden lg:flex lg:items-center lg:gap-2.5">
              <span className="text-sm font-semibold text-zinc-900">
                {activeBuilding.name}
              </span>
              <span className="text-zinc-300">/</span>
              <span className="text-xs font-medium text-zinc-500">
                {activeBuilding.city}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {planAccess.mode === "expired" && (
              <button
                type="button"
                onClick={() => setActiveTab("subscription")}
                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                {t.banners.upgradeCta}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyPortalLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50"
            >
              <Link2 className="h-3.5 w-3.5 text-zinc-400" />
              <span className="hidden sm:inline">{t.header.shareLink}</span>
            </button>

            <Link
              href={`/r/${activeBuilding.shareSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50"
            >
              <span className="hidden sm:inline">{t.settings.openPortal}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>

            {/* Mobile language switch */}
            <button
              type="button"
              onClick={() => setLocale(locale === "fr" ? "ar" : "fr")}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 lg:hidden"
            >
              {locale === "fr" ? "ع" : "FR"}
            </button>
          </div>
        </header>

        {/* Expired Read-Only Bar (only when actually expired) */}
        {planAccess.mode === "expired" && (
          <div className="no-print border-b border-red-200 bg-red-50/90 px-4 py-2 text-xs text-red-900 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
              <span>
                <strong className="font-semibold">{t.banners.expiredTitle}</strong> —{" "}
                {t.banners.expiredDesc}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("subscription")}
                className="font-semibold underline hover:text-red-700"
              >
                {t.banners.upgradeCta} →
              </button>
            </div>
          </div>
        )}

        {/* Workspace Container */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-2 py-1 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-zinc-950" : "text-zinc-400"
                  }`}
                />
                <span className="mt-0.5 truncate max-w-full px-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
