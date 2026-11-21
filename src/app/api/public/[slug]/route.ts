import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ mode: "local" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: building, error: bErr } = await supabase
    .from("buildings")
    .select("*")
    .eq("share_slug", slug)
    .maybeSingle();

  if (bErr || !building) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const pinParam = (url.searchParams.get("pin") ?? "").trim();
  const requiredPin = (building.share_pin ?? "").trim();

  if (requiredPin && pinParam !== requiredPin) {
    return NextResponse.json(
      {
        mode: "cloud",
        requiresPin: true,
        buildingName: building.name,
        city: building.city,
        pinInvalid: Boolean(pinParam),
      },
      { status: 401 }
    );
  }

  const [{ data: apartments }, { data: payments }, { data: expenses }] =
    await Promise.all([
      supabase
        .from("apartments")
        .select(
          "id, building_id, unit_label, resident_name, monthly_fee, active, sort_order"
        )
        .eq("building_id", building.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("payments")
        .select(
          "id, building_id, apartment_id, month_key, amount, method, receipt_number, note, paid_at"
        )
        .eq("building_id", building.id),
      supabase
        .from("expenses")
        .select(
          "id, building_id, category, amount, expense_date, description, receipt_photo_path, created_at"
        )
        .eq("building_id", building.id)
        .order("expense_date", { ascending: false }),
    ]);

  // Privacy enforcement on server: never return phone numbers, and strip resident names if show_names_publicly is false
  const safeApartments = (apartments ?? []).map((a) => ({
    id: a.id,
    buildingId: a.building_id,
    unitLabel: a.unit_label,
    residentName: building.show_names_publicly ? a.resident_name : "",
    phone: "",
    monthlyFee: Number(a.monthly_fee),
    active: a.active,
    sortOrder: a.sort_order,
  }));

  const safePayments = (payments ?? []).map((p) => ({
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

  const safeExpenses = (expenses ?? []).map((e) => ({
    id: e.id,
    buildingId: e.building_id,
    category: e.category,
    amount: Number(e.amount),
    expenseDate: e.expense_date,
    description: e.description,
    receiptPhotoUrl: e.receipt_photo_path,
    createdAt: e.created_at,
  }));

  return NextResponse.json({
    mode: "cloud",
    requiresPin: false,
    building: {
      id: building.id,
      name: building.name,
      city: building.city,
      defaultMonthlyFee: Number(building.default_monthly_fee),
      openingBalance: Number(building.opening_balance),
      startMonth: building.start_month,
      rib: building.rib ?? "",
      shareSlug: building.share_slug,
      sharePin: "",
      showNamesPublicly: Boolean(building.show_names_publicly),
      planStatus: building.plan_status,
      trialEndsAt: building.trial_ends_at,
      planExpiresAt: building.plan_expires_at,
      createdAt: building.created_at,
    },
    apartments: safeApartments,
    payments: safePayments,
    expenses: safeExpenses,
  });
}
