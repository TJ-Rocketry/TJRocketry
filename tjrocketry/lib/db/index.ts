import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { createClient } from "@supabase/supabase-js";

const queryClient = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle({ client: queryClient, schema });

export const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
