export type Locale = "fr" | "ar";
export type WhatsAppLang = "darija" | "fr" | "ar";
export type PaymentMethod = "cash" | "virement" | "cheque";
export type ExpenseCategory =
  | "gardiennage"
  | "eau_electricite"
  | "ascenseur"
  | "nettoyage"
  | "reparation"
  | "autre";
export type PlanStatus = "trial" | "active" | "expired";
export type PlanDuration = "semi_annual" | "annual";
export type SubscriptionChannel = "virement" | "cashplus";
export type SubscriptionRequestStatus = "pending" | "approved" | "rejected";
export type AppTab = "payments" | "expenses" | "report" | "subscription" | "settings";

export interface Building {
  id: string;
  name: string;
  city: string;
  defaultMonthlyFee: number;
  openingBalance: number;
  startMonth: string; // YYYY-MM
  rib: string;
  shareSlug: string;
  sharePin: string;
  showNamesPublicly: boolean;
  planStatus: PlanStatus;
  trialEndsAt: string;
  planExpiresAt: string | null;
  createdAt: string;
}

export interface Apartment {
  id: string;
  buildingId: string;
  unitLabel: string;
  residentName: string;
  phone: string;
  monthlyFee: number;
  active: boolean;
  sortOrder: number;
}

export interface Payment {
  id: string;
  buildingId: string;
  apartmentId: string;
  monthKey: string; // YYYY-MM
  amount: number;
  method: PaymentMethod;
  receiptNumber: string;
  note: string;
  paidAt: string;
}

export interface Expense {
  id: string;
  buildingId: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  description: string;
  receiptPhotoUrl: string | null;
  createdAt: string;
}

export interface SubscriptionRequest {
  id: string;
  buildingId: string;
  buildingName: string;
  referenceCode: string;
  plan: PlanDuration;
  amountMAD: number;
  channel: SubscriptionChannel;
  proofPhotoUrl: string | null;
  note: string;
  status: SubscriptionRequestStatus;
  createdAt: string;
}

export interface AppData {
  locale: Locale;
  whatsappLang: WhatsAppLang;
  activeBuildingId: string;
  buildings: Building[];
  apartments: Apartment[];
  payments: Payment[];
  expenses: Expense[];
  subscriptionRequests: SubscriptionRequest[];
}
