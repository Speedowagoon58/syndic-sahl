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

const DEFAULT_FOUNDER_EMAIL = "mohammedboulahouajeb@gmail.com";

export function getFounderEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL || DEFAULT_FOUNDER_EMAIL;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isFounderIdentity(
  identity: AuthenticatedClerkIdentity | null
): boolean {
  if (!identity) return false;
  const founderSet = new Set(getFounderEmails());
  return identity.emails.some((email) => founderSet.has(email));
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
