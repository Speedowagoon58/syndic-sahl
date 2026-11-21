"use client";

import React, { useState } from "react";
import {
  Camera,
  Check,
  Copy,
  MessageCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  FOUNDER_ACCOUNT_HOLDER,
  FOUNDER_BANK_NAME,
  FOUNDER_CASHPLUS_NAME,
  FOUNDER_RIB,
  FOUNDER_WHATSAPP,
  PLANS,
} from "@/lib/config";
import {
  formatDateShort,
  formatMAD,
  getBuildingReferenceCode,
} from "@/lib/calculations";
import { compressImageToDataUrl } from "@/lib/image";
import {
  buildNeighborPitchMessage,
  buildUpgradeConfirmationMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import type { PlanDuration, SubscriptionChannel } from "@/lib/types";

export function SubscriptionTab() {
  const {
    t,
    locale,
    whatsappLang,
    data,
    activeBuilding,
    buildingApartments,
    submitSubscriptionRequest,
    showToast,
  } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<PlanDuration>("annual");
  const [channel, setChannel] = useState<SubscriptionChannel>("virement");
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const activeUnits = buildingApartments.filter((a) => a.active).length;
  const referenceCode = getBuildingReferenceCode(activeBuilding.id);
  const buildingRequests = data.subscriptionRequests.filter(
    (r) => r.buildingId === activeBuilding.id
  );

  const handleCopy = (value: string) => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(value);
    showToast(t.subscription.copied);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageToDataUrl(file);
    setProofUrl(compressed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = submitSubscriptionRequest({
      plan: selectedPlan,
      channel,
      proofPhotoUrl: proofUrl,
      note,
    });
    const msg = buildUpgradeConfirmationMessage({
      buildingName: activeBuilding.name,
      referenceCode: ref,
      plan: selectedPlan,
      channel,
      note,
    });
    const url = buildWhatsAppUrl(FOUNDER_WHATSAPP, msg);
    window.open(url, "_blank", "noopener,noreferrer");
    setNote("");
    setProofUrl(null);
  };

  const neighborPitchUrl = buildWhatsAppUrl(
    null,
    buildNeighborPitchMessage({
      lang: whatsappLang,
      buildingName: activeBuilding.name,
      activeUnits,
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
          {t.subscription.title}
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          {t.subscription.subtitle}
        </p>
      </div>

      {/* Pricing Cards — Restrained Linear / Stripe aesthetic */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Free Tier */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
          <div>
            <span className="text-xs font-semibold text-zinc-500">
              {t.subscription.freeTierName}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
              {t.subscription.freeTierPrice}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {t.subscription.freeTierLimit}
            </p>
          </div>
          <div className="mt-6 border-t border-zinc-100 pt-3 text-xs text-zinc-400">
            {activeUnits <= 8
              ? "Actif pour cet immeuble"
              : `${activeUnits} lots actifs`}
          </div>
        </div>

        {/* Semi-Annual */}
        <div
          onClick={() => setSelectedPlan("semi_annual")}
          className={`cursor-pointer flex flex-col justify-between rounded-xl border p-5 transition-all ${
            selectedPlan === "semi_annual"
              ? "border-zinc-900 bg-white ring-1 ring-zinc-900"
              : "border-zinc-200/90 bg-white hover:border-zinc-300"
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-zinc-700">
              {t.subscription.semiAnnualName}
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
                {t.subscription.semiAnnualPrice}
              </span>
              <span className="text-xs text-zinc-400">
                {t.subscription.semiAnnualPeriod}
              </span>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-zinc-600">
              {t.subscription.featuresList.slice(0, 3).map((feat) => (
                <li key={feat} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPlan("semi_annual")}
            className={`mt-6 w-full rounded-lg py-2 text-xs font-medium transition-colors ${
              selectedPlan === "semi_annual"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {selectedPlan === "semi_annual"
              ? t.subscription.selectedPlan
              : t.subscription.choosePlan}
          </button>
        </div>

        {/* Annual Recommended */}
        <div
          onClick={() => setSelectedPlan("annual")}
          className={`cursor-pointer flex flex-col justify-between rounded-xl border p-5 transition-all ${
            selectedPlan === "annual"
              ? "border-zinc-900 bg-white ring-1 ring-zinc-900"
              : "border-zinc-200/90 bg-white hover:border-zinc-300"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">
                {t.subscription.annualName}
              </span>
              <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">
                {t.subscription.recommendedBadge}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="tabular-nums text-2xl font-semibold tracking-tight text-zinc-950">
                {t.subscription.annualPrice}
              </span>
              <span className="text-xs text-zinc-400">
                {t.subscription.annualPeriod}
              </span>
            </div>
            <p className="mt-1 text-xs text-emerald-700 font-medium">
              {t.subscription.perAptNote}
            </p>
            <ul className="mt-4 space-y-2 text-xs text-zinc-600">
              {t.subscription.featuresList.map((feat) => (
                <li key={feat} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-zinc-900 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPlan("annual")}
            className={`mt-6 w-full rounded-lg py-2 text-xs font-medium transition-colors ${
              selectedPlan === "annual"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {selectedPlan === "annual"
              ? t.subscription.selectedPlan
              : t.subscription.choosePlan}
          </button>
        </div>
      </div>

      {/* Moroccan Payment Box: Virement / CashPlus */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-4">
            <h2 className="text-sm font-semibold text-zinc-950">
              {t.subscription.paymentTitle} —{" "}
              <span className="tabular-nums text-zinc-900">
                {formatMAD(PLANS[selectedPlan].priceMAD, locale)}
              </span>
            </h2>

            <div className="inline-flex rounded-lg border border-zinc-200/90 bg-zinc-100/80 p-0.5">
              <button
                type="button"
                onClick={() => setChannel("virement")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  channel === "virement"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-500"
                }`}
              >
                {t.subscription.tabVirement}
              </button>
              <button
                type="button"
                onClick={() => setChannel("cashplus")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  channel === "cashplus"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-500"
                }`}
              >
                {t.subscription.tabCashplus}
              </button>
            </div>
          </div>

          {channel === "virement" ? (
            <div className="mt-4 space-y-2.5 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-4 text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-zinc-500">
                  {t.subscription.bankNameLabel}
                </span>
                <span className="font-medium text-zinc-900">
                  {FOUNDER_BANK_NAME}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-zinc-500">
                  {t.subscription.holderLabel}
                </span>
                <span className="font-medium text-zinc-900">
                  {FOUNDER_ACCOUNT_HOLDER}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/70 pt-2.5">
                <div>
                  <span className="block text-zinc-400">
                    {t.subscription.ribLabel}
                  </span>
                  <span className="font-mono text-sm font-semibold text-zinc-950">
                    {FOUNDER_RIB}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(FOUNDER_RIB)}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Copy className="h-3 w-3" />
                  {t.subscription.copyRib}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/70 pt-2.5">
                <span className="text-zinc-500">{t.subscription.refLabel}</span>
                <span className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-zinc-900">
                  {referenceCode}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-4 text-xs">
              <p className="text-zinc-600">
                {t.subscription.cashplusInstructions}
              </p>
              <div className="flex flex-wrap justify-between gap-2 border-t border-zinc-200/70 pt-2.5">
                <span className="text-zinc-500">
                  {t.subscription.cashplusRecipient}
                </span>
                <span className="font-medium text-zinc-900">
                  {FOUNDER_CASHPLUS_NAME}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-500">{t.subscription.refLabel}</span>
                <span className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-zinc-900">
                  {referenceCode}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                {t.subscription.proofLabel}
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs font-medium text-zinc-600 hover:border-zinc-900">
                <Camera className="h-4 w-4 text-zinc-500" />
                <span>
                  {proofUrl ? t.expenses.photoReady : t.expenses.photoHint}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                {t.subscription.noteLabel}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.subscription.notePlaceholder}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              {t.subscription.submitBtn}
            </button>
          </form>
        </div>

        {/* Neighbor Pitch Card & Request History */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-sm font-semibold text-zinc-950">
              {t.subscription.convinceTitle}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              {t.subscription.convinceDesc}
            </p>
            <a
              href={neighborPitchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              {t.subscription.convinceBtn}
            </a>
          </div>

          {buildingRequests.length > 0 && (
            <div className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
                {t.subscription.requestsHistory}
              </h3>
              <div className="space-y-2">
                {buildingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="tabular-nums font-medium text-zinc-900">
                        {formatMAD(req.amountMAD, locale)} • {req.referenceCode}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {formatDateShort(req.createdAt, locale)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        req.status === "approved"
                          ? "text-emerald-700"
                          : req.status === "rejected"
                          ? "text-red-600"
                          : "text-amber-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          req.status === "approved"
                            ? "bg-emerald-600"
                            : req.status === "rejected"
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {req.status === "approved"
                        ? t.subscription.statusApproved
                        : req.status === "rejected"
                        ? t.subscription.statusRejected
                        : t.subscription.statusPending}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
