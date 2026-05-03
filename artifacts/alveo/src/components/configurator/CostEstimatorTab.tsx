
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ClosetLayout, UserPreferences, AccessoryItem, LightingOptions } from "@/types/closet";
import { estimateCostRange } from "@/lib/costEstimator";

interface CostEstimatorTabProps {
  layout: ClosetLayout;
  userInfo: UserPreferences;
  accessories?: AccessoryItem[];
  lighting?: LightingOptions;
}

// ── Cost constants (USD, approximate retail + install) ─────────────────────
const PANEL_COST_PER_SQFT: Record<string, number> = {
  white:  8.5,
  light:  12.0,
  medium: 15.5,
  dark:   18.0,
};

const STYLE_MULTIPLIER: Record<string, number> = {
  minimal: 1.00,
  modern:  1.05,
  rustic:  1.10,
  glam:    1.28,
  luxury:  1.50,
};

const HARDWARE_FINISH_PREMIUM: Record<string, number> = {
  "chrome":       80,
  "brass":       160,
  "matte-black": 120,
  "nickel":      200,
  "gold":        180,
};

const ROD_COST_PER_FT     = 9.5;   // per linear foot
const SHELF_COST_EACH     = 55;    // per shelf board (cut + edge-banded)
const DRAWER_COST_SMALL   = 135;   // < 6" height (jewellery / tie)
const DRAWER_COST_MEDIUM  = 195;   // 6–9" height
const DRAWER_COST_LARGE   = 265;   // > 9" height
const LABOUR_RATE         = 0.42;  // 42 % of materials
const DELIVERY_FLAT       = 185;   // flat delivery / crating

// ── Lighting fixture unit costs (USD, supply + basic install) ───────────────
const LIGHTING_COSTS: Record<keyof LightingOptions, { label: string; icon: string; unit: number; basis: string }> = {
  underShelfLED:  { label: "Under-shelf LED strip",       icon: "💡", unit: 85,  basis: "per wall" },
  overheadRail:   { label: "Overhead track rail + heads", icon: "☀️", unit: 320, basis: "flat"     },
  puckLights:     { label: "Recessed puck lights (set)",  icon: "🔦", unit: 210, basis: "flat"     },
  islandPendant:  { label: "Island pendant fitting",      icon: "🕯️", unit: 320, basis: "flat"     },
};

type LineItem = {
  category: string;
  description: string;
  qty: number;
  unitCost: number;
  total: number;
  icon: string;
};

function computeLineItems(
  layout: ClosetLayout,
  userInfo: UserPreferences,
  accessories?: AccessoryItem[],
  lighting?: LightingOptions,
): LineItem[] {
  const items: LineItem[] = [];
  const finish     = userInfo.woodFinish   ?? "medium";
  const style      = userInfo.stylePreference ?? "modern";
  const panelRate  = PANEL_COST_PER_SQFT[finish] ?? 15.5;
  const styleMult  = STYLE_MULTIPLIER[style]      ?? 1.05;

  // ── 1. Carcass panels (total wall area proxy) ────────────────────────
  let totalSqFt = 0;
  for (const wall of layout.walls) {
    totalSqFt += (wall.width / 12) * (wall.height / 12); // convert in→ft
  }
  const panelUnit = panelRate * styleMult;
  items.push({
    category:    "Materials",
    description: "Cabinet panels & carcasses",
    qty:         Math.round(totalSqFt),
    unitCost:    panelUnit,
    total:       Math.round(totalSqFt * panelUnit),
    icon:        "🪵",
  });

  // ── 2. Hanging rods ──────────────────────────────────────────────────
  const rods = layout.totalStorage.hangingRods; // linear feet
  if (rods > 0) {
    const rodUnit = ROD_COST_PER_FT * styleMult;
    items.push({
      category:    "Materials",
      description: "Hanging rods & brackets",
      qty:         rods,
      unitCost:    rodUnit,
      total:       Math.round(rods * rodUnit),
      icon:        "👗",
    });
  }

  // ── 3. Shelves ───────────────────────────────────────────────────────
  let shelfCount = 0;
  for (const wall of layout.walls) {
    for (const zone of wall.zones) {
      shelfCount += zone.shelves?.reduce((acc, s) => acc + (s.count ?? 1), 0) ?? 0;
    }
  }
  if (shelfCount > 0) {
    const shelfUnit = SHELF_COST_EACH * styleMult;
    items.push({
      category:    "Materials",
      description: "Shelves (cut, edge-banded & drilled)",
      qty:         shelfCount,
      unitCost:    shelfUnit,
      total:       Math.round(shelfCount * shelfUnit),
      icon:        "📦",
    });
  }

  // ── 4. Drawers ───────────────────────────────────────────────────────
  let drawerSmall = 0, drawerMedium = 0, drawerLarge = 0;
  for (const wall of layout.walls) {
    for (const zone of wall.zones) {
      for (const d of zone.drawers ?? []) {
        if (d.height < 6)       drawerSmall++;
        else if (d.height <= 9) drawerMedium++;
        else                    drawerLarge++;
      }
    }
  }
  if (drawerSmall > 0) {
    items.push({
      category:    "Materials",
      description: "Drawers — shallow (≤ 5\")",
      qty:         drawerSmall,
      unitCost:    DRAWER_COST_SMALL * styleMult,
      total:       Math.round(drawerSmall * DRAWER_COST_SMALL * styleMult),
      icon:        "🗄️",
    });
  }
  if (drawerMedium > 0) {
    items.push({
      category:    "Materials",
      description: "Drawers — standard (6–9\")",
      qty:         drawerMedium,
      unitCost:    DRAWER_COST_MEDIUM * styleMult,
      total:       Math.round(drawerMedium * DRAWER_COST_MEDIUM * styleMult),
      icon:        "🗄️",
    });
  }
  if (drawerLarge > 0) {
    items.push({
      category:    "Materials",
      description: "Drawers — deep (> 9\")",
      qty:         drawerLarge,
      unitCost:    DRAWER_COST_LARGE * styleMult,
      total:       Math.round(drawerLarge * DRAWER_COST_LARGE * styleMult),
      icon:        "🗄️",
    });
  }

  // ── 5. Hardware premium ──────────────────────────────────────────────
  const hwFinish = (userInfo.hardwareFinish ?? "").toLowerCase();
  const hwPremium = HARDWARE_FINISH_PREMIUM[hwFinish] ?? 85;
  items.push({
    category:    "Hardware",
    description: `Hardware & pulls${hwFinish ? ` — ${userInfo.hardwareFinish}` : ""}`,
    qty:         1,
    unitCost:    hwPremium,
    total:       hwPremium,
    icon:        "🔩",
  });

  // ── 6. Lighting fixtures ─────────────────────────────────────────────
  if (lighting) {
    const wallCount = layout.walls.length;
    (Object.keys(LIGHTING_COSTS) as (keyof LightingOptions)[]).forEach((key) => {
      if (!lighting[key]) return;
      const fixture = LIGHTING_COSTS[key];
      const qty = key === "underShelfLED" ? wallCount : 1;
      const total = fixture.unit * qty;
      items.push({
        category:    "Lighting",
        description: fixture.label + (qty > 1 ? ` (${qty} walls)` : ""),
        qty,
        unitCost:    fixture.unit,
        total,
        icon:        fixture.icon,
      });
    });
  }

  // ── 7. Accessories catalogue ──────────────────────────────────────────
  if (accessories?.length) {
    for (const acc of accessories) {
      if (acc.qty <= 0) continue;
      items.push({
        category:    "Accessories",
        description: acc.name,
        qty:         acc.qty,
        unitCost:    acc.unitPrice,
        total:       Math.round(acc.qty * acc.unitPrice),
        icon:        acc.category === "mirror"   ? "🪞"
                   : acc.category === "lighting" ? "💡"
                   : acc.category === "hanging"  ? "🪝"
                   : acc.category === "drawer-insert" ? "🗄️"
                   : "📦",
      });
    }
  }

  // ── 8. Delivery & crating ────────────────────────────────────────────
  items.push({
    category:    "Logistics",
    description: "Delivery, crating & site protection",
    qty:         1,
    unitCost:    DELIVERY_FLAT,
    total:       DELIVERY_FLAT,
    icon:        "🚚",
  });

  return items;
}

const CATEGORY_ORDER = ["Materials", "Hardware", "Lighting", "Accessories", "Logistics", "Labour"];

export function CostEstimatorTab({ layout, userInfo, accessories, lighting }: CostEstimatorTabProps) {
  const lineItems = useMemo(
    () => computeLineItems(layout, userInfo, accessories, lighting),
    [layout, userInfo, accessories, lighting],
  );

  const materialsSubtotal = useMemo(
    () => lineItems.reduce((s, i) => s + i.total, 0),
    [lineItems],
  );

  const labourCost = Math.round(materialsSubtotal * LABOUR_RATE);
  const grandTotal = materialsSubtotal + labourCost;
  const range = useMemo(
    () => estimateCostRange(layout, userInfo.woodFinish ?? "medium"),
    [layout, userInfo.woodFinish],
  );

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, LineItem[]> = {};
    for (const item of lineItems) {
      (map[item.category] ??= []).push(item);
    }
    // Add labour as a synthetic group
    map["Labour"] = [
      {
        category:    "Labour",
        description: "Professional installation & fitting",
        qty:         1,
        unitCost:    labourCost,
        total:       labourCost,
        icon:        "🔧",
      },
    ];
    return map;
  }, [lineItems, labourCost]);

  const budgetLabel =
    grandTotal < 2500
      ? { text: "Budget-Friendly", color: "text-green-600", bg: "bg-green-50 border-green-200" }
      : grandTotal < 5000
      ? { text: "Mid-Range",       color: "text-taupe-600", bg: "bg-taupe-50 border-taupe-200" }
      : grandTotal < 10000
      ? { text: "Premium",         color: "text-amber-600", bg: "bg-amber-50 border-amber-200" }
      : { text: "Luxury",          color: "text-purple-600", bg: "bg-purple-50 border-purple-200" };

  const usd = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      {/* ── Headline card ── */}
      <div className="bg-cream-50 rounded-xl border border-cream-200 p-5">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest mb-0.5">
              Estimated Total
            </p>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="font-serif text-4xl font-bold text-charcoal-600"
            >
              {usd(grandTotal)}
            </motion.p>
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${budgetLabel.bg} ${budgetLabel.color}`}
          >
            {budgetLabel.text}
          </span>
        </div>

        {/* Materials vs Labour split bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-charcoal-400">
            <span>Materials & Logistics — {usd(materialsSubtotal)}</span>
            <span>Labour — {usd(labourCost)}</span>
          </div>
          <div className="w-full h-2.5 bg-cream-200 rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(materialsSubtotal / grandTotal) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full bg-taupe-400 rounded-l-full"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(labourCost / grandTotal) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
              className="h-full bg-charcoal-400 rounded-r-full"
            />
          </div>
        </div>

        <p className="text-[11px] text-charcoal-300 mt-3 leading-snug">
          Estimates are indicative only and exclude taxes and permit fees.
          Actual quotes may vary by region and supplier.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-cream-200 p-5">
        <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest mb-2">
          Actionable range
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-cream-200 bg-cream-50 p-3">
            <p className="text-xs text-charcoal-400">DIY materials estimate</p>
            <p className="font-serif text-2xl text-charcoal-600">
              {usd(range.diyTotal)}
            </p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-cream-50 p-3">
            <p className="text-xs text-charcoal-400">Professional install estimate</p>
            <p className="font-serif text-2xl text-charcoal-600">
              {usd(range.proTotal)}
            </p>
          </div>
        </div>
        <p className="text-xs text-charcoal-400 mt-3">
          Breakdown: rods {usd(range.rods)} · shelves {usd(range.shelves)} · drawers {usd(range.drawers)} · base installation {usd(range.baseInstall)}
        </p>
      </div>

      {/* ── Line-item breakdown ── */}
      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat, ci) => (
        <motion.div
          key={cat}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: ci * 0.07 }}
          className="bg-cream-50 rounded-xl border border-cream-200 overflow-hidden"
        >
          <div className="px-4 py-2.5 bg-cream-100 border-b border-cream-200">
            <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest">
              {cat}
            </p>
          </div>
          <div className="divide-y divide-cream-100">
            {grouped[cat].map((item, ii) => (
              <div
                key={ii}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-600 truncate">
                    {item.description}
                  </p>
                  {item.qty > 1 && (
                    <p className="text-xs text-charcoal-400">
                      {item.qty} × {usd(item.unitCost)}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold text-charcoal-600 whitespace-nowrap">
                  {usd(item.total)}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* ── Grand total footer ── */}
      <div className="bg-charcoal-500 rounded-xl p-4 flex items-center justify-between text-white">
        <p className="text-sm font-medium">Grand Total (est.)</p>
        <p className="font-serif text-2xl font-bold">{usd(grandTotal)}</p>
      </div>

      {/* ── Finance hint ── */}
      <div className="bg-cream-50 rounded-xl border border-cream-200 p-4 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">💳</span>
        <div>
          <p className="text-sm font-semibold text-charcoal-600">
            Finance from ~{usd(Math.round(grandTotal / 36))}/mo
          </p>
          <p className="text-xs text-charcoal-400 mt-0.5">
            Based on 36-month 0 % APR — subject to lender approval. Contact
            your Alvéo designer for financing options.
          </p>
        </div>
      </div>
    </div>
  );
}
