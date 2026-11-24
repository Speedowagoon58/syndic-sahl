"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  Camera,
  Download,
  Eye,
  Plus,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  computeAllTimeCategoryTotals,
  formatDateShort,
  formatMAD,
} from "@/lib/calculations";
import { exportExpensesCsv } from "@/lib/export-csv";
import { compressImageToDataUrl } from "@/lib/image";
import { ReceiptLightbox } from "@/components/ReceiptLightbox";
import type { ExpenseCategory } from "@/lib/types";

const CATEGORIES: ExpenseCategory[] = [
  "gardiennage",
  "eau_electricite",
  "ascenseur",
  "nettoyage",
  "reparation",
  "autre",
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  gardiennage: "bg-zinc-900 dark:bg-zinc-200",
  eau_electricite: "bg-emerald-600",
  ascenseur: "bg-amber-500",
  nettoyage: "bg-sky-600",
  reparation: "bg-rose-500",
  autre: "bg-zinc-400",
};

export function ExpensesTab() {
  const {
    t,
    locale,
    activeBuilding,
    buildingExpenses,
    selectedMonthKey,
    addExpense,
    deleteExpense,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("eau_electricite");
  const [amount, setAmount] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    url: string;
    caption: string;
  } | null>(null);

  const categoryTotals = useMemo(
    () => computeAllTimeCategoryTotals(buildingExpenses, activeBuilding.id),
    [buildingExpenses, activeBuilding.id]
  );

  const totalAllTime = useMemo(
    () => buildingExpenses.reduce((sum, e) => sum + e.amount, 0),
    [buildingExpenses]
  );

  const totalThisMonth = useMemo(
    () =>
      buildingExpenses
        .filter((e) => e.expenseDate.startsWith(selectedMonthKey))
        .reduce((sum, e) => sum + e.amount, 0),
    [buildingExpenses, selectedMonthKey]
  );

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageToDataUrl(file);
    setPhotoUrl(compressed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    const ok = addExpense({
      category,
      amount: numAmount,
      expenseDate,
      description,
      receiptPhotoUrl: photoUrl,
    });
    if (ok) {
      setAmount("");
      setDescription("");
      setPhotoUrl(null);
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            {t.expenses.title}
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {t.expenses.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportExpensesCsv(activeBuilding, buildingExpenses, locale)
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            <span>{t.expenses.exportCsv}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.expenses.addExpense}</span>
          </button>
        </div>
      </div>

      {/* Unified Spend Summary & Stacked Distribution Bar */}
      <div className="ss-animate-fade-up overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
        <div className="grid grid-cols-1 divide-y divide-zinc-200/80 dark:divide-zinc-800 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
              {t.expenses.totalThisMonth}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {formatMAD(totalThisMonth, locale)}
            </p>
          </div>
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
              {t.expenses.totalAllTime}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {formatMAD(totalAllTime, locale)}
            </p>
          </div>
          <div className="p-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
              {t.expenses.receiptsCountLabel}
            </span>
            <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {buildingExpenses.filter((e) => e.receiptPhotoUrl).length}{" "}
              <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                / {buildingExpenses.length}
              </span>
            </p>
          </div>
        </div>

        {/* Stacked Spend Breakdown Bar */}
        <div className="border-t border-zinc-200/80 bg-zinc-50/40 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-200/70 gap-0.5 dark:bg-zinc-800">
            {CATEGORIES.map((cat) => {
              const total = categoryTotals[cat].total;
              const pct =
                totalAllTime > 0 ? (total / totalAllTime) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={cat}
                  className={`h-full transition-[width] duration-700 ease-out ${CATEGORY_COLORS[cat]}`}
                  style={{ width: `${pct}%` }}
                  title={`${t.expenses.categories[cat]}: ${formatMAD(total, locale)}`}
                />
              );
            })}
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((cat) => {
              const info = categoryTotals[cat];
              return (
                <div key={cat} className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[cat]}`}
                    />
                    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {t.expenses.categories[cat]}
                    </span>
                  </div>
                  <span className="mt-0.5 tabular-nums text-xs font-semibold text-zinc-900 ps-3.5 dark:text-zinc-100">
                    {formatMAD(info.total, locale)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expense Ledger Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#111113]">
        {buildingExpenses.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 dark:text-zinc-500">
            {t.expenses.noExpenses}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/50 text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500">
                  <th className="py-2.5 ps-4 pe-3 text-start">{t.expenses.colDate}</th>
                  <th className="px-3 py-2.5 text-start">
                    {t.expenses.descLabel}
                  </th>
                  <th className="px-3 py-2.5 text-start">
                    {t.expenses.categoryLabel}
                  </th>
                  <th className="px-3 py-2.5 text-start">{t.expenses.colReceipt}</th>
                  <th className="px-3 py-2.5 text-end">{t.expenses.colAmount}</th>
                  <th className="py-2.5 ps-3 pe-4 text-end" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800/80">
                {buildingExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                  >
                    <td className="py-3 ps-4 pe-3 whitespace-nowrap tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateShort(exp.expenseDate, locale)}
                    </td>
                    <td className="px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {exp.description}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            CATEGORY_COLORS[exp.category]
                          }`}
                        />
                        {t.expenses.categories[exp.category]}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {exp.receiptPhotoUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLightbox({
                              url: exp.receiptPhotoUrl!,
                              caption: exp.description,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <Image
                            src={exp.receiptPhotoUrl}
                            alt={exp.description}
                            width={18}
                            height={18}
                            unoptimized
                            className="h-4 w-4 rounded-xs object-cover"
                          />
                          <span>{t.expenses.viewPhoto}</span>
                          <Eye className="h-3 w-3 text-zinc-400" />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                          <Receipt className="h-3.5 w-3.5" />
                          {t.expenses.noPhoto}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-end tabular-nums whitespace-nowrap font-semibold text-zinc-900 dark:text-zinc-100">
                      -{formatMAD(exp.amount, locale)}
                    </td>
                    <td className="py-3 ps-3 pe-4 text-end whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t.expenses.confirmDelete)) {
                            deleteExpense(exp.id);
                          }
                        }}
                        title={t.expenses.deleteExpense}
                        aria-label={t.expenses.deleteExpense}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-modal-title"
          className="ss-animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
          onClick={() => setShowModal(false)}
        >
          <div
            className="ss-animate-modal w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <h3
                id="expense-modal-title"
                className="text-sm font-semibold text-zinc-950 dark:text-zinc-100"
              >
                {t.expenses.addExpense}
              </h3>
              <button
                type="button"
                aria-label={t.payments.cancel}
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.expenses.amountLabel} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="450"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 tabular-nums text-sm font-semibold text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {t.expenses.dateLabel}
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.expenses.categoryLabel}
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        category === cat
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {t.expenses.categories[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.expenses.descLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.expenses.descPlaceholder}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t.expenses.photoLabel}
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-xs font-medium text-zinc-600 hover:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-400">
                  <Camera className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span>{t.expenses.photoHint}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photoUrl && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    <span className="font-medium">{t.expenses.photoReady}</span>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      {t.expenses.removePhoto}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.payments.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {t.expenses.saveExpense}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReceiptLightbox
        imageUrl={lightbox?.url ?? null}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
