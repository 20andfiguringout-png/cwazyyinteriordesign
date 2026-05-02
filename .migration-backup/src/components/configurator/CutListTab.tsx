"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClosetLayout, ClosetWall, ClosetZone } from "@/types/closet";

interface CutListTabProps {
  layout: ClosetLayout;
}

// ── Cut-list data types ────────────────────────────────────────────────────
type CutCategory = "Panels" | "Shelves" | "Rods" | "Drawers" | "Hardware";

interface CutItem {
  id: string;
  category: CutCategory;
  description: string;
  qty: number;
  width: number;   // inches
  height: number;  // inches (depth for panels treated as height here)
  thickness: number; // inches
  material: string;
  notes?: string;
  wallRef?: string;
}

// ── Thickness constants ────────────────────────────────────────────────────
const PANEL_THICKNESS   = 0.75;  // ¾" melamine / plywood
const BACK_PANEL_THICK  = 0.25;  // ¼" back panel / dust board
const ROD_DIAMETER      = 1.375; // 1⅜" standard closet rod

// ── Helper: round to nearest 1/16" and format as fraction ─────────────────
function toFraction(inches: number): string {
  const whole = Math.floor(inches);
  const frac  = inches - whole;
  const sixteenths = Math.round(frac * 16);
  if (sixteenths === 0)  return `${whole}"`;
  if (sixteenths === 8)  return `${whole > 0 ? whole + " " : ""}½"`;
  if (sixteenths === 4)  return `${whole > 0 ? whole + " " : ""}¼"`;
  if (sixteenths === 12) return `${whole > 0 ? whole + " " : ""}¾"`;
  if (sixteenths === 2)  return `${whole > 0 ? whole + " " : ""}⅛"`;
  if (sixteenths === 6)  return `${whole > 0 ? whole + " " : ""}⅜"`;
  if (sixteenths === 10) return `${whole > 0 ? whole + " " : ""}⅝"`;
  if (sixteenths === 14) return `${whole > 0 ? whole + " " : ""}⅞"`;
  return `${whole} ${sixteenths}/16"`;
}

function dim(w: number, h: number) {
  return `${toFraction(w)} × ${toFraction(h)}`;
}

let _idSeq = 0;
function uid(prefix: string) {
  return `${prefix}-${++_idSeq}`;
}

// ── Main derivation ────────────────────────────────────────────────────────
function deriveCutList(layout: ClosetLayout): CutItem[] {
  _idSeq = 0;
  const items: CutItem[] = [];

  for (const wall of layout.walls) {
    const wallRef  = wall.elevationRef;
    const wallW    = wall.width;
    const wallH    = wall.height;
    const unitDepth = wall.unitDepth;

    // ── Structural carcass panels ──────────────────────────────────────

    // Top panel (full width of wall)
    items.push({
      id: uid("panel"),
      category: "Panels",
      description: "Top panel",
      qty: 1,
      width: wallW - PANEL_THICKNESS * 2, // minus two side panels
      height: unitDepth - PANEL_THICKNESS,
      thickness: PANEL_THICKNESS,
      material: "¾\" melamine board",
      wallRef,
      notes: "Dado-join to side panels",
    });

    // Bottom panel
    items.push({
      id: uid("panel"),
      category: "Panels",
      description: "Bottom panel",
      qty: 1,
      width: wallW - PANEL_THICKNESS * 2,
      height: unitDepth - PANEL_THICKNESS,
      thickness: PANEL_THICKNESS,
      material: "¾\" melamine board",
      wallRef,
      notes: "Dado-join to side panels",
    });

    // Left side panel
    items.push({
      id: uid("panel"),
      category: "Panels",
      description: "Left side panel",
      qty: 1,
      width: wallH,
      height: unitDepth,
      thickness: PANEL_THICKNESS,
      material: "¾\" melamine board",
      wallRef,
    });

    // Right side panel
    items.push({
      id: uid("panel"),
      category: "Panels",
      description: "Right side panel",
      qty: 1,
      width: wallH,
      height: unitDepth,
      thickness: PANEL_THICKNESS,
      material: "¾\" melamine board",
      wallRef,
    });

    // Back panel (full wall)
    items.push({
      id: uid("panel"),
      category: "Panels",
      description: "Back panel",
      qty: 1,
      width: wallW,
      height: wallH,
      thickness: BACK_PANEL_THICK,
      material: "¼\" hardboard / plywood",
      wallRef,
      notes: "Routed into back rebate of side/top/bottom panels",
    });

    // ── Zone-level cuts ────────────────────────────────────────────────
    let dividerCount = 0;

    for (const zone of wall.zones) {
      // Vertical dividers between adjacent zones — estimate 1 per zone
      // boundary (except outer edges already covered by side panels)
      dividerCount++;

      // Shelves
      for (const shelf of zone.shelves ?? []) {
        const shelfCount = shelf.count ?? 1;
        items.push({
          id: uid("shelf"),
          category: "Shelves",
          description: `${shelf.purpose ?? "Shelf"} — ${wallRef}`,
          qty: shelfCount,
          width: zone.width - PANEL_THICKNESS * 2, // between dividers
          height: shelf.depth ?? unitDepth - 2,
          thickness: PANEL_THICKNESS,
          material: "¾\" melamine board",
          wallRef,
          notes: shelf.purpose ? `Purpose: ${shelf.purpose}` : undefined,
        });
      }

      // Hanging rods
      for (const rod of zone.rods ?? []) {
        const rodLen = rod.length ?? zone.width - 2;
        items.push({
          id: uid("rod"),
          category: "Rods",
          description: `Hanging rod — ${rod.purpose ?? "general"} — ${wallRef}`,
          qty: 1,
          width: rodLen,
          height: ROD_DIAMETER,
          thickness: ROD_DIAMETER,
          material: `1⅜" Ø chrome / satin rod`,
          wallRef,
          notes: `Mounted at ${toFraction(rod.height)}" from floor`,
        });
      }

      // Drawers — front face + box sides
      for (const drawer of zone.drawers ?? []) {
        const drawerW = drawer.width ?? zone.width - 3;
        const drawerH = drawer.height;
        const drawerD = drawer.depth ?? unitDepth - 2;

        // Drawer front (face frame)
        items.push({
          id: uid("drawer-front"),
          category: "Drawers",
          description: `Drawer front — ${drawer.purpose ?? "storage"} — ${wallRef}`,
          qty: 1,
          width: drawerW - 2,   // reveal gap
          height: drawerH - 2,
          thickness: PANEL_THICKNESS,
          material: "¾\" matching finish board",
          wallRef,
          notes: `${drawer.purpose ?? ""}; bottom at ${toFraction(drawer.position)}"`,
        });

        // Drawer box sides (×2)
        items.push({
          id: uid("drawer-side"),
          category: "Drawers",
          description: `Drawer box sides — ${drawer.purpose ?? "storage"} — ${wallRef}`,
          qty: 2,
          width: drawerD - PANEL_THICKNESS,
          height: drawerH - PANEL_THICKNESS * 2,
          thickness: PANEL_THICKNESS / 2,
          material: "½\" plywood (drawer box)",
          wallRef,
        });

        // Drawer front & back (×2)
        items.push({
          id: uid("drawer-fb"),
          category: "Drawers",
          description: `Drawer front & back — ${drawer.purpose ?? "storage"} — ${wallRef}`,
          qty: 2,
          width: drawerW - PANEL_THICKNESS,
          height: drawerH - PANEL_THICKNESS * 2,
          thickness: PANEL_THICKNESS / 2,
          material: "½\" plywood (drawer box)",
          wallRef,
        });

        // Drawer bottom
        items.push({
          id: uid("drawer-base"),
          category: "Drawers",
          description: `Drawer base — ${drawer.purpose ?? "storage"} — ${wallRef}`,
          qty: 1,
          width: drawerW - PANEL_THICKNESS,
          height: drawerD - PANEL_THICKNESS,
          thickness: BACK_PANEL_THICK,
          material: "¼\" plywood (drawer base)",
          wallRef,
        });
      }
    }

    // Vertical dividers (deduplicate — 1 per internal zone boundary)
    const dividers = Math.max(0, dividerCount - 1);
    if (dividers > 0) {
      items.push({
        id: uid("divider"),
        category: "Panels",
        description: `Vertical divider — ${wallRef}`,
        qty: dividers,
        width: wallH - PANEL_THICKNESS * 2,
        height: unitDepth - PANEL_THICKNESS,
        thickness: PANEL_THICKNESS,
        material: "¾\" melamine board",
        wallRef,
        notes: "Shelf-pin holes on both faces @ 32 mm spacing",
      });
    }
  }

  // ── Hardware summary ─────────────────────────────────────────────────
  const totalDrawers = layout.totalStorage.drawerCount;
  const totalRodFt   = layout.totalStorage.hangingRods;

  if (totalDrawers > 0) {
    items.push({
      id: uid("hw"),
      category: "Hardware",
      description: "Undermount drawer slides (soft-close)",
      qty: totalDrawers,
      width: layout.dimensions.depth - 2,
      height: 0,
      thickness: 0,
      material: "Blum Tandem 563 or equivalent",
      notes: "Sold in pairs; order 1 pair per drawer",
    });

    items.push({
      id: uid("hw"),
      category: "Hardware",
      description: "Drawer pulls / handles",
      qty: totalDrawers,
      width: 0,
      height: 0,
      thickness: 0,
      material: "Per hardware finish selection",
    });
  }

  if (totalRodFt > 0) {
    const rodBrackets = Math.ceil(totalRodFt / 4); // bracket every ~4 ft
    items.push({
      id: uid("hw"),
      category: "Hardware",
      description: "Rod-end brackets & centre supports",
      qty: rodBrackets,
      width: 0,
      height: 0,
      thickness: 0,
      material: "Matching hardware finish",
      notes: "1 centre support per rod span > 42\"",
    });
  }

  // Shelf pins
  const shelfCount = items.filter(
    (i) => i.category === "Shelves",
  ).reduce((s, i) => s + i.qty, 0);
  if (shelfCount > 0) {
    items.push({
      id: uid("hw"),
      category: "Hardware",
      description: "Shelf pins (5 mm)",
      qty: shelfCount * 4,
      width: 0,
      height: 0,
      thickness: 0,
      material: "Zinc or nickel shelf pins",
      notes: "4 per shelf",
    });
  }

  return items;
}

// ── Category meta ──────────────────────────────────────────────────────────
const CAT_META: Record<CutCategory, { icon: string; color: string }> = {
  Panels:   { icon: "🪵", color: "bg-amber-50  border-amber-200" },
  Shelves:  { icon: "📐", color: "bg-blue-50   border-blue-200"  },
  Rods:     { icon: "📏", color: "bg-teal-50   border-teal-200"  },
  Drawers:  { icon: "🗄️", color: "bg-purple-50 border-purple-200" },
  Hardware: { icon: "🔩", color: "bg-cream-50  border-cream-200" },
};

const CATEGORY_ORDER: CutCategory[] = [
  "Panels", "Shelves", "Rods", "Drawers", "Hardware",
];

// ── Component ──────────────────────────────────────────────────────────────
export function CutListTab({ layout }: CutListTabProps) {
  const cutList = useMemo(() => deriveCutList(layout), [layout]);
  const [activeCategory, setActiveCategory] = useState<CutCategory | "All">("All");
  const [copyDone, setCopyDone] = useState(false);

  const filtered = useMemo(
    () =>
      activeCategory === "All"
        ? cutList
        : cutList.filter((i) => i.category === activeCategory),
    [cutList, activeCategory],
  );

  // Counts per category
  const counts = useMemo(() => {
    const map: Partial<Record<CutCategory | "All", number>> = { All: cutList.length };
    for (const cat of CATEGORY_ORDER) {
      map[cat] = cutList.filter((i) => i.category === cat).length;
    }
    return map;
  }, [cutList]);

  // Total pieces
  const totalPieces = useMemo(
    () => filtered.reduce((s, i) => s + i.qty, 0),
    [filtered],
  );

  const handleCopy = () => {
    const header = "QTY\tDESCRIPTION\tW\tH / DEPTH\tTHICKNESS\tMATERIAL\tNOTES";
    const rows = filtered.map(
      (i) =>
        [
          i.qty,
          i.description,
          i.width  > 0 ? toFraction(i.width)     : "—",
          i.height > 0 ? toFraction(i.height)    : "—",
          i.thickness > 0 ? toFraction(i.thickness) : "—",
          i.material,
          i.notes ?? "",
        ].join("\t"),
    );
    navigator.clipboard.writeText([header, ...rows].join("\n")).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const handleExportCsv = () => {
    const header = "qty,description,width_in,height_or_depth_in,thickness_in,material,notes";
    const rows = filtered.map((i) =>
      [
        i.qty,
        `"${i.description.replace(/"/g, '""')}"`,
        i.width > 0 ? i.width.toFixed(2) : "",
        i.height > 0 ? i.height.toFixed(2) : "",
        i.thickness > 0 ? i.thickness.toFixed(2) : "",
        `"${i.material.replace(/"/g, '""')}"`,
        `"${(i.notes ?? "").replace(/"/g, '""')}"`,
      ].join(","),
    );

    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alveo-cut-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <div className="bg-cream-50 rounded-xl border border-cream-200 p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-widest mb-0.5">
            Cut List
          </p>
          <p className="font-serif text-2xl font-bold text-charcoal-600">
            {cutList.length}{" "}
            <span className="text-base font-normal text-charcoal-400">
              line item{cutList.length !== 1 ? "s" : ""}
            </span>
          </p>
          <p className="text-xs text-charcoal-400 mt-0.5">
            {layout.walls.length} wall{layout.walls.length !== 1 ? "s" : ""} ·{" "}
            {layout.walls.map((w) => w.elevationRef).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-charcoal-500 hover:bg-charcoal-600 text-white text-xs font-semibold transition-colors"
          >
            <span>{copyDone ? "✓ Copied!" : "Copy as TSV"}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream-200 hover:bg-cream-300 text-charcoal-600 text-xs font-semibold transition-colors"
          >
            <span>Export CSV</span>
          </motion.button>
        </div>
      </div>

      {/* ── Category filter pills ── */}
      <div className="flex flex-wrap gap-2">
        {(["All", ...CATEGORY_ORDER] as (CutCategory | "All")[]).map((cat) => {
          const meta = cat !== "All" ? CAT_META[cat] : null;
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                active
                  ? "bg-charcoal-500 text-white border-charcoal-500"
                  : "bg-cream-50 text-charcoal-500 border-cream-200 hover:bg-cream-100"
              }`}
            >
              {meta && <span>{meta.icon}</span>}
              <span>{cat}</span>
              <span
                className={`inline-flex items-center justify-center rounded-full text-[10px] font-bold w-4 h-4 ${
                  active ? "bg-white/20 text-white" : "bg-cream-200 text-charcoal-500"
                }`}
              >
                {counts[cat] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Cut-list table ── */}
      <div className="rounded-xl border border-cream-200 overflow-hidden">
        {/* Table head */}
        <div className="grid grid-cols-[3rem_1fr_6rem_6rem_5rem] bg-cream-100 border-b border-cream-200 px-3 py-2 gap-2 text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">
          <span>Qty</span>
          <span>Description</span>
          <span>Width</span>
          <span>H / Depth</span>
          <span>Thick.</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-charcoal-400">
                No items in this category.
              </div>
            ) : (
              filtered.map((item, idx) => {
                const meta = CAT_META[item.category];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.025 }}
                    className={`grid grid-cols-[3rem_1fr_6rem_6rem_5rem] px-3 py-2.5 gap-2 text-sm border-b border-cream-100 last:border-b-0 hover:bg-cream-50 transition-colors`}
                  >
                    {/* Qty */}
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cream-200 text-charcoal-600 text-xs font-bold">
                        {item.qty}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base leading-none">{meta.icon}</span>
                        <span className="font-medium text-charcoal-600 text-xs leading-snug">
                          {item.description}
                        </span>
                        {item.wallRef && (
                          <span className="text-[9px] font-semibold text-taupe-500 bg-taupe-50 border border-taupe-200 rounded px-1 py-0.5">
                            {item.wallRef}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-charcoal-400 mt-0.5 truncate">
                        {item.material}
                        {item.notes ? ` · ${item.notes}` : ""}
                      </p>
                    </div>

                    {/* Width */}
                    <div className="flex items-center">
                      <span className="font-mono text-xs text-charcoal-600">
                        {item.width > 0 ? toFraction(item.width) : "—"}
                      </span>
                    </div>

                    {/* Height / Depth */}
                    <div className="flex items-center">
                      <span className="font-mono text-xs text-charcoal-600">
                        {item.height > 0 ? toFraction(item.height) : "—"}
                      </span>
                    </div>

                    {/* Thickness */}
                    <div className="flex items-center">
                      <span className="font-mono text-xs text-charcoal-600">
                        {item.thickness > 0 ? toFraction(item.thickness) : "—"}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer summary ── */}
      <div className="bg-cream-50 rounded-xl border border-cream-200 p-3 flex items-center justify-between text-sm">
        <span className="text-charcoal-400 text-xs">
          Showing <span className="font-semibold text-charcoal-600">{filtered.length}</span>{" "}
          line item{filtered.length !== 1 ? "s" : ""} ·{" "}
          <span className="font-semibold text-charcoal-600">{totalPieces}</span> total pieces
        </span>
        <span className="text-[10px] text-charcoal-300 italic">
          All dimensions in inches. Verify before cutting.
        </span>
      </div>
    </div>
  );
}
