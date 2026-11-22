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
import type {
  Apartment,
  AppData,
  AppTab,
  BillingCycle,
  Building,
  BuildingMembership,
  Expense,
  ExpenseCategory,
  Locale,
  MemberRole,
  Payment,
  PaymentMethod,
  PlanDuration,
  SubscriptionChannel,
  SubscriptionRequest,
  ThemeMode,
  WhatsAppLang,
} from "@/lib/types";

const EMPTY_BUILDING_FALLBACK: Building = {
  id: "",
  name: "",
  city: "",
  defaultMonthlyFee: 200,
  openingBalance: 0,
  startMonth: "2026-01",
  rib: "",
  shareSlug: "",
  sharePin: "",
  showNamesPublicly: false,
  planStatus: "trial",
  trialEndsAt: "2026-12-31T00:00:00.000Z",
  planExpiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const emptySubscribe = () => () => {};

function syncWorkspaceAction(
  action: string,
  payload: Record<string, unknown> = {},
  onError?: () => void
): void {
  if (typeof window === "undefined") return;
  fetch("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  })
    .then((res) => {
      if (!res.ok) onError?.();
    })
    .catch(() => {
      onError?.();
    });
}

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
    billingCycle?: BillingCycle;
  }[];
}

interface AppContextValue {
  hydrated: boolean;
  workspaceReady: boolean;
  authRequired: boolean;
  cloudConnected: boolean;
  data: AppData;
  t: TranslationDict;
  locale: Locale;
  theme: ThemeMode;
  whatsappLang: WhatsAppLang;
  activeTab: AppTab;
  selectedMonthKey: string;
  hasBuildings: boolean;
  activeBuilding: Building;
  activeBuildingRole: MemberRole;
  buildingApartments: Apartment[];
  buildingPayments: Payment[];
  buildingExpenses: Expense[];
  buildingMemberships: BuildingMembership[];
  planAccess: PlanAccessInfo;
  toast: string | null;
  setActiveTab: (tab: AppTab) => void;
  setSelectedMonthKey: (monthKey: string) => void;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  setWhatsappLang: (lang: WhatsAppLang) => void;
  setActiveBuildingId: (buildingId: string) => void;
  showToast: (message: string) => void;
  createBuilding: (input: CreateBuildingInput) => Building;
  deleteBuilding: (buildingId: string) => boolean;
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
    billingCycle?: BillingCycle;
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
      billingCycle?: BillingCycle;
    }[]
  ) => boolean;
  updateApartment: (
    apartmentId: string,
    patch: Partial<
      Pick<
        Apartment,
        "unitLabel" | "residentName" | "phone" | "monthlyFee" | "billingCycle" | "active"
      >
    >
  ) => boolean;
  recordPayment: (input: {
    apartmentId: string;
    monthKey: string;
    amount: number;
    method: PaymentMethod;
    note: string;
  }) => Payment | null;
  recordPaymentsBatch: (input: {
    apartmentId: string;
    monthKeys: string[];
    amountPerMonth: number;
    method: PaymentMethod;
    note: string;
  }) => Payment[];
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
  inviteMember: (input: {
    buildingId: string;
    email: string;
    role: "assistant" | "tenant";
    apartmentId?: string | null;
    displayName?: string;
  }) => Promise<BuildingMembership | null>;
  updateMemberRole: (input: {
    membershipId: string;
    role: "assistant" | "tenant";
    apartmentId?: string | null;
  }) => Promise<boolean>;
  revokeMember: (membershipId: string) => Promise<boolean>;
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
  const [cloudConnected, setCloudConnected] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
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
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "";
    const skipWorkspaceFetch =
      pathname.startsWith("/r/") ||
      pathname.startsWith("/receipt/") ||
      pathname.startsWith("/landing") ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/invite/");
    if (skipWorkspaceFetch) {
      queueMicrotask(() => setWorkspaceReady(true));
      return;
    }

    let active = true;
    fetch("/api/workspace")
      .then((res) => (res.ok ? res.json() : null))
      .then((remote) => {
        if (!active || !remote) {
          if (active) setWorkspaceReady(true);
          return;
        }
        if (remote.mode === "auth_required") {
          setAuthRequired(true);
          setCloudConnected(false);
          setData((prev) => ({
            ...prev,
            activeBuildingId: "",
            buildings: [],
            apartments: [],
            payments: [],
            expenses: [],
            subscriptionRequests: [],
            memberships: [],
            myRoles: {},
          }));
          setWorkspaceReady(true);
          return;
        }
        if (remote.mode !== "neon" || !Array.isArray(remote.buildings)) {
          setWorkspaceReady(true);
          return;
        }
        setAuthRequired(false);
        setCloudConnected(true);
        setData((prev) => {
          const remoteBuildings = remote.buildings as Building[];
          const validActive = remoteBuildings.some(
            (b) => b.id === prev.activeBuildingId
          )
            ? prev.activeBuildingId
            : remoteBuildings[0]?.id ?? "";
          return {
            ...prev,
            activeBuildingId: validActive,
            buildings: remoteBuildings,
            apartments: remote.apartments ?? [],
            payments: remote.payments ?? [],
            expenses: remote.expenses ?? [],
            subscriptionRequests: remote.subscriptionRequests ?? [],
            memberships: remote.memberships ?? [],
            myRoles: remote.myRoles ?? {},
          };
        });
        setWorkspaceReady(true);
      })
      .catch(() => {
        if (active) setWorkspaceReady(true);
      });

    return () => {
      active = false;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!authRequired && workspaceReady) {
      saveAppData(data);
    }
    document.documentElement.lang = data.locale;
    document.documentElement.dir = data.locale === "ar" ? "rtl" : "ltr";
    document.documentElement.classList.toggle("dark", data.theme === "dark");
  }, [authRequired, data, hydrated, workspaceReady]);

  const hasBuildings = data.buildings.length > 0;

  const activeBuilding = useMemo(() => {
    return (
      data.buildings.find((b) => b.id === data.activeBuildingId) ??
      data.buildings[0] ??
      EMPTY_BUILDING_FALLBACK
    );
  }, [data.buildings, data.activeBuildingId]);

  const activeBuildingRole = useMemo<MemberRole>(() => {
    if (!hasBuildings || !activeBuilding.id) return "syndic";
    if (!cloudConnected) return "syndic";
    return data.myRoles?.[activeBuilding.id] ?? "syndic";
  }, [activeBuilding.id, cloudConnected, data.myRoles, hasBuildings]);

  const buildingApartments = useMemo(() => {
    if (!hasBuildings || !activeBuilding.id) return [];
    return data.apartments
      .filter((a) => a.buildingId === activeBuilding.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data.apartments, activeBuilding.id, hasBuildings]);

  const buildingPayments = useMemo(() => {
    if (!hasBuildings || !activeBuilding.id) return [];
    return data.payments.filter((p) => p.buildingId === activeBuilding.id);
  }, [data.payments, activeBuilding.id, hasBuildings]);

  const buildingExpenses = useMemo(() => {
    if (!hasBuildings || !activeBuilding.id) return [];
    return data.expenses
      .filter((e) => e.buildingId === activeBuilding.id)
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  }, [data.expenses, activeBuilding.id, hasBuildings]);

  const buildingMemberships = useMemo(() => {
    if (!hasBuildings || !activeBuilding.id) return [];
    return (data.memberships ?? []).filter(
      (m) => m.buildingId === activeBuilding.id && m.status !== "revoked"
    );
  }, [data.memberships, activeBuilding.id, hasBuildings]);

  const activeUnitsCount = useMemo(
    () => buildingApartments.filter((a) => a.active).length,
    [buildingApartments]
  );

  const planAccess = useMemo(() => {
    if (!hasBuildings) {
      return { mode: "free_tier" as const, isReadOnly: false, daysRemaining: 0 };
    }
    return getPlanAccess(activeBuilding, activeUnitsCount);
  }, [activeBuilding, activeUnitsCount, hasBuildings]);

  const t = translations[data.locale];

  const handleSyncError = useCallback(() => {
    if (cloudConnected) showToast(t.common.syncErrorToast);
  }, [cloudConnected, showToast, t.common.syncErrorToast]);

  const guardWritable = useCallback((): boolean => {
    if (!hasBuildings) return false;
    if (activeBuildingRole === "tenant") return false;
    if (planAccess.isReadOnly) {
      showToast(t.common.readOnlyToast);
      setActiveTab("subscription");
      return false;
    }
    return true;
  }, [activeBuildingRole, hasBuildings, planAccess.isReadOnly, showToast, t.common.readOnlyToast]);

  const setLocale = useCallback((locale: Locale) => {
    setData((prev) => ({ ...prev, locale }));
  }, []);

  const toggleTheme = useCallback(() => {
    setData((prev) => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark",
    }));
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
        billingCycle: u.billingCycle ?? "monthly",
        active: true,
        sortOrder: idx + 1,
      }));

      setData((prev) => ({
        ...prev,
        activeBuildingId: buildingId,
        buildings: [...prev.buildings, newBuilding],
        apartments: [...prev.apartments, ...newApartments],
        myRoles: {
          ...(prev.myRoles ?? {}),
          [buildingId]: "syndic",
        },
      }));

      syncWorkspaceAction(
        "create_building",
        { building: newBuilding, apartments: newApartments },
        handleSyncError
      );
      showToast(t.common.saved);
      return newBuilding;
    },
    [data.buildings, handleSyncError, showToast, t.common.saved]
  );

  const deleteBuilding = useCallback(
    (buildingId: string): boolean => {
      if (data.buildings.length <= 1) return false;
      if (cloudConnected && data.myRoles?.[buildingId] !== "syndic") {
        return false;
      }
      const remaining = data.buildings.filter((b) => b.id !== buildingId);
      setData((prev) => {
        const nextRoles = { ...(prev.myRoles ?? {}) };
        delete nextRoles[buildingId];
        return {
          ...prev,
          activeBuildingId:
            prev.activeBuildingId === buildingId
              ? remaining[0]?.id ?? ""
              : prev.activeBuildingId,
          buildings: prev.buildings.filter((b) => b.id !== buildingId),
          apartments: prev.apartments.filter((a) => a.buildingId !== buildingId),
          payments: prev.payments.filter((p) => p.buildingId !== buildingId),
          expenses: prev.expenses.filter((e) => e.buildingId !== buildingId),
          subscriptionRequests: prev.subscriptionRequests.filter(
            (r) => r.buildingId !== buildingId
          ),
          memberships: (prev.memberships ?? []).filter(
            (m) => m.buildingId !== buildingId
          ),
          myRoles: nextRoles,
        };
      });
      syncWorkspaceAction("delete_building", { buildingId }, handleSyncError);
      showToast(t.common.saved);
      return true;
    },
    [cloudConnected, data.buildings, data.myRoles, handleSyncError, showToast, t.common.saved]
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
      const target = data.buildings.find((b) => b.id === buildingId);
      setData((prev) => ({
        ...prev,
        buildings: prev.buildings.map((b) =>
          b.id === buildingId ? { ...b, ...patch } : b
        ),
      }));
      if (target) {
        syncWorkspaceAction(
          "update_building",
          { building: { ...target, ...patch } },
          handleSyncError
        );
      }
      showToast(t.settings.savedToast);
      return true;
    },
    [data.buildings, guardWritable, handleSyncError, showToast, t.settings.savedToast]
  );

  const addApartment = useCallback(
    (input: {
      unitLabel: string;
      residentName: string;
      phone: string;
      monthlyFee: number;
      billingCycle?: BillingCycle;
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
        billingCycle: input.billingCycle ?? "monthly",
        active: true,
        sortOrder: maxOrder + 1,
      };
      setData((prev) => ({
        ...prev,
        apartments: [...prev.apartments, apt],
      }));
      syncWorkspaceAction("add_apartments", { apartments: [apt] }, handleSyncError);
      showToast(t.common.saved);
      return true;
    },
    [activeBuilding, buildingApartments, guardWritable, handleSyncError, showToast, t.common.saved]
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
          billingCycle: "monthly",
          active: true,
          sortOrder: maxOrder + i + 1,
        });
      }
      setData((prev) => ({
        ...prev,
        apartments: [...prev.apartments, ...created],
      }));
      syncWorkspaceAction("add_apartments", { apartments: created }, handleSyncError);
      showToast(t.common.saved);
      return true;
    },
    [activeBuilding, buildingApartments, guardWritable, handleSyncError, showToast, t.common.saved]
  );

  const importApartmentsBatch = useCallback(
    (
      units: {
        unitLabel: string;
        residentName: string;
        phone: string;
        monthlyFee: number;
        billingCycle?: BillingCycle;
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
        billingCycle: u.billingCycle ?? "monthly",
        active: true,
        sortOrder: maxOrder + idx + 1,
      }));
      setData((prev) => ({
        ...prev,
        apartments: [...prev.apartments, ...created],
      }));
      syncWorkspaceAction("add_apartments", { apartments: created }, handleSyncError);
      showToast(t.common.saved);
      return true;
    },
    [activeBuilding, buildingApartments, guardWritable, handleSyncError, showToast, t.common.saved]
  );

  const updateApartment = useCallback(
    (
      apartmentId: string,
      patch: Partial<
        Pick<
          Apartment,
          "unitLabel" | "residentName" | "phone" | "monthlyFee" | "billingCycle" | "active"
        >
      >
    ): boolean => {
      if (!guardWritable()) return false;
      const targetApt = data.apartments.find((a) => a.id === apartmentId);
      setData((prev) => ({
        ...prev,
        apartments: prev.apartments.map((a) =>
          a.id === apartmentId ? { ...a, ...patch } : a
        ),
      }));
      if (targetApt) {
        syncWorkspaceAction(
          "update_apartment",
          { apartment: { ...targetApt, ...patch } },
          handleSyncError
        );
      }
      showToast(t.common.saved);
      return true;
    },
    [data.apartments, guardWritable, handleSyncError, showToast, t.common.saved]
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

      syncWorkspaceAction(
        "record_payment",
        { payment: newPayment },
        handleSyncError
      );
      showToast(t.common.saved);
      return newPayment;
    },
    [activeBuilding, data.payments, guardWritable, handleSyncError, showToast, t.common.saved]
  );

  const recordPaymentsBatch = useCallback(
    (input: {
      apartmentId: string;
      monthKeys: string[];
      amountPerMonth: number;
      method: PaymentMethod;
      note: string;
    }): Payment[] => {
      if (!guardWritable()) return [];
      const uniqueMonths = Array.from(new Set(input.monthKeys)).sort();
      if (uniqueMonths.length === 0) return [];

      const created: Payment[] = [];
      let virtualList = [...data.payments];
      const nowIso = new Date().toISOString();

      for (const mk of uniqueMonths) {
        const receiptNumber = generateReceiptNumber(virtualList, mk);
        const payment: Payment = {
          id: createId("pay"),
          buildingId: activeBuilding.id,
          apartmentId: input.apartmentId,
          monthKey: mk,
          amount: Math.max(
            1,
            Number(input.amountPerMonth) || activeBuilding.defaultMonthlyFee
          ),
          method: input.method,
          receiptNumber,
          note: input.note.trim(),
          paidAt: nowIso,
        };
        created.push(payment);
        virtualList = [...virtualList, payment];
      }

      const monthSet = new Set(uniqueMonths);
      setData((prev) => ({
        ...prev,
        payments: [
          ...prev.payments.filter(
            (p) =>
              !(p.apartmentId === input.apartmentId && monthSet.has(p.monthKey))
          ),
          ...created,
        ],
      }));

      syncWorkspaceAction(
        "record_payments_batch",
        { payments: created },
        handleSyncError
      );
      showToast(t.common.saved);
      return created;
    },
    [activeBuilding, data.payments, guardWritable, handleSyncError, showToast, t.common.saved]
  );

  const cancelPayment = useCallback(
    (paymentId: string): boolean => {
      if (!guardWritable()) return false;
      setData((prev) => ({
        ...prev,
        payments: prev.payments.filter((p) => p.id !== paymentId),
      }));
      syncWorkspaceAction("cancel_payment", { paymentId }, handleSyncError);
      return true;
    },
    [guardWritable, handleSyncError]
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
      syncWorkspaceAction("add_expense", { expense: exp }, handleSyncError);
      showToast(t.common.saved);
      return true;
    },
    [activeBuilding.id, guardWritable, handleSyncError, showToast, t.common.saved, t.expenses.categories]
  );

  const deleteExpense = useCallback(
    (expenseId: string): boolean => {
      if (!guardWritable()) return false;
      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== expenseId),
      }));
      syncWorkspaceAction("delete_expense", { expenseId }, handleSyncError);
      return true;
    },
    [guardWritable, handleSyncError]
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
      syncWorkspaceAction(
        "submit_subscription_request",
        { request: req },
        handleSyncError
      );
      showToast(t.subscription.submittedMsg);
      return refCode;
    },
    [activeBuilding.id, activeBuilding.name, handleSyncError, showToast, t.subscription.submittedMsg]
  );

  const adminActivateBuilding = useCallback(
    (buildingId: string, months: number) => {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + months);
      const expiresIso = expires.toISOString();
      const target = data.buildings.find((b) => b.id === buildingId);
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
      if (target) {
        syncWorkspaceAction(
          "update_building",
          {
            building: {
              ...target,
              planStatus: "active",
              planExpiresAt: expiresIso,
            },
          },
          handleSyncError
        );
      }
      showToast(t.common.saved);
    },
    [data.buildings, handleSyncError, showToast, t.common.saved]
  );

  const adminApproveRequest = useCallback(
    (requestId: string) => {
      const target = data.subscriptionRequests.find((r) => r.id === requestId);
      if (!target) return;
      const months = PLANS[target.plan].months;
      const expires = new Date();
      expires.setMonth(expires.getMonth() + months);
      const expiresIso = expires.toISOString();
      const targetBuilding = data.buildings.find(
        (b) => b.id === target.buildingId
      );

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
      syncWorkspaceAction(
        "update_subscription_request",
        { requestId, status: "approved" },
        handleSyncError
      );
      if (targetBuilding) {
        syncWorkspaceAction(
          "update_building",
          {
            building: {
              ...targetBuilding,
              planStatus: "active",
              planExpiresAt: expiresIso,
            },
          },
          handleSyncError
        );
      }
      showToast(t.common.saved);
    },
    [data.buildings, data.subscriptionRequests, handleSyncError, showToast, t.common.saved]
  );

  const adminRejectRequest = useCallback(
    (requestId: string) => {
      setData((prev) => ({
        ...prev,
        subscriptionRequests: prev.subscriptionRequests.map((r) =>
          r.id === requestId ? { ...r, status: "rejected" } : r
        ),
      }));
      syncWorkspaceAction(
        "update_subscription_request",
        { requestId, status: "rejected" },
        handleSyncError
      );
      showToast(t.common.saved);
    },
    [handleSyncError, showToast, t.common.saved]
  );

  const adminSetBuildingExpired = useCallback(
    (buildingId: string) => {
      const pastIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const target = data.buildings.find((b) => b.id === buildingId);
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
      if (target) {
        syncWorkspaceAction(
          "update_building",
          {
            building: {
              ...target,
              planStatus: "expired",
              trialEndsAt: pastIso,
              planExpiresAt: pastIso,
            },
          },
          handleSyncError
        );
      }
      showToast(t.common.saved);
    },
    [data.buildings, handleSyncError, showToast, t.common.saved]
  );

  const adminRestoreBuildingTrial = useCallback(
    (buildingId: string) => {
      const futureIso = new Date(
        Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      const target = data.buildings.find((b) => b.id === buildingId);
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
      if (target) {
        syncWorkspaceAction(
          "update_building",
          {
            building: {
              ...target,
              planStatus: "trial",
              trialEndsAt: futureIso,
              planExpiresAt: null,
            },
          },
          handleSyncError
        );
      }
      showToast(t.common.saved);
    },
    [data.buildings, handleSyncError, showToast, t.common.saved]
  );

  const inviteMember = useCallback(
    async (input: {
      buildingId: string;
      email: string;
      role: "assistant" | "tenant";
      apartmentId?: string | null;
      displayName?: string;
    }): Promise<BuildingMembership | null> => {
      if (!guardWritable()) return null;
      const email = input.email.trim().toLowerCase();
      if (!email) return null;

      try {
        if (cloudConnected) {
          const res = await fetch("/api/workspace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "invite_member",
              payload: {
                buildingId: input.buildingId,
                email,
                role: input.role,
                apartmentId: input.apartmentId ?? null,
                displayName: input.displayName ?? "",
              },
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.membership) {
            showToast(json?.message || t.common.syncErrorToast);
            return null;
          }
          const created = json.membership as BuildingMembership;
          setData((prev) => ({
            ...prev,
            memberships: [
              ...(prev.memberships ?? []).filter((m) => m.id !== created.id),
              created,
            ],
          }));
          showToast(t.settings.inviteCreatedToast);
          return created;
        }
      } catch {
        showToast(t.common.syncErrorToast);
        return null;
      }

      // Offline / local fallback
      const localMember: BuildingMembership = {
        id: createId("mem"),
        buildingId: input.buildingId,
        email,
        clerkUserId: null,
        role: input.role,
        apartmentId: input.apartmentId ?? null,
        displayName: input.displayName?.trim() ?? "",
        inviteToken: createId("tok"),
        status: "invited",
        invitedBy: null,
        createdAt: new Date().toISOString(),
        acceptedAt: null,
      };
      setData((prev) => ({
        ...prev,
        memberships: [
          ...(prev.memberships ?? []).filter(
            (m) => !(m.buildingId === input.buildingId && m.email === email)
          ),
          localMember,
        ],
      }));
      showToast(t.settings.inviteCreatedToast);
      return localMember;
    },
    [cloudConnected, guardWritable, showToast, t.common.syncErrorToast, t.settings.inviteCreatedToast]
  );

  const updateMemberRole = useCallback(
    async (input: {
      membershipId: string;
      role: "assistant" | "tenant";
      apartmentId?: string | null;
    }): Promise<boolean> => {
      if (!guardWritable()) return false;
      try {
        if (cloudConnected) {
          const res = await fetch("/api/workspace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update_member_role",
              payload: input,
            }),
          });
          if (!res.ok) {
            showToast(t.common.syncErrorToast);
            return false;
          }
        }
      } catch {
        showToast(t.common.syncErrorToast);
        return false;
      }

      setData((prev) => ({
        ...prev,
        memberships: (prev.memberships ?? []).map((m) =>
          m.id === input.membershipId
            ? {
                ...m,
                role: input.role,
                apartmentId:
                  input.apartmentId !== undefined
                    ? input.apartmentId
                    : m.apartmentId,
              }
            : m
        ),
      }));
      showToast(t.common.saved);
      return true;
    },
    [cloudConnected, guardWritable, showToast, t.common.saved, t.common.syncErrorToast]
  );

  const revokeMember = useCallback(
    async (membershipId: string): Promise<boolean> => {
      if (!guardWritable()) return false;
      try {
        if (cloudConnected) {
          const res = await fetch("/api/workspace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "revoke_member",
              payload: { membershipId },
            }),
          });
          if (!res.ok) {
            showToast(t.common.syncErrorToast);
            return false;
          }
        }
      } catch {
        showToast(t.common.syncErrorToast);
        return false;
      }

      setData((prev) => ({
        ...prev,
        memberships: (prev.memberships ?? []).filter(
          (m) => m.id !== membershipId
        ),
      }));
      showToast(t.common.saved);
      return true;
    },
    [cloudConnected, guardWritable, showToast, t.common.saved, t.common.syncErrorToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = resetDemoAppData();
    setData(fresh);
    setSelectedMonthKey(getCurrentMonthKey());
    syncWorkspaceAction("reset_demo", {}, handleSyncError);
    showToast(t.common.saved);
  }, [handleSyncError, showToast, t.common.saved]);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      workspaceReady,
      authRequired,
      cloudConnected,
      data,
      t,
      locale: data.locale,
      theme: data.theme,
      whatsappLang: data.whatsappLang,
      activeTab,
      selectedMonthKey,
      hasBuildings,
      activeBuilding,
      activeBuildingRole,
      buildingApartments,
      buildingPayments,
      buildingExpenses,
      buildingMemberships,
      planAccess,
      toast,
      setActiveTab,
      setSelectedMonthKey,
      setLocale,
      toggleTheme,
      setWhatsappLang,
      setActiveBuildingId,
      showToast,
      createBuilding,
      deleteBuilding,
      updateBuildingSettings,
      addApartment,
      bulkAddApartments,
      importApartmentsBatch,
      updateApartment,
      recordPayment,
      recordPaymentsBatch,
      cancelPayment,
      addExpense,
      deleteExpense,
      submitSubscriptionRequest,
      adminApproveRequest,
      adminRejectRequest,
      adminActivateBuilding,
      adminSetBuildingExpired,
      adminRestoreBuildingTrial,
      inviteMember,
      updateMemberRole,
      revokeMember,
      resetDemoData,
    }),
    [
      hydrated,
      workspaceReady,
      authRequired,
      cloudConnected,
      data,
      t,
      activeTab,
      selectedMonthKey,
      hasBuildings,
      activeBuilding,
      activeBuildingRole,
      buildingApartments,
      buildingPayments,
      buildingExpenses,
      buildingMemberships,
      planAccess,
      toast,
      setLocale,
      toggleTheme,
      setWhatsappLang,
      setActiveBuildingId,
      showToast,
      createBuilding,
      deleteBuilding,
      updateBuildingSettings,
      addApartment,
      bulkAddApartments,
      importApartmentsBatch,
      updateApartment,
      recordPayment,
      recordPaymentsBatch,
      cancelPayment,
      addExpense,
      deleteExpense,
      submitSubscriptionRequest,
      adminApproveRequest,
      adminRejectRequest,
      adminActivateBuilding,
      adminSetBuildingExpired,
      adminRestoreBuildingTrial,
      inviteMember,
      updateMemberRole,
      revokeMember,
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
