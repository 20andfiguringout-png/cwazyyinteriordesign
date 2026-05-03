import { describe, it, expect, beforeEach } from "vitest";
import { buildShareLink, getSharedConfigFromURL, copyShareLinkToClipboard } from "./shareLink";
import type { ClosetConfiguration } from "@/types/closet";

const SAMPLE_CONFIG: Partial<ClosetConfiguration> = {
  dimensions: { width: 120, height: 96, depth: 24 },
  closetType: "walk-in",
  wardrobe: {
    longDresses: 5,
    shortJackets: 3,
    suits: 2,
    shirts: 12,
    pants: 6,
    tShirts: 10,
    sweaters: 4,
    jeans: 3,
    underwear: 8,
    bags: 2,
    belts: 1,
    jewelry: true,
    ties: 0,
  },
  shoes: { sneakers: 4, heels: 3, boots: 2, flats: 2 },
  userInfo: {
    userType: "homeowner",
    stylePreference: "modern",
    woodFinish: "light",
    drawerPreference: "mixed",
    priorityItems: ["hanging"],
  },
};

describe("buildShareLink", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        href: "http://localhost/configure",
        hash: "",
        search: "",
        pathname: "/configure",
      },
      writable: true,
    });
  });

  it("returns a URL string containing the configure path", () => {
    const link = buildShareLink(SAMPLE_CONFIG);
    expect(link).toContain("/configure");
  });

  it("encodes the config into the URL hash with key 'd'", () => {
    const link = buildShareLink(SAMPLE_CONFIG);
    const url = new URL(link);
    expect(url.hash).toMatch(/^#d=/);
  });

  it("produces a non-empty hash payload", () => {
    const link = buildShareLink(SAMPLE_CONFIG);
    const url = new URL(link);
    const payload = url.hash.replace("#d=", "");
    expect(payload.length).toBeGreaterThan(10);
  });

  it("strips search params from the share URL", () => {
    const link = buildShareLink(SAMPLE_CONFIG);
    const url = new URL(link);
    expect(url.search).toBe("");
  });
});

describe("getSharedConfigFromURL", () => {
  it("returns null when hash is empty", () => {
    expect(getSharedConfigFromURL("")).toBeNull();
  });

  it("returns null when hash has no 'd' key", () => {
    expect(getSharedConfigFromURL("#other=value")).toBeNull();
  });

  it("returns null for a corrupted payload", () => {
    expect(getSharedConfigFromURL("#d=!!!notvalidlzstring!!!")).toBeNull();
  });
});

describe("buildShareLink + getSharedConfigFromURL round-trip", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        href: "http://localhost/configure",
        hash: "",
        search: "",
        pathname: "/configure",
      },
      writable: true,
    });
  });

  it("round-trips a full config without data loss", () => {
    const link = buildShareLink(SAMPLE_CONFIG);
    const url = new URL(link);
    const recovered = getSharedConfigFromURL(url.hash);
    expect(recovered).toEqual(SAMPLE_CONFIG);
  });

  it("round-trips a minimal config (dimensions only)", () => {
    const minimal: Partial<ClosetConfiguration> = {
      dimensions: { width: 72, height: 84, depth: 20 },
    };
    const link = buildShareLink(minimal);
    const url = new URL(link);
    const recovered = getSharedConfigFromURL(url.hash);
    expect(recovered).toEqual(minimal);
  });

  it("preserves string, number, and boolean fields", () => {
    const link = buildShareLink(SAMPLE_CONFIG);
    const url = new URL(link);
    const recovered = getSharedConfigFromURL(url.hash);
    expect(recovered?.closetType).toBe("walk-in");
    expect(recovered?.dimensions?.width).toBe(120);
    expect(recovered?.wardrobe?.jewelry).toBe(true);
  });
});

describe("readonly URL construction", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        href: "http://localhost/configure",
        hash: "",
        search: "",
        pathname: "/configure",
      },
      writable: true,
    });
  });

  it("can append readonly=1 to a share link and still decode the config", () => {
    const shareLink = buildShareLink(SAMPLE_CONFIG);
    const url = new URL(shareLink);
    url.searchParams.set("readonly", "1");
    const readonlyLink = url.toString();

    const readonlyUrl = new URL(readonlyLink);
    expect(readonlyUrl.searchParams.get("readonly")).toBe("1");

    const recovered = getSharedConfigFromURL(readonlyUrl.hash);
    expect(recovered).toEqual(SAMPLE_CONFIG);
  });

  it("readonly URL contains both ?readonly=1 and #d= hash", () => {
    const shareLink = buildShareLink(SAMPLE_CONFIG);
    const url = new URL(shareLink);
    url.searchParams.set("readonly", "1");
    const readonlyLink = url.toString();

    expect(readonlyLink).toContain("readonly=1");
    expect(readonlyLink).toContain("#d=");
  });
});

describe("copyShareLinkToClipboard", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        href: "http://localhost/configure",
        hash: "",
        search: "",
        pathname: "/configure",
      },
      writable: true,
    });

    let _clipboardText = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          _clipboardText = text;
        },
        readText: async () => _clipboardText,
      },
      writable: true,
    });
  });

  it("returns the share link string", async () => {
    const link = await copyShareLinkToClipboard(SAMPLE_CONFIG);
    expect(typeof link).toBe("string");
    expect(link).toContain("/configure");
    expect(link).toContain("#d=");
  });

  it("writes the link to the clipboard", async () => {
    const link = await copyShareLinkToClipboard(SAMPLE_CONFIG);
    const pasted = await navigator.clipboard.readText();
    expect(pasted).toBe(link);
  });
});
