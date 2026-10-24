import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryCategories, inventoryCheckouts, inventoryItems, inventoryLogs } from "@/lib/db/schema";

export const ITEM_TYPES = ["reusable", "consumable"] as const;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class InventoryError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function lockItem(tx: Tx, itemId: number) {
  const [item] = await tx
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), isNull(inventoryItems.archivedAt)))
    .for("update");
  if (!item) throw new InventoryError("Item not found", 404);
  return item;
}

export async function outstanding(tx: Tx, itemId: number) {
  const [row] = await tx
    .select({ n: sql<number>`coalesce(sum(${inventoryCheckouts.quantity}), 0)::int` })
    .from(inventoryCheckouts)
    .where(and(eq(inventoryCheckouts.itemId, itemId), isNull(inventoryCheckouts.returnedAt)));
  return row?.n ?? 0;
}

export async function takeFromStock(
  tx: Tx,
  opts: { itemId: number; userId: number; quantity: number; note?: string | null; approvedById?: number | null; actorId?: number },
) {
  const item = await lockItem(tx, opts.itemId);
  const actorId = opts.actorId ?? opts.userId;

  if (item.type === "consumable") {
    if (item.quantity < opts.quantity) {
      throw new InventoryError(`Only ${item.quantity} left`);
    }
    await tx
      .update(inventoryItems)
      .set({ quantity: item.quantity - opts.quantity, updatedAt: new Date() })
      .where(eq(inventoryItems.id, item.id));
    await tx.insert(inventoryLogs).values({
      itemId: item.id,
      userId: opts.userId,
      change: -opts.quantity,
      type: "use",
      note: opts.note ?? null,
    });
    return { item, checkout: null };
  }

  const available = item.quantity - (await outstanding(tx, item.id));
  if (available < opts.quantity) {
    throw new InventoryError(available === 0 ? "None available right now" : `Only ${available} available`);
  }
  const [checkout] = await tx
    .insert(inventoryCheckouts)
    .values({
      itemId: item.id,
      userId: opts.userId,
      quantity: opts.quantity,
      note: opts.note ?? null,
      approvedById: opts.approvedById ?? null,
    })
    .returning();
  await tx.insert(inventoryLogs).values({
    itemId: item.id,
    userId: actorId,
    change: -opts.quantity,
    type: "checkout",
    note: opts.note ?? null,
    checkoutId: checkout.id,
  });
  return { item, checkout };
}

export function parseQuantity(value: unknown, min = 1) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < min || n > 100000) return null;
  return n;
}

export function cleanText(value: unknown, max = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function categoryNames() {
  const rows = await db.select({ name: inventoryCategories.name }).from(inventoryCategories).orderBy(inventoryCategories.name);
  return rows.map(r => r.name);
}

export function parseItem(body: Record<string, unknown>, categories: string[]) {
  const name = cleanText(body.name, 120);
  const location = cleanText(body.location, 120);
  const category = typeof body.category === "string" && body.category ? body.category : null;
  const type = typeof body.type === "string" ? body.type : "";
  const quantity = parseQuantity(body.quantity, 0);
  if (!name) return { error: "Name is required" };
  if (!location) return { error: "Location is required" };
  if (category && !categories.includes(category)) return { error: "That category no longer exists" };
  if (!(ITEM_TYPES as readonly string[]).includes(type)) return { error: "Pick reusable or consumable" };
  if (quantity === null) return { error: "Quantity must be a whole number, 0 or more" };
  return {
    values: {
      name,
      location,
      category,
      type,
      quantity,
      subCategory: cleanText(body.subCategory, 80),
      highValue: body.highValue === true,
      notes: cleanText(body.notes, 1000),
      imageUrl: cleanText(body.imageUrl, 1000),
    },
  };
}
