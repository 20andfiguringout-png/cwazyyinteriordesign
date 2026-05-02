import { ClosetLayout, ClosetZone, UserPreferences } from '@/types/closet';

interface RenderOptions {
  showDimensions: boolean;
  showLabels: boolean;
  style: UserPreferences['stylePreference'];
  woodFinish: UserPreferences['woodFinish'];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert total inches → architectural feet-inches string: 96 → 8'-0"  · 66 → 5'-6" */
function toFtIn(totalInches: number): string {
  const in_ = Math.round(totalInches);
  const ft  = Math.floor(in_ / 12);
  const rem = in_ % 12;
  return rem === 0 ? `${ft}'-0"` : `${ft}'-${rem}"`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

// ─── Main Renderer ──────────────────────────────────────────────────────────

export class ClosetSVGRenderer {
  private layout: ClosetLayout;
  private options: RenderOptions;

  // Canvas margins (px)
  private readonly ML = 110;  // left  – 3-column zone: zoneChain(-40) | overallDim(-56) | intHt(-84)
  private readonly MR = 60;   // right – AFF annotations
  private MT         = 44;   // top  — increased when a void zone above the unit is present
  private readonly MB = 98;   // bottom – dim lines + title block

  private scale: number;
  /** Effective drawing height — the topmost rendered content (not the raw room ceiling).
   *  For typical closets this equals the room height.  For very tall rooms (e.g. 600")
   *  where the storage unit only reaches ~107" AFF, this is ~107" so the unit fills the frame. */
  private drawH: number;

  constructor(layout: ClosetLayout, options: RenderOptions) {
    this.layout  = layout;
    this.options = options;
    this.drawH   = this.calcDrawHeight();
    this.scale   = this.calcScale();
    // Extend top margin to give the void zone band enough room to render.
    // The void is the clear space from the top of the unit to the room ceiling.
    // We allocate up to 90px extra (scaled proportionally) so the band is visible.
    const _roomH  = layout.dimensions.height;
    const _voidIn = _roomH - this.drawH;
    if (_voidIn > 24) {
      this.MT = 44 + clamp(Math.round(_voidIn * this.scale * 0.5), 36, 90);
    }
  }

  // ── Effective draw height ────────────────────────────────────────────────

  /** Find the highest rendered element across all zones.
   *  This gives us the "content height" — the unit top — which is used as the
   *  drawing frame height so the storage system fills the canvas. */
  private calcDrawHeight(): number {
    const roomH = this.layout.dimensions.height;
    let maxH = 0;

    for (const zone of this.layout.zones ?? []) {
      // Hanging zones: highest content is the rod shelf (rod + 1.5")
      if (zone.rods?.length) {
        for (const rod of zone.rods) {
          maxH = Math.max(maxH, rod.height + 2);
        }
      }
      // Shelf zones: use actual shelf heights (relative to zone.y)
      if (zone.shelves?.length) {
        for (const shelf of zone.shelves) {
          // shelf.height is relative to zone.y in shoe/shelf zones
          maxH = Math.max(maxH, zone.y + shelf.height + 2);
        }
      }
      // Drawer zones: topmost drawer face
      if (zone.drawers?.length) {
        for (const drawer of zone.drawers) {
          maxH = Math.max(maxH, zone.y + drawer.position + drawer.height + 2);
        }
      }
      // NOTE: deliberately NOT using zone.y + zone.height —
      // zones are sized to the full room height by the engine,
      // but actual content (rods, shelves, drawers) sits in the lower portion.
    }

    // No content found — fall back to room height
    if (maxH < 12) return roomH;

    // Add 8" breathing margin above highest element so the top panel
    // and top-shelf area are visible.  Never exceed actual room ceiling.
    return Math.min(maxH + 8, roomH);
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  /** Closet-space X (inches from left) → SVG X */
  private cx(in_: number): number { return this.ML + in_ * this.scale; }

  /** Closet-space Y (inches from floor, 0=floor) → SVG Y (0=canvas top).
   *  Uses drawH (effective unit height) so content fills the frame. */
  private cy(in_: number): number {
    return this.MT + (this.drawH - in_) * this.scale;
  }

  private get cW()     { return this.layout.dimensions.width * this.scale; }
  private get cH()     { return this.drawH * this.scale; }
  private get totalW() { return this.ML + this.cW + this.MR; }
  private get totalH() { return this.MT + this.cH + this.MB; }

  private calcScale(): number {
    const sx = 760 / Math.max(this.layout.dimensions.width, 1);
    const sy = 520 / Math.max(this.drawH, 1);
    // Both axes — drawing always fits.  Floor 0.5 prevents sub-pixel lines.
    return clamp(Math.min(sx, sy), 0.5, 8);
  }

  // ── Wood palette ──────────────────────────────────────────────────────────

  private get wood() {
    const p: Record<string, { bg: string; panel: string; edge: string; dark: string }> = {
      light:  { bg: '#f5f1eb', panel: '#ede5d8', edge: '#c4b096', dark: '#a8916b' },
      medium: { bg: '#ede3d5', panel: '#d8cbb8', edge: '#b5977a', dark: '#9c7d5e' },
      dark:   { bg: '#d4c2a8', panel: '#bfa882', edge: '#8d6e63', dark: '#6d4f40' },
      white:  { bg: '#f8f8f8', panel: '#eeeeee', edge: '#c8c8c8', dark: '#aaaaaa' },
    };
    return p[this.options.woodFinish] ?? p.medium;
  }

  // ── Public entry ─────────────────────────────────────────────────────────

  public renderElevation(): string {
    if (!this.layout.zones || this.layout.zones.length === 0) {
      return this.renderPlaceholder();
    }

    return [
      `<svg viewBox="0 0 ${this.totalW} ${this.totalH}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet"`,
      `     style="width:100%;height:auto;display:block;background:#f8f4ef;font-family:'Inter',Arial,sans-serif;">`,
      // Rule 3.2 — xMinYMin meet: drawing origin always top-left, letterbox at right/bottom
      `<defs>`,
      this.defs(),
      `</defs>`,
      `<rect width="${this.totalW}" height="${this.totalH}" fill="#f8f4ef"/>`,
      this.renderShell(),
      this.renderZoneContents(),
      this.renderTopShelf(),
      this.renderDimensions(),
      this.renderLabels(),
      this.renderTitleBlock(),
      `</svg>`,
    ].join('\n');
  }

  // ── SVG defs (patterns + filter) ─────────────────────────────────────────

  private defs(): string {
    const w = this.wood;
    return `
  <pattern id="wp" patternUnits="userSpaceOnUse" width="36" height="7">
    <rect width="36" height="7" fill="${w.panel}"/>
    <line x1="0" y1="1.5" x2="36" y2="1.5" stroke="${w.edge}" stroke-width="0.35" opacity="0.5"/>
    <line x1="0" y1="4.5" x2="36" y2="4.5" stroke="${w.edge}" stroke-width="0.25" opacity="0.3"/>
  </pattern>
  <pattern id="df" patternUnits="userSpaceOnUse" width="36" height="7">
    <rect width="36" height="7" fill="${w.bg}"/>
    <line x1="0" y1="2"   x2="36" y2="2"   stroke="${w.dark}" stroke-width="0.4" opacity="0.35"/>
    <line x1="0" y1="5.5" x2="36" y2="5.5" stroke="${w.dark}" stroke-width="0.25" opacity="0.2"/>
  </pattern>
  <!-- Rule 3.5: shadow on outer boundary only — dx=2, dy=2, stdDeviation=3, flood-opacity=0.12 -->
  <filter id="sh" x="-8%" y="-8%" width="120%" height="120%">
    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.12"/>
  </filter>
  <!-- Tick mark terminators for dimension lines (45° slash) -->
  <marker id="tick" viewBox="-4 -4 8 8" markerWidth="4" markerHeight="4"
          orient="auto" markerUnits="strokeWidth">
    <line x1="-3" y1="-3" x2="3" y2="3" stroke="#222" stroke-width="1.8" stroke-linecap="round"/>
  </marker>
  <!-- Top-shelf light fill pattern -->
  <pattern id="tsp" patternUnits="userSpaceOnUse" width="8" height="8">
    <rect width="8" height="8" fill="#f0ebe0"/>
    <line x1="0" y1="0" x2="8" y2="8" stroke="#ddd5c8" stroke-width="0.5" opacity="0.6"/>
  </pattern>
  <!-- Void-zone 45° crosshatch (space above unit to room ceiling) -->
  <pattern id="void-hatch" patternUnits="userSpaceOnUse" width="10" height="10">
    <rect width="10" height="10" fill="#f7f7f7"/>
    <line x1="0" y1="10" x2="10" y2="0" stroke="#d0ccc6" stroke-width="0.9"/>
    <line x1="-1" y1="1"  x2="1"  y2="-1" stroke="#d0ccc6" stroke-width="0.9"/>
    <line x1="9" y1="11" x2="11" y2="9"  stroke="#d0ccc6" stroke-width="0.9"/>
  </pattern>`;
  }

  // ── Structural shell ──────────────────────────────────────────────────────

  private renderShell(): string {
    const x0     = this.cx(0);
    const x1     = this.cx(this.layout.dimensions.width);
    const yTop   = this.cy(this.drawH);          // top of unit (= top of frame)
    const yFloor = this.cy(0);
    // Panel thickness — 3/4" in drawing units
    const ph = Math.max(this.scale * 0.75, 4);
    const TOE_KICK_IN = 3; // inches
    const yToe = this.cy(TOE_KICK_IN);

    const roomH = this.layout.dimensions.height;
    const isTruncated = roomH > this.drawH + 1; // room is taller than drawn unit

    // ── VOID ZONE: space between top of unit and room ceiling ───────────────
    // When the unit height < room ceiling height, a void zone (crosshatch band) fills
    // the gap with a professional label and a dimension annotation.
    let continuationLine = '';
    if (isTruncated) {
      const yPanelTop  = yTop - ph;          // SVG Y of unit top surface
      const yVoidTop   = 14;                 // SVG Y just inside the outer border
      const voidBandH  = yPanelTop - yVoidTop;
      const voidMidY   = yVoidTop + voidBandH / 2;
      const voidGapIn  = roomH - this.drawH; // actual void in inches
      const dimX       = x1 + 6;            // small dim arrow on right edge of void

      continuationLine = `
  <!-- ═══ VOID ZONE (room ceiling > unit height) ═══ -->
  <!-- Crosshatch fill -->
  ${
      voidGapIn < 12
        // ── SMALL VOID (< 12") — installation tolerance: light treatment only
        ? `<rect x="${x0}" y="${yVoidTop}" width="${this.cW}" height="${voidBandH}"
        fill="#f0ece8" stroke="#d4cec8" stroke-width="0.5"/>
  <line x1="${x0 - 12}" y1="${yVoidTop}" x2="${x1 + 12}" y2="${yVoidTop}"
        stroke="#bbb" stroke-width="0.8" stroke-dasharray="6,3"/>
  <text x="${x0 + 8}" y="${yVoidTop + Math.max(voidBandH * 0.55, 7)}"
        font-size="6" fill="#b8b0a8" letter-spacing="0.8"
        font-family="'Helvetica Neue',Arial,sans-serif">INSTAL. TOLER. ${toFtIn(voidGapIn)}</text>`
        // ── LARGE VOID (≥ 12") — deliberate space: full crosshatch + centred label + dim arrow
        : `<rect x="${x0}" y="${yVoidTop}" width="${this.cW}" height="${voidBandH}"
        fill="url(#void-hatch)" stroke="#c0bab2" stroke-width="0.8"/>
  <line x1="${x0 - 12}" y1="${yVoidTop}" x2="${x1 + 12}" y2="${yVoidTop}"
        stroke="#888" stroke-width="1.2" stroke-dasharray="8,4"/>
  <line x1="${x0 - 12}" y1="${yPanelTop}" x2="${x1 + 12}" y2="${yPanelTop}"
        stroke="#666" stroke-width="1"/>
  <text x="${(x0 + x1) / 2}" y="${voidMidY - 6}" text-anchor="middle"
        font-size="7.5" fill="#aaa" letter-spacing="1.5"
        font-family="'Helvetica Neue',Arial,sans-serif">VOID — ABOVE UNIT HEIGHT</text>
  <text x="${(x0 + x1) / 2}" y="${voidMidY + 7}" text-anchor="middle"
        font-size="6.5" fill="#bbb"
        font-family="'Helvetica Neue',Arial,sans-serif">${toFtIn(voidGapIn)} ABOVE T.O. UNIT</text>
  <line x1="${dimX + 7}" y1="${yVoidTop + 3}" x2="${dimX + 7}" y2="${yPanelTop - 3}"
        stroke="#aaa" stroke-width="0.8"/>
  <line x1="${dimX + 4}" y1="${yVoidTop + 3}"  x2="${dimX + 10}" y2="${yVoidTop + 3}"  stroke="#aaa" stroke-width="0.8"/>
  <line x1="${dimX + 4}" y1="${yPanelTop - 3}" x2="${dimX + 10}" y2="${yPanelTop - 3}" stroke="#aaa" stroke-width="0.8"/>
  <text x="${dimX + 14}" y="${voidMidY}" dominant-baseline="central"
        font-size="7" fill="#aaa"
        font-family="'Helvetica Neue',Arial,sans-serif">${toFtIn(voidGapIn)}</text>`
    }`
    }

    return `
  <!-- ═══ STRUCTURAL SHELL ═══ -->
  ${continuationLine}
  <!-- Back interior fill — Rule 1.8: unit fill #F5F0EB (warm, reads as figure vs #F8F4EF bg) -->
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${this.cH}"
        fill="#f5f0eb" stroke="none"/>
  <!-- Top panel — Rule 3.5: shadow on outer boundary only, not interior panels -->
  <rect x="${x0 - ph}" y="${yTop - ph}" width="${this.cW + 2 * ph}" height="${ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.4}"/>
  <!-- Left side panel — Rule 1.1: secondary profile #2A2520 for structural shell -->
  <rect x="${x0 - ph}" y="${yTop - ph}" width="${ph}" height="${this.cH + ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.3}"/>
  <!-- Right side panel -->
  <rect x="${x1}" y="${yTop - ph}" width="${ph}" height="${this.cH + ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.3}"/>
  <!-- Toe kick base (slightly recessed darker zone) -->
  <rect x="${x0}" y="${yToe}" width="${this.cW}" height="${yFloor - yToe}"
        fill="${this.wood.dark}" fill-opacity="0.55" stroke="none"/>
  <!-- Toe kick face line -->
  <line x1="${x0}" y1="${yToe}" x2="${x1}" y2="${yToe}"
        stroke="${this.wood.edge}" stroke-width="1.2"/>
  <!-- Floor plinth bar -->
  <rect x="${x0 - ph}" y="${yFloor}" width="${this.cW + 2 * ph}" height="5"
        fill="${this.wood.dark}" stroke="${this.wood.dark}" stroke-width="1"/>
  <!-- OUTER BOUNDING BOX — thickest line, architectural standard -->
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${this.cH}"
        fill="none" stroke="#1A1512" stroke-width="3.5" filter="url(#sh)"/>`;
  }

  // ── Full-width top shelf ──────────────────────────────────────────────────

  private renderTopShelf(): string {
    const x0   = this.cx(0);
    const yTop = this.cy(this.drawH);  // top of unit frame
    // 3/4" shelf thickness rendered as a filled panel rect
    const sh = Math.max(this.scale * 0.75, 3);

    return `
  <!-- ═══ TOP SHELF ═══ -->
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${x0}" y="${yTop + sh}" width="${this.cW}" height="3" fill="rgba(0,0,0,0.07)"/>`;
  }

  // ── Zone dispatch ────────────────────────────────────────────────────────

  private renderZoneContents(): string {
    const zones = this.layout.zones;
    if (!zones.length) return '';

    let out = '\n  <!-- ═══ ZONES ═══ -->';

    // Inter-column vertical dividers — 3/4" thick filled panels (structural elements)
    const seenX = new Set<number>();
    const dvThick = Math.max(this.scale * 0.75, 3.5); // 3/4" drawn thick
    for (const zone of zones) {
      if (zone.x <= 0 || seenX.has(zone.x)) continue;
      seenX.add(zone.x);
      const dvX = this.cx(zone.x);
      // Rule 1.1: secondary profile #2A2520 for zone dividers; Rule 3.5: no shadow on interior
      out += `
  <rect x="${dvX - dvThick / 2}" y="${this.cy(this.drawH)}" width="${dvThick}" height="${this.cH}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="1.2"/>
  <rect x="${dvX - dvThick / 2 + dvThick}" y="${this.cy(this.drawH)}" width="2" height="${this.cH}"
        fill="rgba(0,0,0,0.05)" stroke="none"/>`;
    }

    for (const zone of zones) {
      const zx = this.cx(zone.x);
      const zw = zone.width * this.scale;

      switch (zone.type) {
        case 'long-hang':
        case 'double-hang':
          out += this.renderHangZone(zone, zx, zw);
          break;
        case 'drawers':
          out += this.renderDrawerZone(zone, zx, zw);
          break;
        case 'shoe-shelves':
          out += this.renderShoeZone(zone, zx, zw);
          break;
        case 'top-shelves':
          out += this.renderShelfZone(zone, zx, zw);
          break;
      }
    }

    return out;
  }

  // ── Hanging zone ─────────────────────────────────────────────────────────

  private renderHangZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.rods?.length) return '';

    // 3/4" shelf thickness
    const sh  = Math.max(this.scale * 0.75, 3);
    let out   = `\n  <!-- hang: ${zone.type} x=${zone.x} -->`;

    // Sort rods bottom → top so we can compute space between them
    const rods = [...zone.rods].sort((a, b) => a.height - b.height);
    const zoneTop = zone.y + zone.height; // top of zone in inches

    for (let ri = 0; ri < rods.length; ri++) {
      const rod    = rods[ri];
      const rodAFF = rod.height;
      const rodY   = this.cy(rodAFF);
      const pad    = clamp(zw * 0.06, 6, 14);

      // The space above this rod shelf up to the next rod shelf (or drawH — the unit top).
      // Use this.drawH as the ceiling so we never add more shelves than the drawn unit height.
      const rodShelfTop = rodAFF + 1.5; // shelf sits 1.5" above rod centre
      const upperBound  = ri + 1 < rods.length
        ? rods[ri + 1].height + 1.5
        : Math.min(zoneTop, this.drawH); // cap at drawn unit height, not raw room height
      const openSpaceIn = upperBound - rodShelfTop; // inches of open space above this rod's shelf

      // ── shelf panel directly above rod ────────────────────────────────────
      const shelfY = this.cy(rodShelfTop);
      out += `
  <rect x="${zx}" y="${shelfY}" width="${zw}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${zx}" y="${shelfY + sh}" width="${zw}" height="3" fill="rgba(0,0,0,0.06)"/>`;

      // ── intermediate shelves filling open space above rod shelf (every 14–18") ─
      // Long-hang zones must remain clear from floor to rod — never add shelves.
      if (zone.type !== 'long-hang' && openSpaceIn > 18) {
        const shelfSpacing = clamp(openSpaceIn / Math.floor(openSpaceIn / 15), 12, 20);
        let sAFF = rodShelfTop + shelfSpacing;
        while (sAFF + 2 < upperBound - 2) {
          const sy = this.cy(sAFF);
          out += `
  <rect x="${zx}" y="${sy}" width="${zw}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1" opacity="0.75"/>
  <rect x="${zx}" y="${sy + sh}" width="${zw}" height="2" fill="rgba(0,0,0,0.04)"/>`;
          sAFF += shelfSpacing;
        }
      }

      // ── rod — Rule 1.2: dashed hidden line (rod is behind garment plane in elevation) ─────
      // Tertiary weight #4A4540, bracket circles at each end at tertiary weight
      const rodStroke = clamp(this.scale * 0.18, 1.2, 2.2);
      out += `
  <line x1="${zx + pad}" y1="${rodY}" x2="${zx + zw - pad}" y2="${rodY}"
        stroke="#4A4540" stroke-width="${rodStroke}" stroke-linecap="round"
        stroke-dasharray="8,5"/>
  <circle cx="${zx + pad}"      cy="${rodY}" r="${clamp(rodStroke + 0.3, 1.5, 2.8)}" fill="#4A4540" stroke="none"/>
  <circle cx="${zx + zw - pad}" cy="${rodY}" r="${clamp(rodStroke + 0.3, 1.5, 2.8)}" fill="#4A4540" stroke="none"/>`;

      // ── garment silhouettes ────────────────────────────────────────────────
      const isLong       = zone.type === 'long-hang';
      const zoneFloor    = ri === 0 ? zone.y : rods[ri - 1].height + 1.5;
      const gInches      = isLong ? Math.min(rodAFF - zoneFloor - 2, 56) : 26;
      const maxGarmentPx = this.cy(zoneFloor) - rodY;
      const gPx          = Math.min(gInches * this.scale, maxGarmentPx * 0.90);
      const hookH        = clamp(this.scale * 1.2, 4, 9);
      const count   = clamp(Math.floor((zw - pad * 2) / Math.max(this.scale * 2.8, 8)), 2, 8);
      const spacing = (zw - pad * 2) / (count + 1);
      const gw    = isLong ? clamp(this.scale * 2.2, 6, 15) : clamp(this.scale * 2.8, 7, 18);
      const gwBot = isLong ? gw * 1.18 : gw * 0.88;

      for (let i = 0; i < count; i++) {
        const gx    = zx + pad + (i + 1) * spacing;
        const ty    = rodY + hookH;
        const by    = rodY + hookH + gPx;
        const shape = i % 3;
        const fCol  = shape === 0 ? (isLong ? '#f0ede8' : '#ece8e2')
                    : shape === 1 ? (isLong ? '#e8e4de' : '#e5e0da')
                    :               (isLong ? '#edeae4' : '#eae6e0');
        const fOp   = shape === 1 ? 0.72 : 0.82;
        // Hanger
        out += `
  <polyline points="${gx},${rodY} ${gx - gw * 0.6},${ty} ${gx + gw * 0.6},${ty}"
            fill="none" stroke="#666" stroke-width="1.1" stroke-linejoin="round"/>
  <circle cx="${gx}" cy="${rodY}" r="1.6" fill="none" stroke="#666" stroke-width="0.9"/>`;
        if (isLong) {
          if (shape === 1) {
            const cw = gw * 1.08;
            out += `
  <path d="M${gx - cw * 0.5},${ty} L${gx - gw * 0.4},${by} L${gx + gw * 0.4},${by} L${gx + cw * 0.5},${ty} Z"
        fill="${fCol}" fill-opacity="${fOp}" stroke="#999" stroke-width="0.8"/>`;
          } else {
            out += `
  <path d="M${gx - gw * 0.5},${ty} L${gx - gwBot * 0.5},${by} L${gx + gwBot * 0.5},${by} L${gx + gw * 0.5},${ty} Z"
        fill="${fCol}" fill-opacity="${fOp}" stroke="#999" stroke-width="0.8"/>`;
          }
        } else {
          const mid = ty + (by - ty) * 0.28;
          if (shape === 1) {
            const jw = gw * 1.1;
            out += `
  <path d="M${gx - jw * 0.5},${ty} L${gx - jw * 0.52},${mid} L${gx - gwBot * 0.36},${by} L${gx + gwBot * 0.36},${by} L${gx + jw * 0.52},${mid} L${gx + jw * 0.5},${ty} Z"
        fill="${fCol}" fill-opacity="${fOp}" stroke="#999" stroke-width="0.8"/>`;
          } else {
            out += `
  <path d="M${gx - gw * 0.5},${ty} L${gx - gw * 0.58},${mid} L${gx - gwBot * 0.42},${by} L${gx + gwBot * 0.42},${by} L${gx + gw * 0.58},${mid} L${gx + gw * 0.5},${ty} Z"
        fill="${fCol}" fill-opacity="${fOp}" stroke="#999" stroke-width="0.8"/>`;
          }
        }
      }
    }

    return out;
  }

  // ── Drawer zone ───────────────────────────────────────────────────────────

  private renderDrawerZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.drawers?.length) return '';

    let out = `\n  <!-- drawers x=${zone.x} -->`;
    // 3/4" gap between drawer face edge and column panel
    const pad = Math.max(this.scale * 0.75, 3);

    for (const drawer of zone.drawers) {
      const svgTop  = this.cy(drawer.position + drawer.height);
      const svgBot  = this.cy(drawer.position);
      const drawerH = svgBot - svgTop;
      const midY    = svgTop + drawerH / 2;
      const midX    = zx + zw / 2;

      // Drawer face — filled rect with wood pattern, clear gap top & sides
      out += `
  <rect x="${zx + pad}" y="${svgTop + 1.5}" width="${zw - 2 * pad}" height="${drawerH - 3}"
        fill="url(#df)" stroke="${this.wood.edge}" stroke-width="1.5" rx="1.5"/>
  <!-- Drawer gap line at top of each face -->
  <line x1="${zx}" y1="${svgTop}" x2="${zx + zw}" y2="${svgTop}"
        stroke="${this.wood.edge}" stroke-width="1"/>`;

      // Handle — centred horizontal bar (D-pull style)
      if (drawerH > 10) {
        const barW = clamp(zw * 0.36, 12, 38);
        const barH = clamp(drawerH * 0.11, 2.5, 5);
        out += `
  <rect x="${midX - barW / 2}" y="${midY - barH / 2}" width="${barW}" height="${barH}"
        fill="${this.wood.dark}" stroke="${this.wood.dark}" stroke-width="0.5" rx="${barH / 2}"/>
  <rect x="${midX - barW / 2 + 3}" y="${midY - barH / 2 - 1.5}" width="${barW - 6}" height="${barH * 0.4}"
        fill="none" stroke="#fff" stroke-width="0.6" rx="1" opacity="0.4"/>`;
      }

      // Purpose label
      if (drawer.purpose !== 'folded' && drawerH > 14) {
        out += `\n  <text x="${midX}" y="${svgTop + clamp(drawerH * 0.25, 8, 14)}" text-anchor="middle" font-size="6" fill="${this.wood.dark}" opacity="0.65" letter-spacing="0.9" font-family="'Helvetica Neue',Arial,sans-serif">${drawer.purpose.toUpperCase()}</text>`;
      }
    }

    // ── EQ labels between consecutive equal-height drawers (TC-10 / Task 14) ─
    const sortedDrawers = [...zone.drawers].sort((a, b) => a.position - b.position);
    for (let i = 0; i < sortedDrawers.length - 1; i++) {
      const curr = sortedDrawers[i];
      const next = sortedDrawers[i + 1];
      if (Math.abs(curr.height - next.height) < 1) {
        const eqSvgY = this.cy(curr.position + curr.height); // the gap / divider line
        const eqX    = zx + zw / 2;
        out += `
  <rect x="${eqX - 7}" y="${eqSvgY - 4.5}" width="14" height="7" fill="#fafaf5" rx="2"/>
  <text x="${eqX}" y="${eqSvgY - 1}" text-anchor="middle" dominant-baseline="central"
        font-size="5" fill="${this.wood.dark}" opacity="0.55" letter-spacing="0.3"
        font-family="'Helvetica Neue',Arial,sans-serif">EQ</text>`;
      }
    }

    return out;
  }

  // ── Shoe-shelf zone ──────────────────────────────────────────────────────

  private renderShoeZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.shelves?.length) return '';

    let out = `\n  <!-- shoes x=${zone.x} -->`;
    // Shelf thickness — 3/4"
    const sh = Math.max(this.scale * 0.75, 3);

    // Bay fill colours per shoe type
    const bayFill: Record<string, string> = {
      boots:    'rgba(180,160,130,0.07)',
      heels:    'rgba(160,140,120,0.06)',
      sneakers: 'rgba(140,160,140,0.06)',
      flats:    'rgba(140,140,160,0.05)',
    };

    for (let i = 0; i < zone.shelves.length; i++) {
      const shelf   = zone.shelves[i];
      const shelfY  = this.cy(zone.y + shelf.height);
      const bayTopY = shelfY + sh;  // top of bay = bottom of shelf board
      // Bay bottom = top of next shelf, or zone bottom
      const nextShelfH = zone.shelves[i + 1]?.height ?? zone.height;
      const bayBotY    = this.cy(zone.y + nextShelfH);
      const bayH       = bayBotY - bayTopY;

      // ── Bay fill (light background tint for the clear space) ──────────────
      if (bayH > 1) {
        out += `
  <rect x="${zx}" y="${bayTopY}" width="${zw}" height="${bayH}"
        fill="${bayFill[shelf.purpose] ?? 'rgba(160,150,130,0.05)'}" stroke="none"/>`;
      }

      // ── Shelf board — angled 3° (left end lower) to suggest functional shoe shelf ──
      const tilt = Math.min(zw * 0.025, 3); // ~2–3px drop L→R for a 3-degree visual angle
      out += `
  <polygon
    points="${zx},${shelfY + tilt + sh}  ${zx + zw},${shelfY + sh}  ${zx + zw},${shelfY}  ${zx},${shelfY + tilt}"
    fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.2"/>
  <polygon
    points="${zx},${shelfY + tilt + sh + 2.5}  ${zx + zw},${shelfY + sh + 2.5}  ${zx + zw},${shelfY + sh}  ${zx},${shelfY + tilt + sh}"
    fill="rgba(0,0,0,0.05)" stroke="none"/>`;

      // ── Shoe silhouettes in the bay (if space allows) ─────────────────────
      const pairCount  = shelf.count;   // stored in count field from engine
      const bayHpx     = bayH;
      const silhH      = clamp(bayHpx * 0.62, 4, 34);
      const silhY      = bayTopY + bayHpx * 0.18;
      const slotW      = bayHpx > 6 ? (zw - 8) / Math.max(pairCount, 1) : 0;

      if (slotW > 4 && bayHpx > 8) {
        for (let p = 0; p < pairCount; p++) {
          const sx = zx + 4 + p * slotW + slotW / 2;
          const sw = clamp(slotW * 0.6, 3, 14);

          if (shelf.purpose === 'boots') {
            // Boot: tall narrow rounded rect with a small ankle notch
            const bw = clamp(sw * 0.55, 2, 7);
            out += `
  <rect x="${sx - bw / 2}" y="${silhY}" width="${bw}" height="${silhH}"
        fill="none" stroke="#9a8878" stroke-width="0.9" rx="1.5" opacity="0.75"/>
  <line x1="${sx - bw / 2}" y1="${silhY + silhH * 0.72}" x2="${sx + bw / 2}" y2="${silhY + silhH * 0.72}"
        stroke="#9a8878" stroke-width="0.6" opacity="0.6"/>`;
          } else if (shelf.purpose === 'heels') {
            // Heel: small body + heel spike + toe curve
            const hw = clamp(sw * 0.7, 2, 8);
            const hh = clamp(silhH * 0.55, 3, 12);
            out += `
  <path d="M${sx - hw * 0.5},${silhY + hh} Q${sx},${silhY + hh * 0.6} ${sx + hw * 0.5},${silhY + hh}"
        fill="none" stroke="#9a8878" stroke-width="0.9" opacity="0.75"/>
  <line x1="${sx - hw * 0.4}" y1="${silhY + hh}" x2="${sx - hw * 0.5}" y2="${silhY + hh + clamp(silhH * 0.3,2,7)}"
        stroke="#9a8878" stroke-width="0.8" opacity="0.6"/>`;
          } else if (shelf.purpose === 'sneakers') {
            // Sneaker: chunky low oval with thick sole
            const snw = clamp(sw * 0.85, 3, 11);
            const snh = clamp(silhH * 0.45, 3, 10);
            out += `
  <ellipse cx="${sx}" cy="${silhY + snh / 2}" rx="${snw / 2}" ry="${snh / 2}"
           fill="none" stroke="#9a8878" stroke-width="0.9" opacity="0.75"/>
  <rect x="${sx - snw / 2}" y="${silhY + snh * 0.6}" width="${snw}" height="${snh * 0.3}"
        fill="#9a8878" fill-opacity="0.2" stroke="none" rx="1"/>`;
          } else {
            // Flat shoe: low wide oval
            const flw = clamp(sw * 0.9, 3, 12);
            const flh = clamp(silhH * 0.32, 2, 7);
            out += `
  <ellipse cx="${sx}" cy="${silhY + flh / 2}" rx="${flw / 2}" ry="${flh / 2}"
           fill="none" stroke="#9a8878" stroke-width="0.9" opacity="0.75"/>`;
          }
        }
      }

      // ── Shoe type label in bay (small, muted, centred) ────────────────────
      if (shelf.purpose && bayHpx > 14) {
        const cap = shelf.purpose === 'sneakers' ? 'SNEAKERS'
                  : shelf.purpose.charAt(0).toUpperCase() + shelf.purpose.slice(1).toUpperCase();
        const labelY = bayTopY + bayHpx - 5;
        out += `
  <text x="${zx + zw / 2}" y="${labelY}" text-anchor="middle"
        font-size="6" fill="#9a8878" letter-spacing="0.8"
        font-family="'Helvetica Neue',Arial,sans-serif">${cap}</text>`;
      }
    }

    return out;
  }

  // ── Generic shelf zone ────────────────────────────────────────────────────

  private renderShelfZone(zone: ClosetZone, zx: number, zw: number): string {
    const zoneTopY  = this.cy(zone.y + zone.height);
    const zoneBotY  = this.cy(zone.y);
    const sh = Math.max(this.scale * 0.75, 3);

    let out = `\n  <!-- shelves x=${zone.x} -->`;

    // Light fill for the entire top-shelf zone
    out += `
  <rect x="${zx}" y="${zoneTopY}" width="${zw}" height="${zoneBotY - zoneTopY}"
        fill="url(#tsp)" stroke="none" opacity="0.6"/>`;

    // SHELF label centred in zone
    const zoneMid = (zoneTopY + zoneBotY) / 2;
    out += `
  <text x="${zx + zw / 2}" y="${zoneMid}" text-anchor="middle" dominant-baseline="central"
        font-size="7.5" fill="#7a6a5a" letter-spacing="1.8"
        font-family="'Helvetica Neue',Arial,sans-serif">SHELF</text>`;

    if (!zone.shelves?.length) return out;

    for (const shelf of zone.shelves) {
      const sy = this.cy(zone.y + shelf.height);
      out += `
  <rect x="${zx}" y="${sy}" width="${zw}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${zx}" y="${sy + sh}" width="${zw}" height="2" fill="rgba(0,0,0,0.05)"/>`;
    }

    return out;
  }

  // ── Dimension lines ───────────────────────────────────────────────────────

  private renderDimensions(): string {
    if (!this.options.showDimensions) return '';

    const W      = this.layout.dimensions.width;
    const H      = this.drawH;                          // draw height (unit height)
    const roomH  = this.layout.dimensions.height;       // actual room ceiling (may be larger)
    const x0     = this.cx(0);
    const x1     = this.cx(W);
    const yTop   = this.cy(H);
    const yFloor = this.cy(0);

    let out = '\n  <!-- ═══ DIMENSIONS ═══ -->';

    // ── Overall height — left vertical chain ──────────────────────────────
    const vdX = x0 - 46;
    // Extension lines with gap and overshoot
    out += this.extLine('v', x0 - 2, yTop,   vdX + 5, 3);
    out += this.extLine('v', x0 - 2, yFloor, vdX + 5, 3);
    out += this.dimLineV(vdX, yTop, yFloor, toFtIn(H));

    // Usable interior height note — sits in its own outermost column (left of the
    // overall-height dim line at vdX = x0-46) to eliminate label/dim collision.
    const TOE_DIM_H = 3;
    const yToeNote  = this.cy(TOE_DIM_H);
    const noteX     = x0 - 62;
    const noteMid   = (yTop + yToeNote) / 2;
    out += `
  <text x="${noteX}" y="${noteMid}" text-anchor="middle" dominant-baseline="central"
        font-size="5.5" fill="#c8c0b8" letter-spacing="1"
        font-family="'Helvetica Neue',Arial,sans-serif"
        transform="rotate(-90 ${noteX} ${noteMid})">INT. HT. ${toFtIn(H - TOE_DIM_H)}</text>`;

    // ── Per-zone heights on RIGHT vertical chain (clamped + staggered) ──────
    const vdRX = x1 + 46;
    const seenH = new Set<string>();
    const chainPairs: Array<{ za: number; zb: number; hi: number }> = [];
    for (const zone of this.layout.zones) {
      const ctop = Math.min(zone.y + zone.height, H);
      const cbot = Math.max(zone.y, 0);
      if (ctop <= cbot) continue;
      const key = `${Math.round(cbot)}-${Math.round(ctop)}`;
      if (seenH.has(key)) continue;
      seenH.add(key);
      chainPairs.push({ za: this.cy(ctop), zb: this.cy(cbot), hi: ctop - cbot });
    }
    // Stagger alternate labels when there are > 2 zones to prevent text collisions
    chainPairs.forEach(({ za, zb, hi }, i) => {
      const sOff = chainPairs.length > 2 && i % 2 === 1 ? 14 : 0;
      out += this.extLine('v', x1 + 2, za, vdRX - 5 + sOff, 3);
      out += this.extLine('v', x1 + 2, zb, vdRX - 5 + sOff, 3);
      out += this.dimLineV(vdRX + sOff, za, zb, toFtIn(hi));
    });

    // ── Overall width (bottom outer) ──────────────────────────────────────
    const hdY_outer = yFloor + 54;
    out += this.extLine('h', x0, yFloor + 2, hdY_outer + 5, 3);
    out += this.extLine('h', x1, yFloor + 2, hdY_outer + 5, 3);
    out += this.dimLineH(x0, x1, hdY_outer, toFtIn(W));

    // ── Per-zone widths (bottom inner) ────────────────────────────────────
    const hdY_inner = yFloor + 24;
    const seenZX = new Set<number>();
    for (const zone of this.layout.zones) {
      const za = this.cx(zone.x);
      const zb = this.cx(zone.x + zone.width);
      out += this.dimLineH(za, zb, hdY_inner, toFtIn(zone.width));
      if (zone.x > 0 && !seenZX.has(zone.x)) {
        seenZX.add(zone.x);
        out += this.extLine('h', za, yFloor + 2, hdY_inner + 5, 3);
      }
    }
    // Left and right edges for inner chain
    out += this.extLine('h', x0, yFloor + 2, hdY_inner + 5, 3);
    out += this.extLine('h', x1, yFloor + 2, hdY_inner + 5, 3);

    // ── AFF annotations (right side — leader style) ───────────────────────
    const rx = x1 + 12;
    // When room is taller than unit, label unit top as T.O. UNIT — ceiling is noted separately
    const isTruncated = roomH > H + 1;
    if (isTruncated) {
      // TC-21: compact right-margin leader at the top of the void band (y ≈ 14)
      const yCeiling = 14;
      out += `
  <line x1="${rx - 6}" y1="${yCeiling}" x2="${rx + 4}" y2="${yCeiling}" stroke="#888" stroke-width="0.9"/>
  <text x="${rx + 6}" y="${yCeiling + 9}" font-size="7" font-weight="500" fill="#666"
        font-family="'Helvetica Neue',Arial,sans-serif">+${toFtIn(roomH)} A.F. ROOM CLG.</text>
  <text x="${rx + 6}" y="${yCeiling + 20}" font-size="6.5" fill="#888"
        font-family="'Helvetica Neue',Arial,sans-serif">UNIT HT. ${toFtIn(H)}</text>`;
      out += this.affAnnotation(rx, yTop, `+${toFtIn(H)} A.F.F.`, 'T.O. UNIT', true);
    } else {
      out += this.affAnnotation(rx, yTop,   `+${toFtIn(H)} A.F.F.`,  'T.O. CEILING',  true);
    }
    out += this.affAnnotation(rx, yFloor, `+0'-0" A.F.F.`,          'FINISH FLOOR',  false);

    // Toe kick at 3" AFF — use above=true so text rises into the toe kick zone
    // rather than colliding downward with the FINISH FLOOR label (Issue 08).
    const TOE_KICK_IN = 3;
    const yToe = this.cy(TOE_KICK_IN);
    out += this.affAnnotation(rx, yToe, `+3" A.F.F.`, 'TOE KICK', true);

    // Rod heights — label each unique rod with AFF leader
    const seenRod = new Set<number>();
    for (const zone of this.layout.zones) {
      if (!zone.rods) continue;
      for (const rod of zone.rods) {
        const k = Math.round(rod.height);
        if (seenRod.has(k)) continue;
        seenRod.add(k);
        const rodLabel = rod.purpose.includes('lower') ? `${toFtIn(k)} A.F.F.` : `${toFtIn(k)} A.F.F.`;
        out += this.affAnnotation(rx, this.cy(rod.height), rodLabel, rod.purpose.toUpperCase(), false);
      }
    }

    // ── Shoe shelf spacing — small internal dims inside shoe section ───────
    for (const zone of this.layout.zones) {
      if (zone.type !== 'shoe-shelves' || !zone.shelves?.length) continue;
      const shoeRX = this.cx(zone.x + zone.width) + 4;
      for (let i = 0; i < zone.shelves.length; i++) {
        const shelf = zone.shelves[i];
        const nextH = zone.shelves[i + 1]?.height ?? zone.height;
        const bayHin = nextH - shelf.height;
        if (bayHin <= 0) continue;
        const sy1 = this.cy(zone.y + shelf.height);
        const sy2 = this.cy(zone.y + nextH);
        if (sy2 - sy1 > 12) {
          out += `
  <line x1="${shoeRX}" y1="${sy1}" x2="${shoeRX + 16}" y2="${sy1}" stroke="#bbb" stroke-width="0.5"/>
  <line x1="${shoeRX}" y1="${sy2}" x2="${shoeRX + 16}" y2="${sy2}" stroke="#bbb" stroke-width="0.5"/>
  <line x1="${shoeRX + 8}" y1="${sy1}" x2="${shoeRX + 8}" y2="${sy2}" stroke="#999" stroke-width="0.6"/>
  <text x="${shoeRX + 10}" y="${(sy1 + sy2) / 2}" dominant-baseline="central"
        font-size="6" fill="#888" font-family="'Helvetica Neue',Arial,sans-serif">${toFtIn(bayHin)}</text>`;
        }
      }
    }

    return out;
  }

  /** Extension line — either horizontal or vertical, with gap and overshoot */
  private extLine(dir: 'h' | 'v', fromCoord: number, perpCoord: number, toCoord: number, overshoot: number): string {
    const gap = 3;
    if (dir === 'h') {
      // horizontal extension: fromCoord=x of element, perpCoord=y, toCoord=y of dim line
      const y1 = perpCoord + (toCoord > perpCoord ? gap : -gap);
      const y2 = toCoord + (toCoord > perpCoord ? overshoot : -overshoot);
      // Rule 1.1: extension lines — dimension/notation tier #5A5550 @ 0.6px
      return `\n  <line x1="${fromCoord}" y1="${y1}" x2="${fromCoord}" y2="${y2}" stroke="#5A5550" stroke-width="0.6"/>`;
    } else {
      // vertical extension: fromCoord=y of element, perpCoord=x, toCoord=x of dim line
      const x1 = perpCoord + (toCoord > perpCoord ? gap : -gap);
      const x2 = toCoord + (toCoord > perpCoord ? overshoot : -overshoot);
      return `\n  <line x1="${x1}" y1="${fromCoord}" x2="${x2}" y2="${fromCoord}" stroke="#5A5550" stroke-width="0.6"/>`;
    }
  }

  private dimLineH(x1: number, x2: number, y: number, text: string): string {
    const mx   = (x1 + x2) / 2;
    const tw   = text.length * 5 + 8;
    // 45° tick marks at each end (architectural standard)
    const tk   = 4.5;
    // Rule 1.1: dim lines #5A5550 @ 0.6px; Rule 1.3: tick marks 0.8px (tertiary)
    return `
  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#5A5550" stroke-width="0.6"/>
  <line x1="${x1 - tk}" y1="${y + tk}" x2="${x1 + tk}" y2="${y - tk}" stroke="#5A5550" stroke-width="0.8" stroke-linecap="round"/>
  <line x1="${x2 - tk}" y1="${y + tk}" x2="${x2 + tk}" y2="${y - tk}" stroke="#5A5550" stroke-width="0.8" stroke-linecap="round"/>
  <rect x="${mx - tw / 2}" y="${y - 8}" width="${tw}" height="10.5" fill="#f8f4ef"/>
  <text x="${mx}" y="${y - 2}" text-anchor="middle" dominant-baseline="central"
        font-size="8" font-weight="400" fill="#5A5550" letter-spacing="0.3"
        font-family="'Helvetica Neue',Arial,sans-serif">${text}</text>`;
  }

  private dimLineV(x: number, y1: number, y2: number, text: string): string {
    const my = (y1 + y2) / 2;
    const th = text.length * 4.5 + 8;
    const tk = 4.5;
    // Rule 1.1: dim lines #5A5550 @ 0.6px; Rule 1.3: ticks 0.8px; Rule 1.4: rotate(-90) ✅
    return `
  <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#5A5550" stroke-width="0.6"/>
  <line x1="${x - tk}" y1="${y1 + tk}" x2="${x + tk}" y2="${y1 - tk}" stroke="#5A5550" stroke-width="0.8" stroke-linecap="round"/>
  <line x1="${x - tk}" y1="${y2 + tk}" x2="${x + tk}" y2="${y2 - tk}" stroke="#5A5550" stroke-width="0.8" stroke-linecap="round"/>
  <rect x="${x - 5.5}" y="${my - th / 2}" width="11" height="${th}" fill="#f8f4ef"/>
  <text x="${x}" y="${my}" text-anchor="middle" dominant-baseline="central"
        font-size="8" font-weight="400" fill="#5A5550" letter-spacing="0.3"
        font-family="'Helvetica Neue',Arial,sans-serif"
        transform="rotate(-90 ${x} ${my})">${text}</text>`;
  }

  private affAnnotation(x: number, svgY: number, main: string, sub: string, above: boolean): string {
    const ty = above ? svgY - 5 : svgY - 3;
    const sy = above ? svgY - 14 : svgY + 9;
    // Rule 3.4: all 5 SVG text attrs explicit; Rule 1.1: leader + text use dim notation weight
    return `
  <line x1="${x - 6}" y1="${svgY}" x2="${x + 4}" y2="${svgY}" stroke="#5A5550" stroke-width="0.6"/>
  <text x="${x + 6}" y="${ty}" font-size="8" font-weight="600" fill="#5A5550"
        font-family="'Helvetica Neue',Arial,sans-serif" dominant-baseline="auto">${main}</text>
  ${sub ? `<text x="${x + 6}" y="${sy}" font-size="6.5" fill="#888"
        font-family="'Helvetica Neue',Arial,sans-serif" dominant-baseline="auto">${sub}</text>` : ''}`;
  }

  // ── Zone labels ───────────────────────────────────────────────────────────

  private renderLabels(): string {
    if (!this.options.showLabels) return '';

    const MAIN: Record<string, string> = {
      'double-hang':  'DOUBLE HANG',
      'long-hang':    'LONG HANG',
      'shoe-shelves': 'SHOE SHELVES',
      'drawers':      'DRAWERS',
      'top-shelves':  'SHELF',
      'accessories':  'ACCESSORIES',
    };

    let out = '\n  <!-- ═══ LABELS ═══ -->';

    for (const zone of this.layout.zones) {
      // Skip top-shelves — they get labelled by renderShelfZone
      if (zone.type === 'top-shelves') continue;

      const zcx = this.cx(zone.x + zone.width / 2);
      const zw  = zone.width * this.scale;
      // Clamp zone boundaries to the effective drawing canvas (0..drawH).
      // Zone heights in the engine span the full room height; raw zone.y+zone.height
      // can exceed drawH, yielding negative SVG y-coordinates and off-canvas labels.
      const clampedTop = Math.min(zone.y + zone.height, this.drawH);
      const clampedBot = Math.max(zone.y, 0);
      const zTopY  = this.cy(clampedTop);
      const zBotY  = this.cy(clampedBot);
      const zoneH  = zBotY - zTopY;

      // Issue 05 — For hanging zones, centre the label within the *actual hanging area*
      // (between floor/lower-rod and the top rod), not the full zone box which spans
      // floor-to-unit-top and causes the label to float above the garment silhouettes.
      let labelY = zTopY + zoneH / 2;
      if ((zone.type === 'long-hang' || zone.type === 'double-hang') && zone.rods?.length) {
        const sortedRods = [...zone.rods].sort((a, b) => a.height - b.height);
        if (zone.type === 'long-hang') {
          // Centre between floor and the single rod
          labelY = this.cy((clampedBot + sortedRods[0].height) / 2);
        } else {
          // double-hang: centre between lower rod and upper rod
          const lowerRod = sortedRods[0].height;
          const upperRod = sortedRods[sortedRods.length - 1].height;
          labelY = this.cy((lowerRod + upperRod) / 2);
        }
      }

      const mainLabel = MAIN[zone.type] ?? zone.type.toUpperCase();
      // Font size scales with zone width but capped at 10px
      const fsMain = clamp(Math.min(zw / (mainLabel.length * 1.1), 10), 6.5, 10);

      // Rule 1.9: ALL CAPS ✅, letter-spacing ≥ 0.15em, color #3D2B1F inside zones
      out += `
  <text x="${zcx}" y="${labelY}" text-anchor="middle" dominant-baseline="central"
        font-size="${fsMain}" font-weight="400" fill="#3D2B1F" letter-spacing="0.18em"
        font-family="'Helvetica Neue','Arial Narrow',Arial,sans-serif">${mainLabel}</text>`;

      // Inventory content sub-label — 2 lines max, lighter colour, smaller
      if (zone.contentLabel && zoneH > 50) {
        // Issue 02 — show up to 4 parts across two sub-lines (prevents pants being cut off)
        const allParts = zone.contentLabel.split(' · ');
        const line1    = allParts.slice(0, 3).join('  ·  ');
        const line2    = allParts.length > 3 ? allParts.slice(3, 6).join('  ·  ') : null;
        const fsContent = clamp(Math.min(zw / (line1.length * 0.95), 7.5), 5, 7.5);
        out += `
  <text x="${zcx}" y="${labelY + fsMain + 5}" text-anchor="middle" dominant-baseline="central"
        font-size="${fsContent}" font-weight="400" fill="#9a8a7a" letter-spacing="0.5"
        font-family="'Helvetica Neue',Arial,sans-serif">${line1}</text>`;
        if (line2 && zoneH > 80) {
          const fsLine2 = clamp(Math.min(zw / (line2.length * 0.95), 7), 5, 7);
          out += `
  <text x="${zcx}" y="${labelY + fsMain + fsContent + 10}" text-anchor="middle" dominant-baseline="central"
        font-size="${fsLine2}" font-weight="400" fill="#9a8a7a" letter-spacing="0.5"
        font-family="'Helvetica Neue',Arial,sans-serif">${line2}</text>`;
        }
      }
    }

    return out;
  }

  // ── Title block ───────────────────────────────────────────────────────────

  private renderTitleBlock(): string {
    const blockY  = this.MT + this.cH + this.MB - 20;
    const cx      = this.totalW / 2;
    const x0      = this.cx(0);
    const x1      = this.cx(this.layout.dimensions.width);
    const sepY    = this.MT + this.cH + this.MB - 62;
    const { width: W, height: H, depth: D } = this.layout.dimensions;
    const unitH = this.drawH; // effective unit height for display
    const toCm = (inches: number) => Math.round(inches * 2.54);

    const wall      = this.layout.walls?.[0];
    const elevRef   = wall?.elevationRef ?? 'EL-A';
    const wallLabel = wall?.label        ?? 'BACK WALL';
    const typeLabel = this.closetTypeLabel();
    const titleText = `${elevRef} — ${wallLabel}`;

    // Date: today's date formatted as MMM YYYY
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

    // ── Graphical scale bar — adaptive unit so bar is always ≥ 20 px wide ──
    // At extreme scales (e.g. 1:55 for a 28-ft ceiling) a hard-coded 3-ft bar
    // would be < 10 px, making it useless as a visual scale reference.
    const ftPx = 12 * this.scale;
    const barUnits = [1, 2, 3, 5, 10, 20];
    const barFt    = barUnits.find(u => u * ftPx >= 20) ?? 20;
    const barW  = ftPx * barFt;
    const barX  = x0;
    const barY  = blockY - 8;
    const barH  = 5;
    let scaleBar = `
  <text x="${barX}" y="${barY - 8}" font-size="6.5" fill="#888"
        font-family="'Helvetica Neue',Arial,sans-serif" letter-spacing="0.5">SCALE 1:${Math.round(12/this.scale*12)}</text>`;
    for (let i = 0; i < barFt; i++) {
      const bx = barX + i * ftPx;
      scaleBar += `
  <rect x="${bx}" y="${barY}" width="${ftPx}" height="${barH}"
        fill="${i % 2 === 0 ? '#444' : '#fff'}" stroke="#444" stroke-width="0.7"/>`;
      scaleBar += `
  <text x="${bx}" y="${barY + barH + 7}" font-size="6" fill="#666"
        text-anchor="middle" font-family="'Helvetica Neue',Arial,sans-serif">${i}′</text>`;
    }
    scaleBar += `
  <text x="${barX + barW}" y="${barY + barH + 7}" font-size="6" fill="#666"
        text-anchor="middle" font-family="'Helvetica Neue',Arial,sans-serif">${barFt}′</text>`;

    return `
  <!-- ═══ TITLE BLOCK ═══ -->
  <!-- Drawing border -->
  <rect x="12" y="12" width="${this.totalW - 24}" height="${this.totalH - 24}"
        fill="none" stroke="#4A3F35" stroke-width="1" opacity="0.35"/>
  <!-- Title block separator line -->
  <line x1="${x0 - 8}" y1="${sepY}" x2="${x1 + 8}" y2="${sepY}"
        stroke="#4A3F35" stroke-width="1" opacity="0.5"/>
  <!-- Left: Graphical scale bar -->
  ${scaleBar}
  <!-- Centre: Drawing title (level 1 — largest, bold, tracked) -->
  <text x="${cx}" y="${blockY - 26}" text-anchor="middle"
        font-size="14" font-weight="700" fill="#111111" letter-spacing="3"
        font-family="'Helvetica Neue','Arial Narrow',Arial,sans-serif">${titleText}</text>
  <line x1="${cx - 54}" y1="${blockY - 16}" x2="${cx + 54}" y2="${blockY - 16}" stroke="#d8d0c8" stroke-width="0.5"/>
  <!-- Centre: Project data (level 2) -->
  <text x="${cx}" y="${blockY - 7}" text-anchor="middle"
        font-size="8.5" font-weight="400" fill="#666666" letter-spacing="0.8"
      font-family="'Helvetica Neue',Arial,sans-serif">${typeLabel}  ·  ${toFtIn(W)} / ${toCm(W)} cm WIDE  ·  ${toFtIn(unitH)} / ${toCm(unitH)} cm UNIT HT.  ·  ${D}" / ${toCm(D)} cm DEEP${H > unitH + 1 ? `  ·  ${toFtIn(H)} / ${toCm(H)} cm CLG.` : ''}</text>
  <!-- Centre: Meta info (level 3) -->
  <text x="${cx}" y="${blockY + 5}" text-anchor="middle"
        font-size="6.5" fill="#aaaaaa" letter-spacing="0.5"
        font-family="'Helvetica Neue',Arial,sans-serif">REV. A  ·  DATE ${dateStr}  ·  EL-01</text>
  <!-- Right: Brand mark -->
  <text x="${x1 + 8}" y="${blockY - 18}" text-anchor="end"
        font-size="12" font-weight="700" fill="#2e2e2e" letter-spacing="3"
        font-family="Georgia,'Times New Roman',serif">ALVÉO</text>
  <text x="${x1 + 8}" y="${blockY - 3}" text-anchor="end"
        font-size="7" fill="#aaaaaa" letter-spacing="1.2"
        font-family="'Helvetica Neue',Arial,sans-serif">Carved for you.</text>`;
  }

  private closetTypeLabel(): string {
    const map: Record<string, string> = {
      'reach-in':      'REACH-IN CLOSET',
      'wardrobe-wall': 'WARDROBE WALL',
      'walkin-single': 'SINGLE-WALL WALK-IN',
      'walkin-l':      'L-SHAPE WALK-IN',
      'walkin-u':      'U-SHAPE WALK-IN',
      'island':        'ISLAND WALK-IN',
      'corridor':      'CORRIDOR WALK-IN',
    };
    return map[this.layout.closetType ?? ''] ?? 'CLOSET ELEVATION';
  }

  // ── Placeholder (no zones yet) ────────────────────────────────────────────

  private renderPlaceholder(): string {
    return `<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg"
     style="width:100%;height:auto;display:block;background:#fafaf5;font-family:'Inter',Arial,sans-serif;">
  <rect x="60" y="40" width="580" height="300" fill="none" stroke="#d4c2a8"
        stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="350" y="186" text-anchor="middle" font-size="13" fill="#b5977a"
        font-weight="600" letter-spacing="2">COMPLETE ALL STEPS</text>
  <text x="350" y="204" text-anchor="middle" font-size="9" fill="#aaa">
    Your elevation drawing will appear here</text>
</svg>`;
  }
}
