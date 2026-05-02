// src/renderer/ClosetIsometricRenderer.ts
// Generates an isometric-projection SVG for the "3D View" tab of the closet
// configurator preview panel.
//
// Isometric maths (right-hand, y-up world space → SVG screen space):
//   sx = (wx − wz) * COS30 * S  +  originX
//   sy = (wx + wz) * SIN30 * S  −  wy * S  +  originY
//
// Coordinate origins (world space):
//   wx = 0..W   : horizontal, left→right
//   wy = 0..H   : vertical, floor→ceiling
//   wz = 0..D   : depth, front→back
//
// The renderer auto-scales so the cabinet fills roughly a 500 × 350 canvas.

import { ClosetLayout, ClosetZone } from "@/types/closet";

// ─── Public interface ────────────────────────────────────────────────────────

export interface IsometricOptions {
  /** 'minimal' | 'modern' | 'rustic' | 'glam' | 'luxury'  (defaults to 'modern') */
  style?: string;
  /** 'light' | 'medium' | 'dark' | 'white'  (defaults to 'medium') */
  woodFinish?: string;
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface WoodPalette {
  face: string; // main front face
  side: string; // right / shadow face
  top: string; // top / highlight face
  edge: string; // stroke / panel lines
}

type Pt2 = [number, number];

// ─── Colour data ─────────────────────────────────────────────────────────────

const WOOD_PALETTES: Record<string, WoodPalette> = {
  light: { face: "#f0ebe3", side: "#d4c9b8", top: "#e8e0d5", edge: "#c4b096" },
  medium: { face: "#d4c2a8", side: "#b5a089", top: "#c8b899", edge: "#a08070" },
  dark: { face: "#8d7060", side: "#6d5040", top: "#7d6050", edge: "#5d4030" },
  white: { face: "#f8f8f6", side: "#e8e8e6", top: "#f0f0ee", edge: "#d0d0ce" },
};

const HW_COLOR: Record<string, string> = {
  minimal: "#a8a8a8",
  modern: "#787878",
  glam: "#d4af37",
  rustic: "#8a6030",
  luxury: "#c5a028",
};

/** Garment silhouette fills — cycles across rods so each looks distinct */
const GARMENT_HUES: string[] = [
  "#e4d8cc",
  "#ccd8e4",
  "#d8e4cc",
  "#e4ccda",
  "#ede0d3",
  "#d3dded",
  "#ddebd3",
  "#edd3e5",
];

// ─── Iso constants ───────────────────────────────────────────────────────────

const COS30 = Math.sqrt(3) / 2; // ≈ 0.8660
const SIN30 = 0.5;

const TARGET_W = 500;
const TARGET_H = 350;
const PADDING = 40;

// ─── Utility helpers ─────────────────────────────────────────────────────────

function f(n: number, dp = 1): string {
  return n.toFixed(dp);
}

function toFtIn(inches: number): string {
  const n = Math.round(inches);
  const ft = Math.floor(n / 12);
  const rem = n % 12;
  return rem === 0 ? `${ft}′-0″` : `${ft}′-${rem}″`;
}

function adjustHex(hex: string, amount: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = (v: number) => clamp(v + v * amount);
  return `#${a(r).toString(16).padStart(2, "0")}${a(g).toString(16).padStart(2, "0")}${a(b).toString(16).padStart(2, "0")}`;
}

// ─── Renderer class ──────────────────────────────────────────────────────────

export class ClosetIsometricRenderer {
  private readonly layout: ClosetLayout;
  private readonly options: IsometricOptions;
  private readonly pal: WoodPalette;
  private readonly hwColor: string;

  /** px-per-inch scale, computed so the cabinet fits ~TARGET_W × TARGET_H */
  private S = 1.5;
  /** SVG-space origin shift (where world-origin 0,0,0 maps to) */
  private ox = PADDING;
  private oy = PADDING;
  /** Actual viewBox dimensions (≈ TARGET_W × TARGET_H) */
  private vw = TARGET_W;
  private vh = TARGET_H;

  constructor(layout: ClosetLayout, options: IsometricOptions = {}) {
    this.layout = layout;
    this.options = options;

    const finish = (options.woodFinish ??
      "medium") as keyof typeof WOOD_PALETTES;
    const style = (options.style ?? "modern") as keyof typeof HW_COLOR;
    this.pal = WOOD_PALETTES[finish] ?? WOOD_PALETTES.medium;
    this.hwColor = HW_COLOR[style] ?? HW_COLOR.modern;

    this.computeTransform();
  }

  // ── Transform setup ─────────────────────────────────────────────────────────

  private computeTransform(): void {
    const { width: W, height: H, depth: D } = this.layout.dimensions;

    // Raw (S=1) projection of all 8 corners
    const corners: Array<[number, number, number]> = [
      [0, 0, 0],
      [W, 0, 0],
      [W, H, 0],
      [0, H, 0],
      [0, 0, D],
      [W, 0, D],
      [W, H, D],
      [0, H, D],
    ];

    let minX = 1e9,
      maxX = -1e9;
    let minY = 1e9,
      maxY = -1e9;

    for (const [x, y, z] of corners) {
      const sx = (x - z) * COS30;
      const sy = (x + z) * SIN30 - y;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }

    const rawW = maxX - minX;
    const rawH = maxY - minY;

    // Scale to fit inside TARGET, centred
    this.S = Math.min(
      (TARGET_W - 2 * PADDING) / rawW,
      (TARGET_H - 2 * PADDING) / rawH,
    );

    const projW = rawW * this.S;
    const projH = rawH * this.S;

    // Centre within fixed canvas
    this.ox = (TARGET_W - projW) / 2 - minX * this.S;
    this.oy = (TARGET_H - projH) / 2 - minY * this.S;
    this.vw = TARGET_W;
    this.vh = TARGET_H;
  }

  // ── Projection helpers ───────────────────────────────────────────────────────

  private project(wx: number, wy: number, wz: number): Pt2 {
    return [
      (wx - wz) * COS30 * this.S + this.ox,
      ((wx + wz) * SIN30 - wy) * this.S + this.oy,
    ];
  }

  private pts(coords: Pt2[]): string {
    return coords.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
  }

  // ── Colour helpers ───────────────────────────────────────────────────────────

  private lighten(hex: string, a: number): string {
    return adjustHex(hex, a);
  }
  private darken(hex: string, a: number): string {
    return adjustHex(hex, -a);
  }

  // ── SVG <defs> ───────────────────────────────────────────────────────────────

  private buildDefs(): string {
    const c = this.pal;
    return [
      `  <defs>`,

      // Front face: light at top, gently darker at base
      `    <linearGradient id="iso-front" x1="0" y1="0" x2="0" y2="1">`,
      `      <stop offset="0%"   stop-color="${this.lighten(c.face, 0.12)}"/>`,
      `      <stop offset="55%"  stop-color="${c.face}"/>`,
      `      <stop offset="100%" stop-color="${this.darken(c.face, 0.16)}"/>`,
      `    </linearGradient>`,

      // Right (shadow) face: left-edge lighter, right-edge darker
      `    <linearGradient id="iso-side" x1="0" y1="0" x2="1" y2="0">`,
      `      <stop offset="0%"   stop-color="${this.lighten(c.side, 0.08)}"/>`,
      `      <stop offset="100%" stop-color="${this.darken(c.side, 0.22)}"/>`,
      `    </linearGradient>`,

      // Top (highlight) face
      `    <linearGradient id="iso-top" x1="0" y1="0" x2="1" y2="1">`,
      `      <stop offset="0%"   stop-color="${this.lighten(c.top, 0.18)}"/>`,
      `      <stop offset="100%" stop-color="${c.top}"/>`,
      `    </linearGradient>`,

      // Drawer face: subtle depth
      `    <linearGradient id="iso-drawer" x1="0" y1="0" x2="0" y2="1">`,
      `      <stop offset="0%"   stop-color="${this.lighten(c.face, 0.08)}"/>`,
      `      <stop offset="100%" stop-color="${this.darken(c.face, 0.14)}"/>`,
      `    </linearGradient>`,

      // Shelf surface
      `    <linearGradient id="iso-shelf" x1="0" y1="0" x2="0" y2="1">`,
      `      <stop offset="0%"   stop-color="${this.lighten(c.top, 0.12)}"/>`,
      `      <stop offset="100%" stop-color="${this.darken(c.top, 0.06)}"/>`,
      `    </linearGradient>`,

      // Drop shadow on outer box
      `    <filter id="iso-shadow" x="-5%" y="-5%" width="115%" height="120%">`,
      `      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000028"/>`,
      `    </filter>`,

      `  </defs>`,
    ].join("\n");
  }

  // ── Outer box faces ──────────────────────────────────────────────────────────

  private buildFrontFace(): string {
    const { width: W, height: H } = this.layout.dimensions;
    const c = this.pal;
    const bl = this.project(0, 0, 0);
    const br = this.project(W, 0, 0);
    const tr = this.project(W, H, 0);
    const tl = this.project(0, H, 0);
    return [
      `  <!-- ── Front face (z=0, main elevation) ── -->`,
      `  <polygon points="${this.pts([bl, br, tr, tl])}"`,
      `           fill="url(#iso-front)" stroke="${c.edge}" stroke-width="1.5"`,
      `           filter="url(#iso-shadow)"/>`,
    ].join("\n");
  }

  private buildSideFace(): string {
    const { width: W, height: H, depth: D } = this.layout.dimensions;
    const c = this.pal;
    const fl = this.project(W, 0, 0);
    const bl = this.project(W, 0, D);
    const bt = this.project(W, H, D);
    const ft = this.project(W, H, 0);
    return [
      `  <!-- ── Right side face (x=W, shadow side) ── -->`,
      `  <polygon points="${this.pts([fl, bl, bt, ft])}"`,
      `           fill="url(#iso-side)" stroke="${this.pal.edge}" stroke-width="1.2"/>`,
    ].join("\n");
  }

  private buildTopFace(): string {
    const { width: W, height: H, depth: D } = this.layout.dimensions;
    const c = this.pal;
    const fl = this.project(0, H, 0);
    const fr = this.project(W, H, 0);
    const br = this.project(W, H, D);
    const bl = this.project(0, H, D);
    return [
      `  <!-- ── Top face (y=H, highlight side) ── -->`,
      `  <polygon points="${this.pts([fl, fr, br, bl])}"`,
      `           fill="url(#iso-top)" stroke="${c.edge}" stroke-width="1.2"/>`,
    ].join("\n");
  }

  // ── Vertical column dividers ─────────────────────────────────────────────────

  private buildZoneDividers(zones: ClosetZone[]): string {
    const { height: H } = this.layout.dimensions;
    const seen = new Set<number>();
    const lines: string[] = [];

    for (const z of zones) {
      if (z.x <= 0 || seen.has(z.x)) continue;
      seen.add(z.x);
      const bot = this.project(z.x, 0, 0);
      const top = this.project(z.x, H, 0);
      lines.push(
        `  <line x1="${f(bot[0])}" y1="${f(bot[1])}" x2="${f(top[0])}" y2="${f(top[1])}"`,
        `        stroke="${this.pal.edge}" stroke-width="2.6" stroke-linecap="round" opacity="0.65"/>`,
      );
    }

    return lines.join("\n");
  }

  // ── Zone dispatcher ──────────────────────────────────────────────────────────

  private buildZoneContents(zones: ClosetZone[]): string {
    return zones
      .map((z) => this.buildZone(z))
      .filter(Boolean)
      .join("\n");
  }

  private buildZone(zone: ClosetZone): string {
    switch (zone.type) {
      case "long-hang":
        return this.buildLongHang(zone);
      case "double-hang":
        return this.buildDoubleHang(zone);
      case "drawers":
        return this.buildDrawers(zone);
      case "shoe-shelves":
        return this.buildShoeShelves(zone);
      case "top-shelves":
        return this.buildTopShelves(zone);
      case "accessories":
        return this.buildTopShelves(zone); // share shelf renderer
      default:
        return "";
    }
  }

  // ── Shared: rod + hanging garments ──────────────────────────────────────────

  /**
   * Draws a horizontal rod at `rodAFF` (height from floor, absolute / AFF)
   * spanning zone.x → zone.x+zone.width on the front face (z=0),
   * then renders `count` garment silhouettes hanging below it in screen space.
   *
   * `garmentLenIn`  – approximate garment length in inches (clipped to zone floor).
   * `colorOffset`   – start index into GARMENT_HUES so rods get different colours.
   */
  private buildRodAndGarments(
    zone: ClosetZone,
    rodAFF: number,
    garmentLenIn: number,
    count: number,
    colorOffset: number,
  ): string {
    const out: string[] = [];

    const rodL = this.project(zone.x, rodAFF, 0);
    const rodR = this.project(zone.x + zone.width, rodAFF, 0);

    // ── Rod tube ──────────────────────────────────────────────────────────────
    const rodThick = Math.max(1.0, this.S * 0.22);
    out.push(
      `  <line x1="${f(rodL[0])}" y1="${f(rodL[1])}" x2="${f(rodR[0])}" y2="${f(rodR[1])}"`,
      `        stroke="#a09888" stroke-width="${f(rodThick)}" stroke-linecap="round"/>`,
    );

    // Rod end-caps
    const capR = Math.max(1.2, this.S * 0.28);
    out.push(
      `  <circle cx="${f(rodL[0])}" cy="${f(rodL[1])}" r="${f(capR)}" fill="#b8b0a4"/>`,
    );
    out.push(
      `  <circle cx="${f(rodR[0])}" cy="${f(rodR[1])}" r="${f(capR)}" fill="#b8b0a4"/>`,
    );

    // ── Garments ──────────────────────────────────────────────────────────────
    // Space them evenly along the rod direction in screen space
    const dx = (rodR[0] - rodL[0]) / (count + 1);
    const dy = (rodR[1] - rodL[1]) / (count + 1);

    // Max garment height = screen-space distance from rod to zone floor
    const zoneFl = this.project(zone.x, zone.y, 0);
    const maxGH = Math.max(0, zoneFl[1] - rodL[1]);
    const gH = Math.min(garmentLenIn * this.S, maxGH * 0.86);
    const gHW = Math.max(3.5, Math.min(13, this.S * 1.9)); // garment half-width
    const bW = gHW * 1.35; // hem half-width
    const hkH = Math.max(2.5, this.S * 0.85); // hanger height

    for (let i = 0; i < count; i++) {
      const gx = rodL[0] + dx * (i + 1);
      const gy = rodL[1] + dy * (i + 1);
      const col = GARMENT_HUES[(i + colorOffset) % GARMENT_HUES.length];
      const dCol = this.darken(col, 0.15);

      // V-shaped hanger hook
      out.push(
        `  <polyline points="${f(gx)},${f(gy)} ${f(gx - gHW * 0.52)},${f(gy + hkH)} ${f(gx + gHW * 0.52)},${f(gy + hkH)}"`,
        `            fill="none" stroke="#8a8078" stroke-width="0.9" stroke-linejoin="round"/>`,
      );

      // Garment body — trapezoid: narrow at shoulder, wider at hem
      out.push(
        `  <path d="M${f(gx - gHW * 0.52)},${f(gy + hkH)}`,
        `         L${f(gx - bW)},${f(gy + hkH + gH)}`,
        `         L${f(gx + bW)},${f(gy + hkH + gH)}`,
        `         L${f(gx + gHW * 0.52)},${f(gy + hkH)} Z"`,
        `        fill="${col}" fill-opacity="0.82" stroke="${dCol}" stroke-width="0.6"/>`,
      );
    }

    return out.join("\n");
  }

  // ── Long-hang zone ───────────────────────────────────────────────────────────

  private buildLongHang(zone: ClosetZone): string {
    // rod.height = AFF (confirmed from ClosetSVGRenderer source)
    const rodAFF = zone.rods?.[0]?.height ?? zone.y + zone.height * 0.84;
    const count = Math.max(2, Math.min(5, Math.floor(zone.width / 18)));
    return [
      `  <!-- long-hang zone x=${zone.x} -->`,
      this.buildRodAndGarments(zone, rodAFF, 38, count, 0),
    ].join("\n");
  }

  // ── Double-hang zone ─────────────────────────────────────────────────────────

  private buildDoubleHang(zone: ClosetZone): string {
    const rods = zone.rods ?? [];
    let upperRodAFF: number;
    let lowerRodAFF: number;

    if (rods.length >= 2) {
      // Engine outputs [upper, lower] — sort by height descending
      const sorted = [...rods].sort((a, b) => b.height - a.height);
      upperRodAFF = sorted[0].height;
      lowerRodAFF = sorted[1].height;
    } else if (rods.length === 1) {
      upperRodAFF = rods[0].height;
      lowerRodAFF = zone.y + zone.height * 0.37;
    } else {
      upperRodAFF = zone.y + zone.height * 0.78;
      lowerRodAFF = zone.y + zone.height * 0.37;
    }

    const count = Math.max(2, Math.min(7, Math.floor(zone.width / 10)));

    return [
      `  <!-- double-hang zone x=${zone.x} -->`,
      // Upper section: shirts / blazers
      this.buildRodAndGarments(zone, upperRodAFF, 20, count, 0),
      // Lower section: trousers / skirts
      this.buildRodAndGarments(zone, lowerRodAFF, 16, count, 4),
    ].join("\n");
  }

  // ── Drawer zone ──────────────────────────────────────────────────────────────

  private buildDrawers(zone: ClosetZone): string {
    if (!zone.drawers?.length) return "";

    const c = this.pal;
    const out: string[] = [`  <!-- drawers zone x=${zone.x} -->`];

    for (const drawer of zone.drawers) {
      // drawer.position = AFF (absolute from floor), same as SVGRenderer
      const dBot = drawer.position;
      const dTop = drawer.position + drawer.height;

      const bl = this.project(zone.x, dBot, 0);
      const br = this.project(zone.x + zone.width, dBot, 0);
      const tr = this.project(zone.x + zone.width, dTop, 0);
      const tl = this.project(zone.x, dTop, 0);

      // Drawer face
      out.push(
        `  <polygon points="${this.pts([bl, br, tr, tl])}"`,
        `           fill="url(#iso-drawer)" stroke="${c.edge}" stroke-width="0.9"/>`,
      );

      // Top reveal line (gap between drawers)
      out.push(
        `  <line x1="${f(tl[0])}" y1="${f(tl[1])}" x2="${f(tr[0])}" y2="${f(tr[1])}"`,
        `        stroke="${this.darken(c.edge, 0.08)}" stroke-width="0.5" opacity="0.55"/>`,
      );

      // D-pull handle bar — centred on the drawer face
      const cx = (bl[0] + br[0] + tr[0] + tl[0]) / 4;
      const cy = (bl[1] + br[1] + tr[1] + tl[1]) / 4;
      const hbW = Math.max(8, Math.min(28, zone.width * this.S * COS30 * 0.3));
      const hbH = 2.5;

      out.push(
        `  <rect x="${f(cx - hbW / 2)}" y="${f(cy - hbH / 2)}"`,
        `        width="${f(hbW)}" height="${f(hbH)}" rx="1.3"`,
        `        fill="${this.hwColor}" stroke="${this.darken(this.hwColor, 0.14)}" stroke-width="0.5"/>`,
        // highlight stripe on handle
        `  <rect x="${f(cx - hbW / 2 + 2)}" y="${f(cy - hbH / 2 - 0.8)}"`,
        `        width="${f(hbW - 4)}" height="0.9" rx="0.5"`,
        `        fill="white" opacity="0.28"/>`,
      );
    }

    return out.join("\n");
  }

  // ── Shoe-shelf zone ──────────────────────────────────────────────────────────

  private buildShoeShelves(zone: ClosetZone): string {
    if (!zone.shelves?.length) return "";

    const c = this.pal;
    const out: string[] = [`  <!-- shoe-shelves zone x=${zone.x} -->`];

    for (const shelf of zone.shelves) {
      // shelf.height is RELATIVE to zone.y (confirmed from SVGRenderer source)
      const shAFF = zone.y + shelf.height;
      const shTopAFF = shAFF + 0.75; // 3/4″ shelf thickness

      const bl = this.project(zone.x, shAFF, 0);
      const br = this.project(zone.x + zone.width, shAFF, 0);
      const tr = this.project(zone.x + zone.width, shTopAFF, 0);
      const tl = this.project(zone.x, shTopAFF, 0);

      // Shelf board with slight isometric tilt effect
      out.push(
        `  <polygon points="${this.pts([bl, br, tr, tl])}"`,
        `           fill="url(#iso-shelf)" stroke="${c.edge}" stroke-width="0.8"/>`,
        // Underside shadow strip
        `  <line x1="${f(bl[0])}" y1="${f(bl[1] + 1)}" x2="${f(br[0])}" y2="${f(br[1] + 1)}"`,
        `        stroke="rgba(0,0,0,0.07)" stroke-width="1.5"/>`,
      );

      // Shoe silhouettes on top of the shelf
      const pairCount = Math.min(
        shelf.count ?? 3,
        Math.max(1, Math.floor(zone.width / 7)),
      );
      const slotW = zone.width / (pairCount + 1);
      const clearPx = (shelf.spacing ?? 8) * this.S;
      const shoeH = Math.max(3, Math.min(14, clearPx * 0.38));
      const shoeW = Math.max(3, Math.min(10, slotW * this.S * COS30 * 0.5));

      for (let p = 0; p < pairCount; p++) {
        const sx = zone.x + slotW * (p + 1);
        const shoeBase = this.project(sx, shTopAFF, 0);
        out.push(
          this.buildShoeShape(
            shoeBase,
            shoeW,
            shoeH,
            shelf.purpose ?? "sneakers",
          ),
        );
      }
    }

    return out.join("\n");
  }

  /** Small shoe silhouette at screen position `base` (on top of a shelf). */
  private buildShoeShape(
    base: Pt2,
    w: number,
    h: number,
    type: string,
  ): string {
    const [bx, by] = base;
    const stroke = `stroke="#9a8878" stroke-width="0.9" opacity="0.72"`;

    if (type === "boots") {
      return [
        `  <rect x="${f(bx - w * 0.42)}" y="${f(by - h)}" width="${f(w * 0.78)}" height="${f(h)}"`,
        `        fill="none" ${stroke} rx="1.5"/>`,
        `  <line x1="${f(bx - w * 0.42)}" y1="${f(by - h * 0.3)}" x2="${f(bx + w * 0.36)}" y2="${f(by - h * 0.3)}"`,
        `        stroke="#9a8878" stroke-width="0.6" opacity="0.50"/>`,
      ].join("\n");
    }
    if (type === "heels") {
      return [
        `  <path d="M${f(bx - w * 0.5)},${f(by - h * 0.45)} Q${f(bx)},${f(by - h)} ${f(bx + w * 0.5)},${f(by - h * 0.45)}"`,
        `        fill="none" ${stroke}/>`,
        `  <line x1="${f(bx - w * 0.38)}" y1="${f(by - h * 0.45)}" x2="${f(bx - w * 0.5)}" y2="${f(by + h * 0.3)}"`,
        `        stroke="#9a8878" stroke-width="0.8" opacity="0.55"/>`,
      ].join("\n");
    }
    if (type === "sneakers") {
      return [
        `  <ellipse cx="${f(bx)}" cy="${f(by - h * 0.52)}" rx="${f(w * 0.5)}" ry="${f(h * 0.45)}"`,
        `           fill="none" ${stroke}/>`,
        `  <rect x="${f(bx - w * 0.5)}" y="${f(by - h * 0.24)}" width="${f(w)}" height="${f(h * 0.22)}"`,
        `        fill="#9a8878" fill-opacity="0.18" stroke="none" rx="1"/>`,
      ].join("\n");
    }
    // flats — low wide ellipse
    return (
      `  <ellipse cx="${f(bx)}" cy="${f(by - h * 0.38)}" rx="${f(w * 0.52)}" ry="${f(h * 0.38)}"` +
      ` fill="none" ${stroke}/>`
    );
  }

  // ── Top-shelf / accessories zone ─────────────────────────────────────────────

  private buildTopShelves(zone: ClosetZone): string {
    if (!zone.shelves?.length) return "";

    const c = this.pal;
    const out: string[] = [`  <!-- top-shelves zone x=${zone.x} -->`];

    for (let si = 0; si < zone.shelves.length; si++) {
      const shelf = zone.shelves[si];
      const shAFF = zone.y + shelf.height;
      const shTopAFF = shAFF + 0.75;

      const bl = this.project(zone.x, shAFF, 0);
      const br = this.project(zone.x + zone.width, shAFF, 0);
      const tr = this.project(zone.x + zone.width, shTopAFF, 0);
      const tl = this.project(zone.x, shTopAFF, 0);

      out.push(
        `  <polygon points="${this.pts([bl, br, tr, tl])}"`,
        `           fill="url(#iso-shelf)" stroke="${c.edge}" stroke-width="0.7"/>`,
      );

      // Decorative stacked items on the shelf
      const itemCount = Math.min(3, Math.max(1, Math.floor(zone.width / 18)));
      for (let i = 0; i < itemCount; i++) {
        const ix = zone.x + (zone.width / (itemCount + 1)) * (i + 1);
        const iBase = this.project(ix, shTopAFF, 0);
        const iTop = this.project(ix, shTopAFF + 7, 0); // ~7″ stack height
        const bw = Math.max(4, this.S * 1.8);
        const fillC = GARMENT_HUES[(si * 3 + i) % GARMENT_HUES.length];
        out.push(
          `  <polygon points="${this.pts([
            [iBase[0] - bw, iBase[1]],
            [iBase[0] + bw, iBase[1]],
            [iTop[0] + bw, iTop[1]],
            [iTop[0] - bw, iTop[1]],
          ])}" fill="${fillC}" fill-opacity="0.65" stroke="${c.edge}" stroke-width="0.5"/>`,
        );
      }
    }

    return out.join("\n");
  }

  // ── Dimension annotations ────────────────────────────────────────────────────

  private buildDimensions(): string {
    const { width: W, height: H } = this.layout.dimensions;

    const textCol = "#6a5e56";
    const lineCol = "#9a9088";
    const fontSize = Math.max(8, Math.min(11, this.S * 3.2)).toFixed(1);

    const bl = this.project(0, 0, 0);
    const br = this.project(W, 0, 0);
    const topL = this.project(0, H, 0);

    // Width: below the front-bottom edge
    const wMidX = (bl[0] + br[0]) / 2;
    const wMidY = Math.max(bl[1], br[1]) + 17;

    // Height: rotated label to the left of the front-left edge
    const hMidX = bl[0] - 22;
    const hMidY = (bl[1] + topL[1]) / 2;

    return [
      `  <!-- ── Dimension labels ── -->`,

      // Width dim-line
      `  <line x1="${f(bl[0])}" y1="${f(bl[1] + 9)}" x2="${f(br[0])}" y2="${f(br[1] + 9)}"`,
      `        stroke="${lineCol}" stroke-width="0.75" stroke-dasharray="3 2"/>`,
      `  <line x1="${f(bl[0] - 3)}" y1="${f(bl[1] + 5)}" x2="${f(bl[0] + 3)}" y2="${f(bl[1] + 13)}"`,
      `        stroke="${lineCol}" stroke-width="0.8"/>`,
      `  <line x1="${f(br[0] - 3)}" y1="${f(br[1] + 5)}" x2="${f(br[0] + 3)}" y2="${f(br[1] + 13)}"`,
      `        stroke="${lineCol}" stroke-width="0.8"/>`,
      `  <text x="${f(wMidX)}" y="${f(wMidY)}"`,
      `        text-anchor="middle" dominant-baseline="middle"`,
      `        font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fontSize}"`,
      `        fill="${textCol}" letter-spacing="0.3">${toFtIn(W)}</text>`,

      // Height dim-line
      `  <line x1="${f(bl[0] - 9)}" y1="${f(bl[1])}" x2="${f(topL[0] - 9)}" y2="${f(topL[1])}"`,
      `        stroke="${lineCol}" stroke-width="0.75" stroke-dasharray="3 2"/>`,
      `  <line x1="${f(bl[0] - 12)}"    y1="${f(bl[1])}"    x2="${f(bl[0] - 6)}"    y2="${f(bl[1])}"`,
      `        stroke="${lineCol}" stroke-width="0.8"/>`,
      `  <line x1="${f(topL[0] - 12)}" y1="${f(topL[1])}" x2="${f(topL[0] - 6)}" y2="${f(topL[1])}"`,
      `        stroke="${lineCol}" stroke-width="0.8"/>`,
      `  <text x="${f(hMidX)}" y="${f(hMidY)}"`,
      `        text-anchor="middle" dominant-baseline="middle"`,
      `        font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fontSize}"`,
      `        fill="${textCol}" letter-spacing="0.3"`,
      `        transform="rotate(-90 ${f(hMidX)} ${f(hMidY)})">${toFtIn(H)}</text>`,
    ].join("\n");
  }

  // ── Public entry ─────────────────────────────────────────────────────────────

  /** Returns a complete, self-contained SVG string for the isometric 3-D view. */
  public renderIsometric(): string {
    // Use first wall's zones (fall back to layout.zones for reach-in types)
    const zones = this.layout.walls?.[0]?.zones ?? this.layout.zones ?? [];

    return [
      `<svg xmlns="http://www.w3.org/2000/svg"`,
      `     viewBox="0 0 ${this.vw} ${this.vh}"`,
      `     role="img" aria-label="3D isometric closet view"`,
      `     style="width:100%;height:auto;display:block;background:#f8f4ef;">`,

      this.buildDefs(),

      `  <!-- ── background ── -->`,
      `  <rect width="${this.vw}" height="${this.vh}" fill="#f8f4ef"/>`,

      `  <!-- ═══ OUTER SHELL (painter's order: front → side → top) ═══ -->`,
      this.buildFrontFace(),
      this.buildSideFace(),
      this.buildTopFace(),

      `  <!-- ═══ ZONE COLUMN DIVIDERS ═══ -->`,
      this.buildZoneDividers(zones),

      `  <!-- ═══ ZONE INTERIOR CONTENTS ═══ -->`,
      this.buildZoneContents(zones),

      `  <!-- ═══ DIMENSION ANNOTATIONS ═══ -->`,
      this.buildDimensions(),

      `</svg>`,
    ]
      .filter(Boolean)
      .join("\n");
  }
}
