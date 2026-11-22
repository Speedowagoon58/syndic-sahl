import {
  computeApartmentArrears,
  formatDateShort,
  formatMonthLabel,
  normalizeBillingCycle,
} from "./calculations";
import { translations } from "./i18n";
import type {
  Apartment,
  Building,
  BuildingAnnouncement,
  Expense,
  Locale,
  MaintenanceTicket,
  Payment,
} from "./types";

export function escapeCsvCell(
  value: string | number | boolean | null | undefined
): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "0";
  }
  const raw = String(value ?? "");
  // Neutralize Excel/Calc formula injection for untrusted strings
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsvContent(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(";");
  const bodyLines = rows.map((row) =>
    row.map((cell) => escapeCsvCell(cell)).join(";")
  );
  // UTF-8 BOM + semicolon separator so Excel on French/Moroccan Windows opens accents cleanly
  return `\uFEFF${[headerLine, ...bodyLines].join("\r\n")}`;
}

function triggerDownload(
  filename: string,
  content: string,
  mimeType: string
): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugFilePart(building: Building): string {
  return (
    (building.shareSlug || building.name || "syndic")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "syndic"
  );
}

export function buildPaymentsCsv(
  apartments: Apartment[],
  payments: Payment[],
  locale: Locale
): string {
  const t = translations[locale];
  const aptMap = new Map(apartments.map((a) => [a.id, a]));
  const sorted = [...payments].sort(
    (a, b) =>
      b.monthKey.localeCompare(a.monthKey) || b.paidAt.localeCompare(a.paidAt)
  );

  const headers =
    locale === "ar"
      ? [
          "رقم الوصل",
          "الشهر",
          "الشقة",
          "الساكن",
          "المبلغ (درهم)",
          "طريقة الأداء",
          "تاريخ الأداء",
          "ملاحظة",
        ]
      : [
          "N° Reçu",
          "Mois",
          "Lot",
          "Résident",
          "Montant (MAD)",
          "Mode",
          "Date d'encaissement",
          "Note",
        ];

  const rows = sorted.map((p) => {
    const apt = aptMap.get(p.apartmentId);
    return [
      p.receiptNumber,
      formatMonthLabel(p.monthKey, locale),
      apt?.unitLabel ?? p.apartmentId,
      apt?.residentName ?? "",
      p.amount,
      t.payments.methods[p.method] ?? p.method,
      formatDateShort(p.paidAt, locale),
      p.note,
    ];
  });

  return toCsvContent(headers, rows);
}

export function buildArrearsCsv(
  building: Building,
  apartments: Apartment[],
  payments: Payment[],
  upToMonthKey: string,
  locale: Locale
): string {
  const t = translations[locale];
  const headers =
    locale === "ar"
      ? [
          "الشقة",
          "الساكن",
          "الهاتف",
          "الوتيرة",
          "أشهر التأخير",
          "عدد الأشهر",
          "المبلغ المستحق (درهم)",
        ]
      : [
          "Lot",
          "Résident",
          "Téléphone",
          "Fréquence",
          "Mois impayés",
          "Nb mois",
          "Montant dû (MAD)",
        ];

  const rows = apartments
    .filter((a) => a.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((apt) => {
      const arr = computeApartmentArrears(
        apt,
        payments,
        upToMonthKey,
        building.startMonth
      );
      const cycle = normalizeBillingCycle(apt.billingCycle);
      return [
        apt.unitLabel,
        apt.residentName,
        apt.phone,
        t.payments.cycleShort[cycle],
        arr.unpaidMonths.map((mk) => formatMonthLabel(mk, locale)).join(", "),
        arr.unpaidMonths.length,
        arr.totalOwed,
      ];
    });

  return toCsvContent(headers, rows);
}

export function buildExpensesCsv(
  expenses: Expense[],
  locale: Locale
): string {
  const t = translations[locale];
  const sorted = [...expenses].sort((a, b) =>
    b.expenseDate.localeCompare(a.expenseDate)
  );
  const headers =
    locale === "ar"
      ? ["التاريخ", "الفئة", "الوصف", "المبلغ (درهم)", "وثيقة مرفقة"]
      : ["Date", "Catégorie", "Description", "Montant (MAD)", "Justificatif"];

  const yesLabel = locale === "ar" ? "نعم" : "Oui";
  const noLabel = locale === "ar" ? "لا" : "Non";

  const rows = sorted.map((e) => [
    formatDateShort(e.expenseDate, locale),
    t.expenses.categories[e.category] ?? e.category,
    e.description,
    e.amount,
    e.receiptPhotoUrl ? yesLabel : noLabel,
  ]);

  return toCsvContent(headers, rows);
}

export function exportPaymentsCsv(
  building: Building,
  apartments: Apartment[],
  payments: Payment[],
  locale: Locale
): void {
  const csv = buildPaymentsCsv(apartments, payments, locale);
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerDownload(
    `${slugFilePart(building)}-paiements-${dateTag}.csv`,
    csv,
    "text/csv;charset=utf-8;"
  );
}

export function exportArrearsCsv(
  building: Building,
  apartments: Apartment[],
  payments: Payment[],
  upToMonthKey: string,
  locale: Locale
): void {
  const csv = buildArrearsCsv(
    building,
    apartments,
    payments,
    upToMonthKey,
    locale
  );
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerDownload(
    `${slugFilePart(building)}-impayes-${dateTag}.csv`,
    csv,
    "text/csv;charset=utf-8;"
  );
}

export function exportExpensesCsv(
  building: Building,
  expenses: Expense[],
  locale: Locale
): void {
  const csv = buildExpensesCsv(expenses, locale);
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerDownload(
    `${slugFilePart(building)}-depenses-${dateTag}.csv`,
    csv,
    "text/csv;charset=utf-8;"
  );
}

export function exportBuildingBackupJson(params: {
  building: Building;
  apartments: Apartment[];
  payments: Payment[];
  expenses: Expense[];
  announcements: BuildingAnnouncement[];
  tickets: MaintenanceTicket[];
}): void {
  const dateTag = new Date().toISOString().slice(0, 10);
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "SyndicSahl",
    ...params,
  };
  triggerDownload(
    `${slugFilePart(params.building)}-backup-${dateTag}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8;"
  );
}
