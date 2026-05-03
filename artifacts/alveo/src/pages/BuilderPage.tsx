import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Trash2, GripVertical, Box, RotateCcw, Plus, Minus,
  ChevronRight, Layers, Ruler, Info, Save, CheckCircle2, FolderPlus, X,
} from "lucide-react";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";
import { ClosetIsometricRenderer } from "@/renderer/ClosetIsometricRenderer";
import { useAuth } from "@/lib/AuthContext";
import { getStoredToken } from "@/lib/AuthContext";
import {
  ClosetLayout, ClosetZone, ClosetWall, ShelfConfig, DrawerConfig,
} from "@/types/closet";

// ─── Module catalogue ────────────────────────────────────────────────────────

const MODULE_CATALOGUE = [
  { type: "double-hang" as const,  label: "Double Hang",   desc: "Upper + lower rods",          defaultWidth: 24, bg: "#dbeafe", border: "#3b82f6", icon: "⬛" },
  { type: "long-hang"  as const,  label: "Long Hang",     desc: "Full-length rod",              defaultWidth: 30, bg: "#fce7f3", border: "#ec4899", icon: "🔱" },
  { type: "drawers"    as const,  label: "Drawers",       desc: "Pull-out drawer stack",        defaultWidth: 18, bg: "#fef3c7", border: "#f59e0b", icon: "☰" },
  { type: "open-shelves" as const,label: "Open Shelves",  desc: "Horizontal folded storage",   defaultWidth: 18, bg: "#d1fae5", border: "#10b981", icon: "≡" },
  { type: "shoe-shelves" as const,label: "Shoe Shelves",  desc: "Tiered footwear display",     defaultWidth: 18, bg: "#ede9fe", border: "#8b5cf6", icon: "◫" },
  { type: "top-shelves"  as const,label: "Top Shelves",   desc: "High seasonal storage",       defaultWidth: 24, bg: "#fee2e2", border: "#ef4444", icon: "▤" },
] as const;

type ZoneType = (typeof MODULE_CATALOGUE)[number]["type"];
const getCat = (type: ZoneType) => MODULE_CATALOGUE.find((m) => m.type === type)!;

interface BuilderModule { id: string; type: ZoneType; label: string; width: number }

let _uid = 0;
const uid = () => `m${++_uid}_${Date.now().toString(36)}`;

const DEFAULT_MODULES: BuilderModule[] = [
  { id: uid(), type: "long-hang",    label: "Long Hang",    width: 30 },
  { id: uid(), type: "double-hang",  label: "Double Hang",  width: 24 },
  { id: uid(), type: "drawers",      label: "Drawers",      width: 18 },
  { id: uid(), type: "shoe-shelves", label: "Shoe Shelves", width: 18 },
  { id: uid(), type: "double-hang",  label: "Double Hang",  width: 24 },
];

// ─── Layout converter ────────────────────────────────────────────────────────

function buildLayout(modules: BuilderModule[], wallW: number, wallH: number, wallD: number): ClosetLayout {
  const TOE = 3.5;
  let curX = 0;
  const zones: ClosetZone[] = [];

  for (const mod of modules) {
    const x = curX, w = mod.width, yBot = TOE, h = wallH - TOE;
    switch (mod.type) {
      case "double-hang":
        zones.push({ type: "double-hang", x, y: yBot, width: w, height: h,
          rods: [
            { height: yBot + h - 2, depth: wallD - 2, length: w - 4, purpose: "upper rod" },
            { height: yBot + Math.round(h * 0.44), depth: wallD - 2, length: w - 4, purpose: "lower rod" },
          ],
        }); break;
      case "long-hang":
        zones.push({ type: "long-hang", x, y: yBot, width: w, height: h,
          rods: [{ height: yBot + h - 2, depth: wallD - 2, length: w - 4, purpose: "long hang" }],
        }); break;
      case "drawers": {
        const drawers: DrawerConfig[] = [];
        let aff = yBot + 2;
        for (const fh of [7, 9, 9, 7, 6]) {
          if (aff + fh > yBot + h - 2) break;
          drawers.push({ position: aff, height: fh, width: w - 4, depth: wallD - 4, purpose: "folded" });
          aff += fh + 1.5;
        }
        zones.push({ type: "drawers", x, y: yBot, width: w, height: h, drawers }); break;
      }
      case "open-shelves": {
        const shelves: ShelfConfig[] = [];
        let relH = 2;
        while (relH + 0.75 <= h - 4 && shelves.length < 8) {
          shelves.push({ height: relH, depth: wallD - 4, spacing: 11, count: 1, purpose: "folded" });
          relH += 0.75 + 11;
        }
        zones.push({ type: "open-shelves", x, y: yBot, width: w, height: h, shelves }); break;
      }
      case "shoe-shelves": {
        const shelves: ShelfConfig[] = [];
        let relH = 2;
        const purposes = ["boots", "heels", "sneakers", "flats", "sneakers", "heels"];
        while (relH <= h - 8 && shelves.length < 7) {
          shelves.push({ height: relH, depth: wallD - 4, spacing: 7, count: Math.max(2, Math.floor(w / 9)), purpose: purposes[shelves.length % purposes.length] });
          relH += 0.75 + 7;
        }
        zones.push({ type: "shoe-shelves", x, y: yBot, width: w, height: h, shelves }); break;
      }
      case "top-shelves": {
        const shelves: ShelfConfig[] = [];
        let relH = 2;
        while (relH <= h - 8 && shelves.length < 5) {
          shelves.push({ height: relH, depth: wallD - 4, spacing: 14, count: 1, purpose: "accessories" });
          relH += 0.75 + 14;
        }
        zones.push({ type: "top-shelves", x, y: yBot, width: w, height: h, shelves }); break;
      }
    }
    curX += w;
  }

  const wall: ClosetWall = { wallId: "back", label: "Main Wall", elevationRef: "EL-A", width: wallW, height: wallH, unitDepth: wallD, zones };
  let hangingRods = 0, drawerCount = 0, shoeCapacity = 0, shelfSpace = 0;
  for (const z of zones) {
    if (z.type === "long-hang")   hangingRods += Math.round((z.width / 12) * 10) / 10;
    if (z.type === "double-hang") hangingRods += Math.round((z.width / 12) * 2 * 10) / 10;
    if (z.type === "drawers")     drawerCount += z.drawers?.length ?? 0;
    if (z.type === "shoe-shelves") shoeCapacity += (z.shelves?.length ?? 0) * Math.max(2, Math.floor(z.width / 9));
    if (z.type === "open-shelves" || z.type === "top-shelves") shelfSpace += Math.round((z.shelves?.length ?? 0) * (z.width / 12) * (wallD / 12) * 10) / 10;
  }
  return {
    closetType: "walkin-single",
    dimensions: { width: wallW, height: wallH, depth: wallD },
    walls: [wall], zones, aisleWarnings: [], layoutWarnings: [],
    totalStorage: { hangingRods, shelfSpace, drawerCount, shoeCapacity },
    utilizationScore: Math.min(100, Math.round((modules.reduce((s, m) => s + m.width, 0) / wallW) * 100)),
    recommendations: [],
  };
}

// ─── DimInput ─────────────────────────────────────────────────────────────────

function DimInput({ label, value, onChange, min, max, step = 6 }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(min, value - step))}
          className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors">
          <Minus size={11} />
        </button>
        <input type="number" min={min} max={max} value={value}
          onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }}
          className="w-16 text-center text-sm font-mono border border-stone-200 rounded-md px-1 py-1 bg-white text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-taupe-300"
        />
        <button onClick={() => onChange(Math.min(max, value + step))}
          className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors">
          <Plus size={11} />
        </button>
        <span className="text-[10px] text-stone-400 w-3">″</span>
      </div>
    </div>
  );
}

// ─── ModulePalette ────────────────────────────────────────────────────────────

function ModulePalette({ onAdd }: { onAdd: (type: ZoneType) => void }) {
  const handleDragStart = (e: React.DragEvent, type: ZoneType) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("alveo-source", "palette");
    e.dataTransfer.setData("alveo-type", type);
  };

  return (
    <aside className="w-48 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-stone-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Modules</p>
        <p className="text-[10px] text-stone-400 mt-0.5">Drag to canvas or click +</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {MODULE_CATALOGUE.map((mod) => (
          <div
            key={mod.type}
            draggable
            onDragStart={(e) => handleDragStart(e, mod.type)}
            className="group flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing select-none hover:shadow-sm transition-all"
            style={{ backgroundColor: mod.bg, borderColor: mod.border + "44" }}
          >
            <span className="text-sm w-5 text-center flex-shrink-0 font-mono" style={{ color: mod.border }}>
              {mod.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-stone-700 leading-tight truncate">{mod.label}</p>
              <p className="text-[9px] text-stone-500 leading-tight truncate">{mod.desc}</p>
            </div>
            <button
              onClick={() => onAdd(mod.type)}
              className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all bg-white/60 hover:bg-white text-stone-600 hover:text-stone-800"
              title={`Add ${mod.label}`}
            >
              <Plus size={10} />
            </button>
          </div>
        ))}
      </div>
      <div className="px-3 py-2.5 border-t border-stone-100">
        <p className="text-[9px] text-stone-300 leading-relaxed">
          Tip: drag resize handles between columns to adjust widths
        </p>
      </div>
    </aside>
  );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ active, onDragOver, onDrop, height }: {
  active: boolean; onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void; height: number;
}) {
  return (
    <div
      className="flex-shrink-0 transition-all duration-100 rounded flex items-center justify-center"
      style={{ width: active ? 36 : 6, height, backgroundColor: active ? "#b5a090" : "transparent", opacity: active ? 0.75 : 1 }}
      onDragOver={onDragOver} onDrop={onDrop}
    >
      {active && <div className="w-0.5 h-full bg-taupe-600 rounded-full" />}
    </div>
  );
}

// ─── WallCanvas ───────────────────────────────────────────────────────────────

interface WallCanvasProps {
  modules: BuilderModule[]; selectedId: string | null; wallW: number;
  onSelect: (id: string | null) => void; onDelete: (id: string) => void;
  onInsert: (type: ZoneType, atIndex: number) => void;
  onReorder: (fromId: string, toIndex: number) => void;
  onResizeAdj: (leftIdx: number, newLeftW: number, newRightW: number) => void;
}

function WallCanvas({ modules, selectedId, wallW, onSelect, onDelete, onInsert, onReorder, onResizeAdj }: WallCanvasProps) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const resizing = useRef<{ idx: number; startX: number; leftW: number; rightW: number } | null>(null);

  const CANVAS_H = 270;
  const RULER_H = 22;
  const totalUsed = modules.reduce((s, m) => s + m.width, 0);
  const availableW = Math.max(totalUsed, wallW);
  const scale = Math.min(7.5, 800 / Math.max(availableW, 60));
  const overWidth = totalUsed > wallW;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const delta = (e.clientX - resizing.current.startX) / scale;
      const MIN = 12, MAX = 96;
      const newLeft  = Math.min(MAX, Math.max(MIN, resizing.current.leftW + delta));
      const newRight = Math.min(MAX, Math.max(MIN, resizing.current.rightW - delta));
      onResizeAdj(resizing.current.idx, Math.round(newLeft), Math.round(newRight));
    };
    const onUp = () => { resizing.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [scale, onResizeAdj]);

  const readDrop = (e: React.DragEvent, atIndex: number) => {
    e.preventDefault(); setDragOverIdx(null);
    const source = e.dataTransfer.getData("alveo-source");
    if (source === "palette") {
      const type = e.dataTransfer.getData("alveo-type") as ZoneType;
      if (type) onInsert(type, atIndex);
    } else if (source === "wall") {
      const id = e.dataTransfer.getData("alveo-id");
      if (id) onReorder(id, atIndex);
    }
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverIdx(idx);
  };

  // Ruler tick marks
  const wallPx = wallW * scale;
  const tickEvery = wallW <= 60 ? 6 : wallW <= 120 ? 12 : 24;
  const ticks: number[] = [];
  for (let inch = 0; inch <= wallW; inch += tickEvery) ticks.push(inch);

  return (
    <div className="w-full select-none">
      {/* Width progress bar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${overWidth ? "bg-red-400" : "bg-taupe-400"}`}
            style={{ width: `${Math.min(100, (totalUsed / wallW) * 100)}%` }}
          />
        </div>
        <span className={`text-xs font-medium whitespace-nowrap ${overWidth ? "text-red-500" : "text-stone-500"}`}>
          {totalUsed}″ / {wallW}″ {overWidth && "· exceeds wall!"}
        </span>
      </div>

      {/* Canvas */}
      <div
        className={`relative bg-stone-100 border rounded-xl overflow-x-auto transition-colors ${overWidth ? "border-red-300 bg-red-50" : "border-stone-300"}`}
        style={{ minHeight: CANVAS_H + RULER_H + 8 }}
        onDragOver={(e) => { e.preventDefault(); setDragOverIdx(modules.length); }}
        onDrop={(e) => readDrop(e, modules.length)}
        onDragLeave={() => setDragOverIdx(null)}
      >
        {/* Ruler */}
        <div className="sticky top-0 left-0 flex items-end bg-stone-200/70 backdrop-blur-sm border-b border-stone-300/50 px-3 z-10" style={{ height: RULER_H }}>
          <div className="relative flex-1">
            <Ruler size={9} className="absolute left-0 top-1 text-stone-400" />
            <div className="ml-4 relative" style={{ width: wallPx }}>
              {ticks.map((inch) => (
                <div key={inch} className="absolute top-0 flex flex-col items-center" style={{ left: inch * scale }}>
                  <div className="w-px bg-stone-400/60" style={{ height: inch % 24 === 0 ? 8 : 4 }} />
                  {inch % 24 === 0 && (
                    <span className="text-[8px] text-stone-400 mt-0.5 font-mono">{Math.round(inch / 12)}′</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floor line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-stone-400/30" />

        {/* Module row */}
        <div className="flex items-end px-3 pb-1" style={{ height: CANVAS_H + 8 }}>
          {/* Leading drop zone */}
          <DropZone active={dragOverIdx === 0} height={CANVAS_H} onDragOver={(e) => handleDragOver(e, 0)} onDrop={(e) => readDrop(e, 0)} />

          {modules.map((mod, i) => {
            const cat = getCat(mod.type);
            const colW = Math.max(20, mod.width * scale);
            const isSelected = mod.id === selectedId;

            return (
              <div key={mod.id} className="flex items-end">
                {/* Module column */}
                <div
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("alveo-source", "wall"); e.dataTransfer.setData("alveo-id", mod.id); }}
                  onDragEnd={() => setDragOverIdx(null)}
                  onClick={() => onSelect(isSelected ? null : mod.id)}
                  className="relative flex flex-col items-center cursor-grab active:cursor-grabbing rounded-t-lg transition-all"
                  style={{
                    width: colW,
                    height: CANVAS_H,
                    backgroundColor: cat.bg,
                    borderTop: `3px solid ${cat.border}`,
                    borderLeft: `1px solid ${cat.border}44`,
                    borderRight: `1px solid ${cat.border}44`,
                    outline: isSelected ? `2px solid ${cat.border}` : undefined,
                    outlineOffset: isSelected ? "2px" : undefined,
                  }}
                >
                  {/* Top grip */}
                  <div className="mt-1.5 opacity-30 flex-shrink-0">
                    <GripVertical size={12} />
                  </div>

                  {/* Main label area */}
                  {colW >= 30 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 text-center overflow-hidden">
                      <span className="text-xl leading-none" style={{ color: cat.border }}>
                        {cat.icon}
                      </span>
                      {colW >= 44 && (
                        <>
                          <span className="text-[11px] font-semibold leading-tight text-stone-700 mt-1 line-clamp-2">
                            {mod.label}
                          </span>
                          <span className="text-[9px] font-mono text-stone-400">{mod.width}″</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Bottom: width label when narrow */}
                  {colW < 30 && (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[8px] font-mono text-stone-400 rotate-90 whitespace-nowrap">
                        {mod.width}″
                      </span>
                    </div>
                  )}

                  {/* Delete button (selected only) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(mod.id); }}
                    className={`mb-2 p-1 rounded-md bg-red-100 hover:bg-red-200 text-red-500 transition-all flex-shrink-0 ${isSelected ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    title="Remove module"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                {/* Resize handle */}
                {i < modules.length - 1 && (
                  <div
                    className="relative cursor-col-resize group flex-shrink-0"
                    style={{ width: 12, height: CANVAS_H }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      resizing.current = { idx: i, startX: e.clientX, leftW: mod.width, rightW: modules[i + 1].width };
                    }}
                  >
                    <div className="absolute inset-y-2 left-[5px] w-0.5 bg-stone-400/30 group-hover:bg-taupe-500 group-hover:w-[3px] group-active:bg-taupe-600 rounded-full transition-all" />
                  </div>
                )}

                {/* Drop zone */}
                <DropZone active={dragOverIdx === i + 1} height={CANVAS_H} onDragOver={(e) => handleDragOver(e, i + 1)} onDrop={(e) => readDrop(e, i + 1)} />
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {modules.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 gap-3">
            <Box size={40} className="opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">Canvas is empty</p>
              <p className="text-xs mt-0.5 opacity-70">Drag modules from the panel, or click the + button</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── StatsPanel ───────────────────────────────────────────────────────────────

function StatsPanel({
  modules, wallW, wallH, wallD, woodFinish, onWoodFinishChange,
  drawingMode, onDrawingModeChange, svgContent,
}: {
  modules: BuilderModule[]; wallW: number; wallH: number; wallD: number;
  woodFinish: string; onWoodFinishChange: (v: string) => void;
  drawingMode: "elevation" | "3d"; onDrawingModeChange: (v: "elevation" | "3d") => void;
  svgContent: string | null;
}) {
  const totalUsed = modules.reduce((s, m) => s + m.width, 0);
  const layout = useMemo(() => {
    if (!modules.length) return null;
    try { return buildLayout(modules, Math.max(totalUsed, wallW), wallH, wallD); } catch { return null; }
  }, [modules, wallW, wallH, wallD, totalUsed]);

  const stats = layout?.totalStorage;
  const utilization = layout?.utilizationScore ?? 0;
  const remainingIn = wallW - totalUsed;

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-l border-stone-200 flex flex-col overflow-hidden">
      {/* Finish selector */}
      <div className="p-3 border-b border-stone-100">
        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-1.5">
          Wood Finish
        </label>
        <select
          value={woodFinish}
          onChange={(e) => onWoodFinishChange(e.target.value)}
          className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-taupe-300"
        >
          <option value="light">Light Oak</option>
          <option value="medium">Warm Walnut</option>
          <option value="dark">Dark Espresso</option>
          <option value="white">Painted White</option>
        </select>
      </div>

      {/* Storage stats */}
      <div className="p-3 border-b border-stone-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2.5">
          Storage Summary
        </p>
        {!stats ? (
          <p className="text-xs text-stone-400 italic">Add modules to see stats</p>
        ) : (
          <div className="space-y-2.5">
            <StatRow icon="👗" label="Hanging rods"  value={`${stats.hangingRods} lin ft`} />
            <StatRow icon="🗄️" label="Drawers"        value={String(stats.drawerCount)} />
            <StatRow icon="👟" label="Shoe pairs"     value={String(stats.shoeCapacity)} />
            <StatRow icon="📦" label="Shelf space"    value={`${stats.shelfSpace} sq ft`} />

            {/* Utilisation bar */}
            <div className="mt-1">
              <div className="flex justify-between text-[9px] text-stone-400 mb-1">
                <span>Wall usage</span>
                <span className={utilization > 100 ? "text-red-500 font-medium" : ""}>{utilization}%</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${utilization > 100 ? "bg-red-400" : utilization > 85 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min(100, utilization)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Remaining space */}
      {modules.length > 0 && (
        <div className="px-3 py-2.5 border-b border-stone-100">
          <p className={`text-xs ${remainingIn < 0 ? "text-red-500" : "text-stone-500"}`}>
            {remainingIn >= 0
              ? <><span className="font-semibold text-charcoal-600">{remainingIn}″</span> remaining space</>
              : <><span className="font-semibold">{Math.abs(remainingIn)}″</span> over wall limit</>
            }
          </p>
          <p className="text-[9px] text-stone-400 mt-0.5">
            {wallW}″ wall · {modules.length} module{modules.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Preview */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Preview</p>
          <div className="flex items-center gap-0.5 bg-stone-100 rounded-md p-0.5">
            <button
              onClick={() => onDrawingModeChange("elevation")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${drawingMode === "elevation" ? "bg-white text-charcoal-600 shadow-sm" : "text-stone-400"}`}
            >
              2D
            </button>
            <button
              onClick={() => onDrawingModeChange("3d")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${drawingMode === "3d" ? "bg-white text-charcoal-600 shadow-sm" : "text-stone-400"}`}
            >
              3D
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-2 min-h-0 bg-stone-50">
          {modules.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-1">
              <Layers size={24} className="opacity-50" />
              <p className="text-[10px]">No layout yet</p>
            </div>
          ) : svgContent ? (
            <div
              className="h-full w-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-stone-400 text-[10px]">
              Rendering…
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[11px] text-stone-500">{label}</span>
      </div>
      <span className="text-[11px] font-semibold text-charcoal-600">{value}</span>
    </div>
  );
}

// ─── SelectedModulePanel ──────────────────────────────────────────────────────

function SelectedModulePanel({ module, onUpdate, onDelete, onClose }: {
  module: BuilderModule; onUpdate: (changes: Partial<BuilderModule>) => void;
  onDelete: () => void; onClose: () => void;
}) {
  const cat = getCat(module.type);
  return (
    <div
      className="mt-3 p-3 rounded-xl border bg-white shadow-sm"
      style={{ borderColor: cat.border + "44", borderLeftColor: cat.border, borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ backgroundColor: cat.bg, color: cat.border }}>
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-charcoal-600">{cat.label}</p>
          <p className="text-[10px] text-stone-400 truncate">{cat.desc}</p>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-0.5 rounded-md hover:bg-stone-100 transition-colors flex-shrink-0">
          <span className="text-xs">✕</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Label */}
        <div className="col-span-1 flex flex-col gap-1">
          <label className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Label</label>
          <input
            type="text" value={module.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="text-xs border border-stone-200 rounded-md px-2 py-1.5 text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-taupe-400 w-full"
          />
        </div>

        {/* Type */}
        <div className="col-span-1 flex flex-col gap-1">
          <label className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Type</label>
          <select value={module.type}
            onChange={(e) => { const t = e.target.value as ZoneType; onUpdate({ type: t, label: getCat(t).label }); }}
            className="text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-taupe-400 w-full"
          >
            {MODULE_CATALOGUE.map((m) => <option key={m.type} value={m.type}>{m.label}</option>)}
          </select>
        </div>

        {/* Width */}
        <div className="col-span-1 flex flex-col gap-1">
          <label className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Width (in)</label>
          <div className="flex items-center gap-1">
            <button onClick={() => onUpdate({ width: Math.max(12, module.width - 3) })}
              className="w-5 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-xs flex-shrink-0">−</button>
            <input type="number" min={12} max={96} value={module.width}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) onUpdate({ width: Math.min(96, Math.max(12, v)) }); }}
              className="flex-1 min-w-0 text-center text-xs font-mono border border-stone-200 rounded-md px-0.5 py-1.5 text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-taupe-400"
            />
            <button onClick={() => onUpdate({ width: Math.min(96, module.width + 3) })}
              className="w-5 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-xs flex-shrink-0">+</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
        <p className="text-[10px] text-stone-400 flex items-center gap-1">
          <Info size={9} /> Press <kbd className="bg-stone-100 px-1 rounded text-[9px] border border-stone-200 font-mono">Del</kbd> to remove
        </p>
        <button onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
          <Trash2 size={11} /> Remove
        </button>
      </div>
    </div>
  );
}

// ─── SaveToProjectModal ───────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Project { id: string; name: string; client_name: string | null }

type SaveStage = "form" | "saving" | "done" | "error";

function SaveToProjectModal({
  modules, wallW, wallH, wallD, woodFinish, onClose,
}: {
  modules: BuilderModule[]; wallW: number; wallH: number; wallD: number;
  woodFinish: string; onClose: () => void;
}) {
  const [stage, setStage] = useState<SaveStage>("form");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [designName, setDesignName] = useState(
    `Layout ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  );
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [savedDesignId, setSavedDesignId] = useState("");

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { setLoadingProjects(false); return; }
    fetch(`${BASE}/api/projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : { projects: [] })
      .then((d: { projects?: Project[] }) => {
        const list = d.projects ?? [];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
        else setProjectMode("new");
      })
      .catch(() => setProjectMode("new"))
      .finally(() => setLoadingProjects(false));
  }, []);

  const handleSave = async () => {
    if (!designName.trim()) { setErrorMsg("Design name is required."); return; }
    if (projectMode === "new" && !newProjectName.trim()) { setErrorMsg("Project name is required."); return; }
    if (projectMode === "existing" && !selectedProjectId) { setErrorMsg("Select a project."); return; }
    setErrorMsg("");
    setStage("saving");

    const token = getStoredToken();
    if (!token) { setErrorMsg("You must be logged in to save."); setStage("error"); return; }
    const authH = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    try {
      // 1. Save the design
      const designId = `builder_${Date.now().toString(36)}`;
      const designRes = await fetch(`${BASE}/api/designs`, {
        method: "POST",
        headers: authH,
        body: JSON.stringify({
          design: {
            id: designId,
            name: designName.trim(),
            builderModules: modules,
            wallDimensions: { width: wallW, height: wallH, depth: wallD },
            woodFinish,
            source: "builder",
          },
        }),
      });
      if (!designRes.ok) throw new Error("Failed to save design");
      setSavedDesignId(designId);

      // 2. Resolve or create the project
      let projectId = selectedProjectId;
      if (projectMode === "new") {
        const projRes = await fetch(`${BASE}/api/projects`, {
          method: "POST",
          headers: authH,
          body: JSON.stringify({ name: newProjectName.trim(), clientName: newClientName.trim() || null, status: "active" }),
        });
        if (!projRes.ok) throw new Error("Failed to create project");
        const { project } = await projRes.json() as { project: { id: string } };
        projectId = project.id;
      }

      // 3. Link design → project
      await fetch(`${BASE}/api/projects/${projectId}/designs`, {
        method: "POST",
        headers: authH,
        body: JSON.stringify({ designId }),
      });

      setStage("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "An unexpected error occurred.");
      setStage("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-charcoal-50 flex items-center justify-center">
              <Save size={15} className="text-charcoal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal-700">Save to Project</p>
              <p className="text-[10px] text-stone-400">Save this layout to your designer dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {stage === "done" ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <p className="text-base font-semibold text-charcoal-700 mb-1">Layout saved!</p>
              <p className="text-xs text-stone-500 mb-5">
                <span className="font-medium text-charcoal-600">{designName}</span> has been saved to your project.
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/dashboard"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-charcoal-600 text-white hover:bg-charcoal-500 transition-colors">
                  Go to Dashboard
                </Link>
                <button onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors">
                  Keep editing
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Design name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                  Design Name
                </label>
                <input
                  type="text" value={designName} onChange={(e) => setDesignName(e.target.value)}
                  className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-taupe-300"
                  placeholder="e.g. Master Bedroom Closet"
                />
              </div>

              {/* Project selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                  Project
                </label>
                {loadingProjects ? (
                  <div className="text-xs text-stone-400 py-2">Loading projects…</div>
                ) : (
                  <div className="space-y-2">
                    {projects.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => setProjectMode("existing")}
                          className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${projectMode === "existing" ? "bg-charcoal-600 text-white border-charcoal-600" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"}`}>
                          Existing Project
                        </button>
                        <button
                          onClick={() => setProjectMode("new")}
                          className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${projectMode === "new" ? "bg-charcoal-600 text-white border-charcoal-600" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"}`}>
                          New Project
                        </button>
                      </div>
                    )}

                    {projectMode === "existing" && projects.length > 0 && (
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 bg-white text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-taupe-300"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.client_name ? ` — ${p.client_name}` : ""}
                          </option>
                        ))}
                      </select>
                    )}

                    {projectMode === "new" && (
                      <div className="space-y-2.5 p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FolderPlus size={13} className="text-stone-500" />
                          <span className="text-xs font-medium text-stone-600">Create new project</span>
                        </div>
                        <input
                          type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Project name *"
                          className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-taupe-400 bg-white"
                        />
                        <input
                          type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="Client name (optional)"
                          className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-taupe-400 bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Layout summary */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Layout Summary</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-600">
                  <span><span className="text-stone-400">Modules:</span> {modules.length}</span>
                  <span><span className="text-stone-400">Wall:</span> {wallW}″ × {wallH}″ × {wallD}″ deep</span>
                  <span><span className="text-stone-400">Total width:</span> {modules.reduce((s, m) => s + m.width, 0)}″</span>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {stage !== "done" && (
          <div className="px-5 py-3.5 border-t border-stone-100 flex items-center justify-between gap-3">
            <button onClick={onClose} className="text-xs text-stone-500 hover:text-stone-700 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={stage === "saving"}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-charcoal-600 text-white hover:bg-charcoal-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {stage === "saving" ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : (
                <><Save size={13} /> Save Design</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BuilderPage ──────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const { user } = useAuth();
  const [showSave, setShowSave] = useState(false);

  const [modules, setModules] = useState<BuilderModule[]>(() => {
    try {
      const raw = localStorage.getItem("alveo_builder_modules");
      if (!raw) return DEFAULT_MODULES;
      const parsed = JSON.parse(raw) as BuilderModule[];
      return parsed.length > 0 ? parsed : DEFAULT_MODULES;
    } catch { return DEFAULT_MODULES; }
  });
  const [history, setHistory] = useState<BuilderModule[][]>([]);
  const [wallW, setWallW] = useState(120);
  const [wallH, setWallH] = useState(96);
  const [wallD, setWallD] = useState(24);
  const [woodFinish, setWoodFinish] = useState<"light" | "medium" | "dark" | "white">("medium");
  const [drawingMode, setDrawingMode] = useState<"elevation" | "3d">("elevation");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;
  const totalUsed = modules.reduce((s, m) => s + m.width, 0);
  const effectiveW = Math.max(totalUsed, wallW);

  const svgContent = useMemo(() => {
    if (!modules.length) return null;
    try {
      const layout = buildLayout(modules, effectiveW, wallH, wallD);
      return drawingMode === "3d"
        ? new ClosetIsometricRenderer(layout, { woodFinish }).renderIsometric()
        : new ClosetSVGRenderer(layout, { showDimensions: true, showLabels: true, woodFinish, style: "modern" }).renderElevation();
    } catch { return null; }
  }, [modules, effectiveW, wallH, wallD, woodFinish, drawingMode]);

  // Save to localStorage
  useEffect(() => { localStorage.setItem("alveo_builder_modules", JSON.stringify(modules)); }, [modules]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        deleteModule(selectedId);
      }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // History snapshot before mutations
  const snapshot = () => setHistory((h) => [...h.slice(-19), modules]);

  const addModule = useCallback((type: ZoneType, atIndex?: number) => {
    const cat = getCat(type);
    const newMod: BuilderModule = { id: uid(), type, label: cat.label, width: cat.defaultWidth };
    setHistory((h) => [...h.slice(-19), modules]);
    setModules((prev) => { const arr = [...prev]; arr.splice(atIndex ?? arr.length, 0, newMod); return arr; });
  }, [modules]);

  const insertModule = useCallback((type: ZoneType, atIndex: number) => addModule(type, atIndex), [addModule]);

  const reorderModule = useCallback((fromId: string, toIndex: number) => {
    snapshot();
    setModules((prev) => {
      const fromIdx = prev.findIndex((m) => m.id === fromId);
      if (fromIdx === -1) return prev;
      const arr = [...prev]; const [mod] = arr.splice(fromIdx, 1);
      arr.splice(Math.max(0, fromIdx < toIndex ? toIndex - 1 : toIndex), 0, mod);
      return arr;
    });
  }, [snapshot]);

  const deleteModule = useCallback((id: string) => {
    snapshot();
    setModules((prev) => prev.filter((m) => m.id !== id));
    setSelectedId((prev) => prev === id ? null : prev);
  }, [snapshot]);

  const resizeAdj = useCallback((leftIdx: number, newLeftW: number, newRightW: number) => {
    setModules((prev) => {
      const arr = [...prev];
      arr[leftIdx] = { ...arr[leftIdx], width: newLeftW };
      arr[leftIdx + 1] = { ...arr[leftIdx + 1], width: newRightW };
      return arr;
    });
  }, []);

  const updateSelected = useCallback((changes: Partial<BuilderModule>) => {
    setModules((prev) => prev.map((m) => m.id === selectedId ? { ...m, ...changes } : m));
  }, [selectedId]);

  const undo = () => {
    if (!history.length) return;
    const prev = [...history]; const last = prev.pop()!;
    setHistory(prev); setModules(last); setSelectedId(null);
  };

  const resetLayout = () => {
    snapshot();
    setModules(DEFAULT_MODULES.map((m) => ({ ...m, id: uid() })));
    setSelectedId(null);
  };

  const clearAll = () => {
    snapshot(); setModules([]); setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-stone-50 pt-16 flex flex-col" style={{ height: "100dvh" }}>
      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-200 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 z-10 flex-shrink-0">
        <Link href="/" className="text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0" title="Back to home">
          <ArrowLeft size={18} />
        </Link>

        <div className="flex-shrink-0">
          <h1 className="font-serif text-lg font-bold text-charcoal-600 leading-tight">Layout Builder</h1>
          <p className="text-[10px] text-stone-400 leading-none mt-0.5">Drag-and-drop closet design</p>
        </div>

        <div className="hidden sm:block w-px h-7 bg-stone-200 flex-shrink-0" />

        {/* Dimensions */}
        <div className="flex flex-wrap items-start gap-3">
          <DimInput label="Width"  value={wallW} onChange={setWallW} min={36}  max={360} step={12} />
          <DimInput label="Height" value={wallH} onChange={setWallH} min={72}  max={120} step={6}  />
          <DimInput label="Depth"  value={wallD} onChange={setWallD} min={14}  max={30}  step={2}  />
        </div>

        <div className="hidden sm:block w-px h-7 bg-stone-200 flex-shrink-0" />

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {history.length > 0 && (
            <button onClick={undo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors"
              title="Undo last change">
              <RotateCcw size={12} />
              Undo
            </button>
          )}
          <button onClick={resetLayout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">
            Reset
          </button>
          {modules.length > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
              Clear
            </button>
          )}
          {user && modules.length > 0 && (
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-taupe-500 hover:bg-taupe-600 transition-colors"
            >
              <Save size={12} />
              Save to Project
            </button>
          )}
          {!user && modules.length > 0 && (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-taupe-600 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 transition-colors"
              title="Log in to save this layout"
            >
              <Save size={12} />
              Log in to save
            </Link>
          )}
          <Link href="/configurator"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-charcoal-600 hover:bg-charcoal-500 transition-colors">
            Configurator <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Palette */}
        <ModulePalette onAdd={(type) => addModule(type)} />

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-auto p-4">
            <WallCanvas
              modules={modules} selectedId={selectedId} wallW={wallW}
              onSelect={setSelectedId} onDelete={deleteModule}
              onInsert={insertModule} onReorder={reorderModule} onResizeAdj={resizeAdj}
            />

            {/* Selected module editor */}
            {selectedModule && (
              <SelectedModulePanel
                module={selectedModule} onUpdate={updateSelected}
                onDelete={() => deleteModule(selectedModule.id)}
                onClose={() => setSelectedId(null)}
              />
            )}

            {/* Keyboard hint */}
            {!selectedModule && modules.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-stone-400">
                <span className="flex items-center gap-1"><GripVertical size={10} /> Drag columns to reorder</span>
                <span>·  Drag dividers between columns to resize</span>
                <span>·  Click a column to select &amp; edit</span>
                <span>·  <kbd className="bg-stone-100 px-1 rounded border border-stone-200 font-mono text-[9px]">Del</kbd> removes selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats + Preview */}
        <StatsPanel
          modules={modules} wallW={wallW} wallH={wallH} wallD={wallD}
          woodFinish={woodFinish} onWoodFinishChange={(v) => setWoodFinish(v as typeof woodFinish)}
          drawingMode={drawingMode} onDrawingModeChange={setDrawingMode}
          svgContent={svgContent}
        />
      </div>

      {/* Save to Project modal */}
      {showSave && (
        <SaveToProjectModal
          modules={modules} wallW={wallW} wallH={wallH} wallD={wallD}
          woodFinish={woodFinish} onClose={() => setShowSave(false)}
        />
      )}
    </div>
  );
}
