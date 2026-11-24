import { NextResponse } from "next/server";
import {
  getAuthenticatedClerkIdentity,
  isClerkServerConfigured,
  isFounderIdentity,
  mapAccessGrantRow,
  normalizeAccessGrantStatus,
} from "@/lib/auth-server";
import { ensureNeonSchema, getSql } from "@/lib/neon";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const clerkActive = isClerkServerConfigured();
  const identity = clerkActive ? await getAuthenticatedClerkIdentity() : null;

  if (clerkActive && !identity) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }
  if (clerkActive && !isFounderIdentity(identity)) {
    return NextResponse.json({ ok: false, error: "founder_only" }, { status: 403 });
  }

  let body: { action?: unknown; payload?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const payload =
    body.payload && typeof body.payload === "object"
      ? (body.payload as Record<string, unknown>)
      : {};

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  try {
    await ensureNeonSchema();

    if (action === "grant_access") {
      const email = String(payload.email ?? "").trim().toLowerCase();
      if (!isValidEmail(email)) {
        return NextResponse.json(
          { ok: false, error: "invalid_email", message: "Adresse e-mail valide requise" },
          { status: 400 }
        );
      }

      const fullName = String(payload.fullName ?? "").trim().slice(0, 120);
      const buildingName = String(payload.buildingName ?? "").trim().slice(0, 120);
      const city = String(payload.city ?? "").trim().slice(0, 80);
      const phone = String(payload.phone ?? "").trim().slice(0, 40);
      const note = String(payload.note ?? "").trim().slice(0, 300);
      const trialDays = Math.max(1, Math.min(365, Math.round(Number(payload.trialDays) || 30)));
      const maxBuildings = Math.max(1, Math.min(50, Math.round(Number(payload.maxBuildings) || 1)));
      const grantedBy = identity?.primaryEmail || "founder";

      const existing = await sql`
        select id, access_token from syndic_access_grants where lower(email) = ${email} limit 1
      `;

      if (existing[0]) {
        const updated = await sql`
          update syndic_access_grants
          set full_name = case when ${fullName} <> '' then ${fullName} else full_name end,
              building_name = case when ${buildingName} <> '' then ${buildingName} else building_name end,
              city = case when ${city} <> '' then ${city} else city end,
              phone = case when ${phone} <> '' then ${phone} else phone end,
              note = case when ${note} <> '' then ${note} else note end,
              status = 'approved',
              trial_days = ${trialDays},
              max_buildings = ${maxBuildings},
              granted_by = ${grantedBy},
              approved_at = now()
          where id = ${String(existing[0].id)}
          returning *
        `;
        return NextResponse.json({
          ok: true,
          grant: mapAccessGrantRow(updated[0] as Record<string, unknown>, true),
        });
      }

      const id = `grt-${crypto.randomUUID().slice(0, 8)}`;
      const accessToken = crypto.randomUUID();
      const inserted = await sql`
        insert into syndic_access_grants (
          id, email, full_name, building_name, city, phone,
          status, trial_days, max_buildings, access_token, note, granted_by, approved_at
        ) values (
          ${id}, ${email}, ${fullName}, ${buildingName}, ${city}, ${phone},
          'approved', ${trialDays}, ${maxBuildings}, ${accessToken}, ${note}, ${grantedBy}, now()
        )
        returning *
      `;
      return NextResponse.json({
        ok: true,
        grant: mapAccessGrantRow(inserted[0] as Record<string, unknown>, true),
      });
    }

    if (action === "update_grant_status") {
      const grantId = String(payload.grantId ?? "").trim();
      const status = normalizeAccessGrantStatus(payload.status);
      if (!grantId) {
        return NextResponse.json({ ok: false, error: "invalid_grant_id" }, { status: 400 });
      }
      const hasTrialDays = payload.trialDays != null;
      const trialDays = Math.max(1, Math.min(365, Math.round(Number(payload.trialDays) || 30)));
      const hasMaxBuildings = payload.maxBuildings != null;
      const maxBuildings = Math.max(1, Math.min(50, Math.round(Number(payload.maxBuildings) || 1)));
      const grantedBy = identity?.primaryEmail || "founder";

      const updated = await sql`
        update syndic_access_grants
        set status = ${status},
            trial_days = case when ${hasTrialDays} then ${trialDays} else trial_days end,
            max_buildings = case when ${hasMaxBuildings} then ${maxBuildings} else max_buildings end,
            granted_by = ${grantedBy},
            approved_at = case when ${status} = 'approved' then now() else approved_at end
        where id = ${grantId}
        returning *
      `;
      if (!updated[0]) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        grant: mapAccessGrantRow(updated[0] as Record<string, unknown>, true),
      });
    }

    if (action === "delete_grant") {
      const grantId = String(payload.grantId ?? "").trim();
      if (!grantId) {
        return NextResponse.json({ ok: false, error: "invalid_grant_id" }, { status: 400 });
      }
      await sql`delete from syndic_access_grants where id = ${grantId}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
