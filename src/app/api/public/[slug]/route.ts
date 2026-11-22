import { NextResponse } from "next/server";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import {
  activateMatchingInvites,
  claimUnownedLegacyBuildingsIfNeeded,
  getAuthenticatedClerkIdentity,
  getUserBuildingMembership,
  isClerkServerConfigured,
  type UserMembershipMatch,
} from "@/lib/auth-server";
import { normalizeBillingCycle } from "@/lib/calculations";
import { ensureNeonSchema, getSql } from "@/lib/neon";

async function buildSafePortalResponse(
  sql: NeonQueryFunction<false, false>,
  building: Record<string, unknown>,
  viewer?: UserMembershipMatch | null,
  viewerEmails: string[] = []
) {
  const buildingId = String(building.id);
  const showNames = Boolean(building.show_names_publicly);
  const viewerEmailSet = new Set(viewerEmails.map((e) => e.trim().toLowerCase()));

  const [aRows, pRows, eRows, annRows, tktRows] = await Promise.all([
    sql`
      select id, building_id, unit_label, resident_name, monthly_fee, billing_cycle, active, sort_order
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
    sql`
      select id, building_id, title, body, category, pinned, author_name, created_at
      from syndic_announcements
      where building_id = ${buildingId}
      order by pinned desc, created_at desc
      limit 30
    `,
    sql`
      select id, building_id, apartment_id, unit_label, reporter_name, reporter_email,
             title, description, category, status, photo_url, admin_note, created_at, updated_at
      from syndic_tickets
      where building_id = ${buildingId}
      order by created_at desc
      limit 50
    `,
  ]);

  // Privacy enforcement: phone numbers are never returned; resident names stripped if show_names_publicly is false
  const safeApartments = aRows.map((a) => ({
    id: String(a.id),
    buildingId: String(a.building_id),
    unitLabel: String(a.unit_label),
    residentName: showNames ? String(a.resident_name ?? "") : "",
    phone: "",
    monthlyFee: Number(a.monthly_fee),
    billingCycle: normalizeBillingCycle(a.billing_cycle),
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

  const safeAnnouncements = annRows.map((ann) => ({
    id: String(ann.id),
    buildingId: String(ann.building_id),
    title: String(ann.title),
    body: String(ann.body),
    category: String(ann.category ?? "info"),
    pinned: Boolean(ann.pinned),
    authorName: String(ann.author_name ?? ""),
    createdAt: new Date(String(ann.created_at)).toISOString(),
  }));

  const safeTickets = tktRows.map((tkt) => {
    const rowEmail = String(tkt.reporter_email ?? "").trim().toLowerCase();
    const isOwn = Boolean(rowEmail && viewerEmailSet.has(rowEmail));
    return {
      id: String(tkt.id),
      buildingId: String(tkt.building_id),
      apartmentId: tkt.apartment_id ? String(tkt.apartment_id) : null,
      unitLabel: String(tkt.unit_label ?? ""),
      reporterName: showNames || isOwn ? String(tkt.reporter_name ?? "") : "",
      reporterEmail: "",
      title: String(tkt.title),
      description: String(tkt.description ?? ""),
      category: String(tkt.category ?? "autre"),
      status: String(tkt.status ?? "open"),
      photoUrl: tkt.photo_url ? String(tkt.photo_url) : null,
      adminNote: String(tkt.admin_note ?? ""),
      createdAt: new Date(String(tkt.created_at)).toISOString(),
      updatedAt: new Date(String(tkt.updated_at)).toISOString(),
    };
  });

  return NextResponse.json({
    mode: "cloud",
    requiresAuth: false,
    accessDenied: false,
    requiresPin: false,
    viewerRole: viewer?.role ?? "tenant",
    viewerApartmentId: viewer?.apartmentId ?? null,
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
    announcements: safeAnnouncements,
    tickets: safeTickets,
  });
}

export async function GET(
  _request: Request,
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

    const clerkActive = isClerkServerConfigured();
    if (clerkActive) {
      const identity = await getAuthenticatedClerkIdentity();
      if (!identity) {
        return NextResponse.json({
          mode: "cloud",
          requiresAuth: true,
          buildingName: String(building.name),
          city: String(building.city ?? ""),
        });
      }

      await claimUnownedLegacyBuildingsIfNeeded(sql, identity);
      await activateMatchingInvites(sql, identity);

      const membership = await getUserBuildingMembership(
        sql,
        String(building.id),
        identity
      );
      if (!membership) {
        return NextResponse.json(
          {
            mode: "cloud",
            requiresAuth: false,
            accessDenied: true,
            buildingName: String(building.name),
            city: String(building.city ?? ""),
            userEmail: identity.primaryEmail,
          },
          { status: 403 }
        );
      }

      return buildSafePortalResponse(
        sql,
        building as Record<string, unknown>,
        membership,
        identity.emails
      );
    }

    // Local/offline PIN gate only when Clerk is not configured
    const requiredPin = String(building.share_pin ?? "").trim();
    if (requiredPin) {
      return NextResponse.json({
        mode: "cloud",
        requiresPin: true,
        buildingName: String(building.name),
        city: String(building.city ?? ""),
        pinInvalid: false,
      });
    }

    return buildSafePortalResponse(sql, building as Record<string, unknown>);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const sql = getSql();

  if (!sql) {
    return NextResponse.json({ mode: "local" });
  }

  let body: { pin?: unknown };
  try {
    body = (await request.json()) as { pin?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
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

    const clerkActive = isClerkServerConfigured();
    if (clerkActive) {
      const identity = await getAuthenticatedClerkIdentity();
      if (!identity) {
        return NextResponse.json(
          {
            mode: "cloud",
            requiresAuth: true,
            buildingName: String(building.name),
            city: String(building.city ?? ""),
          },
          { status: 401 }
        );
      }

      await claimUnownedLegacyBuildingsIfNeeded(sql, identity);
      await activateMatchingInvites(sql, identity);

      const membership = await getUserBuildingMembership(
        sql,
        String(building.id),
        identity
      );
      if (!membership) {
        return NextResponse.json(
          {
            mode: "cloud",
            accessDenied: true,
            buildingName: String(building.name),
            city: String(building.city ?? ""),
            userEmail: identity.primaryEmail,
          },
          { status: 403 }
        );
      }

      return buildSafePortalResponse(
        sql,
        building as Record<string, unknown>,
        membership,
        identity.emails
      );
    }

    const submittedPin = String(body?.pin ?? "").trim();
    const requiredPin = String(building.share_pin ?? "").trim();

    if (requiredPin && submittedPin !== requiredPin) {
      return NextResponse.json(
        {
          mode: "cloud",
          requiresPin: true,
          buildingName: String(building.name),
          city: String(building.city ?? ""),
          pinInvalid: true,
        },
        { status: 401 }
      );
    }

    return buildSafePortalResponse(sql, building as Record<string, unknown>);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
