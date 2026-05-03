import { ClosetLayout, ClosetZone, UserPreferences, LightingOptions, DoorType, RoomContext } from '@/types/closet';

interface RenderOptions {
  showDimensions: boolean;
  showLabels: boolean;
  style: UserPreferences['stylePreference'];
  woodFinish: UserPreferences['woodFinish'];
  hardwareFinish?: string;
  lighting?: LightingOptions;
  doorType?: DoorType;
  roomContext?: RoomContext;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert total inches → architectural feet-inches string: 96 → 8'-0" */
function toFtIn(totalInches: number): string {
  const in_ = Math.round(Math.abs(totalInches));
  const ft  = Math.floor(in_ / 12);
  const rem = in_ % 12;
  return rem === 0 ? `${ft}'-0"` : `${ft}'-${rem}"`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Safe positive height — returns 0 instead of negative */
function safeH(a: number, b: number): number {
  return Math.max(0, a - b);
}

// ─── Main Renderer ───────────────────────────────────────────────────────────

export class ClosetSVGRenderer {
  private layout: ClosetLayout;
  private options: RenderOptions;

  // Canvas margins (px)
  private readonly ML = 110;  // left  – dim chain space
  private readonly MR = 60;   // right – AFF annotations
  private MT         = 44;   // top   – increased for void zone
  private readonly MB = 98;   // bottom – dim lines + title block

  private scale: number;
  /** Effective drawing height — highest rendered content in the unit. */
  private drawH: number;

  constructor(layout: ClosetLayout, options: RenderOptions) {
    this.layout  = layout;
    this.options = options;
    this.drawH   = this.calcDrawHeight();
    this.scale   = this.calcScale();
    // Extend top margin when there is a significant void above the unit
    const _roomH  = layout.dimensions.height;
    const _voidIn = _roomH - this.drawH;
    if (_voidIn > 24) {
      this.MT = 44 + clamp(Math.round(_voidIn * this.scale * 0.5), 36, 90);
    }
  }

  // ── Effective draw height ─────────────────────────────────────────────────

  /**
   * Find the highest rendered element across all zones.
   * This gives us the "content height" used as the drawing frame height.
   * BUG-FIX: was only looking at rods; now also checks the zone top itself
   * to ensure the frame always covers the full storage unit.
   */
  private calcDrawHeight(): number {
    const roomH = this.layout.dimensions.height;
    let maxH = 0;

    for (const zone of this.layout.zones ?? []) {
      // The zone ceiling is a reliable upper bound for any content inside it
      const zoneCeiling = zone.y + zone.height;
      maxH = Math.max(maxH, zoneCeiling);

      // Hanging zones: rod shelf adds 1.5" above rod centre
      if (zone.rods?.length) {
        for (const rod of zone.rods) {
          maxH = Math.max(maxH, rod.height + 2);
        }
      }
      // Shelf zones: shelf positions are relative to zone.y
      if (zone.shelves?.length && zone.type === 'shoe-shelves') {
        for (const shelf of zone.shelves) {
          maxH = Math.max(maxH, zone.y + shelf.height + shelf.spacing + 2);
        }
      }
      // Drawer zones: topmost drawer face (position is absolute AFF)
      if (zone.drawers?.length) {
        for (const drawer of zone.drawers) {
          maxH = Math.max(maxH, drawer.position + drawer.height + 2);
        }
      }
    }

    if (maxH < 12) return roomH;
    // Add 8" breathing margin so the top panel is visible; never exceed room ceiling
    return Math.min(maxH + 8, roomH);
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  /** Closet-space X (inches from left) → SVG X */
  private cx(in_: number): number { return this.ML + in_ * this.scale; }

  /** Closet-space Y (inches from floor, 0=floor) → SVG Y (0=canvas top).
   *  Higher AFF → smaller SVG Y (higher on screen). */
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

  private get hardwareColor(): string {
    const h: Record<string, string> = {
      chrome:        '#b8b8b8',
      brass:         '#c5a55a',
      'matte-black': '#2c2c2c',
      nickel:        '#a8a8a4',
    };
    return h[this.options.hardwareFinish ?? 'chrome'] ?? '#4A4540';
  }

  // ── Public entry ──────────────────────────────────────────────────────────

  public renderElevation(): string {
    if (!this.layout.zones || this.layout.zones.length === 0) {
      return this.renderPlaceholder();
    }

    return [
      `<svg viewBox="0 0 ${this.totalW} ${this.totalH}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet"`,
      `     style="width:100%;height:auto;display:block;background:#f8f4ef;font-family:'Inter',Arial,sans-serif;">`,
      `<defs>`,
      this.defs(),
      `</defs>`,
      `<rect width="${this.totalW}" height="${this.totalH}" fill="#f8f4ef"/>`,
      this.renderRoomContext(),
      this.renderShell(),
      this.renderZoneContents(),
      this.renderTopShelf(),
      this.renderLighting(),
      this.renderDoors(),
      this.renderDimensions(),
      this.renderLabels(),
      this.renderTitleBlock(),
      `</svg>`,
    ].join('\n');
  }

  // ── SVG defs ──────────────────────────────────────────────────────────────

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
  <filter id="sh" x="-8%" y="-8%" width="120%" height="120%">
    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.12"/>
  </filter>
  <marker id="tick" viewBox="-4 -4 8 8" markerWidth="4" markerHeight="4"
          orient="auto" markerUnits="strokeWidth">
    <line x1="-3" y1="-3" x2="3" y2="3" stroke="#222" stroke-width="1.8" stroke-linecap="round"/>
  </marker>
  <pattern id="tsp" patternUnits="userSpaceOnUse" width="8" height="8">
    <rect width="8" height="8" fill="#f0ebe0"/>
    <line x1="0" y1="0" x2="8" y2="8" stroke="#ddd5c8" stroke-width="0.5" opacity="0.6"/>
  </pattern>
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
    const yTop   = this.cy(this.drawH);
    const yFloor = this.cy(0);
    const ph     = Math.max(this.scale * 0.75, 4);
    const yToe   = this.cy(3);   // 3" toe kick

    const roomH       = this.layout.dimensions.height;
    const isTruncated = roomH > this.drawH + 1;

    let continuationLine = '';
    if (isTruncated) {
      const yPanelTop = yTop - ph;
      const yVoidTop  = 14;
      const voidBandH = Math.max(0, yPanelTop - yVoidTop);
      const voidMidY  = yVoidTop + voidBandH / 2;
      const voidGapIn = roomH - this.drawH;
      const dimX      = x1 + 6;

      continuationLine = `
  <!-- ═══ VOID ZONE ═══ -->
  ${
    voidGapIn < 12
      ? `<rect x="${x0}" y="${yVoidTop}" width="${this.cW}" height="${voidBandH}"
        fill="#f0ece8" stroke="#d4cec8" stroke-width="0.5"/>
  <line x1="${x0 - 12}" y1="${yVoidTop}" x2="${x1 + 12}" y2="${yVoidTop}"
        stroke="#bbb" stroke-width="0.8" stroke-dasharray="6,3"/>
  <text x="${x0 + 8}" y="${yVoidTop + Math.max(voidBandH * 0.55, 7)}"
        font-size="6" fill="#b8b0a8" letter-spacing="0.8"
        font-family="'Helvetica Neue',Arial,sans-serif">INSTAL. TOLER. ${toFtIn(voidGapIn)}</text>`
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
  }`;
    }

    return `
  <!-- ═══ STRUCTURAL SHELL ═══ -->
  ${continuationLine}
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${Math.max(0, this.cH)}"
        fill="#f5f0eb" stroke="none"/>
  <!-- Top panel -->
  <rect x="${x0 - ph}" y="${yTop - ph}" width="${this.cW + 2 * ph}" height="${ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.4}"/>
  <!-- Left side panel -->
  <rect x="${x0 - ph}" y="${yTop - ph}" width="${ph}" height="${this.cH + ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.3}"/>
  <!-- Right side panel -->
  <rect x="${x1}" y="${yTop - ph}" width="${ph}" height="${this.cH + ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.3}"/>
  <!-- Toe kick -->
  <rect x="${x0}" y="${yToe}" width="${this.cW}" height="${Math.max(0, yFloor - yToe)}"
        fill="${this.wood.dark}" fill-opacity="0.55" stroke="none"/>
  <line x1="${x0}" y1="${yToe}" x2="${x1}" y2="${yToe}"
        stroke="${this.wood.edge}" stroke-width="1.2"/>
  <!-- Floor plinth -->
  <rect x="${x0 - ph}" y="${yFloor}" width="${this.cW + 2 * ph}" height="5"
        fill="${this.wood.dark}" stroke="${this.wood.dark}" stroke-width="1"/>
  <!-- Outer bounding box -->
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${Math.max(0, this.cH)}"
        fill="none" stroke="#1A1512" stroke-width="3.5" filter="url(#sh)"/>`;
  }

  // ── Full-width top shelf ──────────────────────────────────────────────────

  private renderTopShelf(): string {
    const x0   = this.cx(0);
    const yTop = this.cy(this.drawH);
    const sh   = Math.max(this.scale * 0.75, 3);

    return `
  <!-- ═══ TOP SHELF ═══ -->
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${x0}" y="${yTop + sh}" width="${this.cW}" height="3" fill="rgba(0,0,0,0.07)"/>`;
  }

  // ── Zone dispatch ─────────────────────────────────────────────────────────

  private renderZoneContents(): string {
    const zones = this.layout.zones;
    if (!zones.length) return '';

    let out = '\n  <!-- ═══ ZONES ═══ -->';

    // Inter-column vertical dividers
    const seenX    = new Set<number>();
    const dvThick  = Math.max(this.scale * 0.75, 3.5);
    for (const zone of zones) {
      if (zone.x <= 0 || seenX.has(zone.x)) continue;
      seenX.add(zone.x);
      const dvX = this.cx(zone.x);
      out += `
  <rect x="${dvX - dvThick / 2}" y="${this.cy(this.drawH)}" width="${dvThick}" height="${this.cH}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="1.2"/>
  <rect x="${dvX - dvThick / 2 + dvThick}" y="${this.cy(this.drawH)}" width="2" height="${this.cH}"
        fill="rgba(0,0,0,0.05)" stroke="none"/>`;
    }

    // Per-zone background tints — subtle hue shifts to distinguish zone types
    const ZONE_BG: Partial<Record<string, string>> = {
      'long-hang':    '#fdf8f0',  // warm amber-cream
      'double-hang':  '#f5f8fd',  // cool blue-white
      'drawers':      '#fdfaf3',  // warm honey
      'shoe-shelves': '#f8f5fd',  // pale lavender
      'top-shelves':  '#f4fdf8',  // pale mint
      'open-shelves': '#f2fdf6',  // pale sage
    };

    for (const zone of zones) {
      const zx = this.cx(zone.x);
      const zw = zone.width * this.scale;
      if (zw < 1) continue;

      // Draw zone tint fill before zone content
      const zoneBg = ZONE_BG[zone.type];
      if (zoneBg) {
        const zTop = this.cy(Math.min(zone.y + zone.height, this.drawH));
        const zBot = this.cy(Math.max(zone.y, 0));
        out += `\n  <rect x="${zx}" y="${zTop}" width="${zw}" height="${Math.max(0, zBot - zTop)}" fill="${zoneBg}" opacity="0.85"/>`;
      }

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
        case 'open-shelves':
          out += this.renderOpenShelvesZone(zone, zx, zw);
          break;
      }
    }

    return out;
  }

  // ── Hanging zone ──────────────────────────────────────────────────────────

  private renderHangZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.rods?.length) return '';

    const sh  = Math.max(this.scale * 0.75, 3);
    let out   = `\n  <!-- hang: ${zone.type} x=${zone.x} -->`;

    // Sort rods bottom → top
    const rods     = [...zone.rods].sort((a, b) => a.height - b.height);
    const zoneTop  = Math.min(zone.y + zone.height, this.drawH);

    for (let ri = 0; ri < rods.length; ri++) {
      const rod    = rods[ri];
      const rodAFF = rod.height;
      if (rodAFF <= 0 || rodAFF > this.drawH) continue;
      const rodY = this.cy(rodAFF);
      const pad  = clamp(zw * 0.06, 6, 14);

      // Shelf sits 1.5" above rod centre
      const rodShelfTopAFF = rodAFF + 1.5;
      // Upper bound for the clear space above this rod's shelf:
      // either the next rod's shelf, or the unit top (capped at drawH)
      const upperBoundAFF = ri + 1 < rods.length
        ? rods[ri + 1].height + 1.5
        : Math.min(zoneTop, this.drawH);

      // ── shelf panel directly above rod ───────────────────────────────────
      const shelfY = this.cy(rodShelfTopAFF);
      out += `
  <rect x="${zx}" y="${shelfY}" width="${zw}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${zx}" y="${shelfY + sh}" width="${zw}" height="3" fill="rgba(0,0,0,0.06)"/>`;

      // ── intermediate shelves in the clear space above rod shelf ───────────
      // Long-hang zones must remain clear floor-to-rod — no intermediate shelves
      const openSpaceIn = safeH(upperBoundAFF, rodShelfTopAFF);
      if (zone.type !== 'long-hang' && openSpaceIn > 18) {
        const divs         = Math.max(1, Math.floor(openSpaceIn / 15));
        const shelfSpacing = openSpaceIn / divs;
        let sAFF           = rodShelfTopAFF + shelfSpacing;
        let guard          = 0;
        while (sAFF + 2 < upperBoundAFF - 2 && guard < 20) {
          const sy = this.cy(sAFF);
          out += `
  <rect x="${zx}" y="${sy}" width="${zw}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1" opacity="0.75"/>
  <rect x="${zx}" y="${sy + sh}" width="${zw}" height="2" fill="rgba(0,0,0,0.04)"/>`;
          sAFF += shelfSpacing;
          guard++;
        }
      }

      // ── rod (dashed hidden line) ──────────────────────────────────────────
      const rodStroke = clamp(this.scale * 0.18, 1.2, 2.2);
      out += `
  <line x1="${zx + pad}" y1="${rodY}" x2="${zx + zw - pad}" y2="${rodY}"
        stroke="#4A4540" stroke-width="${rodStroke}" stroke-linecap="round"
        stroke-dasharray="8,5"/>
  <circle cx="${zx + pad}"      cy="${rodY}" r="${clamp(rodStroke + 0.3, 1.5, 2.8)}" fill="#4A4540" stroke="none"/>
  <circle cx="${zx + zw - pad}" cy="${rodY}" r="${clamp(rodStroke + 0.3, 1.5, 2.8)}" fill="#4A4540" stroke="none"/>`;

      // ── garment silhouettes ────────────────────────────────────────────────
      const isLong    = zone.type === 'long-hang';
      // Floor of the hanging space for this rod: above previous rod shelf, or zone bottom
      const zoneFloorAFF = ri === 0 ? zone.y : rods[ri - 1].height + 1.5;
      const gInches      = isLong
        ? clamp(rodAFF - zoneFloorAFF - 2, 20, 60)
        : 26;
      // garment pixel height — but never extend below the rod's floor
      const floorY        = this.cy(zoneFloorAFF);
      const maxGarmentPx  = safeH(floorY, rodY);
      const gPx           = clamp(gInches * this.scale, 0, maxGarmentPx * 0.90);
      if (gPx < 4) continue; // skip silhouettes if too small

      const hookH   = clamp(this.scale * 1.2, 4, 9);
      const count   = clamp(Math.floor((zw - pad * 2) / Math.max(this.scale * 2.2, 7)), 3, 14);
      const spacing = (zw - pad * 2) / (count + 1);
      const gw      = isLong ? clamp(this.scale * 2.2, 6, 15) : clamp(this.scale * 2.8, 7, 18);
      const gwBot   = isLong ? gw * 1.18 : gw * 0.88;

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
          out += shape === 1
            ? `<path d="M${gx - gw * 1.08 * 0.5},${ty} L${gx - gw * 0.4},${by} L${gx + gw * 0.4},${by} L${gx + gw * 1.08 * 0.5},${ty} Z"
        fill="${fCol}" fill-opacity="${fOp}" stroke="#999" stroke-width="0.8"/>`
            : `<path d="M${gx - gw * 0.5},${ty} L${gx - gwBot * 0.5},${by} L${gx + gwBot * 0.5},${by} L${gx + gw * 0.5},${ty} Z"
        fill="${fCol}" fill-opacity="${fOp}" stroke="#999" stroke-width="0.8"/>`;
        } else {
          const mid = ty + (by - ty) * 0.28;
          out += shape === 1
            ? `<path d="M${gx - gw * 1.1 * 0.5},${ty} L${gx - gw * 1.1 * 0.52},${mid} L${gx - gwBot * 0.36},${by} L${gx + gwBot * 0.36},${by} L${gx + gw * 1.1 * 0.52},${mid} L${gx + gw * 1.1 * 0.5},${ty} Z"
        fill="${fCol}" fill-opacity="${fOp}" stroke="#999" stroke-width="0.8"/>`
            : `<path d="M${gx - gw * 0.5},${ty} L${gx - gw * 0.58},${mid} L${gx - gwBot * 0.42},${by} L${gx + gwBot * 0.42},${by} L${gx + gw * 0.58},${mid} L${gx + gw * 0.5},${ty} Z"
        fill="${fCol}" fill-opacity="${fOp}" stroke="#999" stroke-width="0.8"/>`;
        }
      }
    }

    return out;
  }

  // ── Drawer zone ───────────────────────────────────────────────────────────

  private renderDrawerZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.drawers?.length) return '';

    let out = `\n  <!-- drawers x=${zone.x} -->`;
    const pad = Math.max(this.scale * 0.75, 3);

    for (const drawer of zone.drawers) {
      // drawer.position is absolute AFF; drawer faces open upward from position to position+height
      const svgTop  = this.cy(drawer.position + drawer.height);  // higher AFF → lower SVG Y (top of face)
      const svgBot  = this.cy(drawer.position);                   // lower AFF → higher SVG Y (bottom of face)
      const drawerH = safeH(svgBot, svgTop);
      if (drawerH < 1) continue;

      const midY = svgTop + drawerH / 2;
      const midX = zx + zw / 2;

      out += `
  <rect x="${zx + pad}" y="${svgTop + 1.5}" width="${Math.max(0, zw - 2 * pad)}" height="${Math.max(0, drawerH - 3)}"
        fill="url(#df)" stroke="${this.wood.edge}" stroke-width="1.5" rx="1.5"/>
  <line x1="${zx}" y1="${svgTop}" x2="${zx + zw}" y2="${svgTop}"
        stroke="${this.wood.edge}" stroke-width="1"/>`;

      if (drawerH > 10) {
        const barW = clamp(zw * 0.36, 12, 38);
        const barH = clamp(drawerH * 0.11, 2.5, 5);
        out += `
  <rect x="${midX - barW / 2}" y="${midY - barH / 2}" width="${barW}" height="${barH}"
        fill="${this.hardwareColor}" stroke="${this.hardwareColor}" stroke-width="0.5" rx="${barH / 2}"/>
  <rect x="${midX - barW / 2 + 3}" y="${midY - barH / 2 - 1.5}" width="${barW - 6}" height="${barH * 0.4}"
        fill="none" stroke="#fff" stroke-width="0.6" rx="1" opacity="0.4"/>`;
      }

      if (drawer.purpose !== 'folded' && drawerH > 14) {
        out += `\n  <text x="${midX}" y="${svgTop + clamp(drawerH * 0.25, 8, 14)}" text-anchor="middle" font-size="6" fill="${this.wood.dark}" opacity="0.65" letter-spacing="0.9" font-family="'Helvetica Neue',Arial,sans-serif">${drawer.purpose.toUpperCase()}</text>`;
      }
    }

    // EQ labels between consecutive equal-height drawers
    const sorted = [...zone.drawers].sort((a, b) => a.position - b.position);
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      if (Math.abs(curr.height - next.height) < 1) {
        const eqSvgY = this.cy(curr.position + curr.height);
        const eqX    = zx + zw / 2;
        out += `
  <rect x="${eqX - 7}" y="${eqSvgY - 4.5}" width="14" height="7" fill="#fafaf5" rx="2"/>
  <text x="${eqX}" y="${eqSvgY - 1}" text-anchor="middle" dominant-baseline="central"
        font-size="5" fill="${this.wood.dark}" opacity="0.55" letter-spacing="0.3"
        font-family="'Helvetica Neue',Arial,sans-serif">EQ</text>`;
      }
    }

    if (zone.valetRod) out += this.renderValetRod(zone, zx, zw);

    return out;
  }

  // ── Shoe-shelf zone ───────────────────────────────────────────────────────
  /**
   * CRITICAL COORDINATE FIX:
   * Shelf heights are stored RELATIVE to zone.y (absolute AFF = zone.y + shelf.height).
   * Shelves are ordered bottom → top (ascending relative height, index 0 = lowest shelf).
   *
   * In SVG coordinates, higher AFF → smaller Y (higher on screen).
   * The BAY where shoes sit is ABOVE each shelf board, i.e.:
   *   - Bay top (SVG) = bottom surface of the NEXT shelf board
   *                   = cy(zone.y + nextShelf.height) + shelfThickness
   *   - Bay bottom (SVG) = top surface of the CURRENT shelf board
   *                      = cy(zone.y + shelf.height)
   *   - bayH = bayBotY - bayTopY  (must be positive)
   *
   * Previous code had these reversed, producing negative bayH and invisible bays.
   */
  private renderShoeZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.shelves?.length) return '';

    let out = `\n  <!-- shoes x=${zone.x} -->`;
    const sh = Math.max(this.scale * 0.75, 3); // shelf thickness in px

    const bayFill: Record<string, string> = {
      boots:    'rgba(180,160,130,0.07)',
      heels:    'rgba(160,140,120,0.06)',
      sneakers: 'rgba(140,160,140,0.06)',
      flats:    'rgba(140,140,160,0.05)',
    };

    // Zone top in AFF coordinates
    const zoneTopAFF = zone.y + zone.height;

    for (let i = 0; i < zone.shelves.length; i++) {
      const shelf = zone.shelves[i];
      // Absolute AFF of this shelf's top surface
      const shelfAFF = zone.y + shelf.height;
      // SVG Y of the shelf board top surface (shelf's top edge, where shoes rest upon it)
      const shelfBoardTopY = this.cy(shelfAFF);
      // SVG Y of the shelf board bottom surface (bottom of the board)
      const shelfBoardBotY = shelfBoardTopY + sh;

      // Draw the shelf board
      const tilt = Math.min(zw * 0.025, 3);
      out += `
  <polygon
    points="${zx},${shelfBoardTopY + tilt + sh}  ${zx + zw},${shelfBoardTopY + sh}  ${zx + zw},${shelfBoardTopY}  ${zx},${shelfBoardTopY + tilt}"
    fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.2"/>
  <polygon
    points="${zx},${shelfBoardTopY + tilt + sh + 2.5}  ${zx + zw},${shelfBoardTopY + sh + 2.5}  ${zx + zw},${shelfBoardTopY + sh}  ${zx},${shelfBoardTopY + tilt + sh}"
    fill="rgba(0,0,0,0.05)" stroke="none"/>`;

      // ── BAY: the clear space ABOVE this shelf board where shoes sit ─────────
      // Bay extends from the top of this shelf board UP to the bottom of the next shelf board
      // (or to the zone top if this is the last shelf).
      const nextShelfAFF = i + 1 < zone.shelves.length
        ? zone.y + zone.shelves[i + 1].height
        : zoneTopAFF;  // top of zone in AFF coordinates

      // In SVG: bayTopY (higher on screen, smaller Y) = next shelf's top surface
      //         bayBotY (lower on screen, larger Y)   = this shelf's board bottom
      const bayTopY = this.cy(nextShelfAFF); // SVG Y of next shelf top (or zone top) — smaller number
      const bayBotY = shelfBoardBotY;        // just below this shelf board — larger number
      const bayH    = safeH(bayBotY, bayTopY); // must be ≥ 0

      if (bayH > 1) {
        out += `
  <rect x="${zx}" y="${bayTopY}" width="${zw}" height="${bayH}"
        fill="${bayFill[shelf.purpose] ?? 'rgba(160,150,130,0.05)'}" stroke="none"/>`;
      }

      // ── Shoe silhouettes in the bay ────────────────────────────────────────
      const pairCount = shelf.count;
      const silhH     = clamp(bayH * 0.62, 4, 34);
      const silhY     = bayTopY + bayH * 0.12;  // a little below bay top
      const slotW     = bayH > 6 ? (zw - 8) / Math.max(pairCount, 1) : 0;

      if (slotW > 4 && bayH > 8) {
        for (let p = 0; p < pairCount; p++) {
          const sx = zx + 4 + p * slotW + slotW / 2;
          const sw = clamp(slotW * 0.6, 3, 14);

          if (shelf.purpose === 'boots') {
            const bw = clamp(sw * 0.55, 2, 7);
            out += `
  <rect x="${sx - bw / 2}" y="${silhY}" width="${bw}" height="${silhH}"
        fill="none" stroke="#9a8878" stroke-width="0.9" rx="1.5" opacity="0.75"/>
  <line x1="${sx - bw / 2}" y1="${silhY + silhH * 0.72}" x2="${sx + bw / 2}" y2="${silhY + silhH * 0.72}"
        stroke="#9a8878" stroke-width="0.6" opacity="0.6"/>`;
          } else if (shelf.purpose === 'heels') {
            const hw = clamp(sw * 0.7, 2, 8);
            const hh = clamp(silhH * 0.55, 3, 12);
            out += `
  <path d="M${sx - hw * 0.5},${silhY + hh} Q${sx},${silhY + hh * 0.6} ${sx + hw * 0.5},${silhY + hh}"
        fill="none" stroke="#9a8878" stroke-width="0.9" opacity="0.75"/>
  <line x1="${sx - hw * 0.4}" y1="${silhY + hh}" x2="${sx - hw * 0.5}" y2="${silhY + hh + clamp(silhH * 0.3, 2, 7)}"
        stroke="#9a8878" stroke-width="0.8" opacity="0.6"/>`;
          } else if (shelf.purpose === 'sneakers') {
            const snw = clamp(sw * 0.85, 3, 11);
            const snh = clamp(silhH * 0.45, 3, 10);
            out += `
  <ellipse cx="${sx}" cy="${silhY + snh / 2}" rx="${snw / 2}" ry="${snh / 2}"
           fill="none" stroke="#9a8878" stroke-width="0.9" opacity="0.75"/>
  <rect x="${sx - snw / 2}" y="${silhY + snh * 0.6}" width="${snw}" height="${snh * 0.3}"
        fill="#9a8878" fill-opacity="0.2" stroke="none" rx="1"/>`;
          } else {
            const flw = clamp(sw * 0.9, 3, 12);
            const flh = clamp(silhH * 0.32, 2, 7);
            out += `
  <ellipse cx="${sx}" cy="${silhY + flh / 2}" rx="${flw / 2}" ry="${flh / 2}"
           fill="none" stroke="#9a8878" stroke-width="0.9" opacity="0.75"/>`;
          }
        }
      }

      // ── Shoe type label in bay ─────────────────────────────────────────────
      if (shelf.purpose && bayH > 14) {
        const cap      = shelf.purpose.toUpperCase();
        const labelY   = bayTopY + bayH * 0.78;
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
    const zoneTopY = this.cy(zone.y + zone.height);
    const zoneBotY = this.cy(zone.y);
    const sh       = Math.max(this.scale * 0.75, 3);
    const zoneH    = safeH(zoneBotY, zoneTopY);

    let out = `\n  <!-- shelves x=${zone.x} -->`;

    out += `
  <rect x="${zx}" y="${zoneTopY}" width="${zw}" height="${zoneH}"
        fill="url(#tsp)" stroke="none" opacity="0.6"/>`;

    const zoneMid = zoneTopY + zoneH / 2;
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

  // ── Open-shelves zone ─────────────────────────────────────────────────────

  private renderOpenShelvesZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.shelves?.length) return '';

    const zoneTopY = this.cy(zone.y + zone.height);
    const zoneBotY = this.cy(zone.y);
    const sh       = Math.max(this.scale * 0.75, 3);
    const zoneH    = safeH(zoneBotY, zoneTopY);

    let out = `\n  <!-- open-shelves x=${zone.x} -->`;

    // Zone background
    out += `
  <rect x="${zx}" y="${zoneTopY}" width="${zw}" height="${zoneH}"
        fill="url(#df)" stroke="none" opacity="0.4"/>`;

    for (let i = 0; i < zone.shelves.length; i++) {
      const shelf = zone.shelves[i];
      const sy    = this.cy(zone.y + shelf.height);

      // Shelf board
      out += `
  <rect x="${zx}" y="${sy}" width="${zw}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${zx}" y="${sy + sh}" width="${zw}" height="2.5" fill="rgba(0,0,0,0.06)"/>`;

      // Bay above this shelf (up to next shelf or zone top)
      const nextRelH  = i + 1 < zone.shelves.length
        ? zone.shelves[i + 1].height
        : zone.height;
      const bayTopY   = this.cy(zone.y + nextRelH);
      const bayBotY   = sy;
      const bayH      = safeH(bayBotY, bayTopY);

      // Folded-item stack silhouettes in the bay
      if (bayH > 8) {
        const stackH  = clamp(bayH * 0.55, 4, 18);
        const stackW  = clamp(zw * 0.18, 8, 24);
        const stackY  = bayTopY + bayH * 0.22;
        const slots   = clamp(Math.floor((zw - 12) / (stackW + 4)), 1, 5);
        const spacing = (zw - 12) / Math.max(slots, 1);

        for (let s = 0; s < slots; s++) {
          const sx = zx + 6 + s * spacing + stackW * 0.5;
          // Two stacked rectangles simulate folded clothing
          out += `
  <rect x="${sx - stackW / 2}" y="${stackY}" width="${stackW}" height="${stackH * 0.42}"
        fill="${this.wood.bg}" stroke="${this.wood.edge}" stroke-width="0.8" rx="1" opacity="0.75"/>
  <rect x="${sx - stackW / 2 + 1}" y="${stackY + stackH * 0.42 + 1.5}" width="${stackW - 2}" height="${stackH * 0.38}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="0.8" rx="1" opacity="0.65"/>`;
        }
      }
    }

    if (zone.valetRod) out += this.renderValetRod(zone, zx, zw);

    return out;
  }

  // ── Valet rod ─────────────────────────────────────────────────────────────

  /**
   * Draws a pull-out valet rod symbol at the top of a drawer / open-shelves
   * zone.  The rod projects from the right edge of the column with two small
   * garment silhouettes hanging from it, plus a "VALET ROD" label.
   */
  private renderValetRod(zone: ClosetZone, zx: number, zw: number): string {
    // Mount point: top of zone, right edge
    const mountAFF = zone.y + zone.height;
    const mountY   = this.cy(mountAFF);
    const mountX   = zx + zw;

    // Rod extends rightward; keep it proportional but visible
    const rodLen = clamp(zw * 0.40, 22, 38);
    const hw     = this.hardwareColor;
    const txtCol = this.wood.dark;

    let out = '\n  <!-- ── valet rod ── -->';

    // Bracket plate flush with the right panel face
    out += `
  <rect x="${mountX - 2.5}" y="${mountY - 9}" width="4" height="18"
        fill="${hw}" rx="1.5" opacity="0.92"/>`;

    // Horizontal pull-out rod (solid near bracket, dashed extension hint)
    const solidEnd = mountX + rodLen * 0.55;
    out += `
  <line x1="${mountX}" y1="${mountY}" x2="${solidEnd}" y2="${mountY}"
        stroke="${hw}" stroke-width="3" stroke-linecap="round"/>
  <line x1="${solidEnd}" y1="${mountY}" x2="${mountX + rodLen}" y2="${mountY}"
        stroke="${hw}" stroke-width="1.8" stroke-dasharray="3,2.5" stroke-linecap="round" opacity="0.55"/>`;

    // End-cap ball
    out += `
  <circle cx="${mountX + rodLen}" cy="${mountY}" r="2.6" fill="${hw}"/>`;

    // Two mini garment silhouettes hanging from the rod
    const hookH = 5;
    const gH    = clamp(11 * this.scale, 11, 19);
    const gW    = clamp(3.2 * this.scale, 5, 9);
    const gCols = ['#f0ede8', '#e5e0da'] as const;

    for (let gi = 0; gi < 2; gi++) {
      const gx  = mountX + rodLen * (gi === 0 ? 0.28 : 0.62);
      const col = gCols[gi];

      // Hanger wire
      out += `
  <polyline points="${gx},${mountY} ${gx - gW * 0.55},${mountY + hookH} ${gx + gW * 0.55},${mountY + hookH}"
            fill="none" stroke="#888" stroke-width="0.9" stroke-linejoin="round"/>
  <circle cx="${gx}" cy="${mountY}" r="1.3" fill="none" stroke="#888" stroke-width="0.75"/>`;

      // Garment body (simple trapezoid)
      out += `
  <path d="M${gx - gW * 0.55},${mountY + hookH} L${gx - gW},${mountY + hookH + gH} L${gx + gW},${mountY + hookH + gH} L${gx + gW * 0.55},${mountY + hookH} Z"
        fill="${col}" fill-opacity="0.80" stroke="#9a9090" stroke-width="0.55"/>`;
    }

    // "VALET ROD" label above the rod
    out += `
  <text x="${mountX + rodLen * 0.5}" y="${mountY - 13}"
        text-anchor="middle" font-size="5.5" fill="${txtCol}" opacity="0.60"
        font-family="'Helvetica Neue',Arial,sans-serif" letter-spacing="0.8">VALET ROD</text>`;

    return out;
  }

  // ── Dimension lines ───────────────────────────────────────────────────────

  private renderDimensions(): string {
    if (!this.options.showDimensions) return '';

    const W      = this.layout.dimensions.width;
    const H      = this.drawH;
    const roomH  = this.layout.dimensions.height;
    const x0     = this.cx(0);
    const x1     = this.cx(W);
    const yTop   = this.cy(H);
    const yFloor = this.cy(0);

    let out = '\n  <!-- ═══ DIMENSIONS ═══ -->';

    // ── Overall height — left vertical chain ──────────────────────────────
    const vdX = x0 - 46;
    out += this.extLine('v', x0 - 2, yTop,   vdX + 5, 3);
    out += this.extLine('v', x0 - 2, yFloor, vdX + 5, 3);
    out += this.dimLineV(vdX, yTop, yFloor, toFtIn(H));

    // Interior height note
    const TOE_DIM_H = 3;
    const yToeNote  = this.cy(TOE_DIM_H);
    const noteX     = x0 - 62;
    const noteMid   = (yTop + yToeNote) / 2;
    out += `
  <text x="${noteX}" y="${noteMid}" text-anchor="middle" dominant-baseline="central"
        font-size="5.5" fill="#c8c0b8" letter-spacing="1"
        font-family="'Helvetica Neue',Arial,sans-serif"
        transform="rotate(-90 ${noteX} ${noteMid})">INT. HT. ${toFtIn(H - TOE_DIM_H)}</text>`;

    // ── Per-zone heights on RIGHT vertical chain ───────────────────────────
    const vdRX  = x1 + 46;
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
    const seenZX    = new Set<number>();
    for (const zone of this.layout.zones) {
      const za = this.cx(zone.x);
      const zb = this.cx(zone.x + zone.width);
      out += this.dimLineH(za, zb, hdY_inner, toFtIn(zone.width));
      if (zone.x > 0 && !seenZX.has(zone.x)) {
        seenZX.add(zone.x);
        out += this.extLine('h', za, yFloor + 2, hdY_inner + 5, 3);
      }
    }
    out += this.extLine('h', x0, yFloor + 2, hdY_inner + 5, 3);
    out += this.extLine('h', x1, yFloor + 2, hdY_inner + 5, 3);

    // ── AFF annotations (right side leader style) ─────────────────────────
    const rx           = x1 + 12;
    const isTruncated  = roomH > H + 1;
    if (isTruncated) {
      const yCeiling = 14;
      out += `
  <line x1="${rx - 6}" y1="${yCeiling}" x2="${rx + 4}" y2="${yCeiling}" stroke="#888" stroke-width="0.9"/>
  <text x="${rx + 6}" y="${yCeiling + 9}" font-size="7" font-weight="500" fill="#666"
        font-family="'Helvetica Neue',Arial,sans-serif">+${toFtIn(roomH)} A.F. ROOM CLG.</text>
  <text x="${rx + 6}" y="${yCeiling + 20}" font-size="6.5" fill="#888"
        font-family="'Helvetica Neue',Arial,sans-serif">UNIT HT. ${toFtIn(H)}</text>`;
      out += this.affAnnotation(rx, yTop, `+${toFtIn(H)} A.F.F.`, 'T.O. UNIT', true);
    } else {
      out += this.affAnnotation(rx, yTop, `+${toFtIn(H)} A.F.F.`, 'T.O. CEILING', true);
    }
    out += this.affAnnotation(rx, yFloor, `+0'-0" A.F.F.`, 'FINISH FLOOR', false);
    out += this.affAnnotation(rx, this.cy(3), `+3" A.F.F.`, 'TOE KICK', true);

    // Rod AFF annotations
    const seenRod = new Set<number>();
    for (const zone of this.layout.zones) {
      if (!zone.rods) continue;
      for (const rod of zone.rods) {
        const k = Math.round(rod.height);
        if (seenRod.has(k)) continue;
        seenRod.add(k);
        out += this.affAnnotation(rx, this.cy(rod.height), `${toFtIn(k)} A.F.F.`, rod.purpose.toUpperCase(), false);
      }
    }

    // ── Shoe shelf spacing — small internal dims ───────────────────────────
    for (const zone of this.layout.zones) {
      if (zone.type !== 'shoe-shelves' || !zone.shelves?.length) continue;
      const shoeRX     = this.cx(zone.x + zone.width) + 4;
      const zoneTopAFF = zone.y + zone.height;

      for (let i = 0; i < zone.shelves.length; i++) {
        const shelf     = zone.shelves[i];
        const nextAFF   = i + 1 < zone.shelves.length
          ? zone.y + zone.shelves[i + 1].height
          : zoneTopAFF;
        const bayInches = nextAFF - (zone.y + shelf.height);
        if (bayInches <= 0) continue;

        // SVG Y of the bay top and bottom (for dimension tick marks)
        const sy1 = this.cy(nextAFF);             // bay top (higher AFF → smaller SVG Y)
        const sy2 = this.cy(zone.y + shelf.height) + Math.max(this.scale * 0.75, 3); // bay bottom (just below shelf board)
        const dimH = safeH(sy2, sy1);

        if (dimH > 12) {
          out += `
  <line x1="${shoeRX}" y1="${sy1}" x2="${shoeRX + 16}" y2="${sy1}" stroke="#bbb" stroke-width="0.5"/>
  <line x1="${shoeRX}" y1="${sy2}" x2="${shoeRX + 16}" y2="${sy2}" stroke="#bbb" stroke-width="0.5"/>
  <line x1="${shoeRX + 8}" y1="${sy1}" x2="${shoeRX + 8}" y2="${sy2}" stroke="#999" stroke-width="0.6"/>
  <text x="${shoeRX + 10}" y="${sy1 + dimH / 2}" dominant-baseline="central"
        font-size="6" fill="#888" font-family="'Helvetica Neue',Arial,sans-serif">${toFtIn(bayInches)}</text>`;
        }
      }
    }

    return out;
  }

  private extLine(dir: 'h' | 'v', fromCoord: number, perpCoord: number, toCoord: number, overshoot: number): string {
    const gap = 3;
    if (dir === 'h') {
      const y1 = perpCoord + (toCoord > perpCoord ? gap : -gap);
      const y2 = toCoord   + (toCoord > perpCoord ? overshoot : -overshoot);
      return `\n  <line x1="${fromCoord}" y1="${y1}" x2="${fromCoord}" y2="${y2}" stroke="#5A5550" stroke-width="0.6"/>`;
    } else {
      const x1 = perpCoord + (toCoord > perpCoord ? gap : -gap);
      const x2 = toCoord   + (toCoord > perpCoord ? overshoot : -overshoot);
      return `\n  <line x1="${x1}" y1="${fromCoord}" x2="${x2}" y2="${fromCoord}" stroke="#5A5550" stroke-width="0.6"/>`;
    }
  }

  private dimLineH(x1: number, x2: number, y: number, text: string): string {
    const mx = (x1 + x2) / 2;
    const tw = text.length * 5 + 8;
    const tk = 4.5;
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
      'open-shelves': 'OPEN SHELVES',
      'top-shelves':  'SHELF',
      'accessories':  'ACCESSORIES',
    };

    let out = '\n  <!-- ═══ LABELS ═══ -->';

    for (const zone of this.layout.zones) {
      if (zone.type === 'top-shelves') continue;

      const zcx        = this.cx(zone.x + zone.width / 2);
      const zw         = zone.width * this.scale;
      const clampedTop = Math.min(zone.y + zone.height, this.drawH);
      const clampedBot = Math.max(zone.y, 0);
      const zTopY      = this.cy(clampedTop);
      const zBotY      = this.cy(clampedBot);
      const zoneH      = safeH(zBotY, zTopY);
      if (zoneH < 20) continue;

      // For hanging zones, centre label within the actual hanging area
      let labelY = zTopY + zoneH / 2;
      if ((zone.type === 'long-hang' || zone.type === 'double-hang') && zone.rods?.length) {
        const sortedRods = [...zone.rods].sort((a, b) => a.height - b.height);
        if (zone.type === 'long-hang') {
          labelY = this.cy((clampedBot + sortedRods[0].height) / 2);
        } else {
          const lowerRod = sortedRods[0].height;
          const upperRod = sortedRods[sortedRods.length - 1].height;
          labelY = this.cy((lowerRod + upperRod) / 2);
        }
      }

      const mainLabel = MAIN[zone.type] ?? zone.type.toUpperCase();
      const fsMain    = clamp(Math.min(zw / (mainLabel.length * 1.1), 10), 6.5, 10);

      out += `
  <text x="${zcx}" y="${labelY}" text-anchor="middle" dominant-baseline="central"
        font-size="${fsMain}" font-weight="400" fill="#3D2B1F" letter-spacing="0.18em"
        font-family="'Helvetica Neue','Arial Narrow',Arial,sans-serif">${mainLabel}</text>`;

      if (zone.contentLabel && zoneH > 50) {
        const allParts  = zone.contentLabel.split(' · ');
        const line1     = allParts.slice(0, 3).join('  ·  ');
        const line2     = allParts.length > 3 ? allParts.slice(3, 6).join('  ·  ') : null;
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
    const unitH   = this.drawH;
    const toCm    = (inches: number) => Math.round(inches * 2.54);

    const wall      = this.layout.walls?.[0];
    const elevRef   = wall?.elevationRef ?? 'EL-A';
    const wallLabel = wall?.label        ?? 'BACK WALL';
    const typeLabel = this.closetTypeLabel();
    const titleText = `${elevRef} — ${wallLabel}`;

    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

    // Graphical scale bar
    const ftPx     = 12 * this.scale;
    const barUnits = [1, 2, 3, 5, 10, 20];
    const barFt    = barUnits.find(u => u * ftPx >= 20) ?? 20;
    const barW     = ftPx * barFt;
    const barX     = x0;
    const barY     = blockY - 8;
    const barH     = 5;
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
  <rect x="12" y="12" width="${this.totalW - 24}" height="${this.totalH - 24}"
        fill="none" stroke="#4A3F35" stroke-width="1" opacity="0.35"/>
  <line x1="${x0 - 8}" y1="${sepY}" x2="${x1 + 8}" y2="${sepY}"
        stroke="#4A3F35" stroke-width="1" opacity="0.5"/>
  ${scaleBar}
  <text x="${cx}" y="${blockY - 26}" text-anchor="middle"
        font-size="14" font-weight="700" fill="#111111" letter-spacing="3"
        font-family="'Helvetica Neue','Arial Narrow',Arial,sans-serif">${titleText}</text>
  <line x1="${cx - 54}" y1="${blockY - 16}" x2="${cx + 54}" y2="${blockY - 16}" stroke="#d8d0c8" stroke-width="0.5"/>
  <text x="${cx}" y="${blockY - 7}" text-anchor="middle"
        font-size="8.5" font-weight="400" fill="#666666" letter-spacing="0.8"
        font-family="'Helvetica Neue',Arial,sans-serif">${typeLabel}  ·  ${toFtIn(W)} / ${toCm(W)} cm WIDE  ·  ${toFtIn(unitH)} / ${toCm(unitH)} cm UNIT HT.  ·  ${D}" / ${toCm(D)} cm DEEP${H > unitH + 1 ? `  ·  ${toFtIn(H)} / ${toCm(H)} cm CLG.` : ''}</text>
  <text x="${cx}" y="${blockY + 5}" text-anchor="middle"
        font-size="6.5" fill="#aaaaaa" letter-spacing="0.5"
        font-family="'Helvetica Neue',Arial,sans-serif">REV. A  ·  DATE ${dateStr}  ·  EL-01</text>
  <text x="${x1 + 8}" y="${blockY - 18}" text-anchor="end"
        font-size="12" font-weight="700" fill="#2e2e2e" letter-spacing="3"
        font-family="Georgia,'Times New Roman',serif">ALVÉO</text>
  <text x="${x1 + 8}" y="${blockY - 3}" text-anchor="end"
        font-size="7" fill="#aaaaaa" letter-spacing="1.2"
        font-family="'Helvetica Neue',Arial,sans-serif">Carved for you.</text>`;
  }

  // ── Room context (wall colour + floor strip) ─────────────────────────────

  private renderRoomContext(): string {
    const rc = this.options.roomContext;
    if (!rc?.wallColor && !rc?.floorType) return '';

    let out = '\n  <!-- ═══ ROOM CONTEXT ═══ -->';

    if (rc?.wallColor) {
      out += `
  <rect x="${this.cx(0)}" y="${this.cy(this.drawH)}" width="${this.cW}" height="${this.cH}"
        fill="${rc.wallColor}" opacity="0.14"/>`;
    }

    const floorFill: Record<string, string> = {
      hardwood:    '#c8a870',
      herringbone: '#c4a86c',
      marble:      '#e8e0d8',
      carpet:      '#d4c4b8',
      tile:        '#d8d8d4',
    };

    if (rc?.floorType && floorFill[rc.floorType]) {
      const fy  = this.cy(0);
      const fh  = Math.min(22, this.MB * 0.36);
      const col = floorFill[rc.floorType];
      out += `
  <rect x="${this.cx(0)}" y="${fy}" width="${this.cW}" height="${fh}"
        fill="${col}" opacity="0.75"/>`;
      if (rc.floorType === 'hardwood' || rc.floorType === 'herringbone') {
        for (let lx = 0; lx <= this.layout.dimensions.width; lx += 12) {
          out += `<line x1="${this.cx(lx)}" y1="${fy}" x2="${this.cx(lx)}" y2="${fy + fh}" stroke="rgba(0,0,0,0.09)" stroke-width="0.5"/>`;
        }
      } else if (rc.floorType === 'tile') {
        for (let lx = 0; lx <= this.layout.dimensions.width; lx += 12) {
          out += `<line x1="${this.cx(lx)}" y1="${fy}" x2="${this.cx(lx)}" y2="${fy + fh}" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>`;
        }
      }
      const typeLbl = rc.floorType.replace('-', ' ').toUpperCase();
      out += `
  <text x="${this.cx(this.layout.dimensions.width / 2)}" y="${fy + fh - 3}"
        text-anchor="middle" font-size="5.5" fill="rgba(0,0,0,0.35)"
        font-family="'Helvetica Neue',Arial,sans-serif" letter-spacing="0.8">${typeLbl}</text>`;
    }
    return out;
  }

  // ── LED / lighting overlay ────────────────────────────────────────────────

  private renderLighting(): string {
    const L = this.options.lighting;
    if (!L?.underShelfLED && !L?.overheadRail && !L?.puckLights) return '';

    let out = '\n  <!-- ═══ LIGHTING ═══ -->';

    if (L?.overheadRail) {
      const railY = this.cy(this.drawH) + 3;
      const x0    = this.cx(0);
      const x1    = this.cx(this.layout.dimensions.width);
      out += `
  <rect x="${x0}" y="${railY - 2}" width="${x1 - x0}" height="4" rx="2"
        fill="#e8d58a" opacity="0.9"/>`;
      for (let ix = 0; ix <= this.layout.dimensions.width; ix += 18) {
        const sx = this.cx(ix);
        out += `
  <polygon points="${sx},${railY + 2} ${sx - 4},${railY + 13} ${sx + 4},${railY + 13}"
           fill="#fff9c4" opacity="0.65"/>`;
      }
      out += `
  <text x="${this.cx(this.layout.dimensions.width / 2)}" y="${railY - 5}"
        text-anchor="middle" font-size="5.5" fill="#b8a040" opacity="0.9"
        font-family="'Helvetica Neue',Arial,sans-serif" letter-spacing="0.7">OVERHEAD RAIL</text>`;
    }

    if (L?.underShelfLED || L?.puckLights) {
      for (const zone of this.layout.zones ?? []) {
        if (!zone.shelves?.length) continue;
        const zx = this.cx(zone.x);
        const zw = zone.width * this.scale;
        for (const shelf of zone.shelves) {
          const shelfY = this.cy(zone.y + shelf.height);
          if (L?.underShelfLED) {
            out += `
  <line x1="${zx + 3}" y1="${shelfY + 1.5}" x2="${zx + zw - 3}" y2="${shelfY + 1.5}"
        stroke="#ffe082" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  <line x1="${zx + 3}" y1="${shelfY + 2.5}" x2="${zx + zw - 3}" y2="${shelfY + 2.5}"
        stroke="#fff8e1" stroke-width="1" stroke-linecap="round" opacity="0.5"/>`;
          }
          if (L?.puckLights) {
            const step = Math.max(24, zw / 3);
            for (let px = zx + step / 2; px < zx + zw; px += step) {
              out += `<circle cx="${px}" cy="${shelfY + 2}" r="2.5" fill="#fffde7" stroke="#f9a825" stroke-width="0.8" opacity="0.85"/>`;
            }
          }
        }
      }
    }
    return out;
  }

  // ── Door / opening overlay ────────────────────────────────────────────────

  private renderDoors(): string {
    const dt = this.options.doorType;
    if (!dt || dt === 'open') return '';

    const x0   = this.cx(0);
    const x1   = this.cx(this.layout.dimensions.width);
    const yTop = this.cy(this.drawH);
    const yBot = this.cy(0);
    const W    = x1 - x0;
    const H    = yBot - yTop;
    const midX = x0 + W / 2;

    let out = '\n  <!-- ═══ DOORS ═══ -->';

    switch (dt) {
      case 'sliding-mirror':
      case 'sliding-glass': {
        const isMirror = dt === 'sliding-mirror';
        const fill   = isMirror ? 'rgba(200,220,240,0.24)' : 'rgba(180,210,230,0.13)';
        const stroke = isMirror ? 'rgba(150,190,220,0.7)' : 'rgba(170,200,220,0.45)';
        out += `
  <rect x="${x0}" y="${yTop}" width="${W * 0.52}" height="${H}"
        fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  <rect x="${midX - W * 0.02}" y="${yTop}" width="${W * 0.52}" height="${H}"
        fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
        if (isMirror) {
          out += `
  <line x1="${x0 + W * 0.06}" y1="${yTop + 5}" x2="${x0 + W * 0.06}" y2="${yBot - 5}"
        stroke="rgba(255,255,255,0.35)" stroke-width="8" stroke-linecap="round"/>
  <line x1="${midX - W * 0.02 + W * 0.06}" y1="${yTop + 5}" x2="${midX - W * 0.02 + W * 0.06}" y2="${yBot - 5}"
        stroke="rgba(255,255,255,0.35)" stroke-width="8" stroke-linecap="round"/>`;
        }
        out += `
  <line x1="${midX}" y1="${yTop}" x2="${midX}" y2="${yBot}"
        stroke="${stroke}" stroke-width="3"/>`;
        break;
      }
      case 'bifold': {
        const pw = W / 4;
        const my = (yTop + yBot) / 2;
        [[x0, x0 + pw * 1.4, x0 + pw * 2], [x1, x1 - pw * 1.4, x1 - pw * 2]].forEach(([a, b, c]) => {
          out += `
  <line x1="${a}" y1="${yTop}" x2="${b}" y2="${my}" stroke="rgba(160,140,110,0.65)" stroke-width="2"/>
  <line x1="${b}" y1="${my}" x2="${c}" y2="${yTop}" stroke="rgba(160,140,110,0.65)" stroke-width="2"/>
  <line x1="${a}" y1="${yBot}" x2="${b}" y2="${my}" stroke="rgba(160,140,110,0.65)" stroke-width="2"/>
  <line x1="${b}" y1="${my}" x2="${c}" y2="${yBot}" stroke="rgba(160,140,110,0.65)" stroke-width="2"/>
  <rect x="${Math.min(a, c)}" y="${yTop}" width="${pw * 2}" height="${H}"
        fill="rgba(180,160,120,0.09)" stroke="rgba(160,140,110,0.35)" stroke-width="1.5"/>`;
        });
        break;
      }
      case 'french-panel': {
        const pw = W / 2 - 3;
        const hy = (yTop + yBot) / 2;
        out += `
  <rect x="${x0}" y="${yTop}" width="${pw}" height="${H}"
        fill="rgba(180,160,130,0.11)" stroke="rgba(160,140,110,0.5)" stroke-width="2"/>
  <rect x="${midX + 3}" y="${yTop}" width="${pw}" height="${H}"
        fill="rgba(180,160,130,0.11)" stroke="rgba(160,140,110,0.5)" stroke-width="2"/>
  <line x1="${midX}" y1="${yTop}" x2="${midX}" y2="${yBot}"
        stroke="rgba(130,110,80,0.8)" stroke-width="3"/>
  <circle cx="${midX - 10}" cy="${hy}" r="3.5" fill="rgba(160,140,110,0.75)"/>
  <circle cx="${midX + 10}" cy="${hy}" r="3.5" fill="rgba(160,140,110,0.75)"/>`;
        break;
      }
    }

    const labelMap: Record<string, string> = {
      'sliding-mirror': 'SLIDING MIRROR DOORS',
      'sliding-glass':  'SLIDING GLASS DOORS',
      'bifold':         'BIFOLD DOORS',
      'french-panel':   'FRENCH PANEL DOORS',
    };
    if (labelMap[dt]) {
      out += `
  <text x="${midX}" y="${yTop - 6}" text-anchor="middle" font-size="6"
        fill="#999" opacity="0.85" font-family="'Helvetica Neue',Arial,sans-serif"
        letter-spacing="0.8">${labelMap[dt]}</text>`;
    }
    return out;
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
