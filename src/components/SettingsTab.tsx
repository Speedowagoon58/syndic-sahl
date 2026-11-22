"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Copy,
  Download,
  FileSpreadsheet,
  Layers,
  MessageCircle,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { computeBuildingSummary } from "@/lib/calculations";
import {
  buildGroupTransparencyMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";

function parseCsvLinesToUnits(
  rawText: string,
  defaultFee: number
): {
  unitLabel: string;
  residentName: string;
  phone: string;
  monthlyFee: number;
}[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const units: {
    unitLabel: string;
    residentName: string;
    phone: string;
    monthlyFee: number;
  }[] = [];

  for (const line of lines) {
    // Skip header row if present
    if (/^(lot|appartement|unit)\b/i.test(line) && /[;,\t]/.test(line)) {
      continue;
    }
    const parts = line
      .split(/\t|;|,/)
      .map((p) => p.trim().replace(/^["']|["']$/g, ""));

    const unitLabel = parts[0] || "";
    if (!unitLabel) continue;
    const residentName = parts[1] || "";
    const phone = parts[2] || "";
    const parsedFee = parts[3] ? Number(parts[3].replace(/[^\d.]/g, "")) : NaN;
    const monthlyFee =
      !Number.isNaN(parsedFee) && parsedFee > 0 ? parsedFee : defaultFee;

    units.push({ unitLabel, residentName, phone, monthlyFee });
  }

  return units;
}

export function SettingsTab() {
  const {
    t,
    whatsappLang,
    data,
    activeBuilding,
    buildingApartments,
    buildingPayments,
    buildingExpenses,
    selectedMonthKey,
    updateBuildingSettings,
    deleteBuilding,
    addApartment,
    bulkAddApartments,
    importApartmentsBatch,
    updateApartment,
    adminSetBuildingExpired,
    adminRestoreBuildingTrial,
    resetDemoData,
    showToast,
  } = useApp();

  const [name, setName] = useState(activeBuilding.name);
  const [city, setCity] = useState(activeBuilding.city);
  const [defaultFee, setDefaultFee] = useState(activeBuilding.defaultMonthlyFee);
  const [openingBalance, setOpeningBalance] = useState(
    activeBuilding.openingBalance
  );
  const [startMonth, setStartMonth] = useState(activeBuilding.startMonth);
  const [rib, setRib] = useState(activeBuilding.rib);
  const [sharePin, setSharePin] = useState(activeBuilding.sharePin);
  const [showNames, setShowNames] = useState(activeBuilding.showNamesPublicly);

  const [lastBuildingId, setLastBuildingId] = useState(activeBuilding.id);
  if (lastBuildingId !== activeBuilding.id) {
    setLastBuildingId(activeBuilding.id);
    setName(activeBuilding.name);
    setCity(activeBuilding.city);
    setDefaultFee(activeBuilding.defaultMonthlyFee);
    setOpeningBalance(activeBuilding.openingBalance);
    setStartMonth(activeBuilding.startMonth);
    setRib(activeBuilding.rib);
    setSharePin(activeBuilding.sharePin);
    setShowNames(activeBuilding.showNamesPublicly);
  }

  const [newLabel, setNewLabel] = useState("");
  const [newResident, setNewResident] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFee, setNewFee] = useState(activeBuilding.defaultMonthlyFee);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState("Apt");
  const [bulkStart, setBulkStart] = useState(buildingApartments.length + 1);
  const [bulkCount, setBulkCount] = useState(5);

  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState("");

  const parsedCsvUnits = useMemo(
    () => parseCsvLinesToUnits(csvText, activeBuilding.defaultMonthlyFee),
    [csvText, activeBuilding.defaultMonthlyFee]
  );

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

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const portalUrl = `${origin}/r/${activeBuilding.shareSlug}`;

  const handleSaveBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    updateBuildingSettings(activeBuilding.id, {
      name: name.trim() || activeBuilding.name,
      city: city.trim(),
      defaultMonthlyFee: Number(defaultFee) || 200,
      openingBalance: Number(openingBalance) || 0,
      startMonth,
      rib: rib.trim(),
      sharePin: sharePin.replace(/\D/g, "").slice(0, 4),
      showNamesPublicly: showNames,
    });
  };

  const handleAddApartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const ok = addApartment({
      unitLabel: newLabel,
      residentName: newResident,
      phone: newPhone,
      monthlyFee: Number(newFee) || activeBuilding.defaultMonthlyFee,
    });
    if (ok) {
      setNewLabel("");
      setNewResident("");
      setNewPhone("");
    }
  };

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = bulkAddApartments({
      prefix: bulkPrefix,
      startFrom: Number(bulkStart) || 1,
      count: Number(bulkCount) || 1,
      monthlyFee: activeBuilding.defaultMonthlyFee,
    });
    if (ok) {
      setShowBulk(false);
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDownloadSampleCsv = () => {
    const sample = [
      "Lot;Nom du coproprietaire;Telephone WhatsApp;Cotisation MAD",
      "Apt 1;M. Karim Benali;0661234501;250",
      "Apt 2;Mme Nadia El Fassi;0661234502;250",
      "Apt 3;M. Youssef Tazi;0662345603;250",
      "Magasin RDC;Pharmacie Al Amal;0661987612;400",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-lots-syndicsahl.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmCsvImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedCsvUnits.length === 0) return;
    const ok = importApartmentsBatch(parsedCsvUnits);
    if (ok) {
      setCsvText("");
      setShowCsvImport(false);
    }
  };

  const groupShareWaUrl = buildWhatsAppUrl(
    null,
    buildGroupTransparencyMessage({
      lang: whatsappLang,
      buildingName: activeBuilding.name,
      portalUrl,
      sharePin: activeBuilding.sharePin,
      currentBalance: summary.currentBalance,
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
          {t.settings.title}
        </h1>
      </div>

      {/* 1. Public Resident Transparency Link */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              {t.settings.portalTitle}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {t.settings.portalDesc}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/r/${activeBuilding.shareSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span>{t.settings.openPortal}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>
            <a
              href={groupShareWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{t.settings.sharePortalWa}</span>
            </a>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3.5 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          <code
            dir="ltr"
            className="truncate font-mono text-xs text-zinc-700 dark:text-zinc-300"
          >
            {portalUrl}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(portalUrl);
              showToast(t.header.linkCopied);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 shrink-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Copy className="h-3 w-3" />
            <span>{t.settings.copyPortal}</span>
          </button>
        </div>
      </div>

      {/* 2. Building Profile & Privacy Settings */}
      <form
        onSubmit={handleSaveBuilding}
        className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-5 dark:border-zinc-800 dark:bg-[#111113]"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            {t.settings.profileTitle}
          </h2>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{t.settings.saveBuilding}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t.settings.buildingName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t.settings.city}
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
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
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 tabular-nums text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t.settings.openingBalance}
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 tabular-nums text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t.settings.startMonth}
            </label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
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
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t.settings.pinLabel}
            </label>
            <input
              type="text"
              maxLength={4}
              value={sharePin}
              onChange={(e) =>
                setSharePin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder={t.settings.pinPlaceholder}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
            />
          </div>
          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">
              <input
                type="checkbox"
                checked={showNames}
                onChange={(e) => setShowNames(e.target.checked)}
                className="h-4 w-4 rounded accent-zinc-900 dark:accent-zinc-100"
              />
              {t.settings.showNamesLabel}
            </label>
            <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              {t.settings.showNamesHint}
            </p>
          </div>
        </div>
      </form>

      {/* 3. Apartments Ledger Manager */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-2xs space-y-4 dark:border-zinc-800 dark:bg-[#111113]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            {t.settings.apartmentsTitle} ({buildingApartments.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCsvImport(!showCsvImport);
                setShowBulk(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>{t.settings.importCsvBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBulkStart(buildingApartments.length + 1);
                setShowBulk(!showBulk);
                setShowCsvImport(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Layers className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>{t.settings.bulkAddUnits}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Excel / CSV / WhatsApp List Importer */}
        {showCsvImport && (
          <form
            onSubmit={handleConfirmCsvImport}
            className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.settings.importCsvTitle}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {t.settings.importCsvHint}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Download className="h-3 w-3" />
                  <span>{t.settings.importDownloadSample}</span>
                </button>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  <Upload className="h-3 w-3" />
                  <span>{t.settings.importUploadFile}</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleCsvFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={t.settings.importCsvPlaceholder}
              className="w-full rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <strong className="tabular-nums text-zinc-900 dark:text-zinc-100">
                  {parsedCsvUnits.length}
                </strong>{" "}
                {t.settings.importDetectedCount}
              </span>
              <button
                type="submit"
                disabled={parsedCsvUnits.length === 0}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {t.settings.importConfirmBtn} ({parsedCsvUnits.length})
              </button>
            </div>
          </form>
        )}

        {showBulk && (
          <form
            onSubmit={handleBulkAdd}
            className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {t.settings.bulkPrefix}
              </label>
              <input
                type="text"
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {t.settings.bulkStartFrom}
              </label>
              <input
                type="number"
                min={1}
                value={bulkStart}
                onChange={(e) => setBulkStart(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {t.settings.bulkCount}
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {t.settings.bulkConfirm}
              </button>
            </div>
          </form>
        )}

        {/* Quick Add Single Apartment */}
        <form
          onSubmit={handleAddApartment}
          className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-2.5 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-5"
        >
          <input
            type="text"
            required
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t.settings.unitLabel}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <input
            type="text"
            value={newResident}
            onChange={(e) => setNewResident(e.target.value)}
            placeholder={t.settings.residentName}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 sm:col-span-2"
          />
          <input
            type="text"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder={t.settings.phone}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <div className="flex gap-1.5">
            <input
              type="number"
              min={0}
              value={newFee}
              onChange={(e) => setNewFee(Number(e.target.value))}
              placeholder={t.settings.customFee}
              className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 tabular-nums text-xs text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t.settings.addUnit}</span>
            </button>
          </div>
        </form>

        {/* Editable Apartments Rows */}
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200/90 dark:divide-zinc-800 dark:border-zinc-800">
          {buildingApartments.map((apt) => (
            <div
              key={apt.id}
              className="grid grid-cols-1 items-center gap-2 p-2.5 sm:grid-cols-12"
            >
              <div className="sm:col-span-2">
                <input
                  type="text"
                  defaultValue={apt.unitLabel}
                  onBlur={(e) => {
                    if (e.target.value !== apt.unitLabel) {
                      updateApartment(apt.id, { unitLabel: e.target.value });
                    }
                  }}
                  className="w-full rounded-md border border-zinc-200/80 bg-zinc-50/50 px-2.5 py-1 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-950 dark:focus:border-zinc-400"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="text"
                  defaultValue={apt.residentName}
                  placeholder={t.settings.residentName}
                  onBlur={(e) => {
                    if (e.target.value !== apt.residentName) {
                      updateApartment(apt.id, { residentName: e.target.value });
                    }
                  }}
                  className="w-full rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  defaultValue={apt.phone}
                  placeholder={t.settings.phone}
                  onBlur={(e) => {
                    if (e.target.value !== apt.phone) {
                      updateApartment(apt.id, { phone: e.target.value });
                    }
                  }}
                  className="w-full rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 font-mono text-xs text-zinc-600 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  min={0}
                  defaultValue={apt.monthlyFee}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val !== apt.monthlyFee) {
                      updateApartment(apt.id, { monthlyFee: val });
                    }
                  }}
                  className="w-full rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 tabular-nums text-xs font-medium text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
                />
              </div>
              <div className="sm:col-span-1 text-end">
                <button
                  type="button"
                  onClick={() =>
                    updateApartment(apt.id, { active: !apt.active })
                  }
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    apt.active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  }`}
                >
                  {apt.active
                    ? t.settings.activeLabel
                    : t.settings.inactiveLabel}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Developer / Founder & Danger Controls */}
      <div className="rounded-xl border border-zinc-200/80 bg-zinc-100/60 p-5 dark:border-zinc-800 dark:bg-[#111113]">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">
          {t.settings.demoToolsTitle}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => adminSetBuildingExpired(activeBuilding.id)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.settings.simulateExpired}
          </button>

          <button
            type="button"
            onClick={() => adminRestoreBuildingTrial(activeBuilding.id)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.settings.restoreTrial}
          </button>

          <button
            type="button"
            onClick={resetDemoData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
            <span>{t.settings.resetDemo}</span>
          </button>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <span>{t.settings.openAdminPanel}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            disabled={data.buildings.length <= 1}
            onClick={() => {
              if (data.buildings.length <= 1) return;
              if (window.confirm(t.settings.deleteBuildingConfirm)) {
                deleteBuilding(activeBuilding.id);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/60 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t.settings.deleteBuildingBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
