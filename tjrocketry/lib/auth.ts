import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function checkAdminOrSponsorAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;

  if (!token) return false;

  try {
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return false;
    
    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
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
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return false;
    
    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
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
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return false;
    
    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
    if (!user || !user.roles.includes("admin")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function getCurrentUser(): Promise<{ id: number; ionId: string; name: string | null; username: string | null; roles: string[] } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ion_access_token")?.value;

  if (!token) return null;

  try {
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return null;

    const profileData = await profileRes.json();
    const ionId = String(profileData.id);

    const [user] = await db.select().from(users).where(eq(users.ionId, ionId)).limit(1);
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
    });
    if (!profileRes.ok) return null;
    
    const profileData = await profileRes.json();
    return String(profileData.id);
  } catch {
    return null;
  }
}
