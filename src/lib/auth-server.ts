import type { NeonQueryFunction } from "@neondatabase/serverless";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { BuildingMembership, MemberRole, MemberStatus } from "./types";

export interface AuthenticatedClerkIdentity {
  userId: string;
  emails: string[];
  primaryEmail: string;
  fullName: string;
}

export interface UserMembershipMatch {
  role: MemberRole;
  apartmentId: string | null;
}

export function isClerkServerConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  );
}

/**
 * Resolves the signed-in Clerk identity and verified/listed lowercased emails.
 * Returns null when unauthenticated or when Clerk is not configured.
 */
export async function getAuthenticatedClerkIdentity(): Promise<AuthenticatedClerkIdentity | null> {
  if (!isClerkServerConfigured()) return null;
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    if (!user) return null;

    const rawEmails = user.emailAddresses
      .map((e) => e.emailAddress.trim().toLowerCase())
      .filter(Boolean);
    const emails = Array.from(new Set(rawEmails));
    const primaryObj =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0];
    const primaryEmail = primaryObj?.emailAddress.trim().toLowerCase() ?? emails[0] ?? "";
    const fullName =
      user.fullName?.trim() ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      primaryEmail;

    return {
      userId: user.id,
      emails,
      primaryEmail,
      fullName,
    };
  } catch {
    return null;
  }
}

export function normalizeMemberRole(value: unknown): MemberRole {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "syndic") return "syndic";
  if (raw === "assistant") return "assistant";
  return "tenant";
}

export function normalizeMemberStatus(value: unknown): MemberStatus {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "active") return "active";
  if (raw === "revoked") return "revoked";
  return "invited";
}

export function maskEmailAddress(email: string): string {
  const clean = email.trim().toLowerCase();
  const atIdx = clean.indexOf("@");
  if (atIdx <= 1) return clean;
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${domain}`;
}

export function mapMembershipRow(
  row: Record<string, unknown>,
  includeInviteToken = true
): BuildingMembership {
  const status = normalizeMemberStatus(row.status);
  return {
    id: String(row.id),
    buildingId: String(row.building_id),
    email: String(row.email),
    clerkUserId: row.clerk_user_id ? String(row.clerk_user_id) : null,
    role: normalizeMemberRole(row.role),
    apartmentId: row.apartment_id ? String(row.apartment_id) : null,
    displayName: String(row.display_name ?? ""),
    inviteToken:
      includeInviteToken && status !== "revoked"
        ? String(row.invite_token ?? "")
        : "",
    status,
    invitedBy: row.invited_by ? String(row.invited_by) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    acceptedAt: row.accepted_at
      ? new Date(String(row.accepted_at)).toISOString()
      : null,
  };
}

/**
 * Bootstraps legacy unowned buildings (created before invite-only RBAC existed)
 * by assigning them to the first authenticated syndic so no existing data is orphaned.
 */
export async function claimUnownedLegacyBuildingsIfNeeded(
  sql: NeonQueryFunction<false, false>,
  identity: AuthenticatedClerkIdentity
): Promise<void> {
  const unownedRows = await sql`
    select b.id
    from syndic_buildings b
    where b.owner_id is null
      and not exists (
        select 1 from syndic_memberships m where m.building_id = b.id
      )
  `;

  if (unownedRows.length === 0) return;

  const ownerEmail = identity.primaryEmail || `${identity.userId}@clerk.local`;
  for (const row of unownedRows) {
    const buildingId = String(row.id);
    await sql`
      update syndic_buildings
      set owner_id = ${identity.userId}
      where id = ${buildingId} and owner_id is null
    `;
    const memberId = `mem-${crypto.randomUUID().slice(0, 8)}`;
    const inviteToken = crypto.randomUUID();
    await sql`
      insert into syndic_memberships (
        id, building_id, email, clerk_user_id, role, display_name,
        invite_token, status, invited_by, accepted_at
      ) values (
        ${memberId}, ${buildingId}, ${ownerEmail}, ${identity.userId}, 'syndic',
        ${identity.fullName}, ${inviteToken}, 'active', ${identity.userId}, now()
      )
      on conflict (building_id, email) do nothing
    `;
  }
}

/**
 * Promotes pending invited memberships matching any of the user's Clerk emails to active.
 */
export async function activateMatchingInvites(
  sql: NeonQueryFunction<false, false>,
  identity: AuthenticatedClerkIdentity
): Promise<void> {
  if (identity.emails.length === 0) return;
  await sql`
    update syndic_memberships
    set status = 'active',
        clerk_user_id = ${identity.userId},
        accepted_at = coalesce(accepted_at, now())
    where status = 'invited'
      and lower(email) = any(${identity.emails})
  `;
}

/**
 * Checks whether the signed-in identity holds an active/invited membership or ownership on a building.
 */
export async function getUserBuildingMembership(
  sql: NeonQueryFunction<false, false>,
  buildingId: string,
  identity: AuthenticatedClerkIdentity
): Promise<UserMembershipMatch | null> {
  const mRows =
    identity.emails.length > 0
      ? await sql`
          select role, apartment_id
          from syndic_memberships
          where building_id = ${buildingId}
            and status != 'revoked'
            and (clerk_user_id = ${identity.userId} or lower(email) = any(${identity.emails}))
          order by case role when 'syndic' then 1 when 'assistant' then 2 else 3 end asc
          limit 1
        `
      : await sql`
          select role, apartment_id
          from syndic_memberships
          where building_id = ${buildingId}
            and status != 'revoked'
            and clerk_user_id = ${identity.userId}
          order by case role when 'syndic' then 1 when 'assistant' then 2 else 3 end asc
          limit 1
        `;

  if (mRows[0]) {
    return {
      role: normalizeMemberRole(mRows[0].role),
      apartmentId: mRows[0].apartment_id ? String(mRows[0].apartment_id) : null,
    };
  }

  const bRows = await sql`
    select owner_id from syndic_buildings where id = ${buildingId} limit 1
  `;
  if (bRows[0] && String(bRows[0].owner_id ?? "") === identity.userId) {
    return { role: "syndic", apartmentId: null };
  }

  return null;
}
