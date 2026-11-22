import { NextResponse } from "next/server";
import {
  activateMatchingInvites,
  claimUnownedLegacyBuildingsIfNeeded,
  getAuthenticatedClerkIdentity,
  getUserBuildingMembership,
  isClerkServerConfigured,
} from "@/lib/auth-server";
import { ensureNeonSchema, getSql } from "@/lib/neon";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const clerkActive = isClerkServerConfigured();
  const identity = clerkActive ? await getAuthenticatedClerkIdentity() : null;

  if (clerkActive && !identity) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ mode: "local" });
  }

  try {
    await ensureNeonSchema();
    const pRows = await sql`
      select * from syndic_payments where id = ${id} limit 1
    `;
    const p = pRows[0];
    if (!p) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    let viewerRole: string = "syndic";
    if (clerkActive && identity) {
      await claimUnownedLegacyBuildingsIfNeeded(sql, identity);
      await activateMatchingInvites(sql, identity);

      const membership = await getUserBuildingMembership(
        sql,
        String(p.building_id),
        identity
      );
      if (
        !membership ||
        (membership.role === "tenant" &&
          membership.apartmentId &&
          membership.apartmentId !== String(p.apartment_id))
      ) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      viewerRole = membership.role;
    }

    const [bRows, aRows] = await Promise.all([
      sql`select id, name, city, share_slug from syndic_buildings where id = ${String(p.building_id)} limit 1`,
      sql`select id, unit_label, resident_name from syndic_apartments where id = ${String(p.apartment_id)} limit 1`,
    ]);

    const b = bRows[0];
    const a = aRows[0];
    if (!b || !a) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      mode: "cloud",
      viewerRole,
      payment: {
        id: String(p.id),
        buildingId: String(p.building_id),
        apartmentId: String(p.apartment_id),
        monthKey: String(p.month_key),
        amount: Number(p.amount),
        method: String(p.method),
        receiptNumber: String(p.receipt_number),
        note: String(p.note ?? ""),
        paidAt: new Date(String(p.paid_at)).toISOString(),
      },
      building: {
        id: String(b.id),
        name: String(b.name),
        city: String(b.city ?? ""),
        shareSlug: String(b.share_slug ?? ""),
      },
      apartment: {
        id: String(a.id),
        unitLabel: String(a.unit_label),
        residentName: String(a.resident_name ?? ""),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
