import {
  ClosetType, DrawerPosition, LayoutWarning, VillaAmenities,
  WardrobeItems, ShoeCollection, UserPreferences,
  ClosetLayout, ClosetWall, ClosetZone, ShelfConfig, RodConfig, DrawerConfig,
  ClosetCalculationInput,
} from '@/types/closet';

// â”€â”€ Wall content role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type WallRole =
  | 'all'                // single-wall types  -  everything on one wall
  | 'hanging-only'       // back wall of L/U/corridor  -  long + double hang
  | 'drawers-only'       // left wall of U-shape  -  drawers + short hang above
  | 'shoes-only'         // right wall of U-shape  -  dedicated shoe wall
  | 'drawers-and-shoes'; // L-shape side wall / corridor Wall B

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Architectural constants  (sourced from drawing encyclopedia v1.0)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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



// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Engine
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class ClosetLayoutEngine {
  private H: number;       // ceiling height
  private W: number;       // primary width (single-wall) or room width (walk-in)
  private D: number;       // unit depth
  private roomW: number;   // room width
  private roomD: number;   // room depth (door-to-back)
  private closetType: ClosetType;
  private drawerPosition: DrawerPosition;
  private wardrobe: WardrobeItems;
  private shoes: ShoeCollection;
  private prefs: UserPreferences;
  private amenities: VillaAmenities;
  private inputWarnings: string[] = [];

  // ── Layer 1: Input normaliser ─────────────────────────────────────────────
  // Enforces only hard structural minimums — no upper ceiling.
  // The drawing engine scales dynamically to any size.
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

    // Only enforce structural MINIMUMS — no upper limits.
    // The renderer scales dynamically to any width/height via calcScale() + drawH.
    // Unit depth (D) has a physical max of 48" (deepest usable closet unit).
    this.H = ClosetLayoutEngine.normDim(rawH, 84,  Number.MAX_SAFE_INTEGER, 108);
    this.W = ClosetLayoutEngine.normDim(rawW, 36,  Number.MAX_SAFE_INTEGER, 120);
    this.D = ClosetLayoutEngine.normDim(rawD, 18,  48,                      UNIT_DEPTH);
    this.closetType     = input.closetType ?? 'reach-in';
    this.drawerPosition = input.zoneOverrides?.drawerPosition ?? 'bottom';
    this.roomW = ClosetLayoutEngine.normDim(rawRoomW, 36, Number.MAX_SAFE_INTEGER, this.W);
    this.roomD = ClosetLayoutEngine.normDim(rawRoomD, 48, Number.MAX_SAFE_INTEGER, Math.max(this.W * 0.75, 60));
    this.wardrobe  = input.wardrobe;
    this.shoes     = input.shoes;
    this.prefs     = input.userInfo;
    this.amenities = input.amenities ?? {};

    // Only warn when values hit the structural floor (too small to build)
    if (rawH < 84)
      this.inputWarnings.push(`Ceiling height adjusted from ${rawH}" to ${this.H}" — minimum usable ceiling is 7'-0".`);
    if (rawW < 36)
      this.inputWarnings.push(`Wall width adjusted from ${rawW}" to ${this.W}" — minimum usable width is 3'-0".`);
    if (rawD < 18 || rawD > 48)
      this.inputWarnings.push(`Unit depth adjusted from ${rawD}" to ${this.D}" — usable range is 18"–48".`);
  }

  // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        id: "shoe-first",
        label: "Shoe-First",
        description: "Prioritizes shoe display capacity and shelf allocation.",
        userInfoPatch: {
          priorityItems: ["shoes", "hanging", "folded"],
          drawerPreference: "few-large",
        },
      },
      {
        id: "hanging-first",
        label: "Hanging-First",
        description: "Biases rods and hanging sections for garments.",
        userInfoPatch: {
          priorityItems: ["hanging", "folded", "shoes"],
          drawerPreference: "many-small",
        },
      },
      {
        id: "balanced",
        label: "Balanced",
        description: "Balances rods, drawers, and shelves for mixed wardrobes.",
        userInfoPatch: {
          priorityItems: ["hanging", "shoes", "folded", "accessories"],
          drawerPreference: "mixed",
        },
      },
    ];

    return variants.map((variant) => {
      const engine = new ClosetLayoutEngine({
        ...input,
        userInfo: {
          ...input.userInfo,
          ...variant.userInfoPatch,
        },
      });

      return {
        ...variant,
        layout: engine.calculateLayout(),
      };
    });
  }

  // â”€â”€ Wall factory  -  one entry per closet type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private buildAllWalls(): ClosetWall[] {
    switch (this.closetType) {
      // â”€â”€ Single-wall types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'reach-in':
      case 'wardrobe-wall':
        return [this.wall('back', 'BACK WALL', 'EL-A', this.W, UNIT_DEPTH, 'all')];

      case 'walkin-single':
        return [this.wall('back', 'BACK WALL', 'EL-A', this.roomW, UNIT_DEPTH, 'all')];

      // â”€â”€ L-shape: back wall (hanging) + one side wall (drawers + shoes) â”€â”€â”€â”€
      case 'walkin-l': {
        const sideW = Math.max(this.roomD - UNIT_DEPTH, 36);
        return [
          this.wall('back', 'BACK WALL',  'EL-A', this.roomW, UNIT_DEPTH, 'hanging-only'),
          this.wall('left', 'LEFT WALL',  'EL-B', sideW,      UNIT_DEPTH, 'drawers-and-shoes'),
        ];
      }

      // ── U-shape: back (hanging) + left (drawers) + right (shoes) ──────────
      case 'walkin-u': {
        const sideW = Math.max(this.roomD - UNIT_DEPTH, 36);
        return [
          this.wall('back',  'BACK WALL',  'EL-A', this.roomW, UNIT_DEPTH, 'hanging-only'),
          this.wall('left',  'LEFT WALL',  'EL-B', sideW,      UNIT_DEPTH, 'drawers-only'),
          this.wall('right', 'RIGHT WALL', 'EL-C', sideW,      UNIT_DEPTH, 'shoes-only'),
        ];
      }

      // ── Island: U-shape walls + central island unit ─────────────────────────
      case 'island': {
        const sideW = Math.max(this.roomD - UNIT_DEPTH, 36);
        const islandW = Math.max(Math.round(this.roomW * 0.5), 36);
        const islandH = 36; // counter height 36" A.F.F.
        return [
          this.wall('back',  'BACK WALL',  'EL-A', this.roomW, UNIT_DEPTH, 'hanging-only'),
          this.wall('left',  'LEFT WALL',  'EL-B', sideW,      UNIT_DEPTH, 'drawers-only'),
          this.wall('right', 'RIGHT WALL', 'EL-C', sideW,      UNIT_DEPTH, 'shoes-only'),
          this.buildIslandWall(islandW, islandH),
        ];
      }

      // â”€â”€ Corridor: Wall A (hanging) + Wall B (drawers + shoes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'corridor': {
        const wallW = Math.max(this.roomD, 48);  // length of the passageway
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

    // Drawer stack inside the island counter
    const drawers: DrawerConfig[] = [];
    let curY = DRAWER_MARG;
    if (this.wardrobe.jewelry) {
      drawers.push({ height: DRAWER_JEW, width: drawerW - 4, depth: UNIT_DEPTH - 6, position: curY, purpose: 'jewelry' });
      curY += DRAWER_JEW + DRAWER_GAP;
    }
    // Fill remaining height with shallow drawers for accessories
    const remaining = height - curY - DRAWER_MARG;
    const drawerCount = Math.max(Math.floor(remaining / (DRAWER_STD + DRAWER_GAP)), 1);
    for (let i = 0; i < drawerCount; i++) {
      drawers.push({ height: DRAWER_STD, width: drawerW - 4, depth: UNIT_DEPTH - 6, position: curY, purpose: i === 0 ? 'belts & ties' : 'accessories' });
      curY += DRAWER_STD + DRAWER_GAP;
    }
    zones.push({ type: 'drawers', x: 0, y: 0, width: drawerW, height, drawers, contentLabel: 'Island drawers' });

    // Open shelf compartment on the other side
    zones.push({
      type: 'top-shelves', x: drawerW, y: 0, width: shelfW, height,
      shelves: [
        { height: Math.round(height * 0.5), depth: UNIT_DEPTH - 4, spacing: Math.round(height * 0.5), count: 1, purpose: 'display' },
      ],
      contentLabel: 'Open display',
    });

    return {
      wallId: 'island-unit',
      label: 'ISLAND UNIT',
      elevationRef: 'EL-D',
      width,
      height,
      unitDepth: UNIT_DEPTH,
      zones,
    };
  }

  // â”€â”€ Role dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private buildZonesForRole(role: WallRole, W: number): ClosetZone[] {
    switch (role) {
      case 'all':              return this.buildAll(W);
      case 'hanging-only':     return this.buildHanging(W);
      case 'drawers-only':     return this.buildDrawersOnly(W);
      case 'shoes-only':       return this.buildShoesOnly(W);
      case 'drawers-and-shoes':return this.buildDrawersAndShoes(W);
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Role builders
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * ALL  -  single-wall layout: distributes every item type into columns.
   * Column order (Ch.14): long-hang | double-hang-with-drawers | shoe-shelves
   * AUDIT FIX: Suits are NEVER long-hang — they are double-hang (jacket upper, trousers lower)
   */
  private buildAll(W: number): ClosetZone[] {
    // AUDIT FIX (ISSUE 04): Suits belong entirely in double-hang, never long-hang
    // Long-hang is ONLY for: long dresses, coats, jumpsuits, maxi skirts, full robes
    const longItems  = this.wardrobe.longDresses;
    // Suits go to double-hang: jacket on upper rod, trousers on lower rod
    const shortItems = this.wardrobe.shirts + this.wardrobe.shortJackets +
                       this.wardrobe.pants + this.wardrobe.suits;
    const hasDrawers = this.hasAnyDrawers();
    const totalShoes = this.countShoes();

    const colTypes: ('long-hang' | 'short-hang' | 'shoe-shelves')[] = [];
    if (longItems  > 0)               colTypes.push('long-hang');
    if (shortItems > 0 || hasDrawers) colTypes.push('short-hang');
    if (totalShoes > 0)               colTypes.push('shoe-shelves');
    if (colTypes.length === 0)        colTypes.push('short-hang');

    const widths     = this.distributeWidths(colTypes, W);
    const drawerH    = hasDrawers ? this.calcDrawerStackHeight() : 0;
    const zones: ClosetZone[] = [];
    let curX = 0;

    colTypes.forEach((type, i) => {
      const cW = widths[i];
      if (type === 'shoe-shelves') {
        this.addShoeColumn(zones, curX, cW, TOE_KICK, this.H - TOE_KICK);
      } else if (type === 'long-hang') {
        this.addLongHangZone(zones, curX, cW, TOE_KICK, this.H - TOE_KICK);
      } else {
        if (hasDrawers && drawerH > 0) {
          this.buildDrawerAndHang(zones, curX, cW, drawerH);
        } else {
          this.addShortHangZone(zones, curX, cW, TOE_KICK, this.H - TOE_KICK);
        }
      }
      curX += cW;
    });

    return zones;
  }

  /**
   * HANGING-ONLY  -  back wall of walk-in types: rods span full height, no drawers.
   * Long-hang column (left) + double-hang column (right).
   * AUDIT FIX: Suits are NEVER long-hang — they are double-hang only
   */
  private buildHanging(W: number): ClosetZone[] {
    // AUDIT FIX (ISSUE 04): Suits belong entirely in double-hang, never long-hang
    const longItems  = this.wardrobe.longDresses;
    // All suits go to double-hang (jacket upper + trousers lower)
    const shortItems = this.wardrobe.shirts + this.wardrobe.shortJackets +
                       this.wardrobe.pants + this.wardrobe.suits;

    const hasLong  = longItems  > 0;
    const hasShort = shortItems > 0;

    const zones: ClosetZone[] = [];

    if (hasLong && hasShort) {
      // Split: long gets 38%, short gets 62%
      const longW  = Math.max(Math.round(W * 0.38), COL_HANG_MIN);
      const shortW = Math.max(W - longW, COL_HANG_MIN);
      this.addLongHangZone(zones, 0,     longW,  TOE_KICK, this.H - TOE_KICK);
      this.addShortHangZone(zones, longW, shortW, TOE_KICK, this.H - TOE_KICK);
    } else if (hasLong) {
      this.addLongHangZone(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    } else {
      // No inventory or short only  -  full wall double-hang
      this.addShortHangZone(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    }

    return zones;
  }

  /**
   * DRAWERS-ONLY  -  left wall of U-shape: all drawer inventory at base,
   * short-hang above.
   */
  private buildDrawersOnly(W: number): ClosetZone[] {
    const zones: ClosetZone[] = [];
    if (this.hasAnyDrawers()) {
      const dH = this.calcDrawerStackHeight();
      this.addDrawerZone(zones, 0, W, TOE_KICK, dH);
      this.addShortHangZone(zones, 0, W, TOE_KICK + dH, this.H - TOE_KICK - dH);
    } else {
      // No drawers â†’ full-height short hang
      this.addShortHangZone(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    }
    return zones;
  }

  /**
   * SHOES-ONLY  -  right wall of U-shape: dedicated shoe wall.
   */
  private buildShoesOnly(W: number): ClosetZone[] {
    const zones: ClosetZone[] = [];
    this.addShoeColumn(zones, 0, W, TOE_KICK, this.H - TOE_KICK);
    return zones;
  }

  /**
   * DRAWERS-AND-SHOES  -  L-shape side wall / corridor Wall B.
   * Left portion: drawers + short-hang. Right portion: shoe shelves (if room).
   */
  private buildDrawersAndShoes(W: number): ClosetZone[] {
    const totalShoes = this.countShoes();
    const zones: ClosetZone[] = [];

    if (totalShoes > 0 && W >= COL_HANG_MIN) {
      const shoeW = this.calcShoeColumnWidth();
      if (shoeW + COL_HANG_MIN > W) return this.buildDrawersOnly(W);
      const hangW = W - shoeW;
      // Hanging/drawer column (left)
      if (this.hasAnyDrawers()) {
        const dH = this.calcDrawerStackHeight();
        this.addDrawerZone(zones, 0, hangW, TOE_KICK, dH);
        this.addShortHangZone(zones, 0, hangW, TOE_KICK + dH, this.H - TOE_KICK - dH);
      } else {
        this.addShortHangZone(zones, 0, hangW, TOE_KICK, this.H - TOE_KICK);
      }
      // Shoe column (right)
      this.addShoeColumn(zones, hangW, shoeW, TOE_KICK, this.H - TOE_KICK);
    } else {
      // No room for shoe column  -  fallback to drawers-only
      return this.buildDrawersOnly(W);
    }

    return zones;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Zone construction helpers
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private addLongHangZone(out: ClosetZone[], x: number, w: number, yBottom: number, height: number) {
    const rodAFF = Math.min(yBottom + height - SHELF_THICK - ROD_INSET, ROD_LONG + 4);
    out.push({
      type: 'long-hang', x, y: yBottom, width: w, height,
      rods: [{ height: rodAFF, depth: this.D - 2, length: w - 4, purpose: 'long hang' }],
    });
  }

  private addShortHangZone(out: ClosetZone[], x: number, w: number, yBottom: number, height: number) {
    if (height < 30) return;  // not enough space for any hang zone
    const zoneTopAFF = yBottom + height;
    const upperRod   = Math.min(zoneTopAFF - SHELF_THICK - ROD_INSET, ROD_DBL_HI);
    const lowerRod   = Math.max(yBottom + 6, ROD_DBL_LO);
    const hasLower   = (upperRod - lowerRod) >= 32 && lowerRod > yBottom + 4;

    const rods: RodConfig[] = [
      { height: upperRod, depth: this.D - 2, length: w - 4, purpose: 'upper rod' },
    ];
    if (hasLower) {
      rods.push({ height: lowerRod, depth: this.D - 2, length: w - 4, purpose: 'lower rod' });
    }
    out.push({ type: 'double-hang', x, y: yBottom, width: w, height, rods });
  }

  private addDrawerZone(out: ClosetZone[], x: number, w: number, yBottom: number, totalH: number) {
    const drawers = this.buildDrawerList(w, yBottom, totalH);
    if (!drawers.length) return;
    out.push({ type: 'drawers', x, y: yBottom, width: w, height: totalH, drawers });
  }

  private addShoeColumn(out: ClosetZone[], x: number, w: number, yBottom: number, totalH: number) {
    const shelves = this.buildShoeShelves(totalH, w);
    if (!shelves.length) return;
    out.push({ type: 'shoe-shelves', x, y: yBottom, width: w, height: totalH, shelves });
  }

  // ── Drawer position dispatcher ───────────────────────────────────────────────

  /** Place drawers at bottom / middle / top of the short-hang column */
  private buildDrawerAndHang(out: ClosetZone[], x: number, w: number, drawerH: number): void {
    switch (this.drawerPosition) {
      case 'top': {
        const hangH = Math.max(this.H - TOE_KICK - drawerH, 20);
        this.addShortHangZone(out, x, w, TOE_KICK, hangH);
        this.addDrawerZone(out, x, w, TOE_KICK + hangH, drawerH);
        break;
      }
      case 'middle': {
        const totalHang = Math.max(this.H - TOE_KICK - drawerH, 40);
        const lowerH    = Math.max(Math.round(totalHang * 0.38), 20);
        const upperY    = TOE_KICK + lowerH + drawerH;
        const upperH    = this.H - upperY;
        this.addShortHangZone(out, x, w, TOE_KICK, lowerH);
        this.addDrawerZone(out, x, w, TOE_KICK + lowerH, drawerH);
        if (upperH >= 20) this.addShortHangZone(out, x, w, upperY, upperH);
        break;
      }
      default: // 'bottom'
        this.addDrawerZone(out, x, w, TOE_KICK, drawerH);
        this.addShortHangZone(out, x, w, TOE_KICK + drawerH, this.H - TOE_KICK - drawerH);
    }
  }

  // ── Zone annotation (inventory labels) ────────────────────────────────────

  /** Set contentLabel on each zone with an inventory summary — used by renderer */
  private annotateZones(zones: ClosetZone[]): void {
    const fmt = (n: number, s: string, p?: string) =>
      n > 0 ? `${n} ${n === 1 ? s : (p ?? s + 's')}` : null;

    for (const zone of zones) {
      switch (zone.type) {
        case 'long-hang': {
          // AUDIT FIX (ISSUE 04): Long-hang is ONLY for long dresses, coats, etc. — NEVER suits
          const parts = [
            fmt(this.wardrobe.longDresses, 'dress', 'dresses'),
            // Suits removed from long-hang per audit requirement
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'double-hang': {
          // AUDIT FIX (ISSUE 04): All suits go here (jacket upper rod, trousers lower rod)
          const parts = [
            fmt(this.wardrobe.shirts, 'shirt'),
            fmt(this.wardrobe.shortJackets, 'jacket'),
            fmt(this.wardrobe.pants, 'pant', 'pants'),
            // All suits counted in double-hang, not split with long-hang
            fmt(this.wardrobe.suits, 'suit'),
            fmt(this.wardrobe.ties, 'tie'),
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'drawers': {
          const parts = [
            this.wardrobe.jewelry ? 'Jewelry' : null,
            fmt(this.wardrobe.tShirts, 'T-shirt'),
            fmt(this.wardrobe.sweaters, 'sweater'),
            fmt(this.wardrobe.jeans, 'jean', 'jeans'),
            this.wardrobe.underwear > 0 ? 'Lingerie' : null,
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
        case 'shoe-shelves': {
          const parts = [
            fmt(this.shoes.sneakers, 'sneaker'),
            fmt(this.shoes.heels, 'heel'),
            fmt(this.shoes.boots, 'boot'),
            fmt(this.shoes.flats, 'flat'),
          ].filter(Boolean) as string[];
          if (parts.length) zone.contentLabel = parts.join(' · ');
          break;
        }
      }
    }
  }

  // ── Constraint warnings ──────────────────────────────────────────────────

  /** Soft constraint checks — returns designer-voice warnings for the UI */
  private checkZoneConstraints(walls: ClosetWall[]): LayoutWarning[] {
    const warnings: LayoutWarning[] = [];

    // Drawer position warnings
    if (this.hasAnyDrawers()) {
      if (this.drawerPosition === 'middle') {
        warnings.push({
          id:          'drawer-middle',
          message:     'Drawers at mid-height',
          designerNote:
            "Mid-height drawers sit beautifully at arm's reach — perfect for jewellery, " +
            'accessories, and anything you touch daily. For heavier folded items like jeans ' +
            'or sweaters, you may find the bottom position a little easier to load.',
          severity: 'info',
        });
      } else if (this.drawerPosition === 'top') {
        warnings.push({
          id:          'drawer-top',
          message:     'Drawers at the top',
          designerNote:
            'Top drawers are the perfect home for lightly-used seasonal pieces — travel ' +
            'clutches, spare scarves, sentimental items you treasure but rarely reach for. ' +
            'For anything you touch daily, Bottom or Middle will serve you better.',
          severity: 'info',
        });
        const drawerH = this.calcDrawerStackHeight();
        const hangH   = this.H - TOE_KICK - drawerH;
        if (hangH < 52) {
          warnings.push({
            id:          'hang-compressed',
            message:     'Hanging space is tighter than ideal',
            designerNote:
              `Moving drawers to the top has left ${hangH}" of hanging space. Your longer ` +
              'garments may sit closer to the floor than ideal — consider lowering the drawers ' +
              'back to Bottom, or confirm your ceiling height is generous enough.',
            severity: 'caution',
          });
        }
      }
    }

    // T3-01: Shelf span warning — any zone wider than 32" without centre support
    for (const wall of walls) {
      for (const zone of wall.zones) {
        if (zone.width > 32 && (zone.type === 'shoe-shelves' || zone.type === 'top-shelves')) {
          warnings.push({
            id:          `shelf-span-${zone.x}`,
            message:     `Wide shelf span: ${Math.round(zone.width)}"`,
            designerNote:
              `A ${Math.round(zone.width)}" shelf span exceeds the recommended 32" maximum without ` +
              'a centre support. Over time, shelves this wide can sag under weight. Consider adding ' +
              'a vertical divider or choosing a narrower configuration.',
            severity: 'caution',
          });
          break; // one warning per wall is enough
        }
      }
    }

    // T3-03: Overflow warning — single-wall types where inventory exceeds capacity
    if (this.closetType === 'reach-in' || this.closetType === 'wardrobe-wall') {
      const totalHang = this.wardrobe.longDresses + this.wardrobe.suits +
                        this.wardrobe.shirts + this.wardrobe.shortJackets + this.wardrobe.pants;
      const rodFtNeeded = Math.ceil(totalHang * 2 / 12);
      const rodFtAvail  = Math.round(this.W / 12);
      if (rodFtNeeded > rodFtAvail * 1.5) {
        warnings.push({
          id:          'overflow-capacity',
          message:     'Your wardrobe may exceed this wall\'s capacity',
          designerNote:
            `${totalHang} hanging items need approximately ${rodFtNeeded} ft of rod space, ` +
            `but this ${rodFtAvail} ft wall can comfortably hold about ${Math.round(rodFtAvail * 0.7 * 12 / 2)} items. ` +
            'Consider upgrading to a walk-in layout (L-shape or U-shape) for additional walls, ' +
            'or reduce your hanging inventory.',
          severity: 'caution',
        });
      }
    }

    return warnings;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Detail builders
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private buildDrawerList(colW: number, yBottom: number, totalH: number): DrawerConfig[] {
    const drawers: DrawerConfig[] = [];
    let curAFF = yBottom + DRAWER_MARG;
    const maxAFF = yBottom + totalH - DRAWER_MARG;

    if (this.wardrobe.jewelry && curAFF + DRAWER_JEW <= maxAFF) {
      drawers.push({ height: DRAWER_JEW, width: colW - 4, depth: this.D - 6, position: curAFF, purpose: 'jewelry' });
      curAFF += DRAWER_JEW + DRAWER_GAP;
    }
    while (curAFF + DRAWER_STD <= maxAFF) {
      drawers.push({ height: DRAWER_STD, width: colW - 4, depth: this.D - 6, position: curAFF, purpose: 'folded' });
      curAFF += DRAWER_STD + DRAWER_GAP;
    }
    return drawers;
  }

  /** Shoe shelf heights are stored RELATIVE to zone.y (renderer adds zone.y). */
  private buildShoeShelves(totalH: number, colW: number): ShelfConfig[] {
    const shelves: ShelfConfig[] = [];
    let relH = DRAWER_MARG;
    const maxRelH = totalH - SHELF_THICK;

    // Stack order: tallest (boots) at top â†’ compact (flats) at bottom  â†’  per Ch.15
    const order: (keyof ShoeCollection)[] = ['boots', 'heels', 'sneakers', 'flats'];
    for (const key of order) {
      const count = this.shoes[key];
      if (count <= 0) continue;
      // How many pairs fit side-by-side given the actual column width
      const pairsPerShelf = Math.max(1, Math.floor((colW - 4) / SHOE_PAIR_W[key]));
      const rows  = Math.ceil(count / pairsPerShelf);
      const space = SHOE_SPACING[key];
      for (let r = 0; r < rows; r++) {
        if (relH + SHELF_THICK > maxRelH) break;
        shelves.push({ height: relH, depth: 12, spacing: space, count: pairsPerShelf, purpose: key });
        relH += space + SHELF_THICK;
      }
    }
    return shelves;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Width distribution
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /** Returns the minimum required shoe-column width based on inventory.
   *  Rule: 1.5" per pair, never less than the default COL_SHOE_W (24"). */
  private calcShoeColumnWidth(): number {
    const total = this.countShoes();
    if (total === 0) return COL_SHOE_W;
    return Math.max(COL_SHOE_W, Math.round(total * 1.5));
  }

  private distributeWidths(types: ('long-hang' | 'short-hang' | 'shoe-shelves')[], W: number): number[] {
    const shoeColW   = this.calcShoeColumnWidth();
    const shoeCount  = types.filter(t => t === 'shoe-shelves').length;
    const shortCount = types.filter(t => t === 'short-hang').length;
    const longCount  = types.filter(t => t === 'long-hang').length;

    const shoeTotal = shoeCount * shoeColW;
    const hangAvail = Math.max(W - shoeTotal, (longCount + shortCount) * COL_HANG_MIN);

    // T1-02: Priority-aware ratio — adjust based on user priority items
    let longRatio = 0.38;  // default ratio for long-hang
    const prio = this.prefs.priorityItems ?? [];
    if (prio.includes('hanging') && !prio.includes('shoes') && !prio.includes('folded')) {
      longRatio = 0.45;   // more space when hanging is top priority
    } else if (prio.includes('shoes') || prio.includes('folded')) {
      longRatio = 0.32;   // less long-hang when shoes/folded take priority
    }

    // T3-05: Integer ratio rounding — snap to nearest common ratio
    // For 2-column layouts: 1:2, 1:1.5, 1:1 ratios
    const rawLong  = longCount  > 0 ? Math.max(Math.round(hangAvail * longRatio), COL_HANG_MIN) : 0;
    const rawShort = shortCount > 0 ? Math.max(hangAvail - rawLong, COL_HANG_MIN) : 0;

    // Snap widths to integer inches for clean SVG lines
    const snapLong  = Math.round(rawLong);
    const snapShort = shortCount > 0 ? hangAvail - snapLong : 0;

    return types.map(t => {
      if (t === 'shoe-shelves') return shoeColW;
      if (t === 'long-hang')    return snapLong;
      return Math.max(snapShort, COL_HANG_MIN);
    });
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Drawer height calculator
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private calcDrawerStackHeight(): number {
    let count = 0;
    if (this.wardrobe.jewelry)       count += 1;
    count += Math.ceil(this.wardrobe.tShirts  / 10);
    count += Math.ceil(this.wardrobe.sweaters /  5);
    if (this.wardrobe.jeans     > 0) count += 1;
    if (this.wardrobe.underwear > 0) count += 1;
    if (this.wardrobe.ties      > 0) count += 1;
    count = Math.max(count, 2);
    count = Math.min(count, 5);

    const jewH   = this.wardrobe.jewelry ? DRAWER_JEW : 0;
    const stdCnt = this.wardrobe.jewelry ? count - 1 : count;
    return Math.round(jewH + stdCnt * DRAWER_STD + (count - 1) * DRAWER_GAP + DRAWER_MARG * 2);
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Inventory helpers
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private hasAnyDrawers(): boolean {
    return (
      this.wardrobe.tShirts + this.wardrobe.sweaters +
      this.wardrobe.jeans   + this.wardrobe.underwear
    ) > 0 || !!this.wardrobe.jewelry || this.wardrobe.ties > 0;
  }

  private countShoes(): number {
    return this.shoes.sneakers + this.shoes.heels + this.shoes.boots + this.shoes.flats;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Aisle checks (Ch.4 of Closet Models doc)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private checkAisles(): string[] {
    const warnings: string[] = [];
    const UD = UNIT_DEPTH;

    switch (this.closetType) {
      case 'walkin-single':
      case 'walkin-l': {
        const aisle = this.roomD - UD;
        if (aisle < MIN_AISLE)
          warnings.push(` Front aisle is ${aisle}"  -  minimum is ${MIN_AISLE}". Consider reducing unit depth or widening the room.`);
        break;
      }
      case 'walkin-u':
      case 'island': {
        const lrAisle = this.roomW - UD * 2;
        const fbAisle = this.roomD - UD;
        if (lrAisle < MIN_AISLE)
          warnings.push(` Left-right aisle is ${lrAisle}"  -  minimum is ${MIN_AISLE}". Room width too narrow for U-shape units.`);
        if (fbAisle < MIN_AISLE)
          warnings.push(` Front-back aisle is ${fbAisle}"  -  minimum is ${MIN_AISLE}". Reduce unit depth or deepen the room.`);
        break;
      }
      case 'corridor': {
        const aisle = this.roomW - UD * 2;
        if (aisle < MIN_AISLE)
          warnings.push(` Corridor aisle is ${aisle}"  -  minimum ${MIN_AISLE}" needed. Room is ${this.roomW}" wide; needs at least ${UD * 2 + MIN_AISLE}".`);
        break;
      }
    }
    return warnings;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Storage & utilisation summaries
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private calcStorage(walls: ClosetWall[]) {
    let hangingRods = 0, shelfSpace = 0, drawerCount = 0, shoeCapacity = 0;
    for (const w of walls) {
      for (const z of w.zones) {
        if (z.rods)    hangingRods  += z.rods.reduce((s, r) => s + r.length, 0) / 12;
        if (z.shelves) {
          for (const sh of z.shelves) {
            shelfSpace += (z.width / 12) * (sh.depth / 12);
            // Only shoe-shelf zones contribute to shoe capacity
            if (z.type === 'shoe-shelves') {
              // Capacity per shelf depends on shoe type and zone width
              const pairsPerShelf = Math.max(1, Math.floor(z.width / 6));
              shoeCapacity += pairsPerShelf;
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
    // Compare inventory demand vs provided capacity across three dimensions:
    // hanging linear feet, drawer count, and shoe pairs
    const storage = this.calcStorage(walls);
    const wrd     = this.wardrobe;

    // Hanging demand: ~2.5" per long-hang item, ~1.8" per short-hang item → linear feet
    const longHang  = (wrd.longDresses ?? 0) + (wrd.suits ?? 0);
    const shortHang = (wrd.shirts ?? 0) + (wrd.shortJackets ?? 0) + (wrd.pants ?? 0);
    const hangDemand  = (longHang * 2.5 + shortHang * 1.8) / 12;
    const hangSupply  = Math.max(storage.hangingRods, 0.01);

    // Drawer demand: ~10 folded items per drawer
    const folded       = (wrd.tShirts ?? 0) + (wrd.sweaters ?? 0) + (wrd.jeans ?? 0) + (wrd.underwear ?? 0);
    const drawerDemand = Math.ceil(folded / 10);
    const drawerSupply = Math.max(storage.drawerCount, 0.01);

    // Shoe demand
    const shoeDemand = this.countShoes();
    const shoeSupply = Math.max(storage.shoeCapacity, 0.01);

    // Weighted average of utilization ratios (hanging 40%, drawers 30%, shoes 30%)
    const hangUtil   = Math.min(hangDemand / hangSupply, 1.5);
    const drawerUtil = Math.min(drawerDemand / drawerSupply, 1.5);
    const shoeUtil   = Math.min(shoeDemand / shoeSupply, 1.5);

    const rawScore = (hangUtil * 0.4 + drawerUtil * 0.3 + shoeUtil * 0.3) * 100;
    return Math.min(Math.round(rawScore), 100);
  }

  private calcRecommendations(walls: ClosetWall[]): string[] {
    const recs: string[] = [];
    const shoes  = this.countShoes();
    const wrd    = this.wardrobe;
    const userType = this.prefs?.userType ?? 'homeowner';

    // ── Personalization-aware recommendations ──
    if (userType === 'renter') {
      recs.push('Renter tip: Consider freestanding closet systems (IKEA PAX, Elfa) that don\'t require wall anchoring. Keep receipts for security deposit returns.');
      if (this.closetType !== 'reach-in' && this.closetType !== 'wardrobe-wall') {
        recs.push('As a renter, check with your landlord before modifying walk-in closets. Tension-rod systems and freestanding units work well.');
      }
    }
    if (userType === 'designer') {
      recs.push('Designer note: All measurements are in inches. Elevation drawings include AFF (Above Finished Floor) references for construction documents.');
      recs.push('Export PDF includes Smart Suggestions suitable for client presentation. Edit design name before exporting for professional labeling.');
    }

    // Layout type summary
    const typeNotes: Partial<Record<ClosetType, string>> = {
      'walkin-u':      'U-shape walk-in: 3 elevation drawings - EL-A (back), EL-B (left), EL-C (right).',
      'walkin-l':      'L-shape walk-in: 2 elevation drawings - EL-A (back wall) and EL-B (side wall).',
      'island':        'Island walk-in: U-shape walls generated. Island unit to be specified separately.',
      'corridor':      'Corridor walk-in: 2 facing walls - EL-A (hanging) and EL-B (storage).',
      'walkin-single': 'Single-wall walk-in: back wall fitted, aisle confirmed.',
    };
    const note = typeNotes[this.closetType];
    if (note) recs.push(note);

    // Hanging inventory analysis
    const longHang  = (wrd.longDresses ?? 0) + (wrd.suits ?? 0);
    const shortHang = (wrd.shirts ?? 0) + (wrd.shortJackets ?? 0) + (wrd.pants ?? 0);
    const totalHang = longHang + shortHang;
    if (totalHang > 0) {
      const ftNeeded = Math.ceil((longHang * 2.5 + shortHang * 1.8) / 12);
      recs.push(`${totalHang} hanging items require approx. ${ftNeeded} linear ft of rod space across all walls.`);
    }

    // Double-hang opportunity
    if ((wrd.shirts ?? 0) > 15) {
      const ftSaved = Math.round((wrd.shirts ?? 0) * 1.8 / 12 * 0.45);
      recs.push(`${wrd.shirts} shirts: double-hang layout saves approx. ${ftSaved} linear ft.`);
    }

    // Folded items / drawers
    const folded = (wrd.tShirts ?? 0) + (wrd.sweaters ?? 0) + (wrd.jeans ?? 0) + (wrd.underwear ?? 0);
    if (folded > 0) {
      const drawersNeeded = Math.ceil(folded / 10);
      recs.push(`${folded} folded items require approx. ${drawersNeeded} drawers. ${drawersNeeded > 8 ? 'A dedicated drawer column is recommended.' : 'Covered by the current drawer stack.'}`);
    }

    // Shoes
    if (shoes > 0) {
      const shelvesNeeded = Math.ceil(shoes / 4);
      recs.push(`${shoes} shoe pairs need approx. ${shelvesNeeded} shelves.${shoes > 30 ? ' A dedicated shoe wall section is recommended.' : ''}`);
    }

    if (this.H < 84) recs.push('Ceiling height below 7 ft - rod heights adjusted to maximise hanging space.');
    if (this.W < 60) recs.push('Compact layout: priority items at most accessible height (18 in. to 60 in. A.F.F.).');
    if (walls.every(w => w.zones.length === 0)) recs.push('Complete your wardrobe inventory to generate a tailored layout.');

    // T3-04: Reach zone labeling by A.F.F.
    if (walls.some(w => w.zones.length > 0)) {
      recs.push(
        'Reach zones — Zone 1 (floor–18" A.F.F.): seasonal/heavy items. ' +
        'Zone 2 (18"–60" A.F.F.): daily-reach prime storage. ' +
        'Zone 3 (60"–ceiling): overhead display & seldom-used items.',
      );
    }

    // T3-02: Kids closet — suggest lower rod height
    const allItems = [
      wrd.longDresses, wrd.suits, wrd.shirts, wrd.shortJackets, wrd.pants,
      wrd.tShirts, wrd.sweaters, wrd.jeans, wrd.underwear,
    ];
    const nonZero = allItems.filter(n => n > 0);
    if (nonZero.length > 0 && nonZero.every(n => n <= 5)) {
      recs.push(
        'Small wardrobe detected (≤ 5 each category) — likely a child\'s closet. ' +
        'Consider a single rod at 36"–42" A.F.F. for easy reach, with shelves above.',
      );
    }

    // T1-03: Villa amenities recommendations
    const am = this.amenities;
    if (am.island)         recs.push('Island unit: central counter with integrated jewellery drawers and belt/tie hooks. Requires min. 36" clear aisle around all sides.');
    if (am.vanity)         recs.push('Vanity station: recommend 30"–36" wide × 30" high counter with mirror above and seated clearance below.');
    if (am.seating)        recs.push('Seating area: ottoman or bench — allocate 24"–30" depth × 48" minimum width in the aisle zone.');
    if (am.mirrorWall)     recs.push('Full mirror wall: place on door-facing wall or opposite the primary hanging wall for maximum visual depth.');
    if (am.displayShelves) recs.push('Open display shelves: glass or floating shelves for handbags/collectibles — recommend 12" depth × 14" spacing.');
    if (am.safe)           recs.push('Hidden safe: integrate into the drawer column base, behind a false panel — standard 14" × 14" × 10" internal.');
    if (am.shoeWall)       recs.push('Dedicated shoe display wall: angled shelves (15° tilt) with LED strip under each shelf for gallery effect.');
    if (am.lighting)       recs.push('Feature lighting: LED strips under shelves and inside glass-door cabinets. Warm white (2700K–3000K) for wood tones.');

    return recs;
  }
}
