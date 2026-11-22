import { NextResponse } from "next/server";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import {
  activateMatchingInvites,
  claimUnownedLegacyBuildingsIfNeeded,
  getAuthenticatedClerkIdentity,
  getUserBuildingMembership,
  isClerkServerConfigured,
  isFounderIdentity,
  mapMembershipRow,
  normalizeMemberRole,
  type AuthenticatedClerkIdentity,
} from "@/lib/auth-server";
import { normalizeBillingCycle } from "@/lib/calculations";
import { ensureNeonSchema, getSql, seedNeonDatabase } from "@/lib/neon";
import type {
  AnnouncementCategory,
  Apartment,
  AuditLogEntry,
  Building,
  BuildingAnnouncement,
  BuildingMembership,
  Expense,
  MaintenanceTicket,
  MemberRole,
  Payment,
  SubscriptionRequest,
  TicketCategory,
  TicketStatus,
} from "@/lib/types";

const ALLOWED_ACTIONS = new Set([
  "create_building",
  "update_building",
  "add_apartments",
  "update_apartment",
  "record_payment",
  "record_payments_batch",
  "delete_building",
  "cancel_payment",
  "add_expense",
  "delete_expense",
  "submit_subscription_request",
  "update_subscription_request",
  "admin_update_building_plan",
  "reset_demo",
  "invite_member",
  "update_member_role",
  "revoke_member",
  "transfer_ownership",
  "create_announcement",
  "toggle_announcement_pin",
  "delete_announcement",
  "create_ticket",
  "update_ticket_status",
  "delete_ticket",
]);

const PROTECTED_ADMIN_ACTIONS = new Set([
  "update_subscription_request",
  "admin_update_building_plan",
  "reset_demo",
]);

const ANNOUNCEMENT_CATEGORIES = new Set<AnnouncementCategory>([
  "info",
  "ag",
  "travaux",
  "urgence",
]);

const TICKET_CATEGORIES = new Set<TicketCategory>([
  "plomberie",
  "electricite",
  "ascenseur",
  "nettoyage",
  "securite",
  "autre",
]);

const TICKET_STATUSES = new Set<TicketStatus>([
  "open",
  "in_progress",
  "resolved",
]);

function isPositiveFinite(val: unknown): val is number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0;
}

function isNonNegativeFinite(val: unknown): boolean {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidOptionalImageDataUrl(val: unknown): boolean {
  if (val == null || val === "") return true;
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return true;
  return trimmed.startsWith("data:image/") && trimmed.length <= 1_500_000;
}

function badRequest(error: string, message?: string) {
  return NextResponse.json(
    { mode: "error", ok: false, error, message: message ?? error },
    { status: 400 }
  );
}

function forbidden(message = "Insufficient role permissions for this building") {
  return NextResponse.json(
    { mode: "error", ok: false, error: "forbidden", message },
    { status: 403 }
  );
}

function mapBuilding(b: Record<string, unknown>): Building {
  return {
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
  };
}

function mapAnnouncement(row: Record<string, unknown>): BuildingAnnouncement {
  const rawCat = String(row.category ?? "info") as AnnouncementCategory;
  return {
    id: String(row.id),
    buildingId: String(row.building_id),
    title: String(row.title),
    body: String(row.body ?? ""),
    category: ANNOUNCEMENT_CATEGORIES.has(rawCat) ? rawCat : "info",
    pinned: Boolean(row.pinned),
    authorName: String(row.author_name ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapTicket(
  row: Record<string, unknown>,
  includeEmail = true
): MaintenanceTicket {
  const rawCat = String(row.category ?? "autre") as TicketCategory;
  const rawStatus = String(row.status ?? "open") as TicketStatus;
  return {
    id: String(row.id),
    buildingId: String(row.building_id),
    apartmentId: row.apartment_id ? String(row.apartment_id) : null,
    unitLabel: String(row.unit_label ?? ""),
    reporterName: String(row.reporter_name ?? ""),
    reporterEmail: includeEmail ? String(row.reporter_email ?? "") : "",
    title: String(row.title),
    description: String(row.description ?? ""),
    category: TICKET_CATEGORIES.has(rawCat) ? rawCat : "autre",
    status: TICKET_STATUSES.has(rawStatus) ? rawStatus : "open",
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    adminNote: String(row.admin_note ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapAuditLog(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(row.id),
    buildingId: String(row.building_id),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    actorName: String(row.actor_name ?? ""),
    actorEmail: String(row.actor_email ?? ""),
    actorRole: normalizeMemberRole(row.actor_role),
    action: String(row.action),
    summary: String(row.summary ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

async function writeAuditLog(
  sql: NeonQueryFunction<false, false>,
  params: {
    buildingId: string;
    identity: AuthenticatedClerkIdentity | null;
    role: MemberRole;
    action: string;
    summary: string;
  }
): Promise<void> {
  try {
    const id = `aud-${crypto.randomUUID().slice(0, 8)}`;
    await sql`
      insert into syndic_audit_logs (
        id, building_id, actor_user_id, actor_name, actor_email, actor_role, action, summary
      ) values (
        ${id},
        ${params.buildingId},
        ${params.identity?.userId ?? null},
        ${params.identity?.fullName || "Syndic"},
        ${params.identity?.primaryEmail || ""},
        ${params.role},
        ${params.action},
        ${params.summary.slice(0, 280)}
      )
    `;
  } catch {
    // Non-fatal: audit log writes must not interrupt primary operations
  }
}

export async function GET() {
  const clerkActive = isClerkServerConfigured();
  const identity = clerkActive ? await getAuthenticatedClerkIdentity() : null;

  if (clerkActive && !identity) {
    return NextResponse.json({ mode: "auth_required" });
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ mode: "local" });
  }

  try {
    await ensureNeonSchema();

    if (clerkActive && identity) {
      await claimUnownedLegacyBuildingsIfNeeded(sql, identity);
      await activateMatchingInvites(sql, identity);

      const emailMatchRows =
        identity.emails.length > 0
          ? await sql`
              select * from syndic_memberships
              where status != 'revoked'
                and (clerk_user_id = ${identity.userId} or lower(email) = any(${identity.emails}))
            `
          : await sql`
              select * from syndic_memberships
              where status != 'revoked'
                and clerk_user_id = ${identity.userId}
            `;

      const ownedRows = await sql`
        select * from syndic_buildings where owner_id = ${identity.userId} order by created_at asc
      `;

      const myRoles: Record<string, MemberRole> = {};
      for (const m of emailMatchRows) {
        const bId = String(m.building_id);
        const role = normalizeMemberRole(m.role);
        const prev = myRoles[bId];
        if (
          !prev ||
          role === "syndic" ||
          (role === "assistant" && prev === "tenant")
        ) {
          myRoles[bId] = role;
        }
      }
      for (const o of ownedRows) {
        myRoles[String(o.id)] = "syndic";
      }

      const isFounder = isFounderIdentity(identity);
      const authorizedIds = Object.keys(myRoles);
      if (authorizedIds.length === 0) {
        return NextResponse.json({
          mode: "neon",
          isFounder,
          user: {
            id: identity.userId,
            email: identity.primaryEmail,
            name: identity.fullName,
          },
          myRoles: {},
          buildings: [],
          apartments: [],
          payments: [],
          expenses: [],
          subscriptionRequests: [],
          memberships: [],
          announcements: [],
          tickets: [],
          auditLogs: [],
        });
      }

      const adminBuildingIds = authorizedIds.filter(
        (id) => myRoles[id] === "syndic" || myRoles[id] === "assistant"
      );

      const [bRows, aRows, pRows, eRows, sRows, mRows, annRows, tktRows, audRows] =
        await Promise.all([
          sql`select * from syndic_buildings where id = any(${authorizedIds}) order by created_at asc`,
          sql`select * from syndic_apartments where building_id = any(${authorizedIds}) order by sort_order asc`,
          sql`select * from syndic_payments where building_id = any(${authorizedIds}) order by paid_at desc`,
          sql`select * from syndic_expenses where building_id = any(${authorizedIds}) order by expense_date desc, created_at desc`,
          sql`select * from syndic_subscription_requests where building_id = any(${authorizedIds}) order by created_at desc`,
          sql`select * from syndic_memberships where building_id = any(${authorizedIds}) order by created_at asc`,
          sql`select * from syndic_announcements where building_id = any(${authorizedIds}) order by pinned desc, created_at desc limit 100`,
          sql`select * from syndic_tickets where building_id = any(${authorizedIds}) order by created_at desc limit 150`,
          adminBuildingIds.length > 0
            ? sql`select * from syndic_audit_logs where building_id = any(${adminBuildingIds}) order by created_at desc limit 200`
            : Promise.resolve([]),
        ]);

      const buildings = bRows.map((b) => mapBuilding(b as Record<string, unknown>));

      const apartments: Apartment[] = aRows.map((a) => ({
        id: String(a.id),
        buildingId: String(a.building_id),
        unitLabel: String(a.unit_label),
        residentName: String(a.resident_name ?? ""),
        phone: String(a.phone ?? ""),
        monthlyFee: Number(a.monthly_fee),
        billingCycle: normalizeBillingCycle(a.billing_cycle),
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

      const memberships: BuildingMembership[] = [];
      for (const raw of mRows) {
        const bId = String(raw.building_id);
        const viewerRole = myRoles[bId];
        if (!viewerRole) continue;
        const rowRole = normalizeMemberRole(raw.role);
        const rowEmail = String(raw.email ?? "").trim().toLowerCase();
        const isSelf =
          raw.clerk_user_id === identity.userId ||
          identity.emails.includes(rowEmail);

        if (viewerRole === "tenant" && !isSelf) continue;

        const allowToken =
          viewerRole === "syndic" ||
          (viewerRole === "assistant" && rowRole === "tenant");
        memberships.push(
          mapMembershipRow(raw as Record<string, unknown>, allowToken)
        );
      }

      const announcements = annRows.map((ann) =>
        mapAnnouncement(ann as Record<string, unknown>)
      );
      const tickets = tktRows.map((tkt) => {
        const bId = String(tkt.building_id);
        const includeEmail = myRoles[bId] === "syndic" || myRoles[bId] === "assistant";
        return mapTicket(tkt as Record<string, unknown>, includeEmail);
      });
      const auditLogs = audRows.map((aud) =>
        mapAuditLog(aud as Record<string, unknown>)
      );

      return NextResponse.json({
        mode: "neon",
        isFounder,
        user: {
          id: identity.userId,
          email: identity.primaryEmail,
          name: identity.fullName,
        },
        myRoles,
        buildings,
        apartments,
        payments,
        expenses,
        subscriptionRequests,
        memberships,
        announcements,
        tickets,
        auditLogs,
      });
    }

    // Unauthenticated local-dev / test fallback only when Clerk keys are absent
    const [bRows, aRows, pRows, eRows, sRows, annRows, tktRows, audRows] =
      await Promise.all([
        sql`select * from syndic_buildings order by created_at asc`,
        sql`select * from syndic_apartments order by sort_order asc`,
        sql`select * from syndic_payments order by paid_at desc`,
        sql`select * from syndic_expenses order by expense_date desc, created_at desc`,
        sql`select * from syndic_subscription_requests order by created_at desc`,
        sql`select * from syndic_announcements order by pinned desc, created_at desc limit 100`,
        sql`select * from syndic_tickets order by created_at desc limit 150`,
        sql`select * from syndic_audit_logs order by created_at desc limit 200`,
      ]);

    const buildings = bRows.map((b) => mapBuilding(b as Record<string, unknown>));
    const apartments: Apartment[] = aRows.map((a) => ({
      id: String(a.id),
      buildingId: String(a.building_id),
      unitLabel: String(a.unit_label),
      residentName: String(a.resident_name ?? ""),
      phone: String(a.phone ?? ""),
      monthlyFee: Number(a.monthly_fee),
      billingCycle: normalizeBillingCycle(a.billing_cycle),
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
      isFounder: true,
      myRoles: Object.fromEntries(buildings.map((b) => [b.id, "syndic" as const])),
      buildings,
      apartments,
      payments,
      expenses,
      subscriptionRequests,
      memberships: [],
      announcements: annRows.map((ann) =>
        mapAnnouncement(ann as Record<string, unknown>)
      ),
      tickets: tktRows.map((tkt) =>
        mapTicket(tkt as Record<string, unknown>, true)
      ),
      auditLogs: audRows.map((aud) =>
        mapAuditLog(aud as Record<string, unknown>)
      ),
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
  const clerkActive = isClerkServerConfigured();
  const identity = clerkActive ? await getAuthenticatedClerkIdentity() : null;

  if (clerkActive && !identity) {
    return NextResponse.json(
      { mode: "error", ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let body: { action?: unknown; payload?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; payload?: unknown };
  } catch {
    return badRequest("invalid_json", "Invalid JSON request body");
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.action !== "string" ||
    !ALLOWED_ACTIONS.has(body.action)
  ) {
    return badRequest("invalid_action", "Unsupported or missing action");
  }

  const action = body.action;
  const payload =
    body.payload && typeof body.payload === "object"
      ? (body.payload as Record<string, unknown>)
      : {};

  if (PROTECTED_ADMIN_ACTIONS.has(action) && clerkActive && !isFounderIdentity(identity)) {
    return NextResponse.json(
      { mode: "error", ok: false, error: "founder_only", message: "Founder access required" },
      { status: 403 }
    );
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ mode: "local", ok: true });
  }

  const checkRole = async (
    buildingId: string,
    allowed: MemberRole[]
  ): Promise<MemberRole | null> => {
    if (!clerkActive || !identity) return "syndic";
    const match = await getUserBuildingMembership(sql, buildingId, identity);
    if (!match || !allowed.includes(match.role)) return null;
    return match.role;
  };

  try {
    await ensureNeonSchema();

    if (action === "create_building") {
      const b = payload.building as Building | undefined;
      if (!b || !b.id?.trim() || !b.name?.trim() || !b.shareSlug?.trim()) {
        return badRequest("invalid_building", "Building id, name and slug are required");
      }
      const userId = identity?.userId ?? null;
      const units = Array.isArray(payload.apartments)
        ? (payload.apartments as Apartment[])
        : [];
      const baseSlug = b.shareSlug.trim();
      const slugTaken = await sql`
        select id from syndic_buildings where share_slug = ${baseSlug} limit 1
      `;
      const finalSlug =
        slugTaken[0] && String(slugTaken[0].id) !== b.id
          ? `${baseSlug}-${crypto.randomUUID().slice(0, 4)}`
          : baseSlug;

      await sql`
        insert into syndic_buildings (
          id, owner_id, name, city, default_monthly_fee, opening_balance, start_month,
          rib, share_slug, share_pin, show_names_publicly, plan_status,
          trial_ends_at, plan_expires_at, created_at
        ) values (
          ${b.id}, ${userId}, ${b.name}, ${b.city}, ${b.defaultMonthlyFee}, ${b.openingBalance}, ${b.startMonth},
          ${b.rib}, ${finalSlug}, ${b.sharePin}, ${b.showNamesPublicly}, ${b.planStatus},
          ${b.trialEndsAt}, ${b.planExpiresAt}, ${b.createdAt}
        ) on conflict (id) do nothing
      `;

      if (identity) {
        const ownerEmail = identity.primaryEmail || `${identity.userId}@clerk.local`;
        const memId = `mem-${crypto.randomUUID().slice(0, 8)}`;
        const token = crypto.randomUUID();
        await sql`
          insert into syndic_memberships (
            id, building_id, email, clerk_user_id, role, display_name,
            invite_token, status, invited_by, accepted_at
          ) values (
            ${memId}, ${b.id}, ${ownerEmail}, ${identity.userId}, 'syndic',
            ${identity.fullName}, ${token}, 'active', ${identity.userId}, now()
          )
          on conflict (building_id, email) do nothing
        `;
      }

      for (const a of units) {
        if (!a?.id || !a?.unitLabel) continue;
        await sql`
          insert into syndic_apartments (
            id, building_id, unit_label, resident_name, phone, monthly_fee, billing_cycle, active, sort_order
          ) values (
            ${a.id}, ${b.id}, ${a.unitLabel}, ${a.residentName}, ${a.phone},
            ${a.monthlyFee}, ${normalizeBillingCycle(a.billingCycle)}, ${a.active}, ${a.sortOrder}
          ) on conflict (id) do nothing
        `;
      }
      await writeAuditLog(sql, {
        buildingId: b.id,
        identity,
        role: "syndic",
        action: "create_building",
        summary: `${b.name} (${units.length} lots)`,
      });
      return NextResponse.json({ mode: "neon", ok: true, shareSlug: finalSlug });
    } else if (action === "update_building") {
      const b = payload.building as Building | undefined;
      if (
        !b ||
        !b.id?.trim() ||
        !b.name?.trim() ||
        !isNonNegativeFinite(b.defaultMonthlyFee) ||
        !Number.isFinite(Number(b.openingBalance))
      ) {
        return badRequest("invalid_building", "Valid building id, name and numbers are required");
      }
      const callerRole = await checkRole(b.id, ["syndic", "assistant"]);
      if (!callerRole) {
        return forbidden();
      }
      await sql`
        update syndic_buildings set
          name = ${b.name},
          city = ${b.city},
          default_monthly_fee = ${b.defaultMonthlyFee},
          opening_balance = ${b.openingBalance},
          start_month = ${b.startMonth},
          rib = ${b.rib},
          share_pin = ${b.sharePin},
          show_names_publicly = ${b.showNamesPublicly}
        where id = ${b.id}
      `;
      await writeAuditLog(sql, {
        buildingId: b.id,
        identity,
        role: callerRole,
        action: "update_building",
        summary: b.name,
      });
    } else if (action === "admin_update_building_plan") {
      const buildingId = String(payload.buildingId ?? "").trim();
      const planStatus = String(payload.planStatus ?? "").trim();
      const trialEndsAt = payload.trialEndsAt
        ? String(payload.trialEndsAt)
        : new Date().toISOString();
      const planExpiresAt = payload.planExpiresAt
        ? String(payload.planExpiresAt)
        : null;
      if (
        !buildingId ||
        !["trial", "active", "expired"].includes(planStatus)
      ) {
        return badRequest("invalid_plan_update", "Valid buildingId and planStatus required");
      }
      await sql`
        update syndic_buildings set
          plan_status = ${planStatus},
          trial_ends_at = ${trialEndsAt},
          plan_expires_at = ${planExpiresAt}
        where id = ${buildingId}
      `;
    } else if (action === "delete_building") {
      const buildingId = String(payload.buildingId ?? "").trim();
      if (!buildingId) {
        return badRequest("invalid_building_id", "buildingId is required");
      }
      if (!(await checkRole(buildingId, ["syndic"]))) {
        return forbidden("Only the principal syndic can delete a building");
      }
      await sql`delete from syndic_buildings where id = ${buildingId}`;
    } else if (action === "add_apartments") {
      const units = Array.isArray(payload.apartments)
        ? (payload.apartments as Apartment[])
        : [];
      if (units.length === 0) {
        return badRequest("invalid_apartments", "At least one apartment is required");
      }
      const targetBuildingId = String(units[0]?.buildingId ?? "").trim();
      if (!targetBuildingId) {
        return badRequest("invalid_apartment", "buildingId is required");
      }
      const callerRole = await checkRole(targetBuildingId, ["syndic", "assistant"]);
      if (!callerRole) {
        return forbidden();
      }
      for (const a of units) {
        if (!a?.id || !a?.buildingId || a.buildingId !== targetBuildingId || !a?.unitLabel) {
          return badRequest("invalid_apartment", "Apartment id, consistent buildingId and unitLabel are required");
        }
        await sql`
          insert into syndic_apartments (
            id, building_id, unit_label, resident_name, phone, monthly_fee, billing_cycle, active, sort_order
          ) values (
            ${a.id}, ${a.buildingId}, ${a.unitLabel}, ${a.residentName}, ${a.phone},
            ${a.monthlyFee}, ${normalizeBillingCycle(a.billingCycle)}, ${a.active}, ${a.sortOrder}
          ) on conflict (id) do nothing
        `;
      }
      await writeAuditLog(sql, {
        buildingId: targetBuildingId,
        identity,
        role: callerRole,
        action: "add_apartments",
        summary: `${units.length} lot(s): ${units.slice(0, 3).map((u) => u.unitLabel).join(", ")}`,
      });
    } else if (action === "update_apartment") {
      const a = payload.apartment as Apartment | undefined;
      if (
        !a ||
        !a.id?.trim() ||
        !a.unitLabel?.trim() ||
        !isNonNegativeFinite(a.monthlyFee)
      ) {
        return badRequest("invalid_apartment", "Valid apartment id, unitLabel and non-negative monthlyFee are required");
      }
      const aRows = await sql`
        select building_id from syndic_apartments where id = ${a.id} limit 1
      `;
      if (!aRows[0]) {
        return badRequest("not_found", "Apartment not found");
      }
      const bId = String(aRows[0].building_id);
      const callerRole = await checkRole(bId, ["syndic", "assistant"]);
      if (!callerRole) {
        return forbidden();
      }
      await sql`
        update syndic_apartments set
          unit_label = ${a.unitLabel},
          resident_name = ${a.residentName},
          phone = ${a.phone},
          monthly_fee = ${a.monthlyFee},
          billing_cycle = ${normalizeBillingCycle(a.billingCycle)},
          active = ${a.active}
        where id = ${a.id}
      `;
      await writeAuditLog(sql, {
        buildingId: bId,
        identity,
        role: callerRole,
        action: "update_apartment",
        summary: `${a.unitLabel} (${a.monthlyFee} MAD)`,
      });
    } else if (action === "record_payment") {
      const p = payload.payment as Payment | undefined;
      if (
        !p ||
        !p.id?.trim() ||
        !p.buildingId?.trim() ||
        !p.apartmentId?.trim() ||
        !p.monthKey?.trim() ||
        !isPositiveFinite(p.amount)
      ) {
        return badRequest("invalid_payment", "Valid payment id, buildingId, apartmentId, monthKey and positive amount are required");
      }
      const callerRole = await checkRole(p.buildingId, ["syndic", "assistant"]);
      if (!callerRole) {
        return forbidden();
      }
      const aptCheck = await sql`
        select 1 from syndic_apartments
        where id = ${p.apartmentId} and building_id = ${p.buildingId}
        limit 1
      `;
      if (!aptCheck[0]) {
        return badRequest("invalid_apartment", "Apartment does not belong to target building");
      }
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
      await writeAuditLog(sql, {
        buildingId: p.buildingId,
        identity,
        role: callerRole,
        action: "record_payment",
        summary: `${p.receiptNumber} • ${p.monthKey} (${p.amount} MAD)`,
      });
    } else if (action === "record_payments_batch") {
      const list = Array.isArray(payload.payments)
        ? (payload.payments as Payment[])
        : [];
      if (list.length === 0) {
        return badRequest("invalid_payments", "Non-empty payments array is required");
      }
      const targetBuildingId = String(list[0]?.buildingId ?? "").trim();
      if (!targetBuildingId) {
        return badRequest("invalid_payment", "buildingId is required");
      }
      const callerRole = await checkRole(targetBuildingId, ["syndic", "assistant"]);
      if (!callerRole) {
        return forbidden();
      }
      for (const p of list) {
        if (
          !p ||
          !p.id?.trim() ||
          p.buildingId !== targetBuildingId ||
          !p.apartmentId?.trim() ||
          !p.monthKey?.trim() ||
          !isPositiveFinite(p.amount)
        ) {
          return badRequest("invalid_payment", "Each payment must include valid IDs and positive amount");
        }
      }
      const batchAptIds = Array.from(new Set(list.map((p) => p.apartmentId)));
      const aptCountRows = await sql`
        select count(*)::int as cnt
        from syndic_apartments
        where building_id = ${targetBuildingId} and id = any(${batchAptIds})
      `;
      if (Number(aptCountRows[0]?.cnt ?? 0) !== batchAptIds.length) {
        return badRequest("invalid_apartment", "One or more apartments do not belong to target building");
      }
      for (const p of list) {
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
      }
      const totalBatch = list.reduce((sum, p) => sum + Number(p.amount), 0);
      await writeAuditLog(sql, {
        buildingId: targetBuildingId,
        identity,
        role: callerRole,
        action: "record_payments_batch",
        summary: `${list.length} mois (${totalBatch} MAD)`,
      });
    } else if (action === "cancel_payment") {
      const paymentId = String(payload.paymentId ?? "").trim();
      if (!paymentId) {
        return badRequest("invalid_payment_id", "paymentId is required");
      }
      const pRows = await sql`
        select building_id, receipt_number, month_key from syndic_payments where id = ${paymentId} limit 1
      `;
      if (pRows[0]) {
        const bId = String(pRows[0].building_id);
        const callerRole = await checkRole(bId, ["syndic", "assistant"]);
        if (!callerRole) {
          return forbidden();
        }
        await sql`delete from syndic_payments where id = ${paymentId}`;
        await writeAuditLog(sql, {
          buildingId: bId,
          identity,
          role: callerRole,
          action: "cancel_payment",
          summary: `${String(pRows[0].receipt_number ?? paymentId)} (${String(pRows[0].month_key ?? "")})`,
        });
      }
    } else if (action === "add_expense") {
      const e = payload.expense as Expense | undefined;
      if (
        !e ||
        !e.id?.trim() ||
        !e.buildingId?.trim() ||
        !e.description?.trim() ||
        !isPositiveFinite(e.amount) ||
        !isValidOptionalImageDataUrl(e.receiptPhotoUrl)
      ) {
        return badRequest("invalid_expense", "Expense id, buildingId, description, positive amount and valid image are required");
      }
      const callerRole = await checkRole(e.buildingId, ["syndic", "assistant"]);
      if (!callerRole) {
        return forbidden();
      }
      await sql`
        insert into syndic_expenses (
          id, building_id, category, amount, expense_date, description, receipt_photo_url, created_at
        ) values (
          ${e.id}, ${e.buildingId}, ${e.category}, ${e.amount}, ${e.expenseDate},
          ${e.description}, ${e.receiptPhotoUrl}, ${e.createdAt}
        ) on conflict (id) do nothing
      `;
      await writeAuditLog(sql, {
        buildingId: e.buildingId,
        identity,
        role: callerRole,
        action: "add_expense",
        summary: `${e.description} (${e.amount} MAD)`,
      });
    } else if (action === "delete_expense") {
      const expenseId = String(payload.expenseId ?? "").trim();
      if (!expenseId) {
        return badRequest("invalid_expense_id", "expenseId is required");
      }
      const eRows = await sql`
        select building_id, description, amount from syndic_expenses where id = ${expenseId} limit 1
      `;
      if (eRows[0]) {
        const bId = String(eRows[0].building_id);
        const callerRole = await checkRole(bId, ["syndic", "assistant"]);
        if (!callerRole) {
          return forbidden();
        }
        await sql`delete from syndic_expenses where id = ${expenseId}`;
        await writeAuditLog(sql, {
          buildingId: bId,
          identity,
          role: callerRole,
          action: "delete_expense",
          summary: `${String(eRows[0].description ?? expenseId)} (${Number(eRows[0].amount ?? 0)} MAD)`,
        });
      }
    } else if (action === "submit_subscription_request") {
      const r = payload.request as SubscriptionRequest | undefined;
      if (
        !r ||
        !r.id?.trim() ||
        !r.buildingId?.trim() ||
        !isPositiveFinite(r.amountMAD) ||
        !isValidOptionalImageDataUrl(r.proofPhotoUrl)
      ) {
        return badRequest("invalid_request", "Valid subscription request payload and proof image are required");
      }
      if (!(await checkRole(r.buildingId, ["syndic", "assistant"]))) {
        return forbidden();
      }
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
      const requestId = String(payload.requestId ?? "").trim();
      const status = String(payload.status ?? "pending").trim();
      if (!requestId || !["pending", "approved", "rejected"].includes(status)) {
        return badRequest("invalid_request_update", "Valid requestId and status are required");
      }
      await sql`
        update syndic_subscription_requests set status = ${status} where id = ${requestId}
      `;
    } else if (action === "reset_demo") {
      await sql`truncate table syndic_audit_logs, syndic_tickets, syndic_announcements, syndic_memberships, syndic_subscription_requests, syndic_expenses, syndic_payments, syndic_apartments, syndic_buildings cascade`;
      await seedNeonDatabase(sql);
      if (identity) {
        await claimUnownedLegacyBuildingsIfNeeded(sql, identity);
      }
    } else if (action === "invite_member") {
      const buildingId = String(payload.buildingId ?? "").trim();
      const email = String(payload.email ?? "").trim().toLowerCase();
      const rawRole = String(payload.role ?? "tenant").trim().toLowerCase();
      const apartmentId = payload.apartmentId
        ? String(payload.apartmentId).trim()
        : null;
      const displayName = String(payload.displayName ?? "").trim();

      if (!buildingId || !isValidEmail(email)) {
        return badRequest("invalid_invite", "Valid buildingId and email address are required");
      }
      if (rawRole !== "assistant" && rawRole !== "tenant") {
        return badRequest("invalid_role", "Invite role must be assistant or tenant");
      }

      const callerRole = await checkRole(
        buildingId,
        rawRole === "assistant" ? ["syndic"] : ["syndic", "assistant"]
      );
      if (!callerRole) {
        return forbidden(
          rawRole === "assistant"
            ? "Only the principal syndic can invite building admins"
            : "Insufficient permissions to invite members"
        );
      }

      if (apartmentId) {
        const aptCheck = await sql`
          select 1 from syndic_apartments
          where id = ${apartmentId} and building_id = ${buildingId}
          limit 1
        `;
        if (!aptCheck[0]) {
          return badRequest("invalid_apartment", "Apartment does not belong to target building");
        }
      }

      const existingRows = await sql`
        select * from syndic_memberships
        where building_id = ${buildingId} and lower(email) = ${email}
        limit 1
      `;
      if (existingRows[0] && String(existingRows[0].role) === "syndic") {
        return badRequest("cannot_downgrade_owner", "Cannot overwrite the principal syndic account");
      }

      const memId = existingRows[0]
        ? String(existingRows[0].id)
        : `mem-${crypto.randomUUID().slice(0, 8)}`;
      const inviteToken = crypto.randomUUID();
      const keepActive =
        existingRows[0] && String(existingRows[0].status) === "active";

      const upserted = await sql`
        insert into syndic_memberships (
          id, building_id, email, clerk_user_id, role, apartment_id,
          display_name, invite_token, status, invited_by
        ) values (
          ${memId}, ${buildingId}, ${email},
          ${keepActive ? String(existingRows[0].clerk_user_id ?? "") || null : null},
          ${rawRole}, ${apartmentId || null}, ${displayName},
          ${inviteToken}, ${keepActive ? "active" : "invited"},
          ${identity?.userId ?? null}
        )
        on conflict (building_id, email) do update set
          role = excluded.role,
          apartment_id = excluded.apartment_id,
          display_name = case when excluded.display_name <> '' then excluded.display_name else syndic_memberships.display_name end,
          invite_token = case when syndic_memberships.status = 'active' then syndic_memberships.invite_token else excluded.invite_token end,
          status = case when syndic_memberships.status = 'active' then 'active' else 'invited' end,
          invited_by = excluded.invited_by
        returning *
      `;

      await writeAuditLog(sql, {
        buildingId,
        identity,
        role: callerRole,
        action: "invite_member",
        summary: `${email} (${rawRole})`,
      });

      return NextResponse.json({
        mode: "neon",
        ok: true,
        membership: mapMembershipRow(upserted[0] as Record<string, unknown>, true),
      });
    } else if (action === "update_member_role") {
      const membershipId = String(payload.membershipId ?? "").trim();
      const rawRole = String(payload.role ?? "").trim().toLowerCase();
      const hasApt = "apartmentId" in payload;
      const apartmentId = payload.apartmentId
        ? String(payload.apartmentId).trim()
        : null;

      if (!membershipId || (rawRole !== "assistant" && rawRole !== "tenant")) {
        return badRequest("invalid_role_update", "Valid membershipId and assistant|tenant role required");
      }

      const mRows = await sql`
        select * from syndic_memberships where id = ${membershipId} limit 1
      `;
      const target = mRows[0];
      if (!target) {
        return NextResponse.json({ mode: "error", ok: false, error: "not_found" }, { status: 404 });
      }
      if (String(target.role) === "syndic") {
        return badRequest("cannot_modify_syndic", "Cannot change the principal syndic role");
      }
      const targetBuildingId = String(target.building_id);
      const existingRole = normalizeMemberRole(target.role);
      const isRoleChange = rawRole !== existingRole;
      const callerRole = await checkRole(
        targetBuildingId,
        isRoleChange || existingRole === "assistant"
          ? ["syndic"]
          : ["syndic", "assistant"]
      );
      if (!callerRole) {
        return forbidden("Insufficient permissions to update this member");
      }

      if (hasApt && apartmentId) {
        const aptCheck = await sql`
          select 1 from syndic_apartments
          where id = ${apartmentId} and building_id = ${targetBuildingId}
          limit 1
        `;
        if (!aptCheck[0]) {
          return badRequest("invalid_apartment", "Apartment does not belong to target building");
        }
      }

      const updated = hasApt
        ? await sql`
            update syndic_memberships
            set role = ${rawRole}, apartment_id = ${apartmentId}
            where id = ${membershipId}
            returning *
          `
        : await sql`
            update syndic_memberships
            set role = ${rawRole}
            where id = ${membershipId}
            returning *
          `;

      await writeAuditLog(sql, {
        buildingId: targetBuildingId,
        identity,
        role: callerRole,
        action: "update_member_role",
        summary: `${String(target.email)} -> ${rawRole}`,
      });

      return NextResponse.json({
        mode: "neon",
        ok: true,
        membership: mapMembershipRow(updated[0] as Record<string, unknown>, true),
      });
    } else if (action === "revoke_member") {
      const membershipId = String(payload.membershipId ?? "").trim();
      if (!membershipId) {
        return badRequest("invalid_membership_id", "membershipId is required");
      }
      const mRows = await sql`
        select * from syndic_memberships where id = ${membershipId} limit 1
      `;
      const target = mRows[0];
      if (!target) {
        return NextResponse.json({ mode: "error", ok: false, error: "not_found" }, { status: 404 });
      }
      const targetRole = normalizeMemberRole(target.role);
      if (targetRole === "syndic") {
        return badRequest("cannot_revoke_syndic", "Cannot revoke the principal syndic");
      }
      const callerRole = await checkRole(
        String(target.building_id),
        targetRole === "assistant" ? ["syndic"] : ["syndic", "assistant"]
      );
      if (!callerRole) {
        return forbidden();
      }
      await sql`
        update syndic_memberships set status = 'revoked' where id = ${membershipId}
      `;
      await writeAuditLog(sql, {
        buildingId: String(target.building_id),
        identity,
        role: callerRole,
        action: "revoke_member",
        summary: String(target.email),
      });
    } else if (action === "transfer_ownership") {
      const buildingId = String(payload.buildingId ?? "").trim();
      const targetMembershipId = String(payload.targetMembershipId ?? "").trim();
      if (!buildingId || !targetMembershipId) {
        return badRequest("invalid_transfer", "buildingId and targetMembershipId are required");
      }
      if (!(await checkRole(buildingId, ["syndic"]))) {
        return forbidden("Only the principal syndic can transfer building ownership");
      }

      const targetRows = await sql`
        select * from syndic_memberships
        where id = ${targetMembershipId} and building_id = ${buildingId}
        limit 1
      `;
      const target = targetRows[0];
      if (!target) {
        return NextResponse.json({ mode: "error", ok: false, error: "not_found" }, { status: 404 });
      }
      const targetUserId = String(target.clerk_user_id ?? "").trim();
      if (String(target.status) !== "active" || !targetUserId) {
        return badRequest(
          "target_must_be_active",
          "The target member must first accept their invitation before receiving Syndic ownership"
        );
      }
      if (normalizeMemberRole(target.role) === "syndic") {
        return badRequest("already_syndic", "Target member is already the principal syndic");
      }

      // Demote existing syndic membership(s) to assistant so the former syndic keeps admin assistance access
      await sql`
        update syndic_memberships
        set role = 'assistant'
        where building_id = ${buildingId} and role = 'syndic'
      `;

      if (identity) {
        const callerEmail = identity.primaryEmail || `${identity.userId}@clerk.local`;
        await sql`
          insert into syndic_memberships (
            id, building_id, email, clerk_user_id, role, display_name,
            invite_token, status, invited_by, accepted_at
          ) values (
            ${`mem-${crypto.randomUUID().slice(0, 8)}`}, ${buildingId}, ${callerEmail},
            ${identity.userId}, 'assistant', ${identity.fullName},
            ${crypto.randomUUID()}, 'active', ${identity.userId}, now()
          )
          on conflict (building_id, email) do update set
            role = 'assistant',
            clerk_user_id = excluded.clerk_user_id,
            status = 'active'
        `;
      }

      await sql`
        update syndic_memberships
        set role = 'syndic', status = 'active'
        where id = ${targetMembershipId}
      `;
      await sql`
        update syndic_buildings
        set owner_id = ${targetUserId}
        where id = ${buildingId}
      `;

      await writeAuditLog(sql, {
        buildingId,
        identity,
        role: "syndic",
        action: "transfer_ownership",
        summary: `Syndic -> ${String(target.display_name || target.email)}`,
      });

      return NextResponse.json({
        mode: "neon",
        ok: true,
        targetMembershipId,
        newRole: "assistant",
      });
    } else if (action === "create_announcement") {
      const buildingId = String(payload.buildingId ?? "").trim();
      const title = String(payload.title ?? "").trim().slice(0, 140);
      const annBody = String(payload.body ?? "").trim().slice(0, 2000);
      const rawCat = String(payload.category ?? "info").trim().toLowerCase() as AnnouncementCategory;
      const category: AnnouncementCategory = ANNOUNCEMENT_CATEGORIES.has(rawCat)
        ? rawCat
        : "info";
      const pinned = Boolean(payload.pinned);

      if (!buildingId || !title || !annBody) {
        return badRequest("invalid_announcement", "buildingId, title and body are required");
      }
      const callerRole = await checkRole(buildingId, ["syndic", "assistant"]);
      if (!callerRole) {
        return forbidden();
      }

      const id = String(payload.id ?? "").trim() || `ann-${crypto.randomUUID().slice(0, 8)}`;
      const authorName = identity?.fullName || "Syndic";
      const createdAt = payload.createdAt ? String(payload.createdAt) : new Date().toISOString();

      const inserted = await sql`
        insert into syndic_announcements (
          id, building_id, title, body, category, pinned, author_name, created_at
        ) values (
          ${id}, ${buildingId}, ${title}, ${annBody}, ${category}, ${pinned}, ${authorName}, ${createdAt}
        )
        on conflict (id) do update set
          title = excluded.title,
          body = excluded.body,
          category = excluded.category,
          pinned = excluded.pinned
        returning *
      `;

      await writeAuditLog(sql, {
        buildingId,
        identity,
        role: callerRole,
        action: "create_announcement",
        summary: `${title} (${category})`,
      });

      return NextResponse.json({
        mode: "neon",
        ok: true,
        announcement: mapAnnouncement(inserted[0] as Record<string, unknown>),
      });
    } else if (action === "toggle_announcement_pin") {
      const announcementId = String(payload.announcementId ?? "").trim();
      if (!announcementId) {
        return badRequest("invalid_announcement_id", "announcementId is required");
      }
      const rows = await sql`
        select building_id, pinned from syndic_announcements where id = ${announcementId} limit 1
      `;
      if (!rows[0]) {
        return NextResponse.json({ mode: "error", ok: false, error: "not_found" }, { status: 404 });
      }
      const bId = String(rows[0].building_id);
      if (!(await checkRole(bId, ["syndic", "assistant"]))) {
        return forbidden();
      }
      await sql`
        update syndic_announcements set pinned = ${!Boolean(rows[0].pinned)} where id = ${announcementId}
      `;
    } else if (action === "delete_announcement") {
      const announcementId = String(payload.announcementId ?? "").trim();
      if (!announcementId) {
        return badRequest("invalid_announcement_id", "announcementId is required");
      }
      const rows = await sql`
        select building_id, title from syndic_announcements where id = ${announcementId} limit 1
      `;
      if (rows[0]) {
        const bId = String(rows[0].building_id);
        const callerRole = await checkRole(bId, ["syndic", "assistant"]);
        if (!callerRole) {
          return forbidden();
        }
        await sql`delete from syndic_announcements where id = ${announcementId}`;
        await writeAuditLog(sql, {
          buildingId: bId,
          identity,
          role: callerRole,
          action: "delete_announcement",
          summary: String(rows[0].title ?? announcementId),
        });
      }
    } else if (action === "create_ticket") {
      const buildingId = String(payload.buildingId ?? "").trim();
      const title = String(payload.title ?? "").trim().slice(0, 140);
      const description = String(payload.description ?? "").trim().slice(0, 1500);
      const rawCat = String(payload.category ?? "autre").trim().toLowerCase() as TicketCategory;
      const category: TicketCategory = TICKET_CATEGORIES.has(rawCat) ? rawCat : "autre";
      const unitLabel = String(payload.unitLabel ?? "").trim().slice(0, 40);
      const rawPhoto = typeof payload.photoUrl === "string" && payload.photoUrl.trim()
        ? payload.photoUrl.trim()
        : null;

      if (!buildingId || !title) {
        return badRequest("invalid_ticket", "buildingId and title are required");
      }
      if (rawPhoto && (!rawPhoto.startsWith("data:image/") || rawPhoto.length > 1_500_000)) {
        return badRequest("invalid_photo", "Photo must be a compressed image under 1.5MB");
      }

      const callerRole = await checkRole(buildingId, ["syndic", "assistant", "tenant"]);
      if (!callerRole) {
        return forbidden();
      }

      const id = String(payload.id ?? "").trim() || `tkt-${crypto.randomUUID().slice(0, 8)}`;
      const reporterName = identity?.fullName || "Syndic";
      const reporterEmail = identity?.primaryEmail || "";
      const nowIso = payload.createdAt ? String(payload.createdAt) : new Date().toISOString();

      const inserted = await sql`
        insert into syndic_tickets (
          id, building_id, apartment_id, unit_label, reporter_name, reporter_email,
          title, description, category, status, photo_url, admin_note, created_at, updated_at
        ) values (
          ${id}, ${buildingId}, ${payload.apartmentId ? String(payload.apartmentId) : null},
          ${unitLabel}, ${reporterName}, ${reporterEmail}, ${title}, ${description},
          ${category}, 'open', ${rawPhoto}, '', ${nowIso}, ${nowIso}
        )
        on conflict (id) do nothing
        returning *
      `;

      await writeAuditLog(sql, {
        buildingId,
        identity,
        role: callerRole,
        action: "create_ticket",
        summary: `${title}${unitLabel ? ` (${unitLabel})` : ""}`,
      });

      return NextResponse.json({
        mode: "neon",
        ok: true,
        ticket: inserted[0]
          ? mapTicket(inserted[0] as Record<string, unknown>, true)
          : null,
      });
    } else if (action === "update_ticket_status") {
      const ticketId = String(payload.ticketId ?? "").trim();
      const rawStatus = String(payload.status ?? "").trim().toLowerCase() as TicketStatus;
      const adminNote = String(payload.adminNote ?? "").trim().slice(0, 500);
      if (!ticketId || !TICKET_STATUSES.has(rawStatus)) {
        return badRequest("invalid_ticket_update", "Valid ticketId and status required");
      }
      const rows = await sql`
        select building_id, title from syndic_tickets where id = ${ticketId} limit 1
      `;
      if (!rows[0]) {
        return NextResponse.json({ mode: "error", ok: false, error: "not_found" }, { status: 404 });
      }
      const bId = String(rows[0].building_id);
      const callerRole = await checkRole(bId, ["syndic", "assistant"]);
      if (!callerRole) {
        return forbidden();
      }

      const updated = await sql`
        update syndic_tickets
        set status = ${rawStatus}, admin_note = ${adminNote}, updated_at = now()
        where id = ${ticketId}
        returning *
      `;

      await writeAuditLog(sql, {
        buildingId: bId,
        identity,
        role: callerRole,
        action: "update_ticket_status",
        summary: `${String(rows[0].title)} -> ${rawStatus}`,
      });

      return NextResponse.json({
        mode: "neon",
        ok: true,
        ticket: updated[0]
          ? mapTicket(updated[0] as Record<string, unknown>, true)
          : null,
      });
    } else if (action === "delete_ticket") {
      const ticketId = String(payload.ticketId ?? "").trim();
      if (!ticketId) {
        return badRequest("invalid_ticket_id", "ticketId is required");
      }
      const rows = await sql`
        select building_id, title from syndic_tickets where id = ${ticketId} limit 1
      `;
      if (rows[0]) {
        const bId = String(rows[0].building_id);
        const callerRole = await checkRole(bId, ["syndic", "assistant"]);
        if (!callerRole) {
          return forbidden();
        }
        await sql`delete from syndic_tickets where id = ${ticketId}`;
        await writeAuditLog(sql, {
          buildingId: bId,
          identity,
          role: callerRole,
          action: "delete_ticket",
          summary: String(rows[0].title ?? ticketId),
        });
      }
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
