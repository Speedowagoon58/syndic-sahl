import { NextResponse } from "next/server";
import {
  getAuthenticatedClerkIdentity,
  isClerkServerConfigured,
  maskEmailAddress,
  normalizeMemberRole,
  normalizeMemberStatus,
} from "@/lib/auth-server";
import { ensureNeonSchema, getSql } from "@/lib/neon";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ mode: "local", error: "not_found" }, { status: 404 });
  }

  try {
    await ensureNeonSchema();
    const rows = await sql`
      select m.*, b.name as building_name, b.city as building_city, b.share_slug
      from syndic_memberships m
      join syndic_buildings b on b.id = m.building_id
      where m.invite_token = ${token}
      limit 1
    `;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const status = normalizeMemberStatus(row.status);
    if (status === "revoked") {
      return NextResponse.json({ error: "revoked" }, { status: 410 });
    }

    return NextResponse.json({
      buildingName: String(row.building_name),
      city: String(row.building_city ?? ""),
      shareSlug: String(row.share_slug),
      role: normalizeMemberRole(row.role),
      status,
      maskedEmail: maskEmailAddress(String(row.email)),
      displayName: String(row.display_name ?? ""),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const clerkActive = isClerkServerConfigured();
  const identity = clerkActive ? await getAuthenticatedClerkIdentity() : null;

  if (!identity) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ mode: "local" }, { status: 400 });
  }

  try {
    await ensureNeonSchema();
    const rows = await sql`
      select m.*, b.share_slug
      from syndic_memberships m
      join syndic_buildings b on b.id = m.building_id
      where m.invite_token = ${token}
      limit 1
    `;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const status = normalizeMemberStatus(row.status);
    if (status === "revoked") {
      return NextResponse.json({ error: "revoked" }, { status: 410 });
    }

    const expectedEmail = String(row.email).trim().toLowerCase();
    if (!identity.emails.includes(expectedEmail)) {
      return NextResponse.json(
        {
          error: "email_mismatch",
          expectedEmail: maskEmailAddress(expectedEmail),
          currentEmail: identity.primaryEmail,
        },
        { status: 403 }
      );
    }

    await sql`
      update syndic_memberships
      set status = 'active',
          clerk_user_id = ${identity.userId},
          accepted_at = coalesce(accepted_at, now())
      where id = ${String(row.id)}
    `;

    return NextResponse.json({
      ok: true,
      role: normalizeMemberRole(row.role),
      buildingId: String(row.building_id),
      shareSlug: String(row.share_slug),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
