import { FREE_LOT_LIMIT } from "./config";
import { translations } from "./i18n";
import type {
  Apartment,
  BillingCycle,
  Building,
  Expense,
  ExpenseCategory,
  Locale,
  Payment,
} from "./types";

const MAX_MONTH_SPAN = 120;

export function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const year = Number(match[1]);
  const month = Math.min(12, Math.max(1, Number(match[2])));
  return { year, month };
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function listMonthKeysBetween(startMonth: string, endMonth: string): string[] {
  if (startMonth > endMonth) return [];
  const list: string[] = [];
  let cursor = startMonth;
  let guard = 0;
  while (cursor <= endMonth && guard < MAX_MONTH_SPAN) {
    list.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
    guard += 1;
  }
  return list;
}

export function formatMonthLabel(monthKey: string, locale: Locale): string {
  const { year, month } = parseMonthKey(monthKey);
  const name = translations[locale].months[month - 1] ?? monthKey;
  return `${name} ${year}`;
}

export function formatMAD(amount: number, locale: Locale): string {
  const rounded = Math.round(amount * 100) / 100;
  const formatted = new Intl.NumberFormat(locale === "ar" ? "fr-MA" : "fr-MA", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `${formatted} ${locale === "ar" ? "درهم" : "MAD"}`;
}

export function formatDateShort(isoDate: string, locale: Locale): string {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function computeApartmentArrears(
  apartment: Apartment,
  payments: Payment[],
  upToMonthKey: string,
  buildingStartMonth: string
): { unpaidMonths: string[]; totalOwed: number } {
  if (!apartment.active) {
    return { unpaidMonths: [], totalOwed: 0 };
  }
  const months = listMonthKeysBetween(buildingStartMonth, upToMonthKey);
  const paidMonths = new Set(
    payments
      .filter((p) => p.apartmentId === apartment.id)
      .map((p) => p.monthKey)
  );
  const unpaidMonths = months.filter((m) => !paidMonths.has(m));
  return {
    unpaidMonths,
    totalOwed: unpaidMonths.length * apartment.monthlyFee,
  };
}

export function emptyCategoryTotals(): Record<ExpenseCategory, number> {
  return {
    gardiennage: 0,
    eau_electricite: 0,
    ascenseur: 0,
    nettoyage: 0,
    reparation: 0,
    autre: 0,
  };
}

export interface BuildingSummary {
  openingBalance: number;
  totalCollectedAllTime: number;
  totalExpensesAllTime: number;
  currentBalance: number;
  monthCollected: number;
  monthExpected: number;
  monthExpensesTotal: number;
  paidCount: number;
  totalActiveUnits: number;
  totalArrears: number;
  expensesByCategory: Record<ExpenseCategory, number>;
}

export function computeBuildingSummary(
  building: Building,
  apartments: Apartment[],
  payments: Payment[],
  expenses: Expense[],
  selectedMonthKey: string
): BuildingSummary {
  const activeApartments = apartments.filter(
    (a) => a.buildingId === building.id && a.active
  );
  const buildingPayments = payments.filter((p) => p.buildingId === building.id);
  const buildingExpenses = expenses.filter((e) => e.buildingId === building.id);

  const totalCollectedAllTime = buildingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpensesAllTime = buildingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currentBalance =
    building.openingBalance + totalCollectedAllTime - totalExpensesAllTime;

  const monthPayments = buildingPayments.filter((p) => p.monthKey === selectedMonthKey);
  const monthCollected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const monthExpected = activeApartments.reduce((sum, a) => sum + a.monthlyFee, 0);

  const paidApartmentIds = new Set(monthPayments.map((p) => p.apartmentId));
  const paidCount = activeApartments.filter((a) => paidApartmentIds.has(a.id)).length;

  const monthExpenses = buildingExpenses.filter((e) =>
    e.expenseDate.startsWith(selectedMonthKey)
  );
  const monthExpensesTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = emptyCategoryTotals();
  for (const exp of monthExpenses) {
    expensesByCategory[exp.category] += exp.amount;
  }

  let totalArrears = 0;
  for (const apt of activeApartments) {
    totalArrears += computeApartmentArrears(
      apt,
      buildingPayments,
      selectedMonthKey,
      building.startMonth
    ).totalOwed;
  }

  return {
    openingBalance: building.openingBalance,
    totalCollectedAllTime,
    totalExpensesAllTime,
    currentBalance,
    monthCollected,
    monthExpected,
    monthExpensesTotal,
    paidCount,
    totalActiveUnits: activeApartments.length,
    totalArrears,
    expensesByCategory,
  };
}

export function computeAllTimeCategoryTotals(
  expenses: Expense[],
  buildingId: string
): Record<ExpenseCategory, { total: number; count: number }> {
  const result: Record<ExpenseCategory, { total: number; count: number }> = {
    gardiennage: { total: 0, count: 0 },
    eau_electricite: { total: 0, count: 0 },
    ascenseur: { total: 0, count: 0 },
    nettoyage: { total: 0, count: 0 },
    reparation: { total: 0, count: 0 },
    autre: { total: 0, count: 0 },
  };

  for (const exp of expenses) {
    if (exp.buildingId !== buildingId) continue;
    result[exp.category].total += exp.amount;
    result[exp.category].count += 1;
  }

  return result;
}

export interface PlanAccessInfo {
  mode: "free_tier" | "trial" | "active" | "expired";
  isReadOnly: boolean;
  daysRemaining: number;
}

export function getPlanAccess(
  building: Building,
  activeUnitCount: number,
  nowMs: number = Date.now()
): PlanAccessInfo {
  if (activeUnitCount <= FREE_LOT_LIMIT) {
    return { mode: "free_tier", isReadOnly: false, daysRemaining: 0 };
  }

  const msPerDay = 1000 * 60 * 60 * 24;

  if (building.planStatus === "active" && building.planExpiresAt) {
    const expiresMs = new Date(building.planExpiresAt).getTime();
    if (expiresMs > nowMs) {
      return {
        mode: "active",
        isReadOnly: false,
        daysRemaining: Math.max(1, Math.ceil((expiresMs - nowMs) / msPerDay)),
      };
    }
  }

  if (building.planStatus === "trial" && building.trialEndsAt) {
    const trialMs = new Date(building.trialEndsAt).getTime();
    if (trialMs > nowMs) {
      return {
        mode: "trial",
        isReadOnly: false,
        daysRemaining: Math.max(1, Math.ceil((trialMs - nowMs) / msPerDay)),
      };
    }
  }

  return { mode: "expired", isReadOnly: true, daysRemaining: 0 };
}

export function generateReceiptNumber(
  existingPayments: Payment[],
  monthKey: string
): string {
  const year = monthKey.slice(0, 4) || String(new Date().getFullYear());
  const prefix = `REC-${year}-`;
  let maxSeq = 0;
  for (const p of existingPayments) {
    if (p.receiptNumber.startsWith(prefix)) {
      const seq = Number.parseInt(p.receiptNumber.slice(prefix.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export function slugifyBuildingName(name: string, existingSlugs: string[]): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "residence";

  if (!existingSlugs.includes(base)) return base;
  let suffix = 2;
  while (existingSlugs.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function getBuildingReferenceCode(buildingId: string): string {
  const cleaned = buildingId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `SYN-${cleaned.slice(-5).padStart(4, "0")}`;
}

/** Normalizes any string/CSV token into a supported resident billing cycle. */
export function normalizeBillingCycle(value: unknown): BillingCycle {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (
    raw === "quarterly" ||
    raw.startsWith("trimestr") ||
    raw === "trim" ||
    raw === "3" ||
    raw === "3m" ||
    raw.includes("ربع")
  ) {
    return "quarterly";
  }
  if (
    raw === "annual" ||
    raw === "yearly" ||
    raw.startsWith("annuel") ||
    raw === "12" ||
    raw === "12m" ||
    raw === "1y" ||
    raw.includes("سنو")
  ) {
    return "annual";
  }
  return "monthly";
}

/** Returns how many months a resident billing cycle covers per installment. */
export function getBillingCycleMonths(cycle?: BillingCycle): number {
  if (cycle === "quarterly") return 3;
  if (cycle === "annual") return 12;
  return 1;
}
