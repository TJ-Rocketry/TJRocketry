CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "startsAt" timestamptz NOT NULL,
  "endsAt" timestamptz NOT NULL,
  "createdById" integer REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Announcement_valid_window" CHECK ("endsAt" > "startsAt")
);
CREATE INDEX IF NOT EXISTS "Announcement_window_idx" ON "Announcement" ("startsAt", "endsAt");
