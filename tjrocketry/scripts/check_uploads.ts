import { db } from "../lib/db";
import { resourceFiles } from "../lib/db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const files = await db
    .select()
    .from(resourceFiles)
    .where(eq(resourceFiles.category, "digital_files"))
    .orderBy(desc(resourceFiles.createdAt))
    .limit(30);
  console.log(JSON.stringify(files, null, 2));
}
main().catch((e) => console.error(e));
