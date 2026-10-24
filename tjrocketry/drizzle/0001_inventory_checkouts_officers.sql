ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "position" text;

ALTER TABLE "InventoryItem" ALTER COLUMN "subCategory" DROP NOT NULL;
ALTER TABLE "InventoryItem" ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "archivedAt" timestamp(3);

CREATE TABLE IF NOT EXISTS "InventoryCheckout" (
  "id" serial PRIMARY KEY,
  "itemId" integer NOT NULL REFERENCES "InventoryItem"("id") ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "quantity" integer NOT NULL CHECK ("quantity" > 0),
  "note" text,
  "approvedById" integer REFERENCES "User"("id") ON DELETE SET NULL,
  "checkedOutAt" timestamp(3) NOT NULL DEFAULT now(),
  "returnedAt" timestamp(3),
  "returnedById" integer REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "InventoryCheckout_open_idx" ON "InventoryCheckout" ("itemId") WHERE "returnedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "InventoryCheckout_user_idx" ON "InventoryCheckout" ("userId");

ALTER TABLE "InventoryLog" ADD COLUMN IF NOT EXISTS "note" text;
ALTER TABLE "InventoryLog" ADD COLUMN IF NOT EXISTS "checkoutId" integer REFERENCES "InventoryCheckout"("id") ON DELETE SET NULL;

ALTER TABLE "CheckoutRequest" ADD COLUMN IF NOT EXISTS "note" text;
ALTER TABLE "CheckoutRequest" ADD COLUMN IF NOT EXISTS "decidedAt" timestamp(3);
ALTER TABLE "CheckoutRequest" ALTER COLUMN "updatedAt" SET DEFAULT now();
