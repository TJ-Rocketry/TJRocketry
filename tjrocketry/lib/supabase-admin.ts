import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _admin: SupabaseClient;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase admin env vars");
    }
    _admin = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return _admin;
}

const ensured = new Set<string>();

export async function ensureBucket(name: string) {
  if (ensured.has(name)) return;
  const admin = getSupabaseAdmin();
  const { data } = await admin.storage.getBucket(name);
  if (!data) {
    const { error } = await admin.storage.createBucket(name, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  ensured.add(name);
}
