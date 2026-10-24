CREATE TABLE IF NOT EXISTS "InventoryCategory" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "createdAt" timestamp(3) NOT NULL DEFAULT now()
);

ALTER TABLE "InventoryItem" ALTER COLUMN "category" DROP NOT NULL;
