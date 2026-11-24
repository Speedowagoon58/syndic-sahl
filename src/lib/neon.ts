import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { createSeedData } from "./seed";

let cachedSql: NeonQueryFunction<false, false> | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

export function isNeonConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

/**
 * Lazy-initialized Neon serverless client (safe during Next.js build when DATABASE_URL is absent).
 */
export function getSql(): NeonQueryFunction<false, false> | null {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!cachedSql) {
    cachedSql = neon(url);
  }
  return cachedSql;
}

export async function ensureNeonSchema(): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await sql`
        create table if not exists syndic_buildings (
          id text primary key,
          owner_id text,
          name text not null,
          city text not null default '',
          default_monthly_fee numeric(12, 2) not null default 200,
          opening_balance numeric(12, 2) not null default 0,
          start_month text not null,
          rib text not null default '',
          share_slug text not null unique,
          share_pin text not null default '',
          show_names_publicly boolean not null default false,
          plan_status text not null default 'trial',
          trial_ends_at timestamptz not null,
          plan_expires_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;

      await sql`alter table syndic_buildings add column if not exists owner_id text`;
      await sql`alter table syndic_buildings add column if not exists access_mode text not null default 'invite_only'`;

      await sql`
        create table if not exists syndic_apartments (
          id text primary key,
          building_id text not null references syndic_buildings(id) on delete cascade,
          unit_label text not null,
          resident_name text not null default '',
          phone text not null default '',
          monthly_fee numeric(12, 2) not null default 200,
          billing_cycle text not null default 'monthly',
          active boolean not null default true,
          sort_order integer not null default 1
        )
      `;

      await sql`alter table syndic_apartments add column if not exists billing_cycle text not null default 'monthly'`;

      await sql`
        create table if not exists syndic_payments (
          id text primary key,
          building_id text not null references syndic_buildings(id) on delete cascade,
          apartment_id text not null references syndic_apartments(id) on delete cascade,
          month_key text not null,
          amount numeric(12, 2) not null,
          method text not null default 'cash',
          receipt_number text not null,
          note text not null default '',
          paid_at timestamptz not null default now(),
          unique (apartment_id, month_key)
        )
      `;

      await sql`
        create table if not exists syndic_expenses (
          id text primary key,
          building_id text not null references syndic_buildings(id) on delete cascade,
          category text not null,
          amount numeric(12, 2) not null,
          expense_date text not null,
          description text not null,
          receipt_photo_url text,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists syndic_subscription_requests (
          id text primary key,
          building_id text not null references syndic_buildings(id) on delete cascade,
          building_name text not null,
          reference_code text not null,
          plan text not null,
          amount_mad numeric(12, 2) not null,
          channel text not null,
          proof_photo_url text,
          note text not null default '',
          status text not null default 'pending',
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists syndic_memberships (
          id text primary key,
          building_id text not null references syndic_buildings(id) on delete cascade,
          email text not null,
          clerk_user_id text,
          role text not null,
          apartment_id text references syndic_apartments(id) on delete set null,
          display_name text not null default '',
          invite_token text not null unique,
          status text not null default 'invited',
          invited_by text,
          created_at timestamptz not null default now(),
          accepted_at timestamptz,
          unique (building_id, email)
        )
      `;

      await sql`
        create table if not exists syndic_audit_logs (
          id text primary key,
          building_id text not null references syndic_buildings(id) on delete cascade,
          actor_user_id text,
          actor_name text not null default '',
          actor_email text not null default '',
          actor_role text not null default 'syndic',
          action text not null,
          summary text not null,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists syndic_announcements (
          id text primary key,
          building_id text not null references syndic_buildings(id) on delete cascade,
          title text not null,
          body text not null,
          category text not null default 'info',
          pinned boolean not null default false,
          author_name text not null default '',
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists syndic_tickets (
          id text primary key,
          building_id text not null references syndic_buildings(id) on delete cascade,
          apartment_id text references syndic_apartments(id) on delete set null,
          unit_label text not null default '',
          reporter_name text not null default '',
          reporter_email text not null default '',
          title text not null,
          description text not null,
          category text not null default 'autre',
          status text not null default 'open',
          photo_url text,
          admin_note text not null default '',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists syndic_access_grants (
          id text primary key,
          email text not null,
          full_name text not null default '',
          building_name text not null default '',
          city text not null default '',
          units_estimate integer not null default 12,
          phone text not null default '',
          status text not null default 'pending',
          trial_days integer not null default 30,
          max_buildings integer not null default 1,
          access_token text not null unique,
          note text not null default '',
          granted_by text,
          clerk_user_id text,
          created_at timestamptz not null default now(),
          approved_at timestamptz,
          claimed_at timestamptz
        )
      `;

      await sql`create index if not exists idx_syndic_apt_building on syndic_apartments(building_id, sort_order)`;
      await sql`create index if not exists idx_syndic_pay_building on syndic_payments(building_id, month_key)`;
      await sql`create index if not exists idx_syndic_exp_building on syndic_expenses(building_id, expense_date desc)`;
      await sql`create index if not exists idx_syndic_members_building on syndic_memberships(building_id)`;
      await sql`create index if not exists idx_syndic_members_email on syndic_memberships(lower(email))`;
      await sql`create index if not exists idx_syndic_members_user on syndic_memberships(clerk_user_id)`;
      await sql`create index if not exists idx_syndic_audit_building on syndic_audit_logs(building_id, created_at desc)`;
      await sql`create index if not exists idx_syndic_ann_building on syndic_announcements(building_id, pinned desc, created_at desc)`;
      await sql`create index if not exists idx_syndic_tkt_building on syndic_tickets(building_id, created_at desc)`;
      await sql`create unique index if not exists idx_syndic_grants_email_lower on syndic_access_grants(lower(email))`;
      await sql`create index if not exists idx_syndic_grants_status on syndic_access_grants(status, created_at desc)`;

      // Auto-seed realistic Moroccan demo data if database is brand new
      const countRows = await sql`select count(*)::int as cnt from syndic_buildings`;
      const count = Number(countRows[0]?.cnt ?? 0);
      if (count === 0) {
        await seedNeonDatabase(sql);
      }
    })().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }

  return schemaReadyPromise;
}

export async function seedNeonDatabase(
  sql: NeonQueryFunction<false, false>
): Promise<void> {
  const seed = createSeedData();

  for (const b of seed.buildings) {
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
  }

  for (const a of seed.apartments) {
    await sql`
      insert into syndic_apartments (
        id, building_id, unit_label, resident_name, phone, monthly_fee, billing_cycle, active, sort_order
      ) values (
        ${a.id}, ${a.buildingId}, ${a.unitLabel}, ${a.residentName}, ${a.phone},
        ${a.monthlyFee}, ${a.billingCycle ?? "monthly"}, ${a.active}, ${a.sortOrder}
      ) on conflict (id) do nothing
    `;
  }

  for (const p of seed.payments) {
    await sql`
      insert into syndic_payments (
        id, building_id, apartment_id, month_key, amount, method, receipt_number, note, paid_at
      ) values (
        ${p.id}, ${p.buildingId}, ${p.apartmentId}, ${p.monthKey}, ${p.amount},
        ${p.method}, ${p.receiptNumber}, ${p.note}, ${p.paidAt}
      ) on conflict (apartment_id, month_key) do nothing
    `;
  }

  for (const e of seed.expenses) {
    await sql`
      insert into syndic_expenses (
        id, building_id, category, amount, expense_date, description, receipt_photo_url, created_at
      ) values (
        ${e.id}, ${e.buildingId}, ${e.category}, ${e.amount}, ${e.expenseDate},
        ${e.description}, ${e.receiptPhotoUrl}, ${e.createdAt}
      ) on conflict (id) do nothing
    `;
  }

  for (const r of seed.subscriptionRequests) {
    await sql`
      insert into syndic_subscription_requests (
        id, building_id, building_name, reference_code, plan, amount_mad,
        channel, proof_photo_url, note, status, created_at
      ) values (
        ${r.id}, ${r.buildingId}, ${r.buildingName}, ${r.referenceCode}, ${r.plan},
        ${r.amountMAD}, ${r.channel}, ${r.proofPhotoUrl}, ${r.note}, ${r.status}, ${r.createdAt}
      ) on conflict (id) do nothing
    `;
  }

  for (const ann of seed.announcements) {
    await sql`
      insert into syndic_announcements (
        id, building_id, title, body, category, pinned, author_name, created_at
      ) values (
        ${ann.id}, ${ann.buildingId}, ${ann.title}, ${ann.body}, ${ann.category},
        ${ann.pinned}, ${ann.authorName}, ${ann.createdAt}
      ) on conflict (id) do nothing
    `;
  }

  for (const tkt of seed.tickets) {
    await sql`
      insert into syndic_tickets (
        id, building_id, apartment_id, unit_label, reporter_name, reporter_email,
        title, description, category, status, photo_url, admin_note, created_at, updated_at
      ) values (
        ${tkt.id}, ${tkt.buildingId}, ${tkt.apartmentId}, ${tkt.unitLabel},
        ${tkt.reporterName}, ${tkt.reporterEmail}, ${tkt.title}, ${tkt.description},
        ${tkt.category}, ${tkt.status}, ${tkt.photoUrl}, ${tkt.adminNote},
        ${tkt.createdAt}, ${tkt.updatedAt}
      ) on conflict (id) do nothing
    `;
  }
}
