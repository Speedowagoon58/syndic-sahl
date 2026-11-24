import { NextResponse } from "next/server";
import {
  getAuthenticatedClerkIdentity,
  isClerkServerConfigured,
  maskEmailAddress,
  normalizeAccessGrantStatus,
} from "@/lib/auth-server";
import { ensureNeonSchema, getSql } from "@/lib/neon";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await ensureNeonSchema();
    const rows = await sql`
      select * from syndic_access_grants where access_token = ${token} limit 1
    `;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const status = normalizeAccessGrantStatus(row.status);
    if (status === "revoked") {
      return NextResponse.json({ error: "revoked" }, { status: 410 });
    }
    if (status === "pending") {
      return NextResponse.json({ error: "pending" }, { status: 409 });
    }

    return NextResponse.json({
      maskedEmail: maskEmailAddress(String(row.email)),
      fullName: String(row.full_name ?? ""),
      buildingName: String(row.building_name ?? ""),
      city: String(row.city ?? ""),
      trialDays: Number(row.trial_days ?? 30),
      maxBuildings: Number(row.max_buildings ?? 1),
      status,
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

  if (clerkActive && !identity) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  try {
    await ensureNeonSchema();
    const rows = await sql`
      select * from syndic_access_grants where access_token = ${token} limit 1
    `;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const status = normalizeAccessGrantStatus(row.status);
    if (status === "revoked") {
      return NextResponse.json({ error: "revoked" }, { status: 410 });
    }
    if (status === "pending") {
      return NextResponse.json({ error: "pending" }, { status: 409 });
    }

    const expectedEmail = String(row.email).trim().toLowerCase();
    if (identity && !identity.emails.includes(expectedEmail)) {
      return NextResponse.json(
        {
          error: "email_mismatch",
          expectedEmail: maskEmailAddress(expectedEmail),
          currentEmail: identity.primaryEmail,
        },
        { status: 403 }
      );
    }

    if (identity) {
      await sql`
        update syndic_access_grants
        set clerk_user_id = ${identity.userId},
            claimed_at = coalesce(claimed_at, now())
        where id = ${String(row.id)}
      `;
    }

    return NextResponse.json({
      ok: true,
      trialDays: Number(row.trial_days ?? 30),
      maxBuildings: Number(row.max_buildings ?? 1),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
