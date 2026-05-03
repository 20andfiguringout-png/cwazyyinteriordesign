import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Trash2, GripVertical, Box, RotateCcw, Plus, Minus,
  ChevronRight, Layers, Ruler, Info, Save, CheckCircle2, FolderPlus, X, ExternalLink,
  Settings, Pencil,
} from "lucide-react";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";
import { ClosetIsometricRenderer } from "@/renderer/ClosetIsometricRenderer";
import { useAuth } from "@/lib/AuthContext";
import { getStoredToken } from "@/lib/AuthContext";
import {
  ClosetLayout, ClosetZone, ClosetWall, ShelfConfig, DrawerConfig,
} from "@/types/closet";
import { StorageClass, CatalogueEntry, BUILTIN_CATALOGUE, getCat } from "@/types/catalogue";

// ─── Module catalogue ────────────────────────────────────────────────────────

type ZoneType = string;

interface BuilderModule { id: string; type: string; label: string; width: number }

// ─── Preset layouts ───────────────────────────────────────────────────────────

interface PresetLayout {
  name: string;
  desc: string;
  icon: string;
  modules: Array<{ type: string; label: string; width: number }>;
}

const PRESET_LAYOUTS: PresetLayout[] = [
  {
    name: "His & Hers",
    desc: "Symmetric long hang with shared centre storage",
    icon: "👫",
    modules: [
      { type: "long-hang",    label: "Her Side",    width: 30 },
      { type: "drawers",      label: "Drawers",     width: 18 },
      { type: "shoe-shelves", label: "Shoe Shelves",width: 18 },
      { type: "long-hang",    label: "His Side",    width: 30 },
    ],
  },
  {
    name: "Master Suite",
    desc: "Full-featured walk-in with every storage type",
    icon: "🏠",
    modules: [
      { type: "double-hang",  label: "Double Hang", width: 24 },
      { type: "long-hang",    label: "Long Hang",   width: 30 },
      { type: "drawers",      label: "Drawers",     width: 18 },
      { type: "open-shelves", label: "Shelves",     width: 18 },
      { type: "shoe-shelves", label: "Shoes",       width: 18 },
      { type: "double-hang",  label: "Double Hang", width: 24 },
    ],
  },
  {
    name: "Kids Room",
    desc: "Easy-reach shelves, small hang section, lots of drawers",
    icon: "🧒",
    modules: [
      { type: "open-shelves", label: "Books & Toys", width: 18 },
      { type: "double-hang",  label: "Short Hang",   width: 24 },
      { type: "drawers",      label: "Drawers",      width: 18 },
      { type: "shoe-shelves", label: "Shoe Shelves", width: 18 },
    ],
  },
  {
    name: "Studio Apartment",
    desc: "Compact essentials — hang, fold, and shoes",
    icon: "🏢",
    modules: [
      { type: "long-hang",    label: "Long Hang",   width: 30 },
      { type: "drawers",      label: "Drawers",     width: 18 },
      { type: "shoe-shelves", label: "Shoe Shelves",width: 18 },
    ],
  },
  {
    name: "Entryway",
    desc: "Coats, bags, top shelf, and shoes by the door",
    icon: "🚪",
    modules: [
      { type: "long-hang",   label: "Coats",      width: 30 },
      { type: "top-shelves", label: "Bags & Hats", width: 24 },
      { type: "shoe-shelves",label: "Shoes",       width: 18 },
    ],
  },
  {
    name: "Maximalist",
    desc: "Every module type — maximum capacity",
    icon: "✨",
    modules: [
      { type: "double-hang",  label: "Double Hang", width: 24 },
      { type: "long-hang",    label: "Long Hang",   width: 30 },
      { type: "open-shelves", label: "Shelves",     width: 18 },
      { type: "drawers",      label: "Drawers",     width: 18 },
      { type: "shoe-shelves", label: "Shoes",       width: 18 },
      { type: "top-shelves",  label: "Top Shelves", width: 24 },
    ],
  },
];

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

function buildLayout(modules: BuilderModule[], catalogue: CatalogueEntry[], wallW: number, wallH: number, wallD: number): ClosetLayout {
  const TOE = 3.5;
  let curX = 0;
  const zones: ClosetZone[] = [];

  for (const mod of modules) {
    const storageClass = getCat(catalogue, mod.type).storageClass;
    const x = curX, w = mod.width, yBot = TOE, h = wallH - TOE;
    switch (storageClass) {
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
      case "shelves": {
        const shelves: ShelfConfig[] = [];
        let relH = 2;
        while (relH + 0.75 <= h - 4 && shelves.length < 8) {
          shelves.push({ height: relH, depth: wallD - 4, spacing: 11, count: 1, purpose: "folded" });
          relH += 0.75 + 11;
        }
        zones.push({ type: "open-shelves", x, y: yBot, width: w, height: h, shelves }); break;
      }
      case "shoes": {
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

function ModulePalette({ catalogue, onAdd, onManage, onLoadPreset }: {
  catalogue: CatalogueEntry[];
  onAdd: (type: ZoneType) => void;
  onManage: () => void;
  onLoadPreset: (preset: PresetLayout) => void;
}) {
  const [showPresets, setShowPresets] = useState(false);

  const handleDragStart = (e: React.DragEvent, type: ZoneType) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("alveo-source", "palette");
    e.dataTransfer.setData("alveo-type", type);
  };

  return (
    <aside className="w-48 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-stone-100 flex items-center justify-between gap-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Modules</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Drag to canvas or click +</p>
        </div>
        <button
          onClick={onManage}
          title="Manage module types"
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors flex-shrink-0"
        >
          <Settings size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Module list */}
        <div className="p-2 space-y-1.5">
          {catalogue.map((mod) => (
            <div
              key={mod.type}
              draggable
              onDragStart={(e) => handleDragStart(e, mod.type)}
              className="group flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing select-none hover:shadow-sm transition-all"
              style={{ backgroundColor: mod.bg, borderColor: mod.border + "44" }}
            >
              <span className="text-sm w-5 text-center flex-shrink-0" style={{ color: mod.border }}>
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
          <button
            onClick={onManage}
            className="w-full py-2 rounded-lg border-2 border-dashed border-stone-200 hover:border-taupe-300 hover:bg-taupe-50 text-[10px] font-medium text-stone-400 hover:text-taupe-600 flex items-center justify-center gap-1 transition-all"
          >
            <Plus size={10} /> Add module type
          </button>
        </div>

        {/* Presets accordion */}
        <div className="border-t border-stone-100">
          <button
            onClick={() => setShowPresets((v) => !v)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Layers size={10} />
              Presets
            </span>
            <ChevronRight size={10} className={`transition-transform ${showPresets ? "rotate-90" : ""}`} />
          </button>

          {showPresets && (
            <div className="px-2 pb-2 space-y-1.5">
              {PRESET_LAYOUTS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => onLoadPreset(preset)}
                  className="w-full text-left p-2 rounded-lg bg-stone-50 hover:bg-taupe-50 border border-stone-200 hover:border-taupe-300 transition-all group"
                >
                  <div className="flex items-start gap-1.5">
                    <span className="text-base leading-none mt-0.5 flex-shrink-0">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-stone-700 group-hover:text-taupe-700 leading-tight">{preset.name}</p>
                      <p className="text-[9px] text-stone-400 leading-snug mt-0.5">{preset.desc}</p>
                      <div className="flex gap-0.5 mt-1.5 flex-wrap">
                        {preset.modules.map((m, i) => {
                          const cat = getCat(catalogue, m.type);
                          return (
                            <span
                              key={i}
                              className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                              title={`${m.label} (${m.width}″)`}
                              style={{ backgroundColor: cat.border + "cc" }}
                            />
                          );
                        })}
                        <span className="text-[8px] text-stone-400 ml-0.5 self-center font-mono">
                          {preset.modules.reduce((s, m) => s + m.width, 0)}″
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5 border-t border-stone-100 flex-shrink-0">
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
  catalogue: CatalogueEntry[];
  onSelect: (id: string | null) => void; onDelete: (id: string) => void;
  onInsert: (type: string, atIndex: number) => void;
  onReorder: (fromId: string, toIndex: number) => void;
  onResizeAdj: (leftIdx: number, newLeftW: number, newRightW: number) => void;
}

function WallCanvas({ modules, selectedId, wallW, catalogue, onSelect, onDelete, onInsert, onReorder, onResizeAdj }: WallCanvasProps) {
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
            const cat = getCat(catalogue, mod.type);
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
  modules, catalogue, wallW, wallH, wallD, woodFinish, onWoodFinishChange,
  drawingMode, onDrawingModeChange, svgContent,
}: {
  modules: BuilderModule[]; catalogue: CatalogueEntry[]; wallW: number; wallH: number; wallD: number;
  woodFinish: string; onWoodFinishChange: (v: string) => void;
  drawingMode: "elevation" | "3d"; onDrawingModeChange: (v: "elevation" | "3d") => void;
  svgContent: string | null;
}) {
  const totalUsed = modules.reduce((s, m) => s + m.width, 0);
  const layout = useMemo(() => {
    if (!modules.length) return null;
    try { return buildLayout(modules, catalogue, Math.max(totalUsed, wallW), wallH, wallD); } catch { return null; }
  }, [modules, catalogue, wallW, wallH, wallD, totalUsed]);

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
          <div className="flex items-center gap-1">
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
            <button
              onClick={() => {
                if (!svgContent) return;
                const label = drawingMode === "3d" ? "3D" : "2D";
                const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alvéo — ${label} Preview</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #f7f6f4; }
    body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; font-family: system-ui, sans-serif; }
    .badge { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #9c9590; }
    .svg-wrap { width: min(92vw, 92vh); aspect-ratio: 1; background: #fff; border-radius: 12px; box-shadow: 0 2px 24px rgba(0,0,0,.08); padding: 24px; display: flex; align-items: center; justify-content: center; }
    .svg-wrap svg { width: 100%; height: 100%; }
    .print-btn {
      position: fixed; top: 16px; right: 16px;
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
      background: #2c2825; color: #fff;
      font-family: system-ui, sans-serif; font-size: 13px; font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,.18); transition: background .15s;
    }
    .print-btn:hover { background: #1a1714; }
    .print-btn svg { flex-shrink: 0; }
    .kbd {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 4px;
      background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
      font-size: 11px; font-weight: 600; line-height: 1; margin-left: 2px;
    }
    @media print {
      html, body { background: #fff; height: auto; }
      .print-btn { display: none; }
      .badge { display: none; }
      .svg-wrap {
        width: 100%; height: 100vh; aspect-ratio: unset;
        border-radius: 0; box-shadow: none; padding: 12mm;
      }
      @page { margin: 0; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print / Save as PDF
    <span class="kbd">P</span>
  </button>
  <span class="badge">Alvéo · ${label} Preview</span>
  <div class="svg-wrap">${svgContent}</div>
  <script>
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); window.print(); }
      if (e.key === 'Escape') { window.close(); }
    });
  </script>
</body>
</html>`;
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const w = window.open(url, "_blank");
                if (w) setTimeout(() => URL.revokeObjectURL(url), 60_000);
              }}
              disabled={!svgContent}
              title="Open preview in new tab"
              className="p-1 rounded text-stone-400 hover:text-charcoal-600 hover:bg-stone-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ExternalLink size={12} />
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

function SelectedModulePanel({ module, catalogue, onUpdate, onDelete, onClose }: {
  module: BuilderModule; catalogue: CatalogueEntry[];
  onUpdate: (changes: Partial<BuilderModule>) => void;
  onDelete: () => void; onClose: () => void;
}) {
  const cat = getCat(catalogue, module.type);
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
            onChange={(e) => { const t = e.target.value; onUpdate({ type: t, label: getCat(catalogue, t).label }); }}
            className="text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-white text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-taupe-400 w-full"
          >
            {catalogue.map((m) => <option key={m.type} value={m.type}>{m.label}</option>)}
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

// ─── ManageCatalogueModal ─────────────────────────────────────────────────────

const PRESET_COLORS: Array<{ bg: string; border: string; name: string }> = [
  { bg: "#dbeafe", border: "#3b82f6", name: "Blue" },
  { bg: "#fce7f3", border: "#ec4899", name: "Pink" },
  { bg: "#fef3c7", border: "#f59e0b", name: "Amber" },
  { bg: "#d1fae5", border: "#10b981", name: "Green" },
  { bg: "#ede9fe", border: "#8b5cf6", name: "Purple" },
  { bg: "#fee2e2", border: "#ef4444", name: "Red" },
  { bg: "#ccfbf1", border: "#14b8a6", name: "Teal" },
  { bg: "#ffedd5", border: "#f97316", name: "Orange" },
  { bg: "#fdf4ff", border: "#c026d3", name: "Fuchsia" },
  { bg: "#f0fdf4", border: "#16a34a", name: "Lime" },
];

const PRESET_ICONS = ["☰", "≡", "▤", "◫", "⬛", "🔱", "👔", "👗", "👟", "🧥", "👜", "🎒", "💼", "👞", "🩴", "🧤", "🎩", "👒", "🕶️", "⌚", "💍", "🧣", "🧦", "📦", "🗄️", "🪝", "🪞"];

const STORAGE_CLASS_LABELS: Record<StorageClass, string> = {
  "double-hang": "Double Hang (upper + lower rods)",
  "long-hang":   "Long Hang (full-length rod)",
  "drawers":     "Drawers (pull-out stack)",
  "shelves":     "Open Shelves (horizontal)",
  "shoes":       "Shoe Shelves (angled tiers)",
  "top-shelves": "Top Shelves (high storage)",
};

interface EntryFormState {
  label: string; desc: string; defaultWidth: number;
  bg: string; border: string; icon: string; storageClass: StorageClass;
}

const blankForm = (): EntryFormState => ({
  label: "", desc: "", defaultWidth: 24, bg: "#dbeafe", border: "#3b82f6", icon: "📦", storageClass: "shelves",
});

function EntryForm({ initial, onSave, onCancel, submitLabel }: {
  initial: EntryFormState; onSave: (v: EntryFormState) => void;
  onCancel: () => void; submitLabel: string;
}) {
  const [form, setForm] = useState<EntryFormState>(initial);
  const set = <K extends keyof EntryFormState>(k: K, v: EntryFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block mb-1">Name *</label>
          <input value={form.label} onChange={(e) => set("label", e.target.value)}
            placeholder="e.g. Tie Rack"
            className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-taupe-400 bg-white" />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block mb-1">Description</label>
          <input value={form.desc} onChange={(e) => set("desc", e.target.value)}
            placeholder="e.g. Hanging tie organiser"
            className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-taupe-400 bg-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block mb-1">Storage Behaviour</label>
          <select value={form.storageClass} onChange={(e) => set("storageClass", e.target.value as StorageClass)}
            className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-taupe-400">
            {(Object.keys(STORAGE_CLASS_LABELS) as StorageClass[]).map((k) => (
              <option key={k} value={k}>{STORAGE_CLASS_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block mb-1">Default Width (in)</label>
          <div className="flex items-center gap-1">
            <button onClick={() => set("defaultWidth", Math.max(12, form.defaultWidth - 3))}
              className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 text-xs text-stone-600 flex items-center justify-center">−</button>
            <input type="number" min={12} max={96} value={form.defaultWidth}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) set("defaultWidth", Math.min(96, Math.max(12, v))); }}
              className="flex-1 text-center text-xs border border-stone-200 rounded-lg px-1 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-taupe-400 bg-white" />
            <button onClick={() => set("defaultWidth", Math.min(96, form.defaultWidth + 3))}
              className="w-6 h-6 rounded bg-stone-200 hover:bg-stone-300 text-xs text-stone-600 flex items-center justify-center">+</button>
          </div>
        </div>
      </div>

      <div>
        <label className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block mb-1.5">Color</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button key={c.name} title={c.name}
              onClick={() => { set("bg", c.bg); set("border", c.border); }}
              className="w-7 h-7 rounded-lg border-2 transition-all"
              style={{
                backgroundColor: c.bg,
                borderColor: form.border === c.border ? c.border : "transparent",
                outline: form.border === c.border ? `2px solid ${c.border}` : "none",
                outlineOffset: 1,
              }} />
          ))}
        </div>
      </div>

      <div>
        <label className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block mb-1.5">Icon</label>
        <div className="flex flex-wrap items-center gap-1">
          {PRESET_ICONS.map((ic) => (
            <button key={ic} onClick={() => set("icon", ic)}
              className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all
                ${form.icon === ic ? "ring-2 ring-taupe-400 bg-taupe-50" : "hover:bg-stone-100"}`}>
              {ic}
            </button>
          ))}
          <input value={form.icon} onChange={(e) => { const v = [...e.target.value].slice(-2).join(""); if (v) set("icon", v); }}
            placeholder="✏️"
            title="Type any emoji"
            className="w-10 text-center text-sm border border-stone-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-taupe-400 bg-white" />
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: form.bg, border: `1px solid ${form.border}44` }}>
        <span className="text-lg" style={{ color: form.border }}>{form.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-stone-700 truncate">{form.label || "Module Name"}</p>
          <p className="text-[9px] text-stone-500 truncate">{form.desc || "Description"}</p>
        </div>
        <span className="text-[9px] text-stone-400 font-mono flex-shrink-0">{form.defaultWidth}″ · {STORAGE_CLASS_LABELS[form.storageClass].split(" (")[0]}</span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => { if (form.label.trim()) onSave(form); }}
          disabled={!form.label.trim()}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-charcoal-600 text-white hover:bg-charcoal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {submitLabel}
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManageCatalogueModal({ catalogue, onUpdate, onClose }: {
  catalogue: CatalogueEntry[];
  onUpdate: (next: CatalogueEntry[]) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const saveEdit = (type: string, form: EntryFormState) => {
    onUpdate(catalogue.map((e) => e.type === type ? { ...e, ...form } : e));
    setEditing(null);
  };

  const deleteEntry = (type: string) => {
    onUpdate(catalogue.filter((e) => e.type !== type));
  };

  const addEntry = (form: EntryFormState) => {
    const slug = form.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const newType = `custom-${slug}-${Date.now().toString(36)}`;
    onUpdate([...catalogue, { ...form, type: newType, isBuiltIn: false }]);
    setAdding(false);
  };

  const resetBuiltin = (type: string) => {
    const original = BUILTIN_CATALOGUE.find((b) => b.type === type);
    if (original) onUpdate(catalogue.map((e) => e.type === type ? { ...original } : e));
  };

  const customCount = catalogue.filter((e) => !e.isBuiltIn).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h2 className="font-serif text-base font-bold text-charcoal-600">Module Catalogue</h2>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Add custom types · Edit names, colours &amp; icons · Built-ins can be reset
            </p>
          </div>
          <button onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {catalogue.map((entry) => (
            <div key={entry.type}>
              {editing === entry.type ? (
                <EntryForm
                  initial={{ label: entry.label, desc: entry.desc, defaultWidth: entry.defaultWidth, bg: entry.bg, border: entry.border, icon: entry.icon, storageClass: entry.storageClass }}
                  onSave={(form) => saveEdit(entry.type, form)}
                  onCancel={() => setEditing(null)}
                  submitLabel="Save Changes"
                />
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl group transition-all"
                  style={{ backgroundColor: entry.bg, border: `1px solid ${entry.border}33` }}>
                  <span className="text-base w-6 text-center flex-shrink-0" style={{ color: entry.border }}>{entry.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-stone-700 truncate">{entry.label}</p>
                    <p className="text-[9px] text-stone-500 truncate">{entry.desc || <span className="italic opacity-60">no description</span>}</p>
                  </div>
                  <span className="text-[8px] text-stone-400 italic hidden sm:block flex-shrink-0">
                    {STORAGE_CLASS_LABELS[entry.storageClass]?.split(" (")[0]}
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono flex-shrink-0">{entry.defaultWidth}″</span>
                  <button onClick={() => { setEditing(entry.type); setAdding(false); }}
                    className="p-1 rounded-md hover:bg-white/80 text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
                    title="Edit">
                    <Pencil size={11} />
                  </button>
                  {entry.isBuiltIn ? (
                    <button onClick={() => resetBuiltin(entry.type)}
                      title="Reset to default"
                      className="p-1 rounded-md hover:bg-white/80 text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0">
                      <RotateCcw size={11} />
                    </button>
                  ) : (
                    <button onClick={() => deleteEntry(entry.type)}
                      title="Delete"
                      className="p-1 rounded-md hover:bg-red-100 text-stone-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {adding ? (
            <EntryForm
              initial={blankForm()}
              onSave={addEntry}
              onCancel={() => setAdding(false)}
              submitLabel="Add to Catalogue"
            />
          ) : (
            <button
              onClick={() => { setAdding(true); setEditing(null); }}
              className="w-full py-3 rounded-xl border-2 border-dashed border-stone-200 hover:border-taupe-300 hover:bg-taupe-50 text-xs font-medium text-stone-400 hover:text-taupe-600 flex items-center justify-center gap-1.5 transition-all">
              <Plus size={13} /> Add Module Type
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between">
          <p className="text-[10px] text-stone-400">
            {customCount} custom type{customCount !== 1 ? "s" : ""} · {catalogue.length} total
          </p>
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-charcoal-600 text-white hover:bg-charcoal-500 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BuilderPage ──────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const { user } = useAuth();
  const [showSave, setShowSave] = useState(false);
  const [showManage, setShowManage] = useState(false);

  // ── Catalogue state ──
  const [catalogue, setCatalogue] = useState<CatalogueEntry[]>(() => {
    try {
      const raw = localStorage.getItem("alveo_catalogue");
      if (!raw) return [...BUILTIN_CATALOGUE];
      const saved = JSON.parse(raw) as CatalogueEntry[];
      const builtinMap = new Map(saved.filter((e) => e.isBuiltIn).map((e) => [e.type, e]));
      const customs = saved.filter((e) => !e.isBuiltIn);
      return [...BUILTIN_CATALOGUE.map((b) => builtinMap.get(b.type) ?? b), ...customs];
    } catch { return [...BUILTIN_CATALOGUE]; }
  });

  const [modules, setModules] = useState<BuilderModule[]>(() => {
    try {
      const raw = localStorage.getItem("alveo_builder_modules");
      if (!raw) return DEFAULT_MODULES;
      const parsed = JSON.parse(raw) as BuilderModule[];
      return parsed.length > 0 ? parsed : DEFAULT_MODULES;
    } catch { return DEFAULT_MODULES; }
  });
  const [history, setHistory] = useState<BuilderModule[][]>([]);
  const [wallW, setWallW] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem("alveo_studio_dims") || "null"); return d?.wallW ?? 120; } catch { return 120; }
  });
  const [wallH, setWallH] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem("alveo_studio_dims") || "null"); return d?.wallH ?? 96; } catch { return 96; }
  });
  const [wallD, setWallD] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem("alveo_studio_dims") || "null"); return d?.wallD ?? 24; } catch { return 24; }
  });
  const [woodFinish, setWoodFinish] = useState<"light" | "medium" | "dark" | "white">("medium");
  const [drawingMode, setDrawingMode] = useState<"elevation" | "3d">("elevation");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;
  const totalUsed = modules.reduce((s, m) => s + m.width, 0);
  const effectiveW = Math.max(totalUsed, wallW);

  const svgContent = useMemo(() => {
    if (!modules.length) return null;
    try {
      const layout = buildLayout(modules, catalogue, effectiveW, wallH, wallD);
      return drawingMode === "3d"
        ? new ClosetIsometricRenderer(layout, { woodFinish }).renderIsometric()
        : new ClosetSVGRenderer(layout, { showDimensions: true, showLabels: true, woodFinish, style: "modern" }).renderElevation();
    } catch { return null; }
  }, [modules, catalogue, effectiveW, wallH, wallD, woodFinish, drawingMode]);

  // Save to localStorage
  useEffect(() => { localStorage.setItem("alveo_builder_modules", JSON.stringify(modules)); }, [modules]);
  useEffect(() => { localStorage.setItem("alveo_catalogue", JSON.stringify(catalogue)); }, [catalogue]);

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
    const cat = getCat(catalogue, type);
    const newMod: BuilderModule = { id: uid(), type, label: cat.label, width: cat.defaultWidth };
    setHistory((h) => [...h.slice(-19), modules]);
    setModules((prev) => { const arr = [...prev]; arr.splice(atIndex ?? arr.length, 0, newMod); return arr; });
  }, [modules, catalogue]);

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
          <div className="flex flex-col gap-1">
            <DimInput label="Width"  value={wallW} onChange={setWallW} min={36}  max={360} step={12} />
            {modules.length > 0 && totalUsed !== wallW && (
              <button
                onClick={() => setWallW(Math.min(360, Math.max(36, totalUsed)))}
                className="text-[9px] font-semibold text-taupe-600 hover:text-taupe-700 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 rounded px-1.5 py-0.5 transition-colors leading-none whitespace-nowrap"
                title={`Fit wall to modules (${totalUsed}″)`}
              >
                ↔ Fit to {totalUsed}″
              </button>
            )}
          </div>
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
        <ModulePalette
          catalogue={catalogue}
          onAdd={(type) => addModule(type)}
          onManage={() => setShowManage(true)}
          onLoadPreset={(preset) => {
            snapshot();
            setModules(preset.modules.map((m) => ({ ...m, id: uid() })));
            setSelectedId(null);
          }}
        />

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-auto p-4">
            <WallCanvas
              modules={modules} selectedId={selectedId} wallW={wallW} catalogue={catalogue}
              onSelect={setSelectedId} onDelete={deleteModule}
              onInsert={insertModule} onReorder={reorderModule} onResizeAdj={resizeAdj}
            />

            {/* Selected module editor */}
            {selectedModule && (
              <SelectedModulePanel
                module={selectedModule} catalogue={catalogue} onUpdate={updateSelected}
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
          modules={modules} catalogue={catalogue} wallW={wallW} wallH={wallH} wallD={wallD}
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

      {/* Manage Catalogue modal */}
      {showManage && (
        <ManageCatalogueModal
          catalogue={catalogue}
          onUpdate={setCatalogue}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}
