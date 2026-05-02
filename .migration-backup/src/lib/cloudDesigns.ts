import { SavedDesign } from "@/types/closet";

const memoryStore: Map<string, SavedDesign[]> =
  (globalThis as any).__alveoDesignStore || new Map<string, SavedDesign[]>();
(globalThis as any).__alveoDesignStore = memoryStore;

function useSupabase() {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_DESIGNS_TABLE
  );
}

async function supabaseRequest(path: string, init?: RequestInit) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Missing Supabase configuration");

  const headers = new Headers(init?.headers ?? {});
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("Content-Type", "application/json");

  return fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function listDesigns(userEmail: string): Promise<SavedDesign[]> {
  if (!useSupabase()) {
    return memoryStore.get(userEmail) ?? [];
  }

  const table = process.env.SUPABASE_DESIGNS_TABLE as string;
  const res = await supabaseRequest(
    `${table}?user_email=eq.${encodeURIComponent(userEmail)}&select=payload`,
  );
  if (!res.ok) throw new Error("Failed to load designs");

  const rows = (await res.json()) as Array<{ payload: SavedDesign }>;
  return rows.map((r) => r.payload);
}

export async function addDesign(
  userEmail: string,
  design: SavedDesign,
): Promise<SavedDesign[]> {
  if (!useSupabase()) {
    const current = memoryStore.get(userEmail) ?? [];
    const next = [...current, design];
    memoryStore.set(userEmail, next);
    return next;
  }

  const table = process.env.SUPABASE_DESIGNS_TABLE as string;
  const res = await supabaseRequest(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ user_email: userEmail, design_id: design.id, payload: design }]),
  });
  if (!res.ok) throw new Error("Failed to save design");
  return listDesigns(userEmail);
}

export async function removeDesign(
  userEmail: string,
  id: string,
): Promise<SavedDesign[]> {
  if (!useSupabase()) {
    const current = memoryStore.get(userEmail) ?? [];
    const next = current.filter((d) => d.id !== id);
    memoryStore.set(userEmail, next);
    return next;
  }

  const table = process.env.SUPABASE_DESIGNS_TABLE as string;
  const res = await supabaseRequest(
    `${table}?user_email=eq.${encodeURIComponent(userEmail)}&design_id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
  );
  if (!res.ok) throw new Error("Failed to delete design");
  return listDesigns(userEmail);
}
