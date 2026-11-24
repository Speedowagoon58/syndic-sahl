import { NextResponse } from "next/server";
import {
  getAuthenticatedClerkIdentity,
  isClerkServerConfigured,
  isFounderIdentity,
  mapAccessGrantRow,
} from "@/lib/auth-server";
import { ensureNeonSchema, getSql } from "@/lib/neon";
import type { Building, SubscriptionRequest } from "@/lib/types";

export async function GET() {
  const clerkActive = isClerkServerConfigured();
  const identity = clerkActive ? await getAuthenticatedClerkIdentity() : null;

  if (clerkActive && !identity) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  if (clerkActive && !isFounderIdentity(identity)) {
    return NextResponse.json({ error: "founder_only" }, { status: 403 });
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ mode: "local" });
  }

  try {
    await ensureNeonSchema();

    const [bRows, countRows, sRows, gRows] = await Promise.all([
      sql`select * from syndic_buildings order by created_at asc`,
      sql`
        select building_id, count(*)::int as active_count
        from syndic_apartments
        where active = true
        group by building_id
      `,
      sql`select * from syndic_subscription_requests order by created_at desc`,
      sql`
        select * from syndic_access_grants
        order by case status when 'pending' then 1 when 'approved' then 2 else 3 end asc,
                 created_at desc
      `,
    ]);

    const unitCounts: Record<string, number> = {};
    for (const row of countRows) {
      unitCounts[String(row.building_id)] = Number(row.active_count ?? 0);
    }

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

    const accessGrants = gRows.map((g) =>
      mapAccessGrantRow(g as Record<string, unknown>, true)
    );

    return NextResponse.json({
      mode: "neon",
      buildings,
      unitCounts,
      subscriptionRequests,
      accessGrants,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
