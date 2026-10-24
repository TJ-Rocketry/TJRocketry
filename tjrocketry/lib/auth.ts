import { cookies } from "next/headers";
import { supabase } from "@/lib/db";

export const STAFF_ROLES = ["admin", "sponsor", "officer"];
export const MEMBER_ROLES = [...STAFF_ROLES, "ARCmember", "BOTRmember"];

export type CurrentUser = {
  id: number;
  ionId: string;
  name: string | null;
  username: string | null;
  roles: string[];
};

export const ADMIN_ROLES = ["admin", "sponsor"];

export const isAdmin = (roles: string[]) => roles.some(r => ADMIN_ROLES.includes(r));
export const isStaff = (roles: string[]) => roles.some(r => STAFF_ROLES.includes(r));
export const isMember = (roles: string[]) => roles.some(r => MEMBER_ROLES.includes(r));

async function fetchIonId(token: string): Promise<string | null> {
  const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!profileRes.ok) return null;
  const profileData = await profileRes.json();
  return String(profileData.id);
}

export async function getCurrentUserIonId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;
  if (!token) return null;
  try {
    return await fetchIonId(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const ionId = await getCurrentUserIonId();
  if (!ionId) return null;
  const { data: user } = await supabase
    .from("User")
    .select("id, ionId, name, username, roles")
    .eq("ionId", ionId)
    .maybeSingle();
  return user ?? null;
}

export async function checkAdminAccess(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && isAdmin(user.roles);
}

export async function checkAdminOrSponsorAccess(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && isAdmin(user.roles);
}

export async function checkAdminSponsorOrOfficerAccess(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && isStaff(user.roles);
}
