import { ClosetLayout, UserPreferences } from "@/types/closet";

const ROD_COST_PER_FT = 12;
const SHELF_COST_BY_FINISH: Record<UserPreferences["woodFinish"], number> = {
  light: 42,
  medium: 50,
  dark: 58,
  white: 38,
};
const DRAWER_COST_EACH = 135;
const BASE_INSTALL = 380;

export interface CostBreakdown {
  rods: number;
  shelves: number;
  drawers: number;
  baseInstall: number;
  diyTotal: number;
  proTotal: number;
}

export function estimateCostRange(
  layout: ClosetLayout,
  finish: UserPreferences["woodFinish"],
): CostBreakdown {
  const rods = Math.round(layout.totalStorage.hangingRods * ROD_COST_PER_FT);

  const shelfCount = layout.walls.reduce(
    (sum, wall) =>
      sum +
      wall.zones.reduce(
        (zoneSum, zone) =>
          zoneSum + (zone.shelves?.reduce((acc, shelf) => acc + (shelf.count ?? 1), 0) ?? 0),
        0,
      ),
    0,
  );

  const shelves = shelfCount * SHELF_COST_BY_FINISH[finish];
  const drawers = layout.totalStorage.drawerCount * DRAWER_COST_EACH;

  const diyTotal = rods + shelves + drawers;
  const proTotal = Math.round(diyTotal * 1.35 + BASE_INSTALL);

  return {
    rods,
    shelves,
    drawers,
    baseInstall: BASE_INSTALL,
    diyTotal,
    proTotal,
  };
}
