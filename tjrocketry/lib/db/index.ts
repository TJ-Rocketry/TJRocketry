import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { createClient } from "@supabase/supabase-js";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL!,
	max: 5,
	connectionTimeoutMillis: 30000,
	idleTimeoutMillis: 30000,
	ssl: { rejectUnauthorized: false },
});

export const db = drizzle({ client: pool, schema });

export const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
