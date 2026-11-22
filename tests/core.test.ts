import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeApartmentArrears,
  computeBuildingSummary,
  formatDateTimeShort,
  generateReceiptNumber,
  getBillingCycleMonths,
  getPlanAccess,
  listMonthKeysBetween,
  normalizeBillingCycle,
  shiftMonthKey,
  slugifyBuildingName,
} from "../src/lib/calculations";
import {
  buildArrearsCsv,
  buildExpensesCsv,
  buildPaymentsCsv,
  escapeCsvCell,
} from "../src/lib/export-csv";
import {
  buildMemberInviteMessage,
  buildReminderMessage,
  buildWhatsAppUrl,
  normalizeMoroccoPhone,
} from "../src/lib/whatsapp";
import { translations } from "../src/lib/i18n";
import {
  isFounderIdentity,
  maskEmailAddress,
  normalizeMemberRole,
  normalizeMemberStatus,
} from "../src/lib/auth-helpers";
import type { Apartment, Building, Expense, Payment } from "../src/lib/types";

const sampleBuilding: Building = {
  id: "bld-test",
  name: "Résidence Test",
  city: "Casablanca",
  defaultMonthlyFee: 250,
  openingBalance: 1000,
  startMonth: "2026-01",
  rib: "230 780 0000000000000000 11",
  shareSlug: "residence-test",
  sharePin: "",
  showNamesPublicly: false,
  planStatus: "trial",
  trialEndsAt: new Date(Date.now() + 10 * 86400 * 1000).toISOString(),
  planExpiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const sampleApartments: Apartment[] = [
  {
    id: "apt-1",
    buildingId: "bld-test",
    unitLabel: "Apt 1",
    residentName: "Karim Benali",
    phone: "0661234567",
    monthlyFee: 250,
    billingCycle: "quarterly",
    active: true,
    sortOrder: 1,
  },
  {
    id: "apt-2",
    buildingId: "bld-test",
    unitLabel: "Apt 2",
    residentName: "Nadia El Fassi",
    phone: "0661987654",
    monthlyFee: 300,
    billingCycle: "annual",
    active: true,
    sortOrder: 2,
  },
  {
    id: "apt-3",
    buildingId: "bld-test",
    unitLabel: "Apt 3",
    residentName: "Vacant",
    phone: "",
    monthlyFee: 200,
    billingCycle: "monthly",
    active: false,
    sortOrder: 3,
  },
];

const samplePayments: Payment[] = [
  {
    id: "pay-1",
    buildingId: "bld-test",
    apartmentId: "apt-1",
    monthKey: "2026-01",
    amount: 250,
    method: "virement",
    receiptNumber: "REC-2026-0001",
    note: "T1",
    paidAt: "2026-01-05T10:30:00.000Z",
  },
  {
    id: "pay-2",
    buildingId: "bld-test",
    apartmentId: "apt-1",
    monthKey: "2026-02",
    amount: 250,
    method: "cash",
    receiptNumber: "REC-2026-0002",
    note: "",
    paidAt: "2026-02-05T10:30:00.000Z",
  },
];

const sampleExpenses: Expense[] = [
  {
    id: "exp-1",
    buildingId: "bld-test",
    category: "eau_electricite",
    amount: 400,
    expenseDate: "2026-03-10",
    description: "Lydec escaliers",
    receiptPhotoUrl: "data:image/jpeg;base64,abc",
    createdAt: "2026-03-10T09:00:00.000Z",
  },
];

describe("calculations", () => {
  it("shifts month keys across year boundaries", () => {
    assert.equal(shiftMonthKey("2026-01", -1), "2025-12");
    assert.equal(shiftMonthKey("2026-12", 1), "2027-01");
    assert.equal(shiftMonthKey("2026-03", 12), "2027-03");
  });

  it("lists month ranges accurately", () => {
    assert.deepEqual(listMonthKeysBetween("2026-01", "2026-03"), [
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    assert.deepEqual(listMonthKeysBetween("2026-05", "2026-03"), []);
  });

  it("computes arrears and skips inactive lots", () => {
    const arr1 = computeApartmentArrears(
      sampleApartments[0],
      samplePayments,
      "2026-03",
      "2026-01"
    );
    assert.deepEqual(arr1.unpaidMonths, ["2026-03"]);
    assert.equal(arr1.totalOwed, 250);

    const arr3 = computeApartmentArrears(
      sampleApartments[2],
      samplePayments,
      "2026-03",
      "2026-01"
    );
    assert.deepEqual(arr3.unpaidMonths, []);
    assert.equal(arr3.totalOwed, 0);
  });

  it("computes building summary treasury, collection, and arrears", () => {
    const summary = computeBuildingSummary(
      sampleBuilding,
      sampleApartments,
      samplePayments,
      sampleExpenses,
      "2026-03"
    );
    assert.equal(summary.totalCollectedAllTime, 500);
    assert.equal(summary.totalExpensesAllTime, 400);
    assert.equal(summary.currentBalance, 1100);
    assert.equal(summary.monthExpected, 550);
    assert.equal(summary.paidCount, 0);
    assert.equal(summary.totalActiveUnits, 2);
    assert.equal(summary.totalArrears, 250 + 900);
  });

  it("evaluates plan access across free tier, trial, active, and expired", () => {
    const now = Date.UTC(2026, 5, 1);
    assert.equal(getPlanAccess(sampleBuilding, 8, now).mode, "free_tier");
    assert.equal(
      getPlanAccess(
        {
          ...sampleBuilding,
          trialEndsAt: new Date(now + 5 * 86400 * 1000).toISOString(),
        },
        12,
        now
      ).mode,
      "trial"
    );
    assert.equal(
      getPlanAccess(
        {
          ...sampleBuilding,
          planStatus: "active",
          planExpiresAt: new Date(now + 30 * 86400 * 1000).toISOString(),
        },
        12,
        now
      ).mode,
      "active"
    );
    const expired = getPlanAccess(
      {
        ...sampleBuilding,
        planStatus: "trial",
        trialEndsAt: new Date(now - 86400 * 1000).toISOString(),
      },
      12,
      now
    );
    assert.equal(expired.mode, "expired");
    assert.equal(expired.isReadOnly, true);
  });

  it("generates monotonic receipt numbers and unique slugs", () => {
    assert.equal(
      generateReceiptNumber(samplePayments, "2026-03"),
      "REC-2026-0003"
    );
    assert.equal(
      slugifyBuildingName("Résidence Été", ["residence-ete"]),
      "residence-ete-2"
    );
  });

  it("normalizes quarterly/annual billing cycles in FR, EN, AR, and numeric tokens", () => {
    assert.equal(normalizeBillingCycle("trimestriel"), "quarterly");
    assert.equal(normalizeBillingCycle("3"), "quarterly");
    assert.equal(normalizeBillingCycle("ربع سنوي"), "quarterly");
    assert.equal(normalizeBillingCycle("annuel"), "annual");
    assert.equal(normalizeBillingCycle("yearly"), "annual");
    assert.equal(normalizeBillingCycle("سنوي"), "annual");
    assert.equal(normalizeBillingCycle("other"), "monthly");
    assert.equal(getBillingCycleMonths("monthly"), 1);
    assert.equal(getBillingCycleMonths("quarterly"), 3);
    assert.equal(getBillingCycleMonths("annual"), 12);
    assert.ok(formatDateTimeShort("2026-03-10T09:15:00.000Z", "fr").includes(":"));
  });
});

describe("export-csv", () => {
  it("escapes quotes and neutralizes CSV formula injection", () => {
    assert.equal(escapeCsvCell("=CMD()"), `"'=CMD()"`);
    assert.equal(escapeCsvCell("+1+1"), `"'+1+1"`);
    assert.equal(escapeCsvCell("-2+3"), `"'-2+3"`);
    assert.equal(escapeCsvCell(`@SUM("a")`), `"'@SUM(""a"")"`);
    assert.equal(escapeCsvCell(1250), "1250");
  });

  it("builds localized BOM + semicolon CSV files for payments, arrears, and expenses", () => {
    const payCsvFr = buildPaymentsCsv(sampleApartments, samplePayments, "fr");
    assert.ok(payCsvFr.startsWith("\uFEFF"));
    assert.ok(payCsvFr.includes("Virement bancaire"));
    assert.ok(payCsvFr.includes("REC-2026-0001"));

    const arrCsvAr = buildArrearsCsv(
      sampleBuilding,
      sampleApartments,
      samplePayments,
      "2026-03",
      "ar"
    );
    assert.ok(arrCsvAr.includes("ربع سنوي"));
    assert.ok(arrCsvAr.includes("سنوي"));

    const expCsvAr = buildExpensesCsv(sampleExpenses, "ar");
    assert.ok(expCsvAr.includes("الماء والكهرباء"));
    assert.ok(expCsvAr.includes("نعم"));
  });
});

describe("whatsapp", () => {
  it("normalizes Moroccan mobile numbers to 212 E.164 digits", () => {
    assert.equal(normalizeMoroccoPhone("06 61-23-45-67"), "212661234567");
    assert.equal(normalizeMoroccoPhone("+212661234567"), "212661234567");
    assert.equal(normalizeMoroccoPhone("00212700112233"), "212700112233");
    assert.ok(
      buildWhatsAppUrl("0661234567", "Salam").startsWith(
        "https://wa.me/212661234567?text="
      )
    );
  });

  it("includes quarterly/annual formula details and invite metadata", () => {
    const reminderFr = buildReminderMessage({
      lang: "fr",
      buildingName: "Résidence Atlas",
      unitLabel: "Apt 1",
      residentName: "Karim",
      unpaidMonths: ["2026-03"],
      totalOwed: 250,
      rib: "230 780",
      portalUrl: "https://example.com/r/atlas",
      billingCycle: "quarterly",
      monthlyFee: 250,
    });
    assert.ok(reminderFr.includes("Trimestriel"));

    const inviteAr = buildMemberInviteMessage({
      lang: "ar",
      buildingName: "إقامة أطلس",
      role: "assistant",
      inviteUrl: "https://example.com/invite/abc",
      recipientEmail: "helper@gmail.com",
    });
    assert.ok(inviteAr.includes("مساعد السانديك"));
    assert.ok(inviteAr.includes("helper@gmail.com"));
  });
});

describe("i18n parity", () => {
  it("keeps fr and ar keys 100% symmetrical with non-empty strings", () => {
    function walkCompare(a: unknown, b: unknown, keyPath: string) {
      if (typeof a === "string") {
        assert.equal(typeof b, "string", `Expected string at ${keyPath}`);
        assert.ok(a.trim().length > 0, `Empty fr string at ${keyPath}`);
        assert.ok((b as string).trim().length > 0, `Empty ar string at ${keyPath}`);
        return;
      }
      if (Array.isArray(a)) {
        assert.ok(Array.isArray(b), `Expected array at ${keyPath}`);
        assert.equal(a.length, (b as unknown[]).length, `Length mismatch at ${keyPath}`);
        a.forEach((item, idx) =>
          walkCompare(item, (b as unknown[])[idx], `${keyPath}[${idx}]`)
        );
        return;
      }
      assert.ok(a && typeof a === "object" && b && typeof b === "object");
      const aKeys = Object.keys(a as Record<string, unknown>).sort();
      const bKeys = Object.keys(b as Record<string, unknown>).sort();
      assert.deepEqual(aKeys, bKeys, `Key mismatch at ${keyPath}`);
      for (const k of aKeys) {
        walkCompare(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
          keyPath ? `${keyPath}.${k}` : k
        );
      }
    }
    walkCompare(translations.fr, translations.ar, "");
  });
});

describe("auth helpers", () => {
  it("masks emails, normalizes roles/status, and honors ADMIN_EMAIL", () => {
    assert.equal(maskEmailAddress("mohammed@gmail.com"), "mo***@gmail.com");
    assert.equal(normalizeMemberRole("SYNDIC"), "syndic");
    assert.equal(normalizeMemberRole("assistant"), "assistant");
    assert.equal(normalizeMemberRole("unknown"), "tenant");
    assert.equal(normalizeMemberStatus("active"), "active");
    assert.equal(normalizeMemberStatus("REVOKED"), "revoked");
    assert.equal(normalizeMemberStatus("other"), "invited");

    const prevAdmin = process.env.ADMIN_EMAIL;
    process.env.ADMIN_EMAIL = "founder@example.com, cofounder@example.com";
    try {
      assert.equal(
        isFounderIdentity({
          userId: "u1",
          emails: ["cofounder@example.com"],
          primaryEmail: "cofounder@example.com",
          fullName: "Co",
        }),
        true
      );
      assert.equal(
        isFounderIdentity({
          userId: "u2",
          emails: ["resident@example.com"],
          primaryEmail: "resident@example.com",
          fullName: "Res",
        }),
        false
      );
      assert.equal(isFounderIdentity(null), false);
    } finally {
      if (prevAdmin === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = prevAdmin;
    }
  });
});
