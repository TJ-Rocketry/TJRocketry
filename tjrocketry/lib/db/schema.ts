import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable(
  "User",
  {
    id: serial("id").primaryKey(),
    ionId: text("ionId").notNull(),
    email: text("email"),
  username: text("username"),
  classYear: text("classYear"),
  name: text("name"),
  roles: text("roles").array().default(["user"]).notNull(),
  pfpUrl: text("pfpUrl"),
}, (table) => ({
  ionIdIdx: uniqueIndex("User_ionId_key").on(table.ionId),
  emailIdx: uniqueIndex("User_email_key").on(table.email),
}));

export const attendanceBlocks = pgTable("AttendanceBlock", {
  id: serial("id").primaryKey(),
  blockType: text("blockType").notNull(),
  date: date("date", { mode: "date" }).notNull(),
  code: text("code").notNull(),
  isClosed: boolean("isClosed").default(false).notNull(),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const attendanceRecords = pgTable(
  "AttendanceRecord",
  {
    id: serial("id").primaryKey(),
    blockId: integer("blockId")
      .notNull()
      .references(() => attendanceBlocks.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { precision: 3, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    blockUserIdx: uniqueIndex("AttendanceRecord_blockId_userId_key").on(table.blockId, table.userId),
  }),
);

export const inventoryItems = pgTable("InventoryItem", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  highValue: boolean("highValue").default(false).notNull(),
  category: text("category").notNull(),
  subCategory: text("subCategory").notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" }).notNull(),
});

// ── InventoryLog ──
export const inventoryLogs = pgTable("InventoryLog", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  change: integer("change").notNull(),
  type: text("type").notNull(),
  timestamp: timestamp("timestamp", { precision: 3, mode: "date" })
    .defaultNow()
    .notNull(),
});

// ── CheckoutRequest ──
export const checkoutRequests = pgTable("CheckoutRequest", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  status: text("status").default("pending").notNull(),
  approvedBy: integer("approvedBy").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" }).notNull(),
});

export const notifications = pgTable("Notification", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  link: text("link"),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const launchEvents = pgTable("LaunchEvent", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: date("date", { mode: "date" }).notNull(),
  startTime: text("startTime"),
  endTime: text("endTime"),
  notes: text("notes"),
  location: text("location"),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const resourceFiles = pgTable("ResourceFile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileUrl: text("fileUrl"),
  fileSize: integer("fileSize"),
  category: text("category").notNull(),
  subCategory: text("subCategory"),
  isFolder: boolean("isFolder").default(false).notNull(),
  parentId: integer("parentId"),
  uploadedById: integer("uploadedById"),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const filePermissions = pgTable("FilePermission", {
  id: serial("id").primaryKey(),
  fileId: integer("fileId").notNull().references(() => resourceFiles.id, { onDelete: "cascade" }),
  accessType: text("accessType").notNull(), // "everyone", "arc", "sli", "officers", "admin", "team"
  teamId: integer("teamId"),
});

export const teams = pgTable("Team", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  arcId: text("arcId"),
  createdAt: timestamp("createdAt", { precision: 3, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const teamMembers = pgTable("TeamMember", {
  id: serial("id").primaryKey(),
  teamId: integer("teamId").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // "captain" or "member"
}, (table) => ({
  uniqueTeamUser: unique("TeamMember_teamId_userId_key").on(table.teamId, table.userId),
}));

export const usersRelations = relations(users, ({ many }) => ({
  attendanceRecords: many(attendanceRecords),
  inventoryLogs: many(inventoryLogs),
  checkoutRequests: many(checkoutRequests, { relationName: "requester" }),
  approvedRequests: many(checkoutRequests, { relationName: "approver" }),
  notifications: many(notifications),
}));

export const attendanceBlocksRelations = relations(
  attendanceBlocks,
  ({ many }) => ({
    records: many(attendanceRecords),
  }),
);

export const attendanceRecordsRelations = relations(
  attendanceRecords,
  ({ one }) => ({
    block: one(attendanceBlocks, {
      fields: [attendanceRecords.blockId],
      references: [attendanceBlocks.id],
    }),
    user: one(users, {
      fields: [attendanceRecords.userId],
      references: [users.id],
    }),
  }),
);

export const inventoryItemsRelations = relations(
  inventoryItems,
  ({ many }) => ({
    logs: many(inventoryLogs),
    checkoutRequests: many(checkoutRequests),
  }),
);

export const inventoryLogsRelations = relations(
  inventoryLogs,
  ({ one }) => ({
    item: one(inventoryItems, {
      fields: [inventoryLogs.itemId],
      references: [inventoryItems.id],
    }),
    user: one(users, {
      fields: [inventoryLogs.userId],
      references: [users.id],
    }),
  }),
);

export const checkoutRequestsRelations = relations(
  checkoutRequests,
  ({ one }) => ({
    item: one(inventoryItems, {
      fields: [checkoutRequests.itemId],
      references: [inventoryItems.id],
    }),
    user: one(users, {
      fields: [checkoutRequests.userId],
      references: [users.id],
      relationName: "requester",
    }),
    approver: one(users, {
      fields: [checkoutRequests.approvedBy],
      references: [users.id],
      relationName: "approver",
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const resourceFilesRelations = relations(resourceFiles, ({ one, many }) => ({
  parent: one(resourceFiles, {
    fields: [resourceFiles.parentId],
    references: [resourceFiles.id],
  }),
  children: many(resourceFiles, { relationName: "parent" }),
  uploadedBy: one(users, {
    fields: [resourceFiles.uploadedById],
    references: [users.id],
  }),
  permissions: many(filePermissions),
}));

export const filePermissionsRelations = relations(filePermissions, ({ one }) => ({
  file: one(resourceFiles, {
    fields: [filePermissions.fileId],
    references: [resourceFiles.id],
  }),
  team: one(teams, {
    fields: [filePermissions.teamId],
    references: [teams.id],
  }),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
}));

export const appSettings = pgTable("AppSetting", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updatedAt", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));
