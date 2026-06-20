import { cookies } from "next/headers";
import { supabase } from "@/lib/db";

async function lookupUser(token: string) {
  const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!profileRes.ok) return null;

  const profileData = await profileRes.json();
  const ionId = String(profileData.id);

  const { data: user } = await supabase
    .from('User')
    .select("id, ionId, name, username, roles")
    .eq("ionId", ionId)
    .maybeSingle();

  return user;
}

export async function checkAdminOrSponsorAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;
  if (!token) return false;
  try {
    const user = await lookupUser(token);
    if (!user) return false;
    return user.roles.includes("admin") || user.roles.includes("sponsor");
  } catch {
    return false;
  }
}

export async function checkAdminSponsorOrOfficerAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;
  if (!token) return false;
  try {
    const user = await lookupUser(token);
    if (!user) return false;
    return user.roles.includes("admin") || user.roles.includes("sponsor") || user.roles.includes("officer");
  } catch {
    return false;
  }
}

export async function checkAdminAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;
  if (!token) return false;
  try {
    const user = await lookupUser(token);
    if (!user) return false;
    return user.roles.includes("admin");
  } catch {
    return false;
  }
}

export async function getCurrentUser(): Promise<{ id: number; ionId: string; name: string | null; username: string | null; roles: string[] } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;
  if (!token) return null;
  try {
    const user = await lookupUser(token);
    if (!user) return null;
    return { id: user.id, ionId: user.ionId, name: user.name, username: user.username, roles: user.roles };
  } catch {
    return null;
  }
}

export async function getCurrentUserIonId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;
  if (!token) return null;
  try {
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!profileRes.ok) return null;
    const profileData = await profileRes.json();
    return String(profileData.id);
  } catch {
    return null;
  }
}
