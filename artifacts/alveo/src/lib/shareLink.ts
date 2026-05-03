import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { ClosetConfiguration } from "@/types/closet";

const SHARE_HASH_KEY = "d";

export function buildShareLink(config: Partial<ClosetConfiguration>): string {
  const payload = compressToEncodedURIComponent(JSON.stringify(config));
  const url = new URL(window.location.href);
  url.pathname = "/configure";
  url.hash = `${SHARE_HASH_KEY}=${payload}`;
  url.search = "";
  return url.toString();
}

export async function copyShareLinkToClipboard(
  config: Partial<ClosetConfiguration>,
): Promise<string> {
  const link = buildShareLink(config);
  await navigator.clipboard.writeText(link);
  return link;
}

export function getSharedConfigFromURL(
  hash: string = typeof window !== "undefined" ? window.location.hash : "",
): Partial<ClosetConfiguration> | null {
  if (!hash || !hash.startsWith("#")) return null;

  const raw = hash.slice(1);
  const entries = new URLSearchParams(raw);
  const compressed = entries.get(SHARE_HASH_KEY);
  if (!compressed) return null;

  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json) as Partial<ClosetConfiguration>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
