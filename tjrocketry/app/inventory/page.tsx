"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { isMemberUser, isStaffUser, useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import Tabs, { TabDef } from "@/app/components/Tabs";
import PageShell from "@/app/components/PageShell";
import ItemsTab from "@/app/components/inventory/ItemsTab";
import CheckoutsTab from "@/app/components/inventory/CheckoutsTab";
import RequestsTab from "@/app/components/inventory/RequestsTab";
import ActivityTab from "@/app/components/inventory/ActivityTab";
import ItemForm from "@/app/components/inventory/ItemForm";
import TakeDialog from "@/app/components/inventory/TakeDialog";
import CategoriesDialog from "@/app/components/inventory/CategoriesDialog";
import { Item } from "@/app/components/inventory/types";

type Tab = "items" | "mine" | "out" | "requests" | "activity";
const TAB_KEYS: Tab[] = ["items", "mine", "out", "requests", "activity"];

export default function InventoryPage() {
  const { user, authenticated, loading } = useAuth();
  const router = useRouter();
  const staff = isStaffUser(user);

  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<Item[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [taking, setTaking] = useState<{ item: Item; asRequest: boolean } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!authenticated || !user) router.push("/");
    else if (!isMemberUser(user)) router.push("/apply");
  }, [loading, authenticated, user, router]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (requested && TAB_KEYS.includes(requested)) queueMicrotask(() => setTab(requested));
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const data = await api<{ items: Item[]; categories: string[] }>("/api/inventory");
      setItems(data.items);
      setCategories(data.categories);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (isMemberUser(user)) queueMicrotask(() => { void loadItems(); });
  }, [user, loadItems]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const changed = (message?: string) => {
    if (message) setFlash(message);
    loadItems();
    setRefreshKey(k => k + 1);
  };

  const selectTab = (key: Tab) => {
    setTab(key);
    window.history.replaceState(null, "", key === "items" ? "/inventory" : `/inventory?tab=${key}`);
  };

  const groups = useMemo(
    () => [...new Set((items ?? []).map(i => i.subCategory).filter((g): g is string => !!g))].sort(),
    [items],
  );

  if (loading || !user || !isMemberUser(user)) {
    return <PageShell title="Inventory" loading />;
  }

  const mineCount = (items ?? []).reduce((n, i) => n + i.holders.filter(h => h.user.id === user.id).length, 0);
  const outCount = (items ?? []).reduce((n, i) => n + i.holders.length, 0);
  const pendingCount = (items ?? []).reduce((n, i) => n + i.pendingRequests, 0);

  const tabs: TabDef<Tab>[] = [
    { key: "items", label: "Items" },
    { key: "mine", label: "My items", badge: mineCount },
    ...(staff
      ? ([
          { key: "out", label: "Checked out", badge: outCount },
          { key: "requests", label: "Requests", badge: pendingCount },
          { key: "activity", label: "Activity" },
        ] as TabDef<Tab>[])
      : []),
  ];
  const activeTab = tabs.some(t => t.key === tab) ? tab : "items";

  return (
    <PageShell
      title="Inventory"
      actions={staff && (
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4" /> Add item
        </button>
      )}
    >

        <Tabs tabs={tabs} active={activeTab} onChange={selectTab} />

        {flash && <p className="mb-4 text-sm text-green-400" role="status">{flash}</p>}
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {activeTab === "items" && (
          items === null ? (
            <p className="text-sm text-muted">{error ? "" : "Loading…"}</p>
          ) : (
            <ItemsTab
              items={items}
              categories={categories}
              userId={user.id}
              staff={staff}
              onTake={(item, asRequest) => setTaking({ item, asRequest })}
              onEdit={item => setEditing(item)}
              onChanged={changed}
              onManageCategories={() => setManagingCategories(true)}
            />
          )
        )}
        {activeTab === "mine" && <CheckoutsTab scope="mine" refreshKey={refreshKey} onChanged={changed} />}
        {activeTab === "out" && <CheckoutsTab scope="all" refreshKey={refreshKey} onChanged={changed} />}
        {activeTab === "requests" && <RequestsTab refreshKey={refreshKey} onChanged={changed} />}
        {activeTab === "activity" && <ActivityTab refreshKey={refreshKey} />}

      {editing && (
        <ItemForm
          item={editing === "new" ? null : editing}
          categories={categories}
          groups={groups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            changed(editing === "new" ? "Item added." : "Item saved.");
          }}
        />
      )}
      {managingCategories && (
        <CategoriesDialog
          categories={categories}
          onClose={() => setManagingCategories(false)}
          onChanged={() => changed()}
        />
      )}
      {taking && (
        <TakeDialog
          item={taking.item}
          asRequest={taking.asRequest}
          onClose={() => setTaking(null)}
          onDone={message => {
            setTaking(null);
            changed(message);
          }}
        />
      )}
    </PageShell>
  );
}
