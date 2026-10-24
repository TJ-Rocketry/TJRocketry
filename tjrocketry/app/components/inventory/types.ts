export type Person = { id: number; name: string | null; username: string | null };

export type Holder = {
  id: number;
  quantity: number;
  note: string | null;
  checkedOutAt: string;
  user: Person;
};

export type Item = {
  id: number;
  name: string;
  location: string;
  type: "reusable" | "consumable";
  quantity: number;
  highValue: boolean;
  category: string | null;
  subCategory: string | null;
  notes: string | null;
  imageUrl: string | null;
  checkedOut: number;
  available: number;
  holders: Holder[];
  pendingRequests: number;
  myPendingRequest: boolean;
};

export type Checkout = {
  id: number;
  quantity: number;
  note: string | null;
  checkedOutAt: string;
  returnedAt: string | null;
  item: { id: number; name: string; category: string; location: string };
  user: Person;
  approvedBy: { name: string | null } | null;
  returnedBy: { name: string | null } | null;
};

export type Request = {
  id: number;
  quantity: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
  user: Person;
  item: { id: number; name: string; category: string; type: string };
  approver: { name: string | null } | null;
};

export type LogEntry = {
  id: number;
  change: number;
  type: string;
  note: string | null;
  timestamp: string;
  user: { name: string | null; username: string | null } | null;
  item?: { id: number; name: string } | null;
};

export const personName = (p: { name: string | null; username: string | null } | null | undefined) =>
  p?.name || p?.username || "Unknown";

export const LOG_LABELS: Record<string, string> = {
  checkout: "Checked out",
  return: "Returned",
  use: "Took",
  restock: "Restocked",
  adjust: "Adjusted",
  create: "Added",
  archive: "Archived",
  set: "Set",
  checkin: "Checked in",
};

export function since(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
