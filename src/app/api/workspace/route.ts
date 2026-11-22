import { NextResponse } from "next/server";
import { ensureNeonSchema, getSql, seedNeonDatabase } from "@/lib/neon";
import type {
  Apartment,
  Building,
  Expense,
  Payment,
  SubscriptionRequest,
} from "@/lib/types";

export async function GET() {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ mode: "local" });
  }

  try {
    await ensureNeonSchema();

    const [bRows, aRows, pRows, eRows, sRows] = await Promise.all([
      sql`select * from syndic_buildings order by created_at asc`,
      sql`select * from syndic_apartments order by sort_order asc`,
      sql`select * from syndic_payments order by paid_at desc`,
      sql`select * from syndic_expenses order by expense_date desc, created_at desc`,
      sql`select * from syndic_subscription_requests order by created_at desc`,
    ]);

    const buildings: Building[] = bRows.map((b) => ({
      id: String(b.id),
      name: String(b.name),
      city: String(b.city ?? ""),
      defaultMonthlyFee: Number(b.default_monthly_fee),
      openingBalance: Number(b.opening_balance),
      startMonth: String(b.start_month),
      rib: String(b.rib ?? ""),
      shareSlug: String(b.share_slug),
      sharePin: String(b.share_pin ?? ""),
      showNamesPublicly: Boolean(b.show_names_publicly),
      planStatus: b.plan_status as Building["planStatus"],
      trialEndsAt: new Date(String(b.trial_ends_at)).toISOString(),
      planExpiresAt: b.plan_expires_at
        ? new Date(String(b.plan_expires_at)).toISOString()
        : null,
      createdAt: new Date(String(b.created_at)).toISOString(),
    }));

    const apartments: Apartment[] = aRows.map((a) => ({
      id: String(a.id),
      buildingId: String(a.building_id),
      unitLabel: String(a.unit_label),
      residentName: String(a.resident_name ?? ""),
      phone: String(a.phone ?? ""),
      monthlyFee: Number(a.monthly_fee),
      active: Boolean(a.active),
      sortOrder: Number(a.sort_order ?? 1),
    }));

    const payments: Payment[] = pRows.map((p) => ({
      id: String(p.id),
      buildingId: String(p.building_id),
      apartmentId: String(p.apartment_id),
      monthKey: String(p.month_key),
      amount: Number(p.amount),
      method: p.method as Payment["method"],
      receiptNumber: String(p.receipt_number),
      note: String(p.note ?? ""),
      paidAt: new Date(String(p.paid_at)).toISOString(),
    }));

    const expenses: Expense[] = eRows.map((e) => ({
      id: String(e.id),
      buildingId: String(e.building_id),
      category: e.category as Expense["category"],
      amount: Number(e.amount),
      expenseDate: String(e.expense_date),
      description: String(e.description),
      receiptPhotoUrl: e.receipt_photo_url ? String(e.receipt_photo_url) : null,
      createdAt: new Date(String(e.created_at)).toISOString(),
    }));

    const subscriptionRequests: SubscriptionRequest[] = sRows.map((s) => ({
      id: String(s.id),
      buildingId: String(s.building_id),
      buildingName: String(s.building_name),
      referenceCode: String(s.reference_code),
      plan: s.plan as SubscriptionRequest["plan"],
      amountMAD: Number(s.amount_mad),
      channel: s.channel as SubscriptionRequest["channel"],
      proofPhotoUrl: s.proof_photo_url ? String(s.proof_photo_url) : null,
      note: String(s.note ?? ""),
      status: s.status as SubscriptionRequest["status"],
      createdAt: new Date(String(s.created_at)).toISOString(),
    }));

    return NextResponse.json({
      mode: "neon",
      buildings,
      apartments,
      payments,
      expenses,
      subscriptionRequests,
    });
  } catch (error) {
    return NextResponse.json(
      {
        mode: "error",
        message: error instanceof Error ? error.message : "Database error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ mode: "local", ok: true });
  }

  try {
    await ensureNeonSchema();
    const body = (await request.json()) as {
      action: string;
      payload?: Record<string, unknown>;
    };
    const { action, payload = {} } = body;

    if (action === "create_building") {
      const b = payload.building as Building;
      const units = (payload.apartments as Apartment[]) ?? [];
      await sql`
        insert into syndic_buildings (
          id, name, city, default_monthly_fee, opening_balance, start_month,
          rib, share_slug, share_pin, show_names_publicly, plan_status,
          trial_ends_at, plan_expires_at, created_at
        ) values (
          ${b.id}, ${b.name}, ${b.city}, ${b.defaultMonthlyFee}, ${b.openingBalance}, ${b.startMonth},
          ${b.rib}, ${b.shareSlug}, ${b.sharePin}, ${b.showNamesPublicly}, ${b.planStatus},
          ${b.trialEndsAt}, ${b.planExpiresAt}, ${b.createdAt}
        ) on conflict (id) do nothing
      `;
      for (const a of units) {
        await sql`
          insert into syndic_apartments (
            id, building_id, unit_label, resident_name, phone, monthly_fee, active, sort_order
          ) values (
            ${a.id}, ${a.buildingId}, ${a.unitLabel}, ${a.residentName}, ${a.phone},
            ${a.monthlyFee}, ${a.active}, ${a.sortOrder}
          ) on conflict (id) do nothing
        `;
      }
    } else if (action === "update_building") {
      const b = payload.building as Building;
      await sql`
        update syndic_buildings set
          name = ${b.name},
          city = ${b.city},
          default_monthly_fee = ${b.defaultMonthlyFee},
          opening_balance = ${b.openingBalance},
          start_month = ${b.startMonth},
          rib = ${b.rib},
          share_pin = ${b.sharePin},
          show_names_publicly = ${b.showNamesPublicly},
          plan_status = ${b.planStatus},
          trial_ends_at = ${b.trialEndsAt},
          plan_expires_at = ${b.planExpiresAt}
        where id = ${b.id}
      `;
    } else if (action === "add_apartments") {
      const units = (payload.apartments as Apartment[]) ?? [];
      for (const a of units) {
        await sql`
          insert into syndic_apartments (
            id, building_id, unit_label, resident_name, phone, monthly_fee, active, sort_order
          ) values (
            ${a.id}, ${a.buildingId}, ${a.unitLabel}, ${a.residentName}, ${a.phone},
            ${a.monthlyFee}, ${a.active}, ${a.sortOrder}
          ) on conflict (id) do nothing
        `;
      }
    } else if (action === "update_apartment") {
      const a = payload.apartment as Apartment;
      await sql`
        update syndic_apartments set
          unit_label = ${a.unitLabel},
          resident_name = ${a.residentName},
          phone = ${a.phone},
          monthly_fee = ${a.monthlyFee},
          active = ${a.active}
        where id = ${a.id}
      `;
    } else if (action === "record_payment") {
      const p = payload.payment as Payment;
      await sql`
        insert into syndic_payments (
          id, building_id, apartment_id, month_key, amount, method, receipt_number, note, paid_at
        ) values (
          ${p.id}, ${p.buildingId}, ${p.apartmentId}, ${p.monthKey}, ${p.amount},
          ${p.method}, ${p.receiptNumber}, ${p.note}, ${p.paidAt}
        )
        on conflict (apartment_id, month_key) do update set
          id = excluded.id,
          amount = excluded.amount,
          method = excluded.method,
          receipt_number = excluded.receipt_number,
          note = excluded.note,
          paid_at = excluded.paid_at
      `;
    } else if (action === "cancel_payment") {
      const paymentId = String(payload.paymentId ?? "");
      await sql`delete from syndic_payments where id = ${paymentId}`;
    } else if (action === "add_expense") {
      const e = payload.expense as Expense;
      await sql`
        insert into syndic_expenses (
          id, building_id, category, amount, expense_date, description, receipt_photo_url, created_at
        ) values (
          ${e.id}, ${e.buildingId}, ${e.category}, ${e.amount}, ${e.expenseDate},
          ${e.description}, ${e.receiptPhotoUrl}, ${e.createdAt}
        ) on conflict (id) do nothing
      `;
    } else if (action === "delete_expense") {
      const expenseId = String(payload.expenseId ?? "");
      await sql`delete from syndic_expenses where id = ${expenseId}`;
    } else if (action === "submit_subscription_request") {
      const r = payload.request as SubscriptionRequest;
      await sql`
        insert into syndic_subscription_requests (
          id, building_id, building_name, reference_code, plan, amount_mad,
          channel, proof_photo_url, note, status, created_at
        ) values (
          ${r.id}, ${r.buildingId}, ${r.buildingName}, ${r.referenceCode}, ${r.plan},
          ${r.amountMAD}, ${r.channel}, ${r.proofPhotoUrl}, ${r.note}, ${r.status}, ${r.createdAt}
        ) on conflict (id) do nothing
      `;
    } else if (action === "update_subscription_request") {
      const requestId = String(payload.requestId ?? "");
      const status = String(payload.status ?? "pending");
      await sql`
        update syndic_subscription_requests set status = ${status} where id = ${requestId}
      `;
    } else if (action === "reset_demo") {
      await sql`truncate table syndic_subscription_requests, syndic_expenses, syndic_payments, syndic_apartments, syndic_buildings cascade`;
      await seedNeonDatabase(sql);
    }

    return NextResponse.json({ mode: "neon", ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        mode: "error",
        ok: false,
        message: error instanceof Error ? error.message : "Database write error",
      },
      { status: 500 }
    );
  }
}
