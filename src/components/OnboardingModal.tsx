"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/context/AppContext";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const { t, createBuilding } = useApp();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [city, setCity] = useState("Casablanca");
  const [defaultFee, setDefaultFee] = useState(200);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [rib, setRib] = useState("");

  const [unitCount, setUnitCount] = useState(12);
  const [prefix, setPrefix] = useState("Apt");
  const [includeShop, setIncludeShop] = useState(false);
  const [shopFee, setShopFee] = useState(350);

  const generatedUnits = useMemo(() => {
    const safeCount = Math.min(60, Math.max(1, Number(unitCount) || 1));
    const list = Array.from({ length: safeCount }, (_, idx) => ({
      unitLabel: `${prefix.trim() || "Apt"} ${idx + 1}`,
      residentName: "",
      phone: "",
      monthlyFee: Number(defaultFee) || 200,
    }));
    if (includeShop) {
      list.push({
        unitLabel: "Magasin RDC",
        residentName: "",
        phone: "",
        monthlyFee: Number(shopFee) || 350,
      });
    }
    return list;
  }, [unitCount, prefix, defaultFee, includeShop, shopFee]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    createBuilding({
      name: name.trim() || "Résidence Al Amal",
      city: city.trim() || "Casablanca",
      defaultMonthlyFee: Number(defaultFee) || 200,
      openingBalance: Number(openingBalance) || 0,
      rib,
      units: generatedUnits,
    });
    setStep(1);
    setName("");
    onClose();
  };

  return (
    <div
      className="ss-animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="ss-animate-modal w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.onboarding.title}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {step === 1 ? t.onboarding.step1 : t.onboarding.step2}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form key={step} onSubmit={handleSubmit} className="ss-animate-tab space-y-4 p-6">
          {step === 1 ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.settings.buildingName} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.onboarding.namePlaceholder}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.settings.city}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t.onboarding.cityPlaceholder}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.settings.defaultFee}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={defaultFee}
                    onChange={(e) => setDefaultFee(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 tabular-nums text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.settings.openingBalance}
                  </label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 tabular-nums text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.settings.rib}
                  </label>
                  <input
                    type="text"
                    value={rib}
                    onChange={(e) => setRib(e.target.value)}
                    placeholder="230 780 ..."
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.payments.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {t.onboarding.nextStep}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.onboarding.unitCountLabel}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={unitCount}
                    onChange={(e) => setUnitCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 tabular-nums text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.onboarding.prefixLabel}
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={includeShop}
                    onChange={(e) => setIncludeShop(e.target.checked)}
                    className="h-4 w-4 rounded accent-zinc-900 dark:accent-zinc-100"
                  />
                  {t.onboarding.includeShopLabel}
                </label>
                {includeShop && (
                  <div className="mt-2.5">
                    <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {t.onboarding.shopFeeLabel}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={shopFee}
                      onChange={(e) => setShopFee(Number(e.target.value))}
                      className="w-36 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 tabular-nums text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {t.onboarding.previewTitle} ({generatedUnits.length})
                </p>
                <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                  {generatedUnits.map((u) => (
                    <span
                      key={u.unitLabel}
                      className="rounded-md border border-zinc-200/80 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {u.unitLabel} ({u.monthlyFee} {t.common.mad})
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.onboarding.back}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {t.onboarding.createBtn}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
