import { getSupabaseClient } from "./supabase";
import type {
  Apartment,
  Building,
  Expense,
  Payment,
  SubscriptionRequest,
} from "./types";

/**
 * Cloud synchronization helpers for Supabase PostgreSQL.
 * Each helper is a no-op when Supabase env vars are not configured or the user is in local demo mode.
 */
export async function fetchCloudWorkspace(): Promise<{
  buildings: Building[];
  apartments: Apartment[];
  payments: Payment[];
  expenses: Expense[];
  subscriptionRequests: SubscriptionRequest[];
} | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const [bRes, aRes, pRes, eRes, sRes] = await Promise.all([
    supabase
      .from("buildings")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("apartments")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from("payments").select("*"),
    supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false }),
    supabase
      .from("subscription_requests")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (bRes.error || !bRes.data || bRes.data.length === 0) {
    return null;
  }

  const buildings: Building[] = bRes.data.map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
    defaultMonthlyFee: Number(b.default_monthly_fee),
    openingBalance: Number(b.opening_balance),
    startMonth: b.start_month,
    rib: b.rib ?? "",
    shareSlug: b.share_slug,
    sharePin: b.share_pin ?? "",
    showNamesPublicly: Boolean(b.show_names_publicly),
    planStatus: b.plan_status,
    trialEndsAt: b.trial_ends_at,
    planExpiresAt: b.plan_expires_at,
    createdAt: b.created_at,
  }));

  const buildingNameById = new Map(buildings.map((b) => [b.id, b.name]));

  const apartments: Apartment[] = (aRes.data ?? []).map((a) => ({
    id: a.id,
    buildingId: a.building_id,
    unitLabel: a.unit_label,
    residentName: a.resident_name ?? "",
    phone: a.phone ?? "",
    monthlyFee: Number(a.monthly_fee),
    active: Boolean(a.active),
    sortOrder: Number(a.sort_order ?? 1),
  }));

  const payments: Payment[] = (pRes.data ?? []).map((p) => ({
    id: p.id,
    buildingId: p.building_id,
    apartmentId: p.apartment_id,
    monthKey: p.month_key,
    amount: Number(p.amount),
    method: p.method,
    receiptNumber: p.receipt_number,
    note: p.note ?? "",
    paidAt: p.paid_at,
  }));

  const expenses: Expense[] = (eRes.data ?? []).map((e) => ({
    id: e.id,
    buildingId: e.building_id,
    category: e.category,
    amount: Number(e.amount),
    expenseDate: e.expense_date,
    description: e.description,
    receiptPhotoUrl: e.receipt_photo_path,
    createdAt: e.created_at,
  }));

  const subscriptionRequests: SubscriptionRequest[] = (sRes.data ?? []).map(
    (s) => ({
      id: s.id,
      buildingId: s.building_id,
      buildingName: buildingNameById.get(s.building_id) ?? "Immeuble",
      referenceCode: s.reference_code,
      plan: s.plan,
      amountMAD: Number(s.amount_mad),
      channel: s.channel,
      proofPhotoUrl: s.proof_photo_path,
      note: s.note ?? "",
      status: s.status,
      createdAt: s.created_at,
    })
  );

  return {
    buildings,
    apartments,
    payments,
    expenses,
    subscriptionRequests,
  };
}

export async function pushPaymentToCloud(payment: Payment): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  await supabase.from("payments").upsert(
    {
      id: payment.id,
      building_id: payment.buildingId,
      apartment_id: payment.apartmentId,
      month_key: payment.monthKey,
      amount: payment.amount,
      method: payment.method,
      receipt_number: payment.receiptNumber,
      note: payment.note,
      paid_at: payment.paidAt,
    },
    { onConflict: "apartment_id,month_key" }
  );
}

export async function pushExpenseToCloud(expense: Expense): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  await supabase.from("expenses").insert({
    id: expense.id,
    building_id: expense.buildingId,
    category: expense.category,
    amount: expense.amount,
    expense_date: expense.expenseDate,
    description: expense.description,
    receipt_photo_path: expense.receiptPhotoUrl,
  });
}
