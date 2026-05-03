/**
 * cloudDesigns.ts — browser-side helper
 *
 * Design persistence is handled by the API server (PostgreSQL-backed
 * /api/designs routes). This module is retained as a thin adapter that
 * calls the API server, falling back to an in-memory store when no
 * user email is available.
 *
 * All process.env references have been removed — Vite bundles do not
 * polyfill process.env for browser code.
 */
import { SavedDesign } from "@/types/closet";
import { makeAuthHeaders } from "./auth";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export async function listDesigns(userEmail: string): Promise<SavedDesign[]> {
  if (!userEmail) return [];
  try {
    const headers = makeAuthHeaders(userEmail);
    const res = await fetch(`${BASE}/api/designs`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { designs: SavedDesign[] };
    return data.designs ?? [];
  } catch {
    return [];
  }
}

export async function addDesign(
  userEmail: string,
  design: SavedDesign,
): Promise<SavedDesign[]> {
  if (!userEmail) return [design];
  try {
    const headers = makeAuthHeaders(userEmail);
    const res = await fetch(`${BASE}/api/designs`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ design }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { designs: SavedDesign[] };
    return data.designs ?? [];
  } catch {
    return [design];
  }
}

export async function removeDesign(
  userEmail: string,
  id: string,
): Promise<SavedDesign[]> {
  if (!userEmail) return [];
  try {
    const headers = makeAuthHeaders(userEmail);
    const res = await fetch(`${BASE}/api/designs`, {
      method: "DELETE",
      headers,
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { designs: SavedDesign[] };
    return data.designs ?? [];
  } catch {
    return [];
  }
}
