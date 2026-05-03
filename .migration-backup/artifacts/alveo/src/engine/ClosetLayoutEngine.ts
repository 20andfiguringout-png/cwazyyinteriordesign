import {
  ClosetType, DrawerPosition, LayoutWarning, VillaAmenities,
  WardrobeItems, ShoeCollection, UserPreferences,
  ClosetLayout, ClosetWall, ClosetZone, ShelfConfig, RodConfig, DrawerConfig,
  ClosetCalculationInput,
} from '@/types/closet';

// ── Wall content role ──────────────────────────────────────────────────────
type WallRole =
  | 'all'                // single-wall types — everything on one wall
  | 'hanging-only'       // back wall of L/U/corridor — long + double hang
  | 'drawers-only'       // left wall of U-shape — drawers + short hang above
  | 'shoes-only'         // right wall of U-shape — dedicated shoe wall
  | 'drawers-and-shoes'; // L-shape side wall / corridor Wall B

// ─────────────────────────────────────────────────────────────────────────────
// Architectural constants  (sourced from drawing encyclopedia v1.0)
// ─────────────────────────────────────────────────────────────────────────────
const TOE_KICK    = 3;   // 3" non-usable base gap
const SHELF_THICK = 1;   // shelf panel thickness
const ROD_INSET   = 1.5; // inches from shelf underside to rod centre
const UNIT_DEPTH  = 24;  // standard storage unit depth
const MIN_AISLE   = 36;  // minimum clear aisle width (inches)

// Rod heights A.F.F. from drawing encyclopedia Ch.14
const ROD_LONG    = 66;  // single long-hang rod  (66" A.F.F. = floor to rod)
const ROD_DBL_HI  = 78;  // double hang upper rod (6'-6")
const ROD_DBL_LO  = 40;  // double hang lower rod (3'-4")

// Shoe shelf clear-space between shelves (Ch.15 reference)
const SHOE_SPACING: Record<keyof ShoeCollection, number> = {
  boots:    25,  // knee-high, standing upright
  heels:     8,  // pumps / stilettos
  sneakers:  8,  // trainers
  flats:     6,  // flat shoes / loafers
};
// Pair widths side-by-side on a shelf (2 shoes = 1 pair; inch measurement, Ch.15)
const SHOE_PAIR_W: Record<keyof ShoeCollection, number> = {
  boots:    7,  // ~13cm / 5" per shoe × 2 + 1" gap
  heels:    4,  // slim heel ~3.5" + gap
  sneakers: 5,  // wider sole ~4.5" + gap
  flats:    4,  // thin flat ~3.5" + gap
};

// Drawer specs
const DRAWER_STD  = 9;   // standard drawer height (inches)
const DRAWER_JEW  = 3;   // shallow jewelry drawer
const DRAWER_GAP  = 1;   // gap between drawer faces
const DRAWER_MARG = 2;   // top + bottom clearance inside drawer zone

// Column minimum widths
const COL_HANG_MIN = 24;
const COL_SHOE_W   = 24;  // dedicated shoe column fixed width

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function clampN(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class ClosetLayoutEngine {
  private H: number;       // ceiling height
  private W: number;       // primary width (single-wall) or room width (walk-in)
  private D: number;       // unit depth
  private roomW: number;   // room width
  private roomD: number;   // room depth (door-to-back)
  private closetType: ClosetType;
  private drawerPosition: DrawerPosition;
  private valetRod: boolean;
  private wardrobe: WardrobeItems;
  private shoes: ShoeCollection;
  private prefs: UserPreferences;
  private amenities: VillaAmenities;
  private inputWarnings: string[] = [];

  // ── Layer 1: Input normaliser ─────────────────────────────────────────────
  private static normDim(val: number, min: number, max: number, def: number): number {
    const n = Number(val);
    if (!isFinite(n) || n <= 0) return def;
    return Math.min(Math.max(n, min), max);
  }

  constructor(input: ClosetCalculationInput) {
    const rawH     = input.dimensions.height;
    const rawW     = input.dimensions.width;
    const rawD     = input.dimensions.depth ?? UNIT_DEPTH;
    const rawRoomW = input.roomDimensions?.roomWidth ?? input.dimensions.width;
    const rawRoomD = input.roomDimensions?.roomDepth ?? Math.max(input.dimensions.width * 0.75, 60);

    this.H = ClosetLayoutEngine.normDim(rawH, 84,  Number.MAX_SAFE_INTEGER, 108);
    this.W = ClosetLayoutEngine.normDim(rawW, 36,  Number.MAX_SAFE_INTEGER, 120);
    this.D = ClosetLayoutEngine.normDim(rawD, 18,  48,                      UNIT_DEPTH);
    this.closetType     = input.closetType ?? 'reach-in';
    this.drawerPosition = input.zoneOverrides?.drawerPosition ?? 'bottom';
    this.valetRod       = input.zoneOverrides?.valetRod ?? false;
    this.roomW = ClosetLayoutEngine.normDim(rawRoomW, 36, Number.MAX_SAFE_INTEGER, this.W);
    this.roomD = ClosetLayoutEngine.normDim(rawRoomD, 48, Number.MAX_SAFE_INTEGER, Math.max(this.W * 0.75, 60));
    this.wardrobe  = this.normWardrobe(input.wardrobe);
    this.shoes     = this.normShoes(input.shoes);
    this.prefs     = input.userInfo;
    this.amenities = input.amenities ?? {};

    if (rawH < 84)
      this.inputWarnings.push(`Ceiling height adjusted from ${rawH}" to ${this.H}" — minimum usable ceiling is 7'-0".`);
    if (rawW < 36)
      this.inputWarnings.push(`Wall width adjusted from ${rawW}" to ${this.W}" — minimum usable width is 3'-0".`);
    if (rawD < 18 || rawD > 48)
      this.inputWarnings.push(`Unit depth adjusted from ${rawD}" to ${this.D}" — usable range is 18"–48".`);
  }

  /** Ensure all wardrobe counts are non-negative integers */
  private normWardrobe(w: WardrobeItems): WardrobeItems {
    const nn = (v: number) => Math.max(0, Math.round(Number(v) || 0));
    return {
      longDresses:  nn(w.longDresses),
      shortJackets: nn(w.shortJackets),
      suits:        nn(w.suits),
      shirts:       nn(w.shirts),
      pants:        nn(w.pants),
      tShirts:      nn(w.tShirts),
      sweaters:     nn(w.sweaters),
      jeans:        nn(w.jeans),
      underwear:    nn(w.underwear),
      bags:         nn(w.bags),
      belts:        nn(w.belts),
      jewelry:      !!w.jewelry,
      ties:         nn(w.ties),
    };
  }

  /** Ensure all shoe counts are non-negative integers */
  private normShoes(s: ShoeCollection): ShoeCollection {
    const nn = (v: number) => Math.max(0, Math.round(Number(v) || 0));
    return {
      sneakers: nn(s.sneakers),
      heels:    nn(s.heels),
      boots:    nn(s.boots),
      flats:    nn(s.flats),
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  public calculateLayout(): ClosetLayout {
    const walls          = this.buildAllWalls();
    const aisleWarnings  = this.checkAisles();
    const layoutWarnings = this.checkZoneConstraints(walls);
    const zones          = walls[0]?.zones ?? [];  // backward-compat

    return {
      closetType: this.closetType,
      dimensions: { width: this.W, height: this.H, depth: this.D },
      walls,
      zones,
      aisleWarnings,
      layoutWarnings,
      inputWarnings:    this.inputWarnings,
      totalStorage:     this.calcStorage(walls),
      utilizationScore: this.calcUtilization(walls),
      recommendations:  [...aisleWarnings, ...this.calcRecommendations(walls)],
    };
  }

  public static calcOptimizedLayouts(input: ClosetCalculationInput): Array<{
    id: string;
    label: string;
    description: string;
    userInfoPatch: Partial<UserPreferences>;
    layout: ClosetLayout;
  }> {
    const variants: Array<{
      id: string;
      label: string;
      description: string;
      userInfoPatch: Partial<UserPreferences>;
    }> = [
      {
        id: 'shoe-first',
        label: 'Shoe-First',
        description: 'Prioritizes shoe display capacity and shelf allocation.',
        userInfoPatch: { priorityItems: ['shoes', 'hanging', 'folded'], drawerPreference: 'few-large' },
      },
      {
        id: 'hanging-first',
        label: 'Hanging-First',
        description: 'Biases rods and hanging sections for garments.',
        userInfoPatch: { priorityItems: ['hanging', 'folded', 'shoes'], drawerPreference: 'many-small' },
      },
      {
        id: 'balanced',
        label: 'Balanced',
        description: 'Balances rods, drawers, and shelves for mixed wardrobes.',
        userInfoPatch: { priorityItems: ['hanging', 'shoes', 'folded', 'accessories'], drawerPreference: 'mixed' },
      },
    ];

    return variants.map((variant) => {
      const engine = new ClosetLayoutEngine({
        ...input,
        userInfo: { ...input.userInfo, ...variant.userInfoPatch },
      });
      return { ...variant, layout: engine.calculateLayout() };
    });
  }

  // ── Wall factory ──────────────────────────────────────────────────────────

  private buildAllWalls(): ClosetWall[] {
    switch (this.closetType) {
      case 'reach-in':
      case 'wardrobe-wall':
        return [this.wall('back', 'BACK WALL', 'EL-A', this.W, UNIT_DEPTH, 'all')];

      case 'walkin-single':
        return [this.wall('back', 'BACK WALL', 'EL-A', this.roomW, UNIT_DEPTH, 'all')];

      case 'walkin-l': {
        const sideW = Math.max(this.roomD - UNIT_DEPTH, 36);
        return [
          this.wall('back', 'BACK WALL', 'EL-A', this.roomW, UNIT_DEPTH, 'hanging-only'),
          this.wall('left', 'LEFT WALL',  'EL-B', sideW,     UNIT_DEPTH, 'drawers-and-shoes'),
        ];
      }

      case 'walkin-u': {
        const sideW = Math.max(this.roomD - UNIT_DEPTH, 36);
        return [
          this.wall('back',  'BACK WALL',  'EL-A', this.roomW, UNIT_DEPTH, 'hanging-only'),
          this.wall('left',  'LEFT WALL',  'EL-B', sideW,      UNIT_DEPTH, 'drawers-only'),
          this.wall('right', 'RIGHT WALL', 'EL-C', sideW,      UNIT_DEPTH, 'shoes-only'),
        ];
      }

      case 'island': {
        const sideW   = Math.max(this.roomD - UNIT_DEPTH, 36);
        const islandW = Math.max(Math.round(this.roomW * 0.5), 36);
        return [
          this.wall('back',  'BACK WALL',  'EL-A', this.roomW, UNIT_DEPTH, 'hanging-only'),
          this.wall('left',  'LEFT WALL',  'EL-B', sideW,      UNIT_DEPTH, 'drawers-only'),
          this.wall('right', 'RIGHT WALL', 'EL-C', sideW,      UNIT_DEPTH, 'shoes-only'),
          this.buildIslandWall(islandW, 36),
        ];
      }

      case 'corridor': {
        const wallW = Math.max(this.roomD, 48);
        return [
          this.wall('corridor-a', 'WALL A', 'EL-A', wallW, UNIT_DEPTH, 'hanging-only'),
          this.wall('corridor-b', 'WALL B', 'EL-B', wallW, UNIT_DEPTH, 'drawers-and-shoes'),
        ];
      }

      default:
        return [this.wall('back', 'BACK WALL', 'EL-A', this.W, UNIT_DEPTH, 'all')];
    }
  }

  private wall(
    wallId:       ClosetWall['wallId'],
    label:        string,
    elevationRef: string,
    width:        number,
    unitDepth:    number,
    role:         WallRole,
  ): ClosetWall {
    const zones = this.buildZonesForRole(role, width);
    this.annotateZones(zones);
    return { wallId, label, elevationRef, width, height: this.H, unitDepth, zones };
  }

  /** Island unit — 36" high counter with jewellery drawers + accessory shelf */
  private buildIslandWall(width: number, height: number): ClosetWall {
    const zones: ClosetZone[] = [];
    const drawerW  = Math.round(width * 0.6);
    const shelfW   = width - drawerW;

    const drawers: DrawerConfig[] = [];
    let curY = DRAWER_MARG;
    if (this.wardrobe.jewelry && curY + DRAWER_JEW <= height - DRAWER_MARG) {
      drawers.push({ height: DRAWER_JEW, width: Math.max(drawerW - 4, 4), depth: UNIT_DEPTH - 6, position: curY, purpose: 'jewelry' });
      curY += DRAWER_JEW + DRAWER_GAP;
    }
    const remaining = height - curY - DRAWER_MARG;
    const drawerCount = Math.max(Math.floor(remaining / (DRAWER_STD + DRAWER_GAP)), 0);
    for (let i = 0; i < drawerCount; i++) {
      drawers.push({ height: DRAWER_STD, width: Math.max(drawerW - 4, 4), depth: UNIT_DEPTH - 6, position: curY, purpose: i === 0 ? 'belts & ties' : 'accessories' });
      curY += DRAWER_STD + DRAWER_GAP;
    }
    if (drawers.length > 0) {
      zones.push({ type: 'drawers', x: 0, y: 0, width: drawerW, height, drawers, contentLabel: 'Island drawers' });
    }

    zones.push({
      type: 'top-shelves', x: drawerW, y: 0, width: shelfW, height,
      shelves: [
        { height: Math.round(height * 0.5), depth: UNIT_DEPTH - 4, spacing: Math.round(height * 0.5), count: 1, purpose: 'display' },
      ],
      contentLabel: 'Open display',
    });

    return { wallId: 'island-unit', label: 'ISLAND UNIT', elevationRef: 'EL-D', width, height, unitDepth: UNIT_DEPTH, zones };
  }

  // ── Role dispatcher ───────────────────────────────────────────────────────

  private buildZonesForRole(role: WallRole, W: number): ClosetZone[] {
    switch (role) {
      case 'all':               return this.buildAll(W);
      case 'hanging-only':      return this.buildHanging(W);
      case 'drawers-only':      return this.buildDrawersOnly(W);
      case 'shoes-only':        return this.buildShoesOnly(W);
      case 'drawers-and-shoes': return this.buildDrawersAndShoes(W);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Role builders
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * ALL — single-wall layout: distributes every item type into columns.
   * Column order (Ch.14): long-hang | double-hang-with-drawers | shoe-shelves
   */
  private buildAll(W: number): ClosetZone[] {
    const longItems  = this.wardrobe.longDresses;
    const shortItems = this.wardrobe.shirts + this.wardrobe.shortJackets +
                       this.wardrobe.pants  + this.wardrobe.suits;
    const hasFolded  = this.hasFoldedItems();
    const totalShoes = this.countShoes();

    // Determine which columns we need
    const wantsLong  = longItems  > 0;
    const wantsShort = shortItems > 0 || hasFolded;
    const wantsShoe  = totalShoes > 0;

    // Calculate widths first, then decide which columns actually fit
    const widths = this.distributeWidthsSafe(wantsLong, wantsShort, wantsShoe, W);

    const zones: ClosetZone[] = [];
    const drawerH = hasFolded ? this.calcFoldedStorageHeight() : 0;
    let curX = 0;

    if (wantsLong && widths.longW > 0) {
      this.addLongHangZone(zones, curX, widths.longW, TOE_KICK, this.H - TOE_KICK);
      curX += widths.longW;
    }
    if (wantsShort && widths.shortW > 0) {
      if (hasFolded && drawerH > 0) {
        this.buildDrawerAndHang(zones, curX, widths.shortW, drawerH);
      } else {
        this.addShortHangZone(zones, curX, widths.shortW, TOE_KICK, this.H - TOE_KICK);
      }
      curX += widths.shortW;
    }
    if (wantsShoe && widths.shoeW > 0) {
      this.addShoeColumn(zones, curX, widths.shoeW, TOE_KICK, this.H - TOE_KICK);
      curX += widths.shoeW;
    }

    // Fallback — wall had no qualifying items
    if (zones.length === 0) {
      this.addShortHangZone(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    }

    return zones;
  }

  /**
   * HANGING-ONLY — back wall: long-hang (left) + double-hang (right).
   */
  private buildHanging(W: number): ClosetZone[] {
    const longItems  = this.wardrobe.longDresses;
    const shortItems = this.wardrobe.shirts + this.wardrobe.shortJackets +
                       this.wardrobe.pants  + this.wardrobe.suits;
    const hasLong  = longItems  > 0;
    const hasShort = shortItems > 0;
    const zones: ClosetZone[] = [];

    if (hasLong && hasShort) {
      const prio = this.prefs.priorityItems ?? [];
      const longRatio = prio.includes('hanging') ? 0.40 : 0.35;
      const longW  = clampN(Math.round(W * longRatio), COL_HANG_MIN, W - COL_HANG_MIN);
      const shortW = W - longW;
      this.addLongHangZone(zones, 0,     longW,  TOE_KICK, this.H - TOE_KICK);
      this.addShortHangZone(zones, longW, shortW, TOE_KICK, this.H - TOE_KICK);
    } else if (hasLong) {
      this.addLongHangZone(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    } else {
      this.addShortHangZone(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    }

    return zones;
  }

  /**
   * DRAWERS-ONLY — left wall of U-shape: drawer stack at base, short-hang above.
   */
  private buildDrawersOnly(W: number): ClosetZone[] {
    const zones: ClosetZone[] = [];
    if (this.hasFoldedItems()) {
      const dH    = this.calcFoldedStorageHeight();
      const hangH = this.H - TOE_KICK - dH;
      this.addFoldedStorageZone(zones, 0, W, TOE_KICK, dH);
      if (hangH >= 30) {
        this.addShortHangZone(zones, 0, W, TOE_KICK + dH, hangH);
      }
    } else {
      this.addShortHangZone(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    }
    return zones;
  }

  /**
   * SHOES-ONLY — right wall of U-shape: dedicated shoe wall.
   */
  private buildShoesOnly(W: number): ClosetZone[] {
    const zones: ClosetZone[] = [];
    this.addShoeColumn(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    return zones;
  }

  /**
   * DRAWERS-AND-SHOES — L-shape side wall / corridor Wall B.
   */
  private buildDrawersAndShoes(W: number): ClosetZone[] {
    const totalShoes = this.countShoes();
    const zones: ClosetZone[] = [];

    if (totalShoes > 0) {
      const shoeW = clampN(this.calcShoeColumnWidth(), COL_SHOE_W, W - COL_HANG_MIN);
      const hangW = W - shoeW;

      if (hangW < COL_HANG_MIN) {
        // Not enough room for a hang column — fall back to drawers only
        return this.buildDrawersOnly(W);
      }

      if (this.hasFoldedItems()) {
        const dH    = this.calcFoldedStorageHeight();
        const hangH = this.H - TOE_KICK - dH;
        this.addFoldedStorageZone(zones, 0, hangW, TOE_KICK, dH);
        if (hangH >= 30) {
          this.addShortHangZone(zones, 0, hangW, TOE_KICK + dH, hangH);
        }
      } else {
        this.addShortHangZone(zones, 0, hangW, TOE_KICK, this.H - TOE_KICK);
      }
      this.addShoeColumn(zones, hangW, shoeW, TOE_KICK, this.H - TOE_KICK);
    } else {
      return this.buildDrawersOnly(W);
    }

    return zones;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Zone construction helpers
  // ─────────────────────────────────────────────────────────────────────────

  private addLongHangZone(out: ClosetZone[], x: number, w: number, yBottom: number, height: number) {
    if (w < 4 || height < 20) return;
    // Rod AFF: just below the shelf underside at the zone top
    const zoneTopAFF = yBottom + height;
    const rodAFF = clampN(zoneTopAFF - SHELF_THICK - ROD_INSET, ROD_LONG - 8, ROD_LONG + 4);
    out.push({
      type: 'long-hang', x, y: yBottom, width: w, height,
      rods: [{ height: rodAFF, depth: this.D - 2, length: Math.max(w - 4, 4), purpose: 'long hang' }],
    });
  }

  private addShortHangZone(out: ClosetZone[], x: number, w: number, yBottom: number, height: number) {
    if (w < 4 || height < 30) return;
    const zoneTopAFF = yBottom + height;
    // Upper rod: as high as possible but never above ROD_DBL_HI
    const upperRod = clampN(zoneTopAFF - SHELF_THICK - ROD_INSET, ROD_DBL_LO + 32, ROD_DBL_HI);
    // Lower rod: only if there is enough clearance
    const lowerRod = clampN(yBottom + 6, ROD_DBL_LO - 4, ROD_DBL_LO + 4);
    const hasLower = (upperRod - lowerRod) >= 32 && lowerRod > yBottom + 4;

    const rods: RodConfig[] = [
      { height: upperRod, depth: this.D - 2, length: Math.max(w - 4, 4), purpose: 'upper rod' },
    ];
    if (hasLower) {
      rods.push({ height: lowerRod, depth: this.D - 2, length: Math.max(w - 4, 4), purpose: 'lower rod' });
    }
    out.push({ type: 'double-hang', x, y: yBottom, width: w, height, rods });
  }

  private addDrawerZone(out: ClosetZone[], x: number, w: number, yBottom: number, totalH: number) {
    if (w < 8 || totalH < DRAWER_JEW + DRAWER_MARG * 2) return;
    const drawers = this.buildDrawerList(w, yBottom, totalH);
    if (!drawers.length) return;
    const zone: ClosetZone = { type: 'drawers', x, y: yBottom, width: w, height: totalH, drawers };
    if (this.valetRod) zone.valetRod = true;
    out.push(zone);
  }

  private addShoeColumn(out: ClosetZone[], x: number, w: number, yBottom: number, totalH: number) {
    if (w < 8 || totalH < 10) return;
    const shelves = this.buildShoeShelves(totalH, w);
    if (!shelves.length) return;
    out.push({ type: 'shoe-shelves', x, y: yBottom, width: w, height: totalH, shelves });
  }

  /** Dispatch to drawers or open-shelves zone depending on user preference. */
  private addFoldedStorageZone(out: ClosetZone[], x: number, w: number, yBottom: number, totalH: number) {
    if (this.prefs.foldedStorage === 'open-shelves') {
      this.addOpenShelvesZone(out, x, w, yBottom, totalH);
    } else {
      this.addDrawerZone(out, x, w, yBottom, totalH);
    }
  }

  private addOpenShelvesZone(out: ClosetZone[], x: number, w: number, yBottom: number, totalH: number) {
    if (w < 8 || totalH < 10) return;
    const shelves = this.buildOpenShelves(totalH);
    if (!shelves.length) return;
    const zone: ClosetZone = { type: 'open-shelves', x, y: yBottom, width: w, height: totalH, shelves };
    if (this.valetRod) zone.valetRod = true;
    out.push(zone);
  }

  private buildOpenShelves(totalH: number): ShelfConfig[] {
    const shelves: ShelfConfig[] = [];
    const OPEN_SPACING = 12; // 12" clear space per shelf for folded items
    let relH = DRAWER_MARG;
    const maxRelH = totalH - SHELF_THICK - 2;
    while (relH + SHELF_THICK <= maxRelH && shelves.length < 10) {
      shelves.push({ height: relH, depth: this.D - 4, spacing: OPEN_SPACING, count: 1, purpose: 'folded' });
      relH += SHELF_THICK + OPEN_SPACING;
    }
    return shelves;
  }

  // ── Drawer position dispatcher ────────────────────────────────────────────

  /** Place drawers at bottom / middle / top of the short-hang column */
  private buildDrawerAndHang(out: ClosetZone[], x: number, w: number, drawerH: number): void {
    const availH = this.H - TOE_KICK;

    switch (this.drawerPosition) {
      case 'top': {
        const hangH = Math.max(availH - drawerH, 30);
        const actualDrawH = availH - hangH;
        if (actualDrawH >= DRAWER_JEW + DRAWER_MARG * 2) {
          this.addFoldedStorageZone(out, x, w, TOE_KICK + hangH, actualDrawH);
        }
        this.addShortHangZone(out, x, w, TOE_KICK, hangH);
        break;
      }
      case 'middle': {
        const totalHang  = Math.max(availH - drawerH, 40);
        const lowerH     = clampN(Math.round(totalHang * 0.38), 20, totalHang - 20);
        const drawerYBot = TOE_KICK + lowerH;
        const upperY     = drawerYBot + drawerH;
        const upperH     = this.H - upperY;
        this.addShortHangZone(out, x, w, TOE_KICK, lowerH);
        if (drawerH >= DRAWER_JEW + DRAWER_MARG * 2) {
          this.addFoldedStorageZone(out, x, w, drawerYBot, drawerH);
        }
        if (upperH >= 30) {
          this.addShortHangZone(out, x, w, upperY, upperH);
        }
        break;
      }
      default: { // 'bottom'
        const hangH = Math.max(availH - drawerH, 30);
        const actualDrawH = availH - hangH;
        if (actualDrawH >= DRAWER_JEW + DRAWER_MARG * 2) {
          this.addFoldedStorageZone(out, x, w, TOE_KICK, actualDrawH);
        }
        this.addShortHangZone(out, x, w, TOE_KICK + actualDrawH, hangH);
        break;
      }
    }
  }

  // ── Zone annotation (inventory labels) ────────────────────────────────────

  private annotateZones(zones: ClosetZone[]): void {
    const fmt = (n: number, s: string, p?: string) =>
      n > 0 ? `${n} ${n === 1 ? s : (p ?? s + 's')}` : null;

    for (const zone of zones) {
      switch (zone.type) {
        case 'long-hang': {
          const parts = [
            fmt(this.wardrobe.longDresses, 'dress', 'dresses'),
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'double-hang': {
          const parts = [
            fmt(this.wardrobe.shirts,      'shirt'),
            fmt(this.wardrobe.shortJackets,'jacket'),
            fmt(this.wardrobe.pants,       'pant', 'pants'),
            fmt(this.wardrobe.suits,       'suit'),
            fmt(this.wardrobe.ties,        'tie'),
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'drawers':
        case 'open-shelves': {
          const parts = [
            this.wardrobe.jewelry ? 'Jewelry' : null,
            fmt(this.wardrobe.tShirts,  'T-shirt'),
            fmt(this.wardrobe.sweaters, 'sweater'),
            fmt(this.wardrobe.jeans,    'jean', 'jeans'),
            this.wardrobe.underwear > 0 ? 'Lingerie' : null,
            fmt(this.wardrobe.bags,     'bag'),
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'shoe-shelves': {
          const parts = [
            fmt(this.shoes.sneakers, 'sneaker'),
            fmt(this.shoes.heels,    'heel'),
            fmt(this.shoes.boots,    'boot'),
            fmt(this.shoes.flats,    'flat'),
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
      }
    }
  }

  // ── Constraint warnings ───────────────────────────────────────────────────

  private checkZoneConstraints(walls: ClosetWall[]): LayoutWarning[] {
    const warnings: LayoutWarning[] = [];

    if (this.hasAnyDrawers()) {
      if (this.drawerPosition === 'middle') {
        warnings.push({
          id: 'drawer-middle', message: 'Drawers at mid-height', severity: 'info',
          designerNote:
            "Mid-height drawers sit beautifully at arm's reach — perfect for jewellery, " +
            'accessories, and anything you touch daily.',
        });
      } else if (this.drawerPosition === 'top') {
        warnings.push({
          id: 'drawer-top', message: 'Drawers at the top', severity: 'info',
          designerNote:
            'Top drawers are the perfect home for lightly-used seasonal pieces — travel ' +
            'clutches, spare scarves, sentimental items you treasure but rarely reach for.',
        });
        const drawerH = this.calcDrawerStackHeight();
        const hangH   = this.H - TOE_KICK - drawerH;
        if (hangH < 52) {
          warnings.push({
            id: 'hang-compressed', severity: 'caution',
            message: 'Hanging space is tighter than ideal',
            designerNote:
              `Moving drawers to the top has left ${hangH}" of hanging space. Your longer ` +
              'garments may sit closer to the floor than ideal.',
          });
        }
      }
    }

    for (const wall of walls) {
      for (const zone of wall.zones) {
        if (zone.width > 32 && (zone.type === 'shoe-shelves' || zone.type === 'top-shelves' || zone.type === 'open-shelves')) {
          warnings.push({
            id:          `shelf-span-${zone.x}`,
            message:     `Wide shelf span: ${Math.round(zone.width)}"`,
            severity:    'caution',
            designerNote:
              `A ${Math.round(zone.width)}" shelf span exceeds the recommended 32" maximum without ` +
              'a centre support. Over time, shelves this wide can sag under weight.',
          });
          break;
        }
      }
    }

    if (this.closetType === 'reach-in' || this.closetType === 'wardrobe-wall') {
      const totalHang   = this.wardrobe.longDresses + this.wardrobe.suits +
                          this.wardrobe.shirts + this.wardrobe.shortJackets + this.wardrobe.pants;
      const rodFtNeeded = Math.ceil(totalHang * 2 / 12);
      const rodFtAvail  = Math.round(this.W / 12);
      if (rodFtNeeded > rodFtAvail * 1.5) {
        warnings.push({
          id: 'overflow-capacity', severity: 'caution',
          message: "Your wardrobe may exceed this wall's capacity",
          designerNote:
            `${totalHang} hanging items need approximately ${rodFtNeeded} ft of rod space, ` +
            `but this ${rodFtAvail} ft wall can comfortably hold about ${Math.round(rodFtAvail * 0.7 * 12 / 2)} items.`,
        });
      }
    }

    return warnings;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Detail builders
  // ─────────────────────────────────────────────────────────────────────────

  private buildDrawerList(colW: number, yBottom: number, totalH: number): DrawerConfig[] {
    const drawers: DrawerConfig[] = [];
    // Drawer face inset — min 4" but at most half the column width
    const inset   = Math.min(4, Math.max(0, Math.floor(colW / 2) - 4));
    const faceW   = Math.max(colW - inset * 2, Math.floor(colW * 0.6));
    let curAFF    = yBottom + DRAWER_MARG;
    const maxAFF  = yBottom + totalH - DRAWER_MARG;

    if (this.wardrobe.jewelry && curAFF + DRAWER_JEW <= maxAFF) {
      drawers.push({ height: DRAWER_JEW, width: faceW, depth: this.D - 6, position: curAFF, purpose: 'jewelry' });
      curAFF += DRAWER_JEW + DRAWER_GAP;
    }
    while (curAFF + DRAWER_STD <= maxAFF) {
      drawers.push({ height: DRAWER_STD, width: faceW, depth: this.D - 6, position: curAFF, purpose: 'folded' });
      curAFF += DRAWER_STD + DRAWER_GAP;
    }
    return drawers;
  }

  /**
   * Shoe shelf heights are stored RELATIVE to zone.y (renderer adds zone.y to get AFF).
   * Shelves are ordered bottom → top (ascending relative height).
   * Each shelf entry represents: the board at `height` inches above zone.y,
   * with a clear space of `spacing` inches above it for shoes.
   */
  private buildShoeShelves(totalH: number, colW: number): ShelfConfig[] {
    const shelves: ShelfConfig[] = [];
    let relH     = DRAWER_MARG;      // start a couple of inches above the zone floor
    const maxRelH = totalH - SHELF_THICK - 2; // leave 2" at top
    const maxShelves = 20;           // hard cap to prevent infinite loops

    // Stack order: tallest (boots) at top → compact (flats) at bottom → per Ch.15
    // We build bottom-to-top, so start with flats/sneakers and end with boots
    const order: (keyof ShoeCollection)[] = ['flats', 'sneakers', 'heels', 'boots'];

    for (const key of order) {
      const count = this.shoes[key];
      if (count <= 0) continue;
      if (shelves.length >= maxShelves) break;

      const pairsPerShelf = Math.max(1, Math.floor((colW - 4) / SHOE_PAIR_W[key]));
      const rows  = Math.ceil(count / pairsPerShelf);
      const space = SHOE_SPACING[key];

      for (let r = 0; r < rows; r++) {
        if (relH + SHELF_THICK > maxRelH) break;
        if (shelves.length >= maxShelves) break;
        shelves.push({ height: relH, depth: 12, spacing: space, count: pairsPerShelf, purpose: key });
        // Next shelf starts above the current shelf board + clear space for this shoe type
        relH += SHELF_THICK + space;
      }
    }
    return shelves;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Width distribution — GUARANTEED to sum to W exactly
  // ─────────────────────────────────────────────────────────────────────────

  /** Returns per-column widths { longW, shortW, shoeW } that sum exactly to W. */
  private distributeWidthsSafe(
    wantsLong: boolean,
    wantsShort: boolean,
    wantsShoe: boolean,
    W: number,
  ): { longW: number; shortW: number; shoeW: number } {
    const hangCount = (wantsLong ? 1 : 0) + (wantsShort ? 1 : 0);
    const hangMin   = hangCount * COL_HANG_MIN;

    // ── Shoe column width ─────────────────────────────────────────────────
    let shoeW = 0;
    if (wantsShoe) {
      const ideal = this.calcShoeColumnWidth();
      const maxShoe = Math.max(W - hangMin, 0);
      if (maxShoe >= COL_SHOE_W / 2) {
        shoeW = clampN(ideal, COL_SHOE_W, maxShoe);
      }
      // If there's no room for even a half-size shoe column, omit it
    }

    const availForHang = W - shoeW;

    // ── Priority-aware long/short ratio ───────────────────────────────────
    const prio = this.prefs.priorityItems ?? [];
    let longRatio = 0.38;
    if (prio.includes('hanging') && !prio.includes('shoes') && !prio.includes('folded')) {
      longRatio = 0.45;
    } else if (prio.includes('shoes') || prio.includes('folded')) {
      longRatio = 0.32;
    }

    // ── Distribute hang columns ───────────────────────────────────────────
    let longW  = 0;
    let shortW = 0;

    if (!wantsLong && !wantsShort) {
      // No hang columns — redistribute their share into shoe (or leave empty)
      shoeW = W;
    } else if (wantsLong && wantsShort) {
      longW  = clampN(Math.round(availForHang * longRatio), COL_HANG_MIN, availForHang - COL_HANG_MIN);
      shortW = availForHang - longW;
    } else if (wantsLong) {
      longW  = availForHang;
    } else {
      shortW = availForHang;
    }

    // ── Final sanity: force sum = W ───────────────────────────────────────
    // Snap shortW/longW if there's rounding drift
    const total = longW + shortW + shoeW;
    if (total !== W) {
      const diff = W - total;
      if (shortW > 0)     shortW += diff;
      else if (longW > 0) longW  += diff;
      else                shoeW  += diff;
    }

    return { longW, shortW, shoeW };
  }

  /** Legacy single-column shoe-width helper */
  private calcShoeColumnWidth(): number {
    const total = this.countShoes();
    if (total === 0) return COL_SHOE_W;
    // Each extra pair needs ~1.5" of column width beyond the minimum
    return Math.max(COL_SHOE_W, Math.round(total * 1.5));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Drawer height calculator
  // ─────────────────────────────────────────────────────────────────────────

  /** Returns the height needed for folded-item storage, regardless of style (drawers or shelves). */
  private calcFoldedStorageHeight(): number {
    return this.prefs.foldedStorage === 'open-shelves'
      ? this.calcOpenShelvesHeight()
      : this.calcDrawerStackHeight();
  }

  private calcOpenShelvesHeight(): number {
    const OPEN_SPACING = 12;
    let count = 0;
    count += Math.ceil(this.wardrobe.tShirts  / 8);
    count += Math.ceil(this.wardrobe.sweaters / 4);
    if (this.wardrobe.jeans     > 0) count += 1;
    if (this.wardrobe.underwear > 0) count += 1;
    if (this.wardrobe.jewelry)       count += 1;
    count = clampN(count, 2, 6);
    const rawH = count * (SHELF_THICK + OPEN_SPACING) + DRAWER_MARG * 2;
    const maxH = Math.floor((this.H - TOE_KICK) * 0.60);
    return Math.min(Math.round(rawH), maxH);
  }

  private calcDrawerStackHeight(): number {
    let count = 0;
    if (this.wardrobe.jewelry)          count += 1;
    count += Math.ceil(this.wardrobe.tShirts  / 10);
    count += Math.ceil(this.wardrobe.sweaters /  5);
    if (this.wardrobe.jeans     > 0)    count += 1;
    if (this.wardrobe.underwear > 0)    count += 1;
    if (this.wardrobe.ties      > 0)    count += 1;
    count = clampN(count, 2, 6);

    const jewH    = this.wardrobe.jewelry ? DRAWER_JEW : 0;
    const stdCnt  = this.wardrobe.jewelry ? count - 1 : count;
    const rawH    = jewH + stdCnt * DRAWER_STD + (count - 1) * DRAWER_GAP + DRAWER_MARG * 2;

    // Never exceed 60% of usable wall height
    const maxH = Math.floor((this.H - TOE_KICK) * 0.60);
    return Math.min(Math.round(rawH), maxH);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Inventory helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** True when the wardrobe contains any items that need folded storage (drawers or open shelves). */
  private hasFoldedItems(): boolean {
    return (
      this.wardrobe.tShirts + this.wardrobe.sweaters +
      this.wardrobe.jeans   + this.wardrobe.underwear
    ) > 0 || !!this.wardrobe.jewelry || this.wardrobe.ties > 0;
  }

  /** True only when folded storage is rendered as drawers (not open shelves). */
  private hasAnyDrawers(): boolean {
    return this.hasFoldedItems() && this.prefs.foldedStorage !== 'open-shelves';
  }

  private countShoes(): number {
    return this.shoes.sneakers + this.shoes.heels + this.shoes.boots + this.shoes.flats;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Aisle checks
  // ─────────────────────────────────────────────────────────────────────────

  private checkAisles(): string[] {
    const warnings: string[] = [];
    const UD = UNIT_DEPTH;

    switch (this.closetType) {
      case 'walkin-single':
      case 'walkin-l': {
        const aisle = this.roomD - UD;
        if (aisle < MIN_AISLE)
          warnings.push(` Front aisle is ${aisle}" — minimum is ${MIN_AISLE}". Consider reducing unit depth or widening the room.`);
        break;
      }
      case 'walkin-u':
      case 'island': {
        const lrAisle = this.roomW - UD * 2;
        const fbAisle = this.roomD - UD;
        if (lrAisle < MIN_AISLE)
          warnings.push(` Left-right aisle is ${lrAisle}" — minimum is ${MIN_AISLE}". Room width too narrow for U-shape units.`);
        if (fbAisle < MIN_AISLE)
          warnings.push(` Front-back aisle is ${fbAisle}" — minimum is ${MIN_AISLE}". Reduce unit depth or deepen the room.`);
        break;
      }
      case 'corridor': {
        const aisle = this.roomW - UD * 2;
        if (aisle < MIN_AISLE)
          warnings.push(` Corridor aisle is ${aisle}" — minimum ${MIN_AISLE}" needed. Room is ${this.roomW}" wide; needs at least ${UD * 2 + MIN_AISLE}".`);
        break;
      }
    }
    return warnings;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Storage & utilisation summaries
  // ─────────────────────────────────────────────────────────────────────────

  private calcStorage(walls: ClosetWall[]) {
    let hangingRods = 0, shelfSpace = 0, drawerCount = 0, shoeCapacity = 0;
    for (const w of walls) {
      for (const z of w.zones) {
        if (z.rods)    hangingRods += z.rods.reduce((s, r) => s + r.length, 0) / 12;
        if (z.shelves) {
          for (const sh of z.shelves) {
            shelfSpace += (z.width / 12) * (sh.depth / 12);
            if (z.type === 'shoe-shelves') {
              shoeCapacity += Math.max(1, Math.floor(z.width / 6));
            }
          }
        }
        if (z.drawers) drawerCount += z.drawers.length;
      }
    }
    return {
      hangingRods:  Math.round(hangingRods  * 10) / 10,
      shelfSpace:   Math.round(shelfSpace   * 10) / 10,
      drawerCount,
      shoeCapacity,
    };
  }

  private calcUtilization(walls: ClosetWall[]): number {
    const totalArea = walls.reduce((s, w) => s + w.width * w.height, 0);
    let usedArea    = 0;
    for (const w of walls) {
      for (const z of w.zones) usedArea += z.width * z.height;
    }
    const score = totalArea > 0 ? Math.round((usedArea / totalArea) * 100) : 0;
    return clampN(score, 0, 100);
  }

  private calcRecommendations(walls: ClosetWall[]): string[] {
    const recs: string[] = [];
    const totalShoes = this.countShoes();
    let hasShoeZone  = false;
    for (const w of walls) {
      for (const z of w.zones) {
        if (z.type === 'shoe-shelves') hasShoeZone = true;
      }
    }
    if (totalShoes > 20 && !hasShoeZone) {
      recs.push('Consider adding a dedicated shoe wall — your collection warrants it.');
    }
    if (this.wardrobe.longDresses > 5 && this.closetType === 'reach-in') {
      recs.push('A walk-in configuration would better accommodate your long garments.');
    }
    return recs;
  }
}
