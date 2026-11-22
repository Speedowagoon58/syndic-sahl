import { NextResponse } from "next/server";
import { ensureNeonSchema, getSql } from "@/lib/neon";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const sql = getSql();

  if (!sql) {
    return NextResponse.json({ mode: "local" });
  }

  try {
    await ensureNeonSchema();

    const bRows = await sql`
      select * from syndic_buildings where share_slug = ${slug} limit 1
    `;
    const building = bRows[0];

    if (!building) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const pinParam = (url.searchParams.get("pin") ?? "").trim();
    const requiredPin = String(building.share_pin ?? "").trim();

    if (requiredPin && pinParam !== requiredPin) {
      return NextResponse.json(
        {
          mode: "cloud",
          requiresPin: true,
          buildingName: String(building.name),
          city: String(building.city ?? ""),
          pinInvalid: Boolean(pinParam),
        },
        { status: 401 }
      );
    }

    const buildingId = String(building.id);
    const showNames = Boolean(building.show_names_publicly);

    const [aRows, pRows, eRows] = await Promise.all([
      sql`
        select id, building_id, unit_label, resident_name, monthly_fee, active, sort_order
        from syndic_apartments
        where building_id = ${buildingId} and active = true
        order by sort_order asc
      `,
      sql`
        select id, building_id, apartment_id, month_key, amount, method, receipt_number, note, paid_at
        from syndic_payments
        where building_id = ${buildingId}
      `,
      sql`
        select id, building_id, category, amount, expense_date, description, receipt_photo_url, created_at
        from syndic_expenses
        where building_id = ${buildingId}
        order by expense_date desc, created_at desc
      `,
    ]);

    // Server-side privacy enforcement: phone numbers are never returned; resident names stripped if show_names_publicly is false
    const safeApartments = aRows.map((a) => ({
      id: String(a.id),
      buildingId: String(a.building_id),
      unitLabel: String(a.unit_label),
      residentName: showNames ? String(a.resident_name ?? "") : "",
      phone: "",
      monthlyFee: Number(a.monthly_fee),
      active: Boolean(a.active),
      sortOrder: Number(a.sort_order ?? 1),
    }));

    const safePayments = pRows.map((p) => ({
      id: String(p.id),
      buildingId: String(p.building_id),
      apartmentId: String(p.apartment_id),
      monthKey: String(p.month_key),
      amount: Number(p.amount),
      method: String(p.method),
      receiptNumber: String(p.receipt_number),
      note: String(p.note ?? ""),
      paidAt: new Date(String(p.paid_at)).toISOString(),
    }));

    const safeExpenses = eRows.map((e) => ({
      id: String(e.id),
      buildingId: String(e.building_id),
      category: String(e.category),
      amount: Number(e.amount),
      expenseDate: String(e.expense_date),
      description: String(e.description),
      receiptPhotoUrl: e.receipt_photo_url ? String(e.receipt_photo_url) : null,
      createdAt: new Date(String(e.created_at)).toISOString(),
    }));

    return NextResponse.json({
      mode: "cloud",
      requiresPin: false,
      building: {
        id: buildingId,
        name: String(building.name),
        city: String(building.city ?? ""),
        defaultMonthlyFee: Number(building.default_monthly_fee),
        openingBalance: Number(building.opening_balance),
        startMonth: String(building.start_month),
        rib: String(building.rib ?? ""),
        shareSlug: String(building.share_slug),
        sharePin: "",
        showNamesPublicly: showNames,
        planStatus: String(building.plan_status),
        trialEndsAt: new Date(String(building.trial_ends_at)).toISOString(),
        planExpiresAt: building.plan_expires_at
          ? new Date(String(building.plan_expires_at)).toISOString()
          : null,
        createdAt: new Date(String(building.created_at)).toISOString(),
      },
      apartments: safeApartments,
      payments: safePayments,
      expenses: safeExpenses,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
