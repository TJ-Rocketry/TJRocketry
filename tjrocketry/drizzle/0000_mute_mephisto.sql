CREATE TABLE "AttendanceBlock" (
	"id" serial PRIMARY KEY NOT NULL,
	"blockType" text NOT NULL,
	"date" date NOT NULL,
	"code" text NOT NULL,
	"isClosed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AttendanceRecord" (
	"id" serial PRIMARY KEY NOT NULL,
	"blockId" integer NOT NULL,
	"userId" integer NOT NULL,
	"timestamp" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CheckoutRequest" (
	"id" serial PRIMARY KEY NOT NULL,
	"itemId" integer NOT NULL,
	"userId" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approvedBy" integer,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FilePermission" (
	"id" serial PRIMARY KEY NOT NULL,
	"fileId" integer NOT NULL,
	"accessType" text NOT NULL,
	"teamId" integer
);
--> statement-breakpoint
CREATE TABLE "InventoryItem" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"highValue" boolean DEFAULT false NOT NULL,
	"category" text NOT NULL,
	"subCategory" text NOT NULL,
	"imageUrl" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InventoryLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"itemId" integer NOT NULL,
	"userId" integer NOT NULL,
	"change" integer NOT NULL,
	"type" text NOT NULL,
	"timestamp" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "LaunchEvent" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"startTime" text,
	"endTime" text,
	"notes" text,
	"location" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"link" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ResourceFile" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fileUrl" text,
	"fileSize" integer,
	"category" text NOT NULL,
	"subCategory" text,
	"isFolder" boolean DEFAULT false NOT NULL,
	"parentId" integer,
	"uploadedById" integer,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TeamMember" (
	"id" serial PRIMARY KEY NOT NULL,
	"teamId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "TeamMember_teamId_userId_key" UNIQUE("teamId","userId")
);
--> statement-breakpoint
CREATE TABLE "Team" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"arcId" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" serial PRIMARY KEY NOT NULL,
	"ionId" text NOT NULL,
	"email" text,
	"username" text,
	"classYear" text,
	"name" text,
	"roles" text[] DEFAULT '{"user"}' NOT NULL,
	"pfpUrl" text
);
--> statement-breakpoint
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_blockId_AttendanceBlock_id_fk" FOREIGN KEY ("blockId") REFERENCES "public"."AttendanceBlock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CheckoutRequest" ADD CONSTRAINT "CheckoutRequest_itemId_InventoryItem_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CheckoutRequest" ADD CONSTRAINT "CheckoutRequest_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CheckoutRequest" ADD CONSTRAINT "CheckoutRequest_approvedBy_User_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FilePermission" ADD CONSTRAINT "FilePermission_fileId_ResourceFile_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."ResourceFile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_itemId_InventoryItem_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "AttendanceRecord_blockId_userId_key" ON "AttendanceRecord" USING btree ("blockId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_ionId_key" ON "User" USING btree ("ionId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email");