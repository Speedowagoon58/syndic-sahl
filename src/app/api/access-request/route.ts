import { NextResponse } from "next/server";
import {
  getAuthenticatedClerkIdentity,
  isClerkServerConfigured,
  mapAccessGrantRow,
  normalizeAccessGrantStatus,
} from "@/lib/auth-server";
import { ensureNeonSchema, getSql } from "@/lib/neon";

export async function POST(request: Request) {
  const clerkActive = isClerkServerConfigured();
  const identity = clerkActive ? await getAuthenticatedClerkIdentity() : null;

  if (clerkActive && !identity) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  let body: {
    fullName?: unknown;
    buildingName?: unknown;
    city?: unknown;
    unitsEstimate?: unknown;
    phone?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const buildingName = String(body.buildingName ?? "").trim().slice(0, 120);
  if (!buildingName) {
    return NextResponse.json(
      { ok: false, error: "invalid_building_name", message: "Nom de l'immeuble requis" },
      { status: 400 }
    );
  }

  const fullName = String(body.fullName ?? identity?.fullName ?? "").trim().slice(0, 120);
  const city = String(body.city ?? "").trim().slice(0, 80);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  const unitsEstimate = Math.max(1, Math.min(500, Math.round(Number(body.unitsEstimate) || 12)));
  const email = (identity?.primaryEmail || "local-request@syndicsahl.local").trim().toLowerCase();

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({
      ok: true,
      mode: "local",
      status: "pending",
      grant: null,
    });
  }

  try {
    await ensureNeonSchema();

    const existingRows = await sql`
      select * from syndic_access_grants where lower(email) = ${email} limit 1
    `;
    const existing = existingRows[0];

    if (existing) {
      const existingStatus = normalizeAccessGrantStatus(existing.status);
      if (existingStatus === "approved") {
        return NextResponse.json({
          ok: true,
          status: "approved",
          grant: mapAccessGrantRow(existing as Record<string, unknown>, false),
        });
      }
      if (existingStatus === "revoked") {
        return NextResponse.json(
          {
            ok: false,
            error: "access_revoked",
            message: "Cet accès a été révoqué par l'administrateur.",
          },
          { status: 403 }
        );
      }

      const updated = await sql`
        update syndic_access_grants
        set full_name = ${fullName},
            building_name = ${buildingName},
            city = ${city},
            units_estimate = ${unitsEstimate},
            phone = ${phone},
            clerk_user_id = coalesce(clerk_user_id, ${identity?.userId ?? null})
        where id = ${String(existing.id)}
        returning *
      `;
      return NextResponse.json({
        ok: true,
        status: "pending",
        grant: mapAccessGrantRow(updated[0] as Record<string, unknown>, false),
      });
    }

    const id = `grt-${crypto.randomUUID().slice(0, 8)}`;
    const token = crypto.randomUUID();
    const inserted = await sql`
      insert into syndic_access_grants (
        id, email, full_name, building_name, city, units_estimate, phone,
        status, trial_days, max_buildings, access_token, clerk_user_id
      ) values (
        ${id}, ${email}, ${fullName}, ${buildingName}, ${city}, ${unitsEstimate}, ${phone},
        'pending', 30, 1, ${token}, ${identity?.userId ?? null}
      )
      returning *
    `;

    return NextResponse.json({
      ok: true,
      status: "pending",
      grant: mapAccessGrantRow(inserted[0] as Record<string, unknown>, false),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
