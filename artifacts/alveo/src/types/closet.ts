// Core closet data types for the Alvéo configurator

// ── Closet shape / type ──────────────────────────────────────────────────────
export type ClosetType =
  | 'reach-in'       // single wall, door, no entry space
  | 'walkin-single'  // dedicated room, one fitted wall
  | 'walkin-l'       // two walls at 90° — back + one side
  | 'walkin-u'       // three walls — back + both sides (luxury standard)
  | 'island'         // U-shape + central island unit
  | 'corridor'       // two facing walls, narrow central aisle
  | 'wardrobe-wall'; // full bedroom wall, no separate room

// ── Room footprint (walk-in types) ──────────────────────────────────────────
export interface RoomDimensions {
  roomWidth: number;  // interior room width wall-to-wall (inches)
  roomDepth: number;  // interior room depth door-to-back (inches)
}

export interface ClosetDimensions {
  width: number; // inches
  height: number; // inches  
  depth: number; // inches
}

export interface ShoeCollection {
  sneakers: number; // ~5" height
  heels: number; // ~6" height
  boots: number; // ~12" height
  flats: number; // ~4" height
}

export interface WardrobeItems {
  // Hanging items
  longDresses: number; // 50-60" hanging space
  shortJackets: number; // 30-36" hanging space  
  suits: number; // 40-45" hanging space
  shirts: number; // 28-32" hanging space
  pants: number; // 40-44" hanging space (folded over hanger)
  
  // Folded items (for drawers/shelves)
  tShirts: number;
  sweaters: number;
  jeans: number;
  underwear: number;
  
  // Accessories
  bags: number;
  belts: number;
  jewelry: boolean;
  ties: number;
}

export interface LightingOptions {
  underShelfLED?: boolean;   // warm LED strip under every shelf board
  overheadRail?: boolean;    // ceiling-mounted track / rail lighting
  puckLights?: boolean;      // individual puck lights recessed under shelves
  islandPendant?: boolean;   // pendant fitting above island unit
}

export type DoorType =
  | 'open'              // no doors — open closet
  | 'sliding-mirror'    // sliding panels with mirror face
  | 'sliding-glass'     // sliding frosted-glass panels
  | 'bifold'            // bifold wood panels
  | 'french-panel';     // swing-open French-style panels

export interface AccessoryItem {
  id: string;
  name: string;
  category: 'drawer-insert' | 'hanging' | 'storage' | 'mirror' | 'lighting';
  qty: number;
  unitPrice: number;
}

export interface RoomContext {
  wallColor?: string;  // hex colour for the room wall visible behind the closet
  floorType?: 'hardwood' | 'marble' | 'carpet' | 'tile' | 'herringbone';
}

export interface UserPreferences {
  userType: 'homeowner' | 'renter' | 'designer' | 'browsing';
  stylePreference: 'minimal' | 'glam' | 'rustic' | 'modern' | 'luxury';
  woodFinish: 'light' | 'medium' | 'dark' | 'white';
  drawerPreference: 'many-small' | 'few-large' | 'mixed';
  priorityItems: ('shoes' | 'hanging' | 'folded' | 'accessories')[];
  hardwareFinish?: HardwareFinish;
  accentColor?: string;
  foldedStorage?: FoldedStorageStyle;  // drawers (default) or open shelves
}

// ── Zone customisation ───────────────────────────────────────────────────────
export type DrawerPosition = 'bottom' | 'middle' | 'top';

export interface ZoneOverrides {
  drawerPosition?: DrawerPosition;   // reposition drawer stack within its column
  valetRod?: boolean;               // add a small pull-out valet rod
}

/** Shelf display style for folded items */
export type FoldedStorageStyle = 'drawers' | 'open-shelves';

/** Hardware finish for pulls, handles, and rods */
export type HardwareFinish = 'chrome' | 'brass' | 'matte-black' | 'nickel';

export interface LayoutWarning {
  id:           string;
  message:      string;         // short description shown as toast header
  designerNote: string;         // Alvéo-voice paragraph shown to user
  severity:     'info' | 'caution';
}

export interface ClosetZone {
  type: 'double-hang' | 'long-hang' | 'shoe-shelves' | 'drawers' | 'open-shelves' | 'top-shelves' | 'accessories';
  x: number; // position from left
  y: number; // position from bottom  
  width: number;
  height: number;
  shelves?: ShelfConfig[];
  rods?: RodConfig[];
  drawers?: DrawerConfig[];
  contentLabel?: string;   // e.g. "15 shirts · 8 blazers" — populated by engine
  valetRod?: boolean;      // pull-out valet rod at the top of this zone
}

// ── Fitted wall — one elevation in a multi-wall walk-in ──────────────────────
export interface ClosetWall {
  wallId: 'back' | 'left' | 'right' | 'corridor-a' | 'corridor-b' | 'island-unit';
  label: string;         // 'BACK WALL' / 'LEFT WALL' etc.
  elevationRef: string;  // 'EL-A' / 'EL-B' / 'EL-C'
  width: number;         // fitted-wall width (inches)
  height: number;        // ceiling height (inches)
  unitDepth: number;     // storage unit depth, typically 24"
  zones: ClosetZone[];
}

export interface ShelfConfig {
  height: number; // inches from bottom of zone
  depth: number;
  spacing: number; // height between shelves
  count: number;
  purpose: string; // "shoes", "folded items", "bags", etc.
}

export interface RodConfig {
  height: number; // inches from bottom of zone
  depth: number;
  length: number;
  purpose: string; // "short hang", "long hang", etc.
}

export interface DrawerConfig {
  height: number;
  width: number; 
  depth: number;
  position: number; // height from bottom
  purpose: string; // "jewelry", "ties", "folded tees", etc.
}

export interface ClosetLayout {
  closetType: ClosetType;              // what shape this closet is
  dimensions: ClosetDimensions;        // primary wall / room dimensions
  walls: ClosetWall[];                 // all fitted walls (1 for single-wall, 2-3 for walk-in)
  zones: ClosetZone[];                 // backward-compat: first (or selected) wall's zones
  aisleWarnings: string[];             // flagged if any aisle < 36"
  inputWarnings?: string[];            // values clamped by the input normaliser
  layoutWarnings: LayoutWarning[];     // soft warnings for zone positioning choices
  totalStorage: {
    hangingRods: number;   // total linear feet across all walls
    shelfSpace: number;    // total sq ft across all walls
    drawerCount: number;
    shoeCapacity: number;  // pairs
  };
  utilizationScore: number;
  recommendations: string[];
}

export interface VillaAmenities {
  island?:         boolean;  // central island unit
  seating?:        boolean;  // seating / ottoman
  vanity?:         boolean;  // vanity + mirror
  mirrorWall?:     boolean;  // full mirror wall
  displayShelves?: boolean;  // open display shelves
  safe?:           boolean;  // hidden safe
  shoeWall?:       boolean;  // dedicated shoe display wall
  lighting?:       boolean;  // feature / accent lighting
}

export interface ClosetConfiguration {
  closetType?: ClosetType;           // set in step 0 — the shape question
  userInfo: UserPreferences;
  dimensions: ClosetDimensions;
  roomDimensions?: RoomDimensions;   // set for walk-in types
  wardrobe: WardrobeItems;
  shoes: ShoeCollection;
  amenities?: VillaAmenities;        // villa mode only
  layout?: ClosetLayout;
  zoneOverrides?: ZoneOverrides;
  lighting?: LightingOptions;        // lighting specification (T003)
  doorType?: DoorType;               // door / opening type (T004)
  accessories?: AccessoryItem[];     // selected accessories with qty (T005)
  roomContext?: RoomContext;         // wall colour + floor type (T006)
}

// Calculation constants based on real closet design principles
export const CLOSET_CONSTANTS = {
  // Hanging heights (from floor)
  LONG_HANG_MIN: 50, // dresses, coats
  SHORT_HANG_MIN: 32, // shirts, jackets
  DOUBLE_HANG_UPPER: 80, // upper rod in double hang
  DOUBLE_HANG_LOWER: 40, // lower rod in double hang
  
  // Shoe shelving
  SHOE_SHELF_DEPTHS: {
    sneakers: 12,
    heels: 10, 
    boots: 14,
    flats: 10
  },
  SHOE_HEIGHTS: {
    sneakers: 5,
    heels: 6,
    boots: 12, 
    flats: 4
  },
  
  // Standard measurements
  STANDARD_DEPTH: 24, // standard closet depth
  MIN_WALKWAY: 36, // minimum space to walk/dress
  SHELF_THICKNESS: 0.75,
  ROD_CLEARANCE: 2, // space above hanging items
  
  // Drawer specifications  
  DRAWER_HEIGHTS: {
    jewelry: 3,
    ties: 4,
    underwear: 6,
    tShirts: 8,
    sweaters: 10
  }
} as const;

/** Input to the layout engine — explicit interface so all fields are visible */
export interface ClosetCalculationInput {
  closetType?: ClosetType;         // defaults to 'reach-in' if omitted
  dimensions: ClosetDimensions;
  roomDimensions?: RoomDimensions;
  wardrobe: WardrobeItems;
  shoes: ShoeCollection;
  userInfo: UserPreferences;
  zoneOverrides?: ZoneOverrides;
  amenities?: VillaAmenities;      // villa mode only
}
export type CalculationResult = ClosetLayout;

// ─── Saved design entry ──────────────────────────────────────────────────────
// Persisted in localStorage; one entry per saved closet configuration.
export interface SavedDesign {
  id: string;
  name: string;
  config: Partial<ClosetConfiguration>;
  savedAt: string; // ISO date string (JSON-serialisable)
}