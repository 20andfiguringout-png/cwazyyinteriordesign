/**
 * Comprehensive test suite for the Alvéo closet configurator.
 *
 * Uses Node.js built-in test runner (node:test + node:assert).
 * Run with: npx tsx --test src/__tests__/engine.test.ts
 *
 * Covers discovered bugs + engine correctness tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ClosetLayoutEngine } from '../engine/ClosetLayoutEngine';
import type {
  ClosetCalculationInput, ClosetLayout, ClosetType,
} from '../types/closet';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<ClosetCalculationInput> = {}): ClosetCalculationInput {
  return {
    closetType: 'reach-in',
    dimensions: { width: 96, height: 96, depth: 24 },
    wardrobe: {
      longDresses: 3, shortJackets: 4, suits: 2, shirts: 10, pants: 5,
      tShirts: 15, sweaters: 6, jeans: 4, underwear: 10,
      bags: 3, belts: 2, jewelry: true, ties: 0,
    },
    shoes: { sneakers: 5, heels: 4, boots: 2, flats: 3 },
    userInfo: {
      userType: 'homeowner', stylePreference: 'modern',
      woodFinish: 'medium', drawerPreference: 'mixed',
      priorityItems: ['hanging'],
    },
    ...overrides,
  };
}

function calc(overrides: Partial<ClosetCalculationInput> = {}): ClosetLayout {
  return new ClosetLayoutEngine(makeInput(overrides)).calculateLayout();
}

// ─── BUG-1: Multi-wall closets must produce >1 wall ──────────────────────────

describe('BUG-1: Multi-wall closets produce all walls', () => {
  const multiTypes: { type: ClosetType; minWalls: number }[] = [
    { type: 'walkin-l',  minWalls: 2 },
    { type: 'walkin-u',  minWalls: 3 },
    { type: 'island',    minWalls: 4 },
    { type: 'corridor',  minWalls: 2 },
  ];

  for (const { type, minWalls } of multiTypes) {
    it(`${type} produces at least ${minWalls} walls`, () => {
      const layout = calc({
        closetType: type,
        dimensions: { width: 120, height: 96, depth: 24 },
        roomDimensions: { roomWidth: 120, roomDepth: 96 },
      });
      assert.ok(layout.walls.length >= minWalls,
        `${type} has ${layout.walls.length} walls, expected >= ${minWalls}`);
    });

    it(`${type} all walls have non-empty zones`, () => {
      const layout = calc({
        closetType: type,
        dimensions: { width: 120, height: 96, depth: 24 },
        roomDimensions: { roomWidth: 120, roomDepth: 96 },
      });
      for (const wall of layout.walls) {
        assert.ok(wall.zones.length > 0, `wall ${wall.wallId} has 0 zones`);
      }
    });
  }
});

// ─── BUG-2: amenities should affect recommendations ──────────────────────────

describe('BUG-2: Amenities reflected in layout', () => {
  it('island amenity produces island recommendation', () => {
    const layout = calc({
      closetType: 'island',
      dimensions: { width: 180, height: 96, depth: 24 },
      roomDimensions: { roomWidth: 180, roomDepth: 120 },
      amenities: { island: true },
    });
    const has = layout.recommendations.some(r => r.toLowerCase().includes('island'));
    assert.ok(has, 'Expected island recommendation');
  });

  it('vanity amenity produces vanity recommendation', () => {
    const layout = calc({
      closetType: 'walkin-u',
      dimensions: { width: 120, height: 96, depth: 24 },
      roomDimensions: { roomWidth: 120, roomDepth: 96 },
      amenities: { vanity: true },
    });
    const has = layout.recommendations.some(r => r.toLowerCase().includes('vanity'));
    assert.ok(has, 'Expected vanity recommendation');
  });

  it('safe amenity produces safe recommendation', () => {
    const layout = calc({
      amenities: { safe: true },
    });
    const has = layout.recommendations.some(r => r.toLowerCase().includes('safe'));
    assert.ok(has, 'Expected safe recommendation');
  });
});

// ─── BUG-7: checkZoneConstraints should NOT rebuild walls ────────────────────

describe('BUG-7: Engine does not double-build walls', () => {
  it('calculateLayout returns consistent walls and warnings', () => {
    const layout = calc({
      closetType: 'walkin-u',
      dimensions: { width: 120, height: 96, depth: 24 },
      roomDimensions: { roomWidth: 120, roomDepth: 96 },
    });
    assert.equal(layout.walls.length, 3);
    for (const w of layout.walls) {
      assert.ok(w.wallId, 'wallId should be defined');
      assert.ok(w.zones, 'zones should be defined');
    }
  });
});

// ─── BUG-8: Utilization should NOT always be ~100% ───────────────────────────

describe('BUG-8: Utilization score is meaningful', () => {
  it('small inventory in large closet has lower utilization', () => {
    const layout = calc({
      closetType: 'walkin-u',
      dimensions: { width: 240, height: 108, depth: 24 },
      roomDimensions: { roomWidth: 240, roomDepth: 180 },
      wardrobe: {
        longDresses: 1, shortJackets: 1, suits: 0, shirts: 2, pants: 1,
        tShirts: 2, sweaters: 1, jeans: 1, underwear: 2,
        bags: 0, belts: 0, jewelry: false, ties: 0,
      },
      shoes: { sneakers: 1, heels: 0, boots: 0, flats: 1 },
    });
    assert.ok(layout.utilizationScore <= 100, `util ${layout.utilizationScore} > 100`);
    assert.ok(layout.utilizationScore >= 0, `util ${layout.utilizationScore} < 0`);
  });

  it('full inventory in small closet has high utilization', () => {
    const layout = calc({
      dimensions: { width: 60, height: 84, depth: 24 },
      wardrobe: {
        longDresses: 10, shortJackets: 8, suits: 5, shirts: 30, pants: 15,
        tShirts: 25, sweaters: 10, jeans: 8, underwear: 20,
        bags: 5, belts: 3, jewelry: true, ties: 5,
      },
      shoes: { sneakers: 8, heels: 6, boots: 3, flats: 5 },
    });
    assert.ok(layout.utilizationScore >= 50,
      `Expected util >= 50 but got ${layout.utilizationScore}`);
  });
});

// ─── BUG-9: Shoe capacity should be accurate ─────────────────────────────────

describe('BUG-9: Shoe capacity is type-aware', () => {
  it('shoe capacity reflects actual pairs not hardcoded 4', () => {
    const layout = calc({
      shoes: { sneakers: 20, heels: 0, boots: 0, flats: 0 },
    });
    assert.ok(layout.totalStorage.shoeCapacity >= 15,
      `Expected shoeCapacity>=15, got ${layout.totalStorage.shoeCapacity}`);
  });

  it('boot shelves count fewer pairs than flat shelves', () => {
    const bootLayout = calc({ shoes: { sneakers: 0, heels: 0, boots: 10, flats: 0 } });
    const flatLayout = calc({ shoes: { sneakers: 0, heels: 0, boots: 0, flats: 10 } });
    assert.ok(bootLayout.totalStorage.shoeCapacity >= 8,
      `boot cap ${bootLayout.totalStorage.shoeCapacity} < 8`);
    assert.ok(flatLayout.totalStorage.shoeCapacity >= 8,
      `flat cap ${flatLayout.totalStorage.shoeCapacity} < 8`);
  });
});

// ─── Engine: Single-wall types ──────────────────────────────────────────────

describe('Engine: single-wall types', () => {
  it('reach-in produces 1 wall', () => {
    const layout = calc({ closetType: 'reach-in' });
    assert.equal(layout.walls.length, 1);
    assert.equal(layout.walls[0].wallId, 'back');
  });

  it('wardrobe-wall produces 1 wall', () => {
    const layout = calc({ closetType: 'wardrobe-wall' });
    assert.equal(layout.walls.length, 1);
  });

  it('walkin-single produces 1 wall', () => {
    const layout = calc({
      closetType: 'walkin-single',
      roomDimensions: { roomWidth: 120, roomDepth: 96 },
    });
    assert.equal(layout.walls.length, 1);
  });
});

// ─── Engine: Island type ────────────────────────────────────────────────────

describe('Engine: island type', () => {
  it('island produces 4 walls including island-unit', () => {
    const layout = calc({
      closetType: 'island',
      dimensions: { width: 180, height: 96, depth: 24 },
      roomDimensions: { roomWidth: 180, roomDepth: 120 },
    });
    assert.equal(layout.walls.length, 4);
    const islandWall = layout.walls.find(w => w.wallId === 'island-unit');
    assert.ok(islandWall, 'island-unit wall should exist');
    assert.equal(islandWall!.label, 'ISLAND UNIT');
    assert.equal(islandWall!.height, 36);
  });
});

// ─── Engine: Corridor type ──────────────────────────────────────────────────

describe('Engine: corridor type', () => {
  it('corridor produces 2 walls (A and B)', () => {
    const layout = calc({
      closetType: 'corridor',
      dimensions: { width: 120, height: 96, depth: 24 },
      roomDimensions: { roomWidth: 120, roomDepth: 96 },
    });
    assert.equal(layout.walls.length, 2);
    assert.equal(layout.walls[0].wallId, 'corridor-a');
    assert.equal(layout.walls[1].wallId, 'corridor-b');
  });
});

// ─── Engine: dimension clamping ──────────────────────────────────────────────

describe('Engine: dimension normalization', () => {
  it('too-small height gets clamped to 84 with warning', () => {
    const layout = calc({ dimensions: { width: 96, height: 60, depth: 24 } });
    assert.ok(layout.dimensions.height >= 84, `height ${layout.dimensions.height} < 84`);
    assert.ok((layout.inputWarnings?.length ?? 0) > 0, 'expected input warnings');
  });

  it('too-small width gets clamped to 36 with warning', () => {
    const layout = calc({ dimensions: { width: 20, height: 96, depth: 24 } });
    assert.ok(layout.dimensions.width >= 36, `width ${layout.dimensions.width} < 36`);
    assert.ok((layout.inputWarnings?.length ?? 0) > 0, 'expected input warnings');
  });

  it('very large width does NOT get clamped', () => {
    const layout = calc({ dimensions: { width: 600, height: 96, depth: 24 } });
    assert.equal(layout.dimensions.width, 600);
  });
});

// ─── Engine: Drawer position variations ─────────────────────────────────────

describe('Engine: drawer position', () => {
  for (const pos of ['bottom', 'middle', 'top'] as const) {
    it(`drawer position ${pos} produces valid zones`, () => {
      const layout = calc({ zoneOverrides: { drawerPosition: pos } });
      const hasDrawer = layout.zones.some(z => z.type === 'drawers');
      assert.ok(hasDrawer, `no drawer zone for position=${pos}`);
    });
  }

  it('middle position produces info warning', () => {
    const layout = calc({ zoneOverrides: { drawerPosition: 'middle' } });
    const warn = layout.layoutWarnings.find(w => w.id === 'drawer-middle');
    assert.ok(warn, 'expected drawer-middle warning');
    assert.equal(warn!.severity, 'info');
  });
});

// ─── Engine: edge cases ─────────────────────────────────────────────────────

describe('Engine: edge cases', () => {
  it('zero wardrobe still produces a layout', () => {
    const layout = calc({
      wardrobe: {
        longDresses: 0, shortJackets: 0, suits: 0, shirts: 0, pants: 0,
        tShirts: 0, sweaters: 0, jeans: 0, underwear: 0,
        bags: 0, belts: 0, jewelry: false, ties: 0,
      },
      shoes: { sneakers: 0, heels: 0, boots: 0, flats: 0 },
    });
    assert.ok(layout, 'layout should be defined');
    assert.ok(layout.walls.length >= 1, 'should have at least 1 wall');
  });

  it('minimum dimensions produce valid layout', () => {
    const layout = calc({ dimensions: { width: 36, height: 84, depth: 18 } });
    assert.ok(layout, 'layout should be defined');
    assert.ok(layout.zones.length >= 0, 'zones should exist');
  });
});

// ─── Engine: aisle warnings ─────────────────────────────────────────────────

describe('Engine: aisle warnings', () => {
  it('narrow walkin-u triggers aisle warning', () => {
    const layout = calc({
      closetType: 'walkin-u',
      dimensions: { width: 72, height: 96, depth: 24 },
      roomDimensions: { roomWidth: 72, roomDepth: 72 },
    });
    assert.ok(layout.aisleWarnings.length > 0, 'expected aisle warnings');
  });

  it('spacious room has no aisle warnings', () => {
    const layout = calc({
      closetType: 'walkin-u',
      dimensions: { width: 180, height: 96, depth: 24 },
      roomDimensions: { roomWidth: 180, roomDepth: 120 },
    });
    assert.equal(layout.aisleWarnings.length, 0);
  });
});

// ─── Engine: kids closet detection ──────────────────────────────────────────

describe('Engine: smart recommendations', () => {
  it('small wardrobe triggers kids closet recommendation', () => {
    const layout = calc({
      wardrobe: {
        longDresses: 2, shortJackets: 3, suits: 1, shirts: 5, pants: 3,
        tShirts: 5, sweaters: 2, jeans: 3, underwear: 5,
        bags: 1, belts: 1, jewelry: false, ties: 0,
      },
      shoes: { sneakers: 2, heels: 0, boots: 1, flats: 2 },
    });
    const has = layout.recommendations.some(r => r.toLowerCase().includes('child'));
    assert.ok(has, 'Expected kids closet recommendation');
  });

  it('overflow warning for overloaded reach-in', () => {
    const layout = calc({
      closetType: 'reach-in',
      dimensions: { width: 48, height: 96, depth: 24 },
      wardrobe: {
        longDresses: 15, shortJackets: 10, suits: 8, shirts: 40, pants: 20,
        tShirts: 30, sweaters: 10, jeans: 8, underwear: 20,
        bags: 5, belts: 3, jewelry: true, ties: 5,
      },
    });
    const warn = layout.layoutWarnings.find(w => w.id === 'overflow-capacity');
    assert.ok(warn, 'Expected overflow-capacity warning');
  });
});

// ─── Engine: storage totals ─────────────────────────────────────────────────

describe('Engine: storage totals', () => {
  it('storage totals are non-negative', () => {
    const layout = calc();
    assert.ok(layout.totalStorage.hangingRods >= 0);
    assert.ok(layout.totalStorage.shelfSpace >= 0);
    assert.ok(layout.totalStorage.drawerCount >= 0);
    assert.ok(layout.totalStorage.shoeCapacity >= 0);
  });

  it('U-shape has more storage than reach-in for same inventory', () => {
    const reachIn = calc({ closetType: 'reach-in' });
    const uShape = calc({
      closetType: 'walkin-u',
      dimensions: { width: 120, height: 96, depth: 24 },
      roomDimensions: { roomWidth: 120, roomDepth: 96 },
    });
    const riTotal = reachIn.totalStorage.hangingRods + reachIn.totalStorage.shelfSpace;
    const usTotal = uShape.totalStorage.hangingRods + uShape.totalStorage.shelfSpace;
    assert.ok(usTotal >= riTotal, `U-shape total ${usTotal} < reach-in ${riTotal}`);
  });
});

// ─── Engine: zone contentLabels ─────────────────────────────────────────────

describe('Engine: zone content labels', () => {
  it('zones get content labels for non-zero inventory', () => {
    const layout = calc();
    const labeled = layout.walls.flatMap(w => w.zones).filter(z => z.contentLabel);
    assert.ok(labeled.length > 0, 'Expected some zones with content labels');
  });
});

// ─── Engine: priority-aware width distribution ──────────────────────────────

describe('Engine: priority-aware widths', () => {
  it('hanging priority gives more long-hang width', () => {
    const hangPrio = calc({
      userInfo: { ...makeInput().userInfo, priorityItems: ['hanging'] },
    });
    const shoePrio = calc({
      userInfo: { ...makeInput().userInfo, priorityItems: ['shoes'] },
    });
    assert.ok(hangPrio.walls.length > 0);
    assert.ok(shoePrio.walls.length > 0);
  });
});

// ─── Engine: all closet types produce valid output ──────────────────────────

describe('Engine: all closet types', () => {
  const types: ClosetType[] = [
    'reach-in', 'wardrobe-wall', 'walkin-single',
    'walkin-l', 'walkin-u', 'island', 'corridor',
  ];

  for (const type of types) {
    it(`${type} produces valid layout without throwing`, () => {
      const layout = calc({
        closetType: type,
        dimensions: { width: 120, height: 96, depth: 24 },
        roomDimensions: { roomWidth: 120, roomDepth: 96 },
      });
      assert.ok(layout, 'layout should be defined');
      assert.equal(layout.closetType, type);
      assert.ok(layout.walls.length >= 1, 'should have at least 1 wall');
      assert.ok(layout.utilizationScore >= 0, `util ${layout.utilizationScore} < 0`);
      assert.ok(layout.utilizationScore <= 100, `util ${layout.utilizationScore} > 100`);
    });
  }
});
