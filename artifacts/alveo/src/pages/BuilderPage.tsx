import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Trash2, GripVertical, Box, RotateCcw, Plus, Minus } from "lucide-react";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";
import { ClosetIsometricRenderer } from "@/renderer/ClosetIsometricRenderer";
import {
  ClosetLayout,
  ClosetZone,
  ClosetWall,
  ShelfConfig,
  DrawerConfig,
} from "@/types/closet";

// ─── Module catalogue ────────────────────────────────────────────────────────

const MODULE_CATALOGUE = [
  {
    type: "double-hang" as const,
    label: "Double Hang",
    desc: "Two rods — shirts above, trousers below",
    defaultWidth: 24,
    bg: "#dbeafe",
    border: "#3b82f6",
    icon: "✦",
  },
  {
    type: "long-hang" as const,
    label: "Long Hang",
    desc: "Full-length rod for dresses & coats",
    defaultWidth: 30,
    bg: "#fce7f3",
    border: "#ec4899",
    icon: "↕",
  },
  {
    type: "drawers" as const,
    label: "Drawers",
    desc: "Stack of organised pull-out drawers",
    defaultWidth: 18,
    bg: "#fef3c7",
    border: "#f59e0b",
    icon: "≡",
  },
  {
    type: "open-shelves" as const,
    label: "Open Shelves",
    desc: "Horizontal shelves for folded items",
    defaultWidth: 18,
    bg: "#d1fae5",
    border: "#10b981",
    icon: "⊟",
  },
  {
    type: "shoe-shelves" as const,
    label: "Shoe Shelves",
    desc: "Tiered shelves for footwear",
    defaultWidth: 18,
    bg: "#ede9fe",
    border: "#8b5cf6",
    icon: "◫",
  },
  {
    type: "top-shelves" as const,
    label: "Top Shelves",
    desc: "High storage for seasonal & bulky items",
    defaultWidth: 24,
    bg: "#fee2e2",
    border: "#ef4444",
    icon: "▤",
  },
] as const;

type ZoneType = (typeof MODULE_CATALOGUE)[number]["type"];

function getCat(type: ZoneType) {
  return MODULE_CATALOGUE.find((m) => m.type === type)!;
}

interface BuilderModule {
  id: string;
  type: ZoneType;
  label: string;
  width: number; // inches
}

let _uid = 0;
const uid = () => `m${++_uid}_${Date.now().toString(36)}`;

// ─── Default starting layout ─────────────────────────────────────────────────

const DEFAULT_MODULES: BuilderModule[] = [
  { id: uid(), type: "long-hang", label: "Long Hang", width: 30 },
  { id: uid(), type: "double-hang", label: "Double Hang", width: 24 },
  { id: uid(), type: "drawers", label: "Drawers", width: 18 },
  { id: uid(), type: "shoe-shelves", label: "Shoe Shelves", width: 18 },
  { id: uid(), type: "double-hang", label: "Double Hang", width: 24 },
];

// ─── Convert builder modules → ClosetLayout ──────────────────────────────────

function buildLayout(
  modules: BuilderModule[],
  wallW: number,
  wallH: number,
  wallD: number,
): ClosetLayout {
  const TOE = 3.5;
  let curX = 0;
  const zones: ClosetZone[] = [];

  for (const mod of modules) {
    const x = curX;
    const w = mod.width;
    const yBot = TOE;
    const h = wallH - TOE;

    switch (mod.type) {
      case "double-hang": {
        zones.push({
          type: "double-hang",
          x,
          y: yBot,
          width: w,
          height: h,
          rods: [
            {
              height: yBot + h - 2,
              depth: wallD - 2,
              length: w - 4,
              purpose: "upper rod",
            },
            {
              height: yBot + Math.round(h * 0.44),
              depth: wallD - 2,
              length: w - 4,
              purpose: "lower rod",
            },
          ],
        });
        break;
      }
      case "long-hang": {
        zones.push({
          type: "long-hang",
          x,
          y: yBot,
          width: w,
          height: h,
          rods: [
            {
              height: yBot + h - 2,
              depth: wallD - 2,
              length: w - 4,
              purpose: "long hang",
            },
          ],
        });
        break;
      }
      case "drawers": {
        const drawers: DrawerConfig[] = [];
        const FACES = [7, 9, 9, 7, 6];
        let aff = yBot + 2;
        for (const fh of FACES) {
          if (aff + fh > yBot + h - 2) break;
          drawers.push({
            position: aff,
            height: fh,
            width: w - 4,
            depth: wallD - 4,
            purpose: "folded",
          });
          aff += fh + 1.5;
        }
        zones.push({ type: "drawers", x, y: yBot, width: w, height: h, drawers });
        break;
      }
      case "open-shelves": {
        const SPACE = 11;
        const shelves: ShelfConfig[] = [];
        let relH = 2;
        while (relH + 0.75 <= h - 4 && shelves.length < 8) {
          shelves.push({
            height: relH,
            depth: wallD - 4,
            spacing: SPACE,
            count: 1,
            purpose: "folded",
          });
          relH += 0.75 + SPACE;
        }
        zones.push({
          type: "open-shelves",
          x,
          y: yBot,
          width: w,
          height: h,
          shelves,
        });
        break;
      }
      case "shoe-shelves": {
        const shelves: ShelfConfig[] = [];
        let relH = 2;
        const purposes = ["boots", "heels", "sneakers", "flats", "sneakers", "heels"];
        while (relH <= h - 8 && shelves.length < 7) {
          shelves.push({
            height: relH,
            depth: wallD - 4,
            spacing: 7,
            count: Math.max(2, Math.floor(w / 9)),
            purpose: purposes[shelves.length % purposes.length],
          });
          relH += 0.75 + 7;
        }
        zones.push({
          type: "shoe-shelves",
          x,
          y: yBot,
          width: w,
          height: h,
          shelves,
        });
        break;
      }
      case "top-shelves": {
        const shelves: ShelfConfig[] = [];
        let relH = 2;
        while (relH <= h - 8 && shelves.length < 5) {
          shelves.push({
            height: relH,
            depth: wallD - 4,
            spacing: 14,
            count: 1,
            purpose: "accessories",
          });
          relH += 0.75 + 14;
        }
        zones.push({
          type: "top-shelves",
          x,
          y: yBot,
          width: w,
          height: h,
          shelves,
        });
        break;
      }
    }

    curX += w;
  }

  const wall: ClosetWall = {
    wallId: "back",
    label: "Main Wall",
    elevationRef: "EL-A",
    width: wallW,
    height: wallH,
    unitDepth: wallD,
    zones,
  };

  return {
    closetType: "walkin-single",
    dimensions: { width: wallW, height: wallH, depth: wallD },
    walls: [wall],
    zones,
    aisleWarnings: [],
    layoutWarnings: [],
    totalStorage: (() => {
      let hangingRods = 0;
      let drawerCount = 0;
      let shoeCapacity = 0;
      let shelfSpace = 0;
      for (const zone of zones) {
        if (zone.type === "long-hang") {
          hangingRods += Math.round((zone.width / 12) * 10) / 10;
        } else if (zone.type === "double-hang") {
          hangingRods += Math.round((zone.width / 12) * 2 * 10) / 10;
        }
        if (zone.type === "drawers") {
          drawerCount += zone.drawers?.length ?? 0;
        }
        if (zone.type === "shoe-shelves") {
          shoeCapacity += (zone.shelves?.length ?? 0) * Math.max(2, Math.floor(zone.width / 9));
        }
        if (zone.type === "open-shelves" || zone.type === "top-shelves") {
          const boards = zone.shelves?.length ?? 0;
          shelfSpace += Math.round((boards * (zone.width / 12) * (wallD / 12)) * 10) / 10;
        }
      }
      return { hangingRods, shelfSpace, drawerCount, shoeCapacity };
    })(),
    utilizationScore: 100,
    recommendations: [],
  };
}

// ─── DimInput component ──────────────────────────────────────────────────────

function DimInput({
  label,
  value,
  onChange,
  min,
  max,
  unit = "in",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - 6))}
          className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors"
        >
          <Minus size={10} />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className="w-14 text-center text-sm font-mono border border-stone-200 rounded px-1 py-0.5 bg-white text-charcoal-600 focus:outline-none focus:ring-1 focus:ring-taupe-400"
        />
        <button
          onClick={() => onChange(Math.min(max, value + 6))}
          className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors"
        >
          <Plus size={10} />
        </button>
        <span className="text-[10px] text-stone-400">{unit}</span>
      </div>
    </div>
  );
}

// ─── ModulePalette ───────────────────────────────────────────────────────────

function ModulePalette({ onAdd }: { onAdd: (type: ZoneType) => void }) {
  const handleDragStart = (e: React.DragEvent, type: ZoneType) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("alveo-source", "palette");
    e.dataTransfer.setData("alveo-type", type);
  };

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-stone-200 overflow-y-auto">
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Modules
        </p>
        <p className="text-xs text-stone-400 mb-4 leading-relaxed">
          Drag onto the canvas, or click&nbsp;
          <span className="font-medium text-stone-500">+</span> to add at the end.
        </p>
        <div className="space-y-2">
          {MODULE_CATALOGUE.map((mod) => (
            <div
              key={mod.type}
              draggable
              onDragStart={(e) => handleDragStart(e, mod.type)}
              className="group relative flex items-start gap-2.5 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing select-none hover:shadow-sm transition-all"
              style={{ backgroundColor: mod.bg, borderColor: mod.border + "55" }}
            >
              <span
                className="text-base leading-none mt-0.5 font-mono"
                style={{ color: mod.border }}
              >
                {mod.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-stone-700 leading-tight">
                  {mod.label}
                </p>
                <p className="text-[10px] text-stone-500 leading-tight mt-0.5">
                  {mod.desc}
                </p>
              </div>
              <button
                onClick={() => onAdd(mod.type)}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded bg-white/70 hover:bg-white text-stone-600 flex items-center justify-center transition-all"
                title="Add to end"
              >
                <Plus size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({
  active,
  onDragOver,
  onDrop,
  height,
}: {
  active: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  height: number;
}) {
  return (
    <div
      className="flex-shrink-0 transition-all duration-150 rounded"
      style={{
        width: active ? 32 : 4,
        height,
        backgroundColor: active ? "#b5a090" : "transparent",
        opacity: active ? 0.6 : 1,
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
}

// ─── WallCanvas ───────────────────────────────────────────────────────────────

interface WallCanvasProps {
  modules: BuilderModule[];
  selectedId: string | null;
  wallW: number;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onInsert: (type: ZoneType, atIndex: number) => void;
  onReorder: (fromId: string, toIndex: number) => void;
  onResizeAdj: (leftIdx: number, newLeftW: number, newRightW: number) => void;
}

function WallCanvas({
  modules,
  selectedId,
  wallW,
  onSelect,
  onDelete,
  onInsert,
  onReorder,
  onResizeAdj,
}: WallCanvasProps) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const resizing = useRef<{
    idx: number;
    startX: number;
    leftW: number;
    rightW: number;
  } | null>(null);

  const CANVAS_H = 200; // px
  const totalUsed = modules.reduce((s, m) => s + m.width, 0);
  const availableW = Math.max(totalUsed, wallW);
  // Scale so columns fill ~820px
  const scale = Math.min(8.0, 820 / Math.max(availableW, 60));

  // Global resize listeners
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const delta = (e.clientX - resizing.current.startX) / scale;
      const MIN = 12,
        MAX = 96;
      const newLeft = Math.min(MAX, Math.max(MIN, resizing.current.leftW + delta));
      const newRight = Math.min(
        MAX,
        Math.max(MIN, resizing.current.rightW - delta),
      );
      onResizeAdj(
        resizing.current.idx,
        Math.round(newLeft),
        Math.round(newRight),
      );
    };
    const onUp = () => {
      resizing.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scale, onResizeAdj]);

  const readDrop = (e: React.DragEvent, atIndex: number) => {
    e.preventDefault();
    setDragOverIdx(null);
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
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };

  const overWidth = totalUsed > wallW;

  return (
    <div className="w-full">
      {/* Canvas */}
      <div
        className="relative bg-stone-100 border border-stone-300 rounded-xl overflow-x-auto"
        style={{ minHeight: CANVAS_H + 56 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverIdx(modules.length);
        }}
        onDrop={(e) => readDrop(e, modules.length)}
        onDragLeave={() => setDragOverIdx(null)}
      >
        {/* Wall label */}
        <div className="absolute top-3 left-4 text-[10px] text-stone-400 font-mono tracking-widest uppercase select-none">
          {wallW}″ wall
        </div>

        {/* Module row */}
        <div
          className="absolute bottom-0 left-0 flex items-end px-3 pb-0"
          style={{ height: CANVAS_H }}
        >
          {/* Initial drop zone */}
          <DropZone
            active={dragOverIdx === 0}
            height={CANVAS_H}
            onDragOver={(e) => handleDragOver(e, 0)}
            onDrop={(e) => readDrop(e, 0)}
          />

          {modules.map((mod, i) => {
            const cat = getCat(mod.type);
            const colW = Math.max(24, mod.width * scale);
            const isSelected = mod.id === selectedId;

            return (
              <div key={mod.id} className="flex items-end">
                {/* Module column */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("alveo-source", "wall");
                    e.dataTransfer.setData("alveo-id", mod.id);
                  }}
                  onDragEnd={() => setDragOverIdx(null)}
                  onClick={() => onSelect(isSelected ? null : mod.id)}
                  className="relative flex flex-col items-center justify-between cursor-grab active:cursor-grabbing select-none rounded-t-lg transition-all"
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
                  {/* Grip */}
                  <div className="mt-1.5 opacity-20">
                    <GripVertical size={11} />
                  </div>

                  {/* Label */}
                  {colW > 38 && (
                    <div className="flex flex-col items-center gap-0.5 px-1 text-center">
                      <span
                        className="text-[11px] font-semibold leading-tight"
                        style={{ color: "#374151" }}
                      >
                        {mod.label}
                      </span>
                      <span className="text-[9px] font-mono text-stone-400">
                        {mod.width}″
                      </span>
                    </div>
                  )}

                  {/* Delete button (shown when selected) */}
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(mod.id);
                      }}
                      className="mb-2 p-1 rounded bg-red-100 hover:bg-red-200 text-red-500 transition-colors"
                      title="Remove module"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                  {!isSelected && <div className="mb-2" />}
                </div>

                {/* Resize handle (between modules) */}
                {i < modules.length - 1 && (
                  <div
                    className="w-2 flex-shrink-0 relative cursor-col-resize group"
                    style={{ height: CANVAS_H }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      resizing.current = {
                        idx: i,
                        startX: e.clientX,
                        leftW: mod.width,
                        rightW: modules[i + 1].width,
                      };
                    }}
                  >
                    <div className="absolute inset-y-0 left-[3px] w-px bg-stone-400/40 group-hover:bg-taupe-400 transition-colors" />
                  </div>
                )}

                {/* Drop zone after this module */}
                <DropZone
                  active={dragOverIdx === i + 1}
                  height={CANVAS_H}
                  onDragOver={(e) => handleDragOver(e, i + 1)}
                  onDrop={(e) => readDrop(e, i + 1)}
                />
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {modules.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Box size={36} className="opacity-20" />
            <p className="text-sm">Drag modules from the panel to build your layout</p>
          </div>
        )}
      </div>

      {/* Width indicator */}
      <div className="mt-2 flex items-center justify-between text-xs text-stone-500 px-1">
        <span>
          Used:{" "}
          <strong className={overWidth ? "text-red-500" : "text-charcoal-600"}>
            {totalUsed}″
          </strong>{" "}
          ({(totalUsed / 12).toFixed(1)}′)
        </span>
        <span className={overWidth ? "text-red-500 font-medium" : ""}>
          Wall: {wallW}″ ({(wallW / 12).toFixed(1)}′)
          {overWidth && " · EXCEEDS WALL"}
        </span>
      </div>
    </div>
  );
}

// ─── SelectedModulePanel ─────────────────────────────────────────────────────

function SelectedModulePanel({
  module,
  onUpdate,
  onDelete,
}: {
  module: BuilderModule;
  onUpdate: (changes: Partial<BuilderModule>) => void;
  onDelete: () => void;
}) {
  const cat = getCat(module.type);
  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-4 p-4 rounded-xl border bg-white shadow-sm"
      style={{ borderColor: cat.border + "55" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono"
        style={{ backgroundColor: cat.bg, color: cat.border }}
      >
        {cat.icon}
      </div>
      <div>
        <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">
          Selected
        </p>
        <p className="text-sm font-semibold text-charcoal-600">{cat.label}</p>
      </div>

      {/* Label */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">
          Label
        </label>
        <input
          type="text"
          value={module.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="text-sm border border-stone-200 rounded-lg px-2 py-1 w-36 text-charcoal-600 focus:outline-none focus:ring-1 focus:ring-taupe-400"
        />
      </div>

      {/* Type */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">
          Type
        </label>
        <select
          value={module.type}
          onChange={(e) => {
            const newType = e.target.value as ZoneType;
            const newCat = getCat(newType);
            onUpdate({ type: newType, label: newCat.label });
          }}
          className="text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-charcoal-600 focus:outline-none focus:ring-1 focus:ring-taupe-400"
        >
          {MODULE_CATALOGUE.map((m) => (
            <option key={m.type} value={m.type}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Width */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">
          Width (inches)
        </label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ width: Math.max(12, module.width - 3) })}
            className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-xs transition-colors"
          >
            −
          </button>
          <input
            type="number"
            min={12}
            max={96}
            value={module.width}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v)) onUpdate({ width: Math.min(96, Math.max(12, v)) });
            }}
            className="w-14 text-center text-sm font-mono border border-stone-200 rounded-lg px-1 py-1 text-charcoal-600 focus:outline-none focus:ring-1 focus:ring-taupe-400"
          />
          <button
            onClick={() => onUpdate({ width: Math.min(96, module.width + 3) })}
            className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-xs transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
      >
        <Trash2 size={12} />
        Remove
      </button>
    </div>
  );
}

// ─── BuilderPage ──────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const [modules, setModules] = useState<BuilderModule[]>(DEFAULT_MODULES);
  const [wallW, setWallW] = useState(120);
  const [wallH, setWallH] = useState(96);
  const [wallD, setWallD] = useState(24);
  const [woodFinish, setWoodFinish] = useState<"light" | "medium" | "dark" | "white">("medium");
  const [drawingMode, setDrawingMode] = useState<"elevation" | "3d">("elevation");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;

  // ── Layout conversion ────────────────────────────────────────────────────────
  const totalUsed = modules.reduce((s, m) => s + m.width, 0);
  const effectiveW = Math.max(totalUsed, wallW);

  const svgContent = useMemo(() => {
    if (!modules.length) return null;
    try {
      const layout = buildLayout(modules, effectiveW, wallH, wallD);
      if (drawingMode === "3d") {
        return new ClosetIsometricRenderer(layout, { woodFinish }).renderIsometric();
      }
      return new ClosetSVGRenderer(layout, {
        showDimensions: true,
        showLabels: true,
        woodFinish,
        style: "modern",
      }).renderElevation();
    } catch {
      return null;
    }
  }, [modules, effectiveW, wallH, wallD, woodFinish, drawingMode]);

  // ── Module mutations ─────────────────────────────────────────────────────────

  const addModule = useCallback((type: ZoneType, atIndex?: number) => {
    const cat = getCat(type);
    const newMod: BuilderModule = {
      id: uid(),
      type,
      label: cat.label,
      width: cat.defaultWidth,
    };
    setModules((prev) => {
      const arr = [...prev];
      arr.splice(atIndex ?? arr.length, 0, newMod);
      return arr;
    });
  }, []);

  const insertModule = useCallback((type: ZoneType, atIndex: number) => {
    addModule(type, atIndex);
  }, [addModule]);

  const reorderModule = useCallback((fromId: string, toIndex: number) => {
    setModules((prev) => {
      const fromIdx = prev.findIndex((m) => m.id === fromId);
      if (fromIdx === -1) return prev;
      const arr = [...prev];
      const [mod] = arr.splice(fromIdx, 1);
      const insertIdx = fromIdx < toIndex ? toIndex - 1 : toIndex;
      arr.splice(Math.max(0, insertIdx), 0, mod);
      return arr;
    });
  }, []);

  const deleteModule = useCallback((id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const resizeAdj = useCallback(
    (leftIdx: number, newLeftW: number, newRightW: number) => {
      setModules((prev) => {
        const arr = [...prev];
        arr[leftIdx] = { ...arr[leftIdx], width: newLeftW };
        arr[leftIdx + 1] = { ...arr[leftIdx + 1], width: newRightW };
        return arr;
      });
    },
    [],
  );

  const updateSelected = useCallback(
    (changes: Partial<BuilderModule>) => {
      setModules((prev) =>
        prev.map((m) => (m.id === selectedId ? { ...m, ...changes } : m)),
      );
    },
    [selectedId],
  );

  const resetLayout = () => {
    setModules(
      DEFAULT_MODULES.map((m) => ({ ...m, id: uid() })),
    );
    setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-cream-50 pt-16 flex flex-col">
      {/* ── Header ── */}
      <div className="bg-white border-b border-stone-200 px-6 py-3 flex flex-wrap items-center gap-4 z-10">
        <Link
          href="/"
          className="text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0"
          title="Back to home"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="flex-shrink-0">
          <h1 className="font-serif text-xl font-bold text-charcoal-600 leading-tight">
            Layout Builder
          </h1>
          <p className="text-xs text-stone-400">
            Design large-format closets with drag-and-drop modules
          </p>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8 bg-stone-200 flex-shrink-0" />

        {/* Dimension controls */}
        <div className="flex flex-wrap items-center gap-4">
          <DimInput
            label="Wall Width"
            value={wallW}
            onChange={setWallW}
            min={36}
            max={360}
          />
          <DimInput
            label="Height"
            value={wallH}
            onChange={setWallH}
            min={72}
            max={120}
          />
          <DimInput
            label="Depth"
            value={wallD}
            onChange={setWallD}
            min={14}
            max={30}
          />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8 bg-stone-200 flex-shrink-0" />

        {/* Wood finish */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
            Wood finish
          </span>
          <select
            value={woodFinish}
            onChange={(e) =>
              setWoodFinish(e.target.value as typeof woodFinish)
            }
            className="text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-charcoal-600 focus:outline-none focus:ring-1 focus:ring-taupe-400"
          >
            <option value="light">Light oak</option>
            <option value="medium">Warm walnut</option>
            <option value="dark">Dark espresso</option>
            <option value="white">Painted white</option>
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={resetLayout}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors flex-shrink-0"
          title="Reset to default layout"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Palette */}
        <ModulePalette onAdd={(type) => addModule(type)} />

        {/* Center: Canvas + Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas area */}
          <div className="flex-1 overflow-auto p-6 bg-stone-50">
            <WallCanvas
              modules={modules}
              selectedId={selectedId}
              wallW={wallW}
              onSelect={setSelectedId}
              onDelete={deleteModule}
              onInsert={insertModule}
              onReorder={reorderModule}
              onResizeAdj={resizeAdj}
            />

            {/* Selected module editor */}
            {selectedModule && (
              <SelectedModulePanel
                module={selectedModule}
                onUpdate={updateSelected}
                onDelete={() => deleteModule(selectedModule.id)}
              />
            )}

            {/* Tips */}
            {!selectedModule && modules.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-400">
                <span className="flex items-center gap-1">
                  <GripVertical size={11} />
                  Drag columns to reorder
                </span>
                <span>· Drag the thin dividers between columns to resize</span>
                <span>· Click a column to select and edit it</span>
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div
            className="border-t border-stone-200 bg-white flex-shrink-0"
            style={{ height: 300 }}
          >
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-stone-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Live Preview
              </p>
              <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
                <button
                  onClick={() => setDrawingMode("elevation")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    drawingMode === "elevation"
                      ? "bg-white text-charcoal-600 shadow-sm"
                      : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  Elevation
                </button>
                <button
                  onClick={() => setDrawingMode("3d")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    drawingMode === "3d"
                      ? "bg-white text-charcoal-600 shadow-sm"
                      : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  3D View
                </button>
              </div>
            </div>

            <div className="h-[calc(100%-41px)] overflow-hidden px-4 py-2">
              {modules.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-2">
                  <Box size={28} className="opacity-20" />
                  <p className="text-xs">Add modules above to see a preview</p>
                </div>
              ) : svgContent ? (
                <div
                  className="h-full"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-stone-400 text-xs">
                  Rendering…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
