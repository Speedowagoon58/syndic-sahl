import { STORAGE_KEY } from "./config";
import { createSeedData } from "./seed";
import type { AppData } from "./types";

export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return createSeedData();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (!parsed || !Array.isArray(parsed.buildings) || parsed.buildings.length === 0) {
      const seed = createSeedData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return {
      locale: parsed.locale === "ar" ? "ar" : "fr",
      theme: parsed.theme === "dark" ? "dark" : "light",
      whatsappLang:
        parsed.whatsappLang === "fr" || parsed.whatsappLang === "ar"
          ? parsed.whatsappLang
          : "darija",
      activeBuildingId: parsed.activeBuildingId || parsed.buildings[0].id,
      buildings: parsed.buildings,
      apartments: Array.isArray(parsed.apartments) ? parsed.apartments : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      subscriptionRequests: Array.isArray(parsed.subscriptionRequests)
        ? parsed.subscriptionRequests
        : [],
      memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
      announcements: Array.isArray(parsed.announcements)
        ? parsed.announcements
        : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      myRoles:
        parsed.myRoles && typeof parsed.myRoles === "object"
          ? parsed.myRoles
          : {},
    };
  } catch {
    return createSeedData();
  }
}

export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors gracefully; in-memory state remains active.
  }
}

export function resetDemoAppData(): AppData {
  const seed = createSeedData();
  saveAppData(seed);
  return seed;
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
