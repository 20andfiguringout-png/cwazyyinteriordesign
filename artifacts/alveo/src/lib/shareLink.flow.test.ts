/**
 * End-to-end share link flow tests.
 *
 * These tests simulate the complete journey:
 *   1. User configures a closet and clicks "Copy link"
 *   2. The link is built (buildShareLink / copyShareLinkToClipboard)
 *   3. Recipient visits the URL — ConfigurePage reads hash + search params
 *      on mount (getSharedConfigFromURL, URLSearchParams("readonly"))
 *   4. Config is hydrated; readonly mode is applied when ?readonly=1 is present
 *
 * The DOM environment (jsdom) lets us test real window.location access
 * patterns that match what ConfigurePage uses in production.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildShareLink,
  copyShareLinkToClipboard,
  getSharedConfigFromURL,
} from "./shareLink";
import type { ClosetConfiguration } from "@/types/closet";

const FULL_CONFIG: Partial<ClosetConfiguration> = {
  closetType: "walk-in",
  dimensions: { width: 144, height: 96, depth: 24 },
  wardrobe: {
    longDresses: 8,
    shortJackets: 4,
    suits: 3,
    shirts: 14,
    pants: 7,
    tShirts: 20,
    sweaters: 5,
    jeans: 6,
    underwear: 12,
    bags: 4,
    belts: 2,
    jewelry: true,
    ties: 1,
  },
  shoes: { sneakers: 6, heels: 5, boots: 3, flats: 4 },
  userInfo: {
    userType: "designer",
    stylePreference: "classic",
    woodFinish: "dark",
    hardwareFinish: "gold",
    drawerPreference: "more",
    priorityItems: ["hanging", "shoes"],
  },
};

function simulateWindowLocation(url: string) {
  const parsed = new URL(url);
  Object.defineProperty(window, "location", {
    value: {
      href: url,
      hash: parsed.hash,
      search: parsed.search,
      pathname: parsed.pathname,
      origin: parsed.origin,
    },
    writable: true,
    configurable: true,
  });
}

describe("Full share link flow — standard (editable) link", () => {
  beforeEach(() => {
    simulateWindowLocation("http://localhost/configure");
    let _clipboard = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (t: string) => { _clipboard = t; },
        readText: async () => _clipboard,
      },
      writable: true,
      configurable: true,
    });
  });

  it("Step 1: copyShareLinkToClipboard writes a valid URL to clipboard", async () => {
    const link = await copyShareLinkToClipboard(FULL_CONFIG);
    const pasted = await navigator.clipboard.readText();
    expect(pasted).toBe(link);
    const url = new URL(link);
    expect(url.pathname).toBe("/configure");
    expect(url.hash).toMatch(/^#d=.+/);
    expect(url.search).toBe("");
  });

  it("Step 2: recipient visits the link — window.location.hash contains the payload", async () => {
    const link = await copyShareLinkToClipboard(FULL_CONFIG);
    simulateWindowLocation(link);
    expect(window.location.hash).toMatch(/^#d=.+/);
    expect(window.location.search).toBe("");
  });

  it("Step 3: ConfigurePage calls getSharedConfigFromURL() and recovers the exact config", async () => {
    const link = await copyShareLinkToClipboard(FULL_CONFIG);
    simulateWindowLocation(link);

    const recovered = getSharedConfigFromURL(window.location.hash);
    expect(recovered).toEqual(FULL_CONFIG);
  });

  it("Step 4: ConfigurePage reads readonly=false from standard link", async () => {
    const link = await copyShareLinkToClipboard(FULL_CONFIG);
    simulateWindowLocation(link);

    const readonly = new URLSearchParams(window.location.search).get("readonly") === "1";
    expect(readonly).toBe(false);
  });
});

describe("Full share link flow — read-only client link", () => {
  beforeEach(() => {
    simulateWindowLocation("http://localhost/configure");
    let _clipboard = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (t: string) => { _clipboard = t; },
        readText: async () => _clipboard,
      },
      writable: true,
      configurable: true,
    });
  });

  function buildReadonlyLink(config: Partial<ClosetConfiguration>): string {
    const editable = buildShareLink(config);
    const url = new URL(editable);
    url.searchParams.set("readonly", "1");
    return url.toString();
  }

  it("Step 1: readonly link contains both ?readonly=1 and #d= payload", () => {
    const link = buildReadonlyLink(FULL_CONFIG);
    expect(link).toContain("readonly=1");
    expect(link).toContain("#d=");
  });

  it("Step 2: recipient visits the readonly link — search param is readonly=1", () => {
    const link = buildReadonlyLink(FULL_CONFIG);
    simulateWindowLocation(link);

    const readonly = new URLSearchParams(window.location.search).get("readonly") === "1";
    expect(readonly).toBe(true);
  });

  it("Step 3: config is still fully recoverable from the hash on a readonly URL", () => {
    const link = buildReadonlyLink(FULL_CONFIG);
    simulateWindowLocation(link);

    const recovered = getSharedConfigFromURL(window.location.hash);
    expect(recovered).toEqual(FULL_CONFIG);
  });

  it("Step 4: readonly URL still has #d= hash untouched after appending ?readonly=1", () => {
    const standard = buildShareLink(FULL_CONFIG);
    const readonly = buildReadonlyLink(FULL_CONFIG);

    const standardHash = new URL(standard).hash;
    const readonlyHash = new URL(readonly).hash;
    expect(readonlyHash).toBe(standardHash);
  });
});

describe("Edge cases in share flow", () => {
  beforeEach(() => {
    simulateWindowLocation("http://localhost/configure");
  });

  it("visiting /configure with no hash returns null config (fresh session)", () => {
    simulateWindowLocation("http://localhost/configure");
    const recovered = getSharedConfigFromURL(window.location.hash);
    expect(recovered).toBeNull();
  });

  it("visiting with a corrupted hash gracefully returns null", () => {
    simulateWindowLocation("http://localhost/configure#d=NOTVALID!!!!!!!");
    const recovered = getSharedConfigFromURL(window.location.hash);
    expect(recovered).toBeNull();
  });

  it("visiting with ?readonly=1 but no config hash still sets readonly correctly", () => {
    simulateWindowLocation("http://localhost/configure?readonly=1");
    const readonly = new URLSearchParams(window.location.search).get("readonly") === "1";
    expect(readonly).toBe(true);
    const config = getSharedConfigFromURL(window.location.hash);
    expect(config).toBeNull();
  });

  it("large config (many items) still compresses and decompresses correctly", () => {
    const bigConfig: Partial<ClosetConfiguration> = {
      ...FULL_CONFIG,
      wardrobe: {
        longDresses: 99, shortJackets: 99, suits: 99, shirts: 99,
        pants: 99, tShirts: 99, sweaters: 99, jeans: 99,
        underwear: 99, bags: 99, belts: 99, jewelry: true, ties: 99,
      },
      shoes: { sneakers: 99, heels: 99, boots: 99, flats: 99 },
    };
    const link = buildShareLink(bigConfig);
    const url = new URL(link);
    const recovered = getSharedConfigFromURL(url.hash);
    expect(recovered).toEqual(bigConfig);
  });

  it("two different configs produce two different share links", () => {
    simulateWindowLocation("http://localhost/configure");
    const configA: Partial<ClosetConfiguration> = {
      dimensions: { width: 72, height: 84, depth: 20 },
    };
    const configB: Partial<ClosetConfiguration> = {
      dimensions: { width: 144, height: 96, depth: 24 },
    };
    const linkA = buildShareLink(configA);
    const linkB = buildShareLink(configB);
    expect(linkA).not.toBe(linkB);
  });
});
