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
