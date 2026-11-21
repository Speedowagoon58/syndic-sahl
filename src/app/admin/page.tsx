"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Eye,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { PLANS } from "@/lib/config";
import {
  formatDateShort,
  formatMAD,
  getBuildingReferenceCode,
  getPlanAccess,
} from "@/lib/calculations";
import { ReceiptLightbox } from "@/components/ReceiptLightbox";

export default function AdminPage() {
  const {
    hydrated,
    data,
    locale,
    t,
    adminApproveRequest,
    adminRejectRequest,
    adminActivateBuilding,
    adminSetBuildingExpired,
    toast,
  } = useApp();

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F6F4] text-xs text-zinc-400">
        {t.common.loading}
      </div>
    );
  }

  const pendingRequests = data.subscriptionRequests.filter(
    (r) => r.status === "pending"
  );
  const paidBuildingsCount = data.buildings.filter(
    (b) => b.planStatus === "active"
  ).length;
  const estimatedArr = paidBuildingsCount * PLANS.annual.priceMAD;

  return (
    <div className="min-h-screen bg-[#F6F6F4] pb-12 text-zinc-950">
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white">
              S
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-950">
                {t.admin.title}
              </h1>
              <p className="text-xs text-zinc-400">{t.admin.subtitle}</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.admin.backToApp}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
        {/* Founder KPIs Strip */}
        <div className="grid grid-cols-2 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.totalBuildings}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950">
              {data.buildings.length}
            </p>
          </div>
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.paidBuildings}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-emerald-700">
              {paidBuildingsCount}
            </p>
          </div>
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.pendingRequests}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950">
              {pendingRequests.length}
            </p>
          </div>
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {t.admin.estimatedArr}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold text-zinc-950">
              {formatMAD(estimatedArr, locale)}
            </p>
          </div>
        </div>

        {/* Pending Activation Requests Queue */}
        <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-950">
              {t.admin.pendingQueue} ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="p-6 text-xs text-zinc-400">{t.admin.noPending}</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-800">
                        {req.referenceCode}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {req.buildingName}
                      </h3>
                      <span className="tabular-nums text-xs font-medium text-zinc-600">
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
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        <Eye className="h-3.5 w-3.5 text-zinc-400" />
                        {t.admin.viewProof}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => adminApproveRequest(req.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t.admin.approve}
                    </button>
                    <button
                      type="button"
                      onClick={() => adminRejectRequest(req.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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

        {/* All Buildings Management Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-950">
              {t.admin.allBuildings}
            </h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {data.buildings.map((b) => {
              const unitsCount = data.apartments.filter(
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
                      <span className="text-sm font-semibold text-zinc-900">
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
                      <span className="text-zinc-600">
                        {access.mode === "active" &&
                          `${t.banners.activePlanTitle} (${
                            b.planExpiresAt
                              ? formatDateShort(b.planExpiresAt, locale)
                              : ""
                          })`}
                        {access.mode === "trial" &&
                          `${t.banners.trialTitle} (${access.daysRemaining}j)`}
                        {access.mode === "free_tier" && t.banners.freeTierTitle}
                        {access.mode === "expired" && t.banners.expiredTitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adminActivateBuilding(b.id, 12)}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      {t.admin.activateYear}
                    </button>
                    <button
                      type="button"
                      onClick={() => adminActivateBuilding(b.id, 6)}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      {t.admin.activateSixMonths}
                    </button>
                    <button
                      type="button"
                      onClick={() => adminSetBuildingExpired(b.id)}
                      className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
        <div className="fixed bottom-6 end-4 z-50 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl">
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
