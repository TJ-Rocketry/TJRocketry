import { db } from "../lib/db";
import { resourceFiles } from "../lib/db/schema";

async function main() {
  const [record] = await db
    .insert(resourceFiles)
    .values({
      name: "test.txt",
      fileUrl: "https://example.com/test.txt",
      fileSize: 100,
      category: "digital_files",
      parentId: null,
      uploadedById: 1,
    })
    .returning();
  console.log("Inserted:", JSON.stringify(record, null, 2));
}
main().catch((e) => console.error("Error:", e));
