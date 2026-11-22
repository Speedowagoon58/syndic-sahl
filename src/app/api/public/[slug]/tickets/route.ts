import { NextResponse } from "next/server";
import {
  activateMatchingInvites,
  claimUnownedLegacyBuildingsIfNeeded,
  getAuthenticatedClerkIdentity,
  getUserBuildingMembership,
  isClerkServerConfigured,
} from "@/lib/auth-server";
import { ensureNeonSchema, getSql } from "@/lib/neon";
import type { TicketCategory } from "@/lib/types";

const ALLOWED_TICKET_CATEGORIES = new Set<TicketCategory>([
  "plomberie",
  "electricite",
  "ascenseur",
  "nettoyage",
  "securite",
  "autre",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const clerkActive = isClerkServerConfigured();
  const identity = clerkActive ? await getAuthenticatedClerkIdentity() : null;

  if (clerkActive && !identity) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const { slug } = await context.params;
  const sql = getSql();

  if (!sql) {
    return NextResponse.json({ mode: "local", ok: true });
  }

  let body: {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    unitLabel?: unknown;
    photoUrl?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    await ensureNeonSchema();

    const bRows = await sql`
      select id, name from syndic_buildings where share_slug = ${slug} limit 1
    `;
    const building = bRows[0];
    if (!building) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const buildingId = String(building.id);

    let apartmentId: string | null = null;
    let roleLabel: string = "tenant";
    if (clerkActive && identity) {
      await claimUnownedLegacyBuildingsIfNeeded(sql, identity);
      await activateMatchingInvites(sql, identity);
      const membership = await getUserBuildingMembership(sql, buildingId, identity);
      if (!membership) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      apartmentId = membership.apartmentId;
      roleLabel = membership.role;
    }

    const title = String(body.title ?? "").trim().slice(0, 140);
    const description = String(body.description ?? "").trim().slice(0, 1500);
    const rawCat = String(body.category ?? "autre").trim().toLowerCase() as TicketCategory;
    const category: TicketCategory = ALLOWED_TICKET_CATEGORIES.has(rawCat)
      ? rawCat
      : "autre";

    if (!title) {
      return NextResponse.json(
        { error: "invalid_title", message: "Title is required" },
        { status: 400 }
      );
    }

    let photoUrl: string | null = null;
    if (typeof body.photoUrl === "string" && body.photoUrl.trim()) {
      const candidate = body.photoUrl.trim();
      if (!candidate.startsWith("data:image/") || candidate.length > 1_500_000) {
        return NextResponse.json(
          { error: "invalid_photo", message: "Photo must be a compressed image under 1.5MB" },
          { status: 400 }
        );
      }
      photoUrl = candidate;
    }

    let unitLabel = String(body.unitLabel ?? "").trim().slice(0, 40);
    if (apartmentId) {
      const aRows = await sql`
        select unit_label from syndic_apartments where id = ${apartmentId} limit 1
      `;
      if (aRows[0]?.unit_label) {
        unitLabel = String(aRows[0].unit_label);
      }
    }

    const reporterName = identity?.fullName || "Résident";
    const reporterEmail = identity?.primaryEmail || "";
    const ticketId = `tkt-${crypto.randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    await sql`
      insert into syndic_tickets (
        id, building_id, apartment_id, unit_label, reporter_name, reporter_email,
        title, description, category, status, photo_url, admin_note, created_at, updated_at
      ) values (
        ${ticketId}, ${buildingId}, ${apartmentId}, ${unitLabel},
        ${reporterName}, ${reporterEmail}, ${title}, ${description},
        ${category}, 'open', ${photoUrl}, '', ${nowIso}, ${nowIso}
      )
    `;

    // Audit log best-effort
    try {
      await sql`
        insert into syndic_audit_logs (
          id, building_id, actor_user_id, actor_name, actor_email, actor_role, action, summary
        ) values (
          ${`aud-${crypto.randomUUID().slice(0, 8)}`}, ${buildingId},
          ${identity?.userId ?? null}, ${reporterName}, ${reporterEmail},
          ${roleLabel}, 'create_ticket', ${`${title}${unitLabel ? ` (${unitLabel})` : ""}`}
        )
      `;
    } catch {
      // Do not fail ticket submission if audit log write fails
    }

    return NextResponse.json({
      mode: "cloud",
      ok: true,
      ticket: {
        id: ticketId,
        buildingId,
        apartmentId,
        unitLabel,
        reporterName,
        reporterEmail: "",
        title,
        description,
        category,
        status: "open",
        photoUrl,
        adminNote: "",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
