import { redirect } from "next/navigation";

export default function InventoryRequestsRedirect() {
  redirect("/inventory?tab=requests");
}
