import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Error listing buckets:", listError);
    process.exit(1);
  }

  const existing = buckets.find((b) => b.name === "profiles");

  if (existing) {
    console.log('Bucket "profiles" already exists, updating public access...');
  } else {
    const { error: createError } = await supabase.storage.createBucket("profiles", {
      public: true,
    });

    if (createError) {
      console.error("Error creating bucket:", createError);
      process.exit(1);
    }

    console.log('Created bucket "profiles"');
  }

  const { error: policyError } = await supabase.storage
    .from("profiles")
    .createSignedUrl("dummy.txt", 1);

  console.log("Bucket setup complete!");
  console.log(`\nMake sure your .env has:\n`);
  console.log(`NEXT_PUBLIC_SUPABASE_URL="${supabaseUrl}"`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY="<from Supabase Dashboard > Project Settings > API > service_role key>"`);
}

main().catch(console.error);
