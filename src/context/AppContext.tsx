"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PLANS, TRIAL_DAYS } from "@/lib/config";
import {
  generateReceiptNumber,
  getBuildingReferenceCode,
  getCurrentMonthKey,
  getPlanAccess,
  slugifyBuildingName,
  type PlanAccessInfo,
} from "@/lib/calculations";
import { translations, type TranslationDict } from "@/lib/i18n";
import {
  createId,
  loadAppData,
  resetDemoAppData,
  saveAppData,
} from "@/lib/storage";
import {
  fetchCloudWorkspace,
  pushExpenseToCloud,
  pushPaymentToCloud,
} from "@/lib/supabase-sync";
import type {
  Apartment,
  AppData,
  AppTab,
  Building,
  Expense,
  ExpenseCategory,
  Locale,
  Payment,
  PaymentMethod,
  PlanDuration,
  SubscriptionChannel,
  SubscriptionRequest,
  WhatsAppLang,
} from "@/lib/types";

const emptySubscribe = () => () => {};

interface CreateBuildingInput {
  name: string;
  city: string;
  defaultMonthlyFee: number;
  openingBalance: number;
  rib: string;
  units: {
    unitLabel: string;
    residentName: string;
    phone: string;
    monthlyFee: number;
  }[];
}

interface AppContextValue {
  hydrated: boolean;
  data: AppData;
  t: TranslationDict;
  locale: Locale;
  whatsappLang: WhatsAppLang;
  activeTab: AppTab;
  selectedMonthKey: string;
  activeBuilding: Building;
  buildingApartments: Apartment[];
  buildingPayments: Payment[];
  buildingExpenses: Expense[];
  planAccess: PlanAccessInfo;
  toast: string | null;
  setActiveTab: (tab: AppTab) => void;
  setSelectedMonthKey: (monthKey: string) => void;
  setLocale: (locale: Locale) => void;
  setWhatsappLang: (lang: WhatsAppLang) => void;
  setActiveBuildingId: (buildingId: string) => void;
  showToast: (message: string) => void;
  createBuilding: (input: CreateBuildingInput) => Building;
  updateBuildingSettings: (
    buildingId: string,
    patch: Partial<
      Pick<
        Building,
        | "name"
        | "city"
        | "defaultMonthlyFee"
        | "openingBalance"
        | "startMonth"
        | "rib"
        | "sharePin"
        | "showNamesPublicly"
      >
    >
  ) => boolean;
  addApartment: (input: {
    unitLabel: string;
    residentName: string;
    phone: string;
    monthlyFee: number;
  }) => boolean;
  bulkAddApartments: (input: {
    prefix: string;
    startFrom: number;
    count: number;
    monthlyFee: number;
  }) => boolean;
  importApartmentsBatch: (
    units: {
      unitLabel: string;
      residentName: string;
      phone: string;
      monthlyFee: number;
    }[]
  ) => boolean;
  updateApartment: (
    apartmentId: string,
    patch: Partial<
      Pick<Apartment, "unitLabel" | "residentName" | "phone" | "monthlyFee" | "active">
    >
  ) => boolean;
  recordPayment: (input: {
    apartmentId: string;
    monthKey: string;
    amount: number;
    method: PaymentMethod;
    note: string;
  }) => Payment | null;
  cancelPayment: (paymentId: string) => boolean;
  addExpense: (input: {
    category: ExpenseCategory;
    amount: number;
    expenseDate: string;
    description: string;
    receiptPhotoUrl: string | null;
  }) => boolean;
  deleteExpense: (expenseId: string) => boolean;
  submitSubscriptionRequest: (input: {
    plan: PlanDuration;
    channel: SubscriptionChannel;
    proofPhotoUrl: string | null;
    note: string;
  }) => string;
  adminApproveRequest: (requestId: string) => void;
  adminRejectRequest: (requestId: string) => void;
  adminActivateBuilding: (buildingId: string, months: number) => void;
  adminSetBuildingExpired: (buildingId: string) => void;
  adminRestoreBuildingTrial: (buildingId: string) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<AppTab>("payments");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() =>
    getCurrentMonthKey()
  );
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    fetchCloudWorkspace().then((cloud) => {
      if (!active || !cloud) return;
      setData((prev) => ({
        ...prev,
        activeBuildingId: cloud.buildings[0]?.id ?? prev.activeBuildingId,
        buildings: cloud.buildings,
        apartments: cloud.apartments,
        payments: cloud.payments,
        expenses: cloud.expenses,
        subscriptionRequests: cloud.subscriptionRequests,
      }));
    });
    return () => {
      active = false;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveAppData(data);
    document.documentElement.lang = data.locale;
    document.documentElement.dir = data.locale === "ar" ? "rtl" : "ltr";
  }, [data, hydrated]);

  const activeBuilding = useMemo(() => {
    return (
      data.buildings.find((b) => b.id === data.activeBuildingId) ??
      data.buildings[0]
    );
  }, [data.buildings, data.activeBuildingId]);

  const buildingApartments = useMemo(() => {
    if (!activeBuilding) return [];
    return data.apartments
      .filter((a) => a.buildingId === activeBuilding.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data.apartments, activeBuilding]);

  const buildingPayments = useMemo(() => {
    if (!activeBuilding) return [];
    return data.payments.filter((p) => p.buildingId === activeBuilding.id);
  }, [data.payments, activeBuilding]);

  const buildingExpenses = useMemo(() => {
    if (!activeBuilding) return [];
    return data.expenses
      .filter((e) => e.buildingId === activeBuilding.id)
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  }, [data.expenses, activeBuilding]);

  const activeUnitsCount = useMemo(
    () => buildingApartments.filter((a) => a.active).length,
    [buildingApartments]
  );

  const planAccess = useMemo(
    () => getPlanAccess(activeBuilding, activeUnitsCount),
    [activeBuilding, activeUnitsCount]
  );

  const t = translations[data.locale];

  const guardWritable = useCallback((): boolean => {
    if (planAccess.isReadOnly) {
      showToast(t.common.readOnlyToast);
      setActiveTab("subscription");
      return false;
    }
    return true;
  }, [planAccess.isReadOnly, showToast, t.common.readOnlyToast]);

  const setLocale = useCallback((locale: Locale) => {
    setData((prev) => ({ ...prev, locale }));
  }, []);

  const setWhatsappLang = useCallback((whatsappLang: WhatsAppLang) => {
    setData((prev) => ({ ...prev, whatsappLang }));
  }, []);

  const setActiveBuildingId = useCallback((buildingId: string) => {
    setData((prev) => ({ ...prev, activeBuildingId: buildingId }));
  }, []);

  const createBuilding = useCallback(
    (input: CreateBuildingInput): Building => {
      const now = new Date();
      const buildingId = createId("bld");
      const trialEndsAt = new Date(
        now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      const existingSlugs = data.buildings.map((b) => b.shareSlug);
      const shareSlug = slugifyBuildingName(input.name, existingSlugs);

      const newBuilding: Building = {
        id: buildingId,
        name: input.name.trim() || "Nouvelle Résidence",
        city: input.city.trim() || "Casablanca",
        defaultMonthlyFee: Math.max(0, Number(input.defaultMonthlyFee) || 200),
        openingBalance: Number(input.openingBalance) || 0,
        startMonth: getCurrentMonthKey(now),
        rib: input.rib.trim(),
        shareSlug,
        sharePin: "",
        showNamesPublicly: false,
        planStatus: "trial",
        trialEndsAt,
        planExpiresAt: null,
        createdAt: now.toISOString(),
      };

      const newApartments: Apartment[] = input.units.map((u, idx) => ({
        id: createId("apt"),
        buildingId,
        unitLabel: u.unitLabel.trim() || `Apt ${idx + 1}`,
        residentName: u.residentName.trim(),
        phone: u.phone.trim(),
        monthlyFee: Math.max(0, Number(u.monthlyFee) || newBuilding.defaultMonthlyFee),
        active: true,
        sortOrder: idx + 1,
      }));

      setData((prev) => ({
        ...prev,
        activeBuildingId: buildingId,
        buildings: [...prev.buildings, newBuilding],
        apartments: [...prev.apartments, ...newApartments],
      }));

      showToast(t.common.saved);
      return newBuilding;
    },
    [data.buildings, showToast, t.common.saved]
  );

  const updateBuildingSettings = useCallback(
    (
      buildingId: string,
      patch: Partial<
        Pick<
          Building,
          | "name"
          | "city"
          | "defaultMonthlyFee"
          | "openingBalance"
          | "startMonth"
          | "rib"
          | "sharePin"
          | "showNamesPublicly"
        >
      >
    ): boolean => {
      if (!guardWritable()) return false;
      setData((prev) => ({
        ...prev,
        buildings: prev.buildings.map((b) =>
          b.id === buildingId ? { ...b, ...patch } : b
        ),
      }));
      showToast(t.settings.savedToast);
      return true;
    },
    [guardWritable, showToast, t.settings.savedToast]
  );

  const addApartment = useCallback(
    (input: {
      unitLabel: string;
      residentName: string;
      phone: string;
      monthlyFee: number;
    }): boolean => {
      if (!guardWritable()) return false;
      const maxOrder = buildingApartments.reduce(
        (max, a) => Math.max(max, a.sortOrder),
        0
      );
      const apt: Apartment = {
        id: createId("apt"),
        buildingId: activeBuilding.id,
        unitLabel: input.unitLabel.trim() || `Apt ${maxOrder + 1}`,
        residentName: input.residentName.trim(),
        phone: input.phone.trim(),
        monthlyFee: Math.max(0, Number(input.monthlyFee) || activeBuilding.defaultMonthlyFee),
        active: true,
        sortOrder: maxOrder + 1,
      };
      setData((prev) => ({
        ...prev,
        apartments: [...prev.apartments, apt],
      }));
      showToast(t.common.saved);
      return true;
    },
    [activeBuilding, buildingApartments, guardWritable, showToast, t.common.saved]
  );

  const bulkAddApartments = useCallback(
    (input: {
      prefix: string;
      startFrom: number;
      count: number;
      monthlyFee: number;
    }): boolean => {
      if (!guardWritable()) return false;
      const safeCount = Math.min(100, Math.max(1, input.count));
      const maxOrder = buildingApartments.reduce(
        (max, a) => Math.max(max, a.sortOrder),
        0
      );
      const created: Apartment[] = [];
      for (let i = 0; i < safeCount; i += 1) {
        const num = input.startFrom + i;
        created.push({
          id: createId("apt"),
          buildingId: activeBuilding.id,
          unitLabel: `${input.prefix.trim() || "Apt"} ${num}`,
          residentName: "",
          phone: "",
          monthlyFee: Math.max(
            0,
            Number(input.monthlyFee) || activeBuilding.defaultMonthlyFee
          ),
          active: true,
          sortOrder: maxOrder + i + 1,
        });
      }
      setData((prev) => ({
        ...prev,
        apartments: [...prev.apartments, ...created],
      }));
      showToast(t.common.saved);
      return true;
    },
    [activeBuilding, buildingApartments, guardWritable, showToast, t.common.saved]
  );

  const importApartmentsBatch = useCallback(
    (
      units: {
        unitLabel: string;
        residentName: string;
        phone: string;
        monthlyFee: number;
      }[]
    ): boolean => {
      if (!guardWritable()) return false;
      if (units.length === 0) return false;
      const maxOrder = buildingApartments.reduce(
        (max, a) => Math.max(max, a.sortOrder),
        0
      );
      const created: Apartment[] = units.slice(0, 200).map((u, idx) => ({
        id: createId("apt"),
        buildingId: activeBuilding.id,
        unitLabel: u.unitLabel.trim() || `Apt ${maxOrder + idx + 1}`,
        residentName: u.residentName.trim(),
        phone: u.phone.trim(),
        monthlyFee: Math.max(
          0,
          Number(u.monthlyFee) || activeBuilding.defaultMonthlyFee
        ),
        active: true,
        sortOrder: maxOrder + idx + 1,
      }));
      setData((prev) => ({
        ...prev,
        apartments: [...prev.apartments, ...created],
      }));
      showToast(t.common.saved);
      return true;
    },
    [activeBuilding, buildingApartments, guardWritable, showToast, t.common.saved]
  );

  const updateApartment = useCallback(
    (
      apartmentId: string,
      patch: Partial<
        Pick<
          Apartment,
          "unitLabel" | "residentName" | "phone" | "monthlyFee" | "active"
        >
      >
    ): boolean => {
      if (!guardWritable()) return false;
      setData((prev) => ({
        ...prev,
        apartments: prev.apartments.map((a) =>
          a.id === apartmentId ? { ...a, ...patch } : a
        ),
      }));
      showToast(t.common.saved);
      return true;
    },
    [guardWritable, showToast, t.common.saved]
  );

  const recordPayment = useCallback(
    (input: {
      apartmentId: string;
      monthKey: string;
      amount: number;
      method: PaymentMethod;
      note: string;
    }): Payment | null => {
      if (!guardWritable()) return null;
      const receiptNumber = generateReceiptNumber(data.payments, input.monthKey);
      const newPayment: Payment = {
        id: createId("pay"),
        buildingId: activeBuilding.id,
        apartmentId: input.apartmentId,
        monthKey: input.monthKey,
        amount: Math.max(1, Number(input.amount) || activeBuilding.defaultMonthlyFee),
        method: input.method,
        receiptNumber,
        note: input.note.trim(),
        paidAt: new Date().toISOString(),
      };

      setData((prev) => {
        const filtered = prev.payments.filter(
          (p) =>
            !(
              p.apartmentId === input.apartmentId &&
              p.monthKey === input.monthKey
            )
        );
        return {
          ...prev,
          payments: [...filtered, newPayment],
        };
      });

      void pushPaymentToCloud(newPayment);
      showToast(t.common.saved);
      return newPayment;
    },
    [activeBuilding, data.payments, guardWritable, showToast, t.common.saved]
  );

  const cancelPayment = useCallback(
    (paymentId: string): boolean => {
      if (!guardWritable()) return false;
      setData((prev) => ({
        ...prev,
        payments: prev.payments.filter((p) => p.id !== paymentId),
      }));
      return true;
    },
    [guardWritable]
  );

  const addExpense = useCallback(
    (input: {
      category: ExpenseCategory;
      amount: number;
      expenseDate: string;
      description: string;
      receiptPhotoUrl: string | null;
    }): boolean => {
      if (!guardWritable()) return false;
      const exp: Expense = {
        id: createId("exp"),
        buildingId: activeBuilding.id,
        category: input.category,
        amount: Math.max(1, Number(input.amount) || 0),
        expenseDate: input.expenseDate || new Date().toISOString().slice(0, 10),
        description: input.description.trim() || t.expenses.categories[input.category],
        receiptPhotoUrl: input.receiptPhotoUrl,
        createdAt: new Date().toISOString(),
      };
      setData((prev) => ({
        ...prev,
        expenses: [exp, ...prev.expenses],
      }));
      void pushExpenseToCloud(exp);
      showToast(t.common.saved);
      return true;
    },
    [activeBuilding.id, guardWritable, showToast, t.common.saved, t.expenses.categories]
  );

  const deleteExpense = useCallback(
    (expenseId: string): boolean => {
      if (!guardWritable()) return false;
      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== expenseId),
      }));
      return true;
    },
    [guardWritable]
  );

  const submitSubscriptionRequest = useCallback(
    (input: {
      plan: PlanDuration;
      channel: SubscriptionChannel;
      proofPhotoUrl: string | null;
      note: string;
    }): string => {
      const refCode = getBuildingReferenceCode(activeBuilding.id);
      const req: SubscriptionRequest = {
        id: createId("subreq"),
        buildingId: activeBuilding.id,
        buildingName: activeBuilding.name,
        referenceCode: refCode,
        plan: input.plan,
        amountMAD: PLANS[input.plan].priceMAD,
        channel: input.channel,
        proofPhotoUrl: input.proofPhotoUrl,
        note: input.note.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      setData((prev) => ({
        ...prev,
        subscriptionRequests: [req, ...prev.subscriptionRequests],
      }));
      showToast(t.subscription.submittedMsg);
      return refCode;
    },
    [activeBuilding.id, activeBuilding.name, showToast, t.subscription.submittedMsg]
  );

  const adminActivateBuilding = useCallback(
    (buildingId: string, months: number) => {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + months);
      const expiresIso = expires.toISOString();
      setData((prev) => ({
        ...prev,
        buildings: prev.buildings.map((b) =>
          b.id === buildingId
            ? {
                ...b,
                planStatus: "active",
                planExpiresAt: expiresIso,
              }
            : b
        ),
      }));
      showToast(t.common.saved);
    },
    [showToast, t.common.saved]
  );

  const adminApproveRequest = useCallback(
    (requestId: string) => {
      const target = data.subscriptionRequests.find((r) => r.id === requestId);
      if (!target) return;
      const months = PLANS[target.plan].months;
      const expires = new Date();
      expires.setMonth(expires.getMonth() + months);
      const expiresIso = expires.toISOString();

      setData((prev) => ({
        ...prev,
        subscriptionRequests: prev.subscriptionRequests.map((r) =>
          r.id === requestId ? { ...r, status: "approved" } : r
        ),
        buildings: prev.buildings.map((b) =>
          b.id === target.buildingId
            ? { ...b, planStatus: "active", planExpiresAt: expiresIso }
            : b
        ),
      }));
      showToast(t.common.saved);
    },
    [data.subscriptionRequests, showToast, t.common.saved]
  );

  const adminRejectRequest = useCallback(
    (requestId: string) => {
      setData((prev) => ({
        ...prev,
        subscriptionRequests: prev.subscriptionRequests.map((r) =>
          r.id === requestId ? { ...r, status: "rejected" } : r
        ),
      }));
      showToast(t.common.saved);
    },
    [showToast, t.common.saved]
  );

  const adminSetBuildingExpired = useCallback(
    (buildingId: string) => {
      const pastIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      setData((prev) => ({
        ...prev,
        buildings: prev.buildings.map((b) =>
          b.id === buildingId
            ? {
                ...b,
                planStatus: "expired",
                trialEndsAt: pastIso,
                planExpiresAt: pastIso,
              }
            : b
        ),
      }));
      showToast(t.common.saved);
    },
    [showToast, t.common.saved]
  );

  const adminRestoreBuildingTrial = useCallback(
    (buildingId: string) => {
      const futureIso = new Date(
        Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      setData((prev) => ({
        ...prev,
        buildings: prev.buildings.map((b) =>
          b.id === buildingId
            ? {
                ...b,
                planStatus: "trial",
                trialEndsAt: futureIso,
                planExpiresAt: null,
              }
            : b
        ),
      }));
      showToast(t.common.saved);
    },
    [showToast, t.common.saved]
  );

  const resetDemoData = useCallback(() => {
    const fresh = resetDemoAppData();
    setData(fresh);
    setSelectedMonthKey(getCurrentMonthKey());
    showToast(t.common.saved);
  }, [showToast, t.common.saved]);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      data,
      t,
      locale: data.locale,
      whatsappLang: data.whatsappLang,
      activeTab,
      selectedMonthKey,
      activeBuilding,
      buildingApartments,
      buildingPayments,
      buildingExpenses,
      planAccess,
      toast,
      setActiveTab,
      setSelectedMonthKey,
      setLocale,
      setWhatsappLang,
      setActiveBuildingId,
      showToast,
      createBuilding,
      updateBuildingSettings,
      addApartment,
      bulkAddApartments,
      importApartmentsBatch,
      updateApartment,
      recordPayment,
      cancelPayment,
      addExpense,
      deleteExpense,
      submitSubscriptionRequest,
      adminApproveRequest,
      adminRejectRequest,
      adminActivateBuilding,
      adminSetBuildingExpired,
      adminRestoreBuildingTrial,
      resetDemoData,
    }),
    [
      hydrated,
      data,
      t,
      activeTab,
      selectedMonthKey,
      activeBuilding,
      buildingApartments,
      buildingPayments,
      buildingExpenses,
      planAccess,
      toast,
      setLocale,
      setWhatsappLang,
      setActiveBuildingId,
      showToast,
      createBuilding,
      updateBuildingSettings,
      addApartment,
      bulkAddApartments,
      importApartmentsBatch,
      updateApartment,
      recordPayment,
      cancelPayment,
      addExpense,
      deleteExpense,
      submitSubscriptionRequest,
      adminApproveRequest,
      adminRejectRequest,
      adminActivateBuilding,
      adminSetBuildingExpired,
      adminRestoreBuildingTrial,
      resetDemoData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside <AppProvider>");
  }
  return ctx;
}
