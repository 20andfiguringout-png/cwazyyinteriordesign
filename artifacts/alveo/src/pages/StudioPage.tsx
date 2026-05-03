import { useState, useRef, useEffect, useCallback, type ReactElement } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Plus, GripVertical, Trash2, Bookmark, BookmarkCheck, ExternalLink, AlertCircle, FolderOpen, Clock, X, Loader2, Pencil, Copy } from "lucide-react";
import { BUILTIN_CATALOGUE, getCat, type CatalogueEntry } from "@/types/catalogue";
import { getStoredToken } from "@/lib/AuthContext";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ─── Types ───────────────────────────────────────────────────────────────────

type ClosetKind = "reach-in" | "walkin-single" | "walkin-l" | "walkin-u";

interface StudioModule { id: string; type: string; label: string; width: number }

let _id = 0;
const sid = () => `s${++_id}_${Date.now().toString(36)}`;

const CLOSET_TYPES: Array<{ kind: ClosetKind; label: string; desc: string; svg: ReactElement }> = [
  {
    kind: "reach-in",
    label: "Reach-In",
    desc: "Single open wall, typically 60–96\" wide",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full">
        <rect x="8" y="8" width="64" height="44" rx="2" fill="#f5f0eb" stroke="#c4b5a5" strokeWidth="1.5"/>
        <line x1="8" y1="42" x2="72" y2="42" stroke="#c4b5a5" strokeWidth="1"/>
        <line x1="40" y1="8" x2="40" y2="42" stroke="#d6ccc2" strokeWidth="1" strokeDasharray="2,2"/>
        <rect x="10" y="44" width="28" height="6" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1"/>
        <rect x="42" y="44" width="28" height="6" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1"/>
        <circle cx="39" cy="47" r="1.5" fill="#a89080"/>
        <circle cx="41" cy="47" r="1.5" fill="#a89080"/>
        <line x1="14" y1="14" x2="36" y2="14" stroke="#b8a898" strokeWidth="1"/>
        <line x1="14" y1="20" x2="36" y2="20" stroke="#b8a898" strokeWidth="1"/>
        <rect x="14" y="24" width="22" height="14" rx="1" fill="#e0d8ce" stroke="#c4b5a5" strokeWidth="1"/>
        <line x1="44" y1="14" x2="66" y2="14" stroke="#b8a898" strokeWidth="1"/>
        <line x1="44" y1="20" x2="66" y2="20" stroke="#b8a898" strokeWidth="1"/>
        <line x1="44" y1="26" x2="66" y2="26" stroke="#b8a898" strokeWidth="1"/>
        <line x1="44" y1="32" x2="66" y2="32" stroke="#b8a898" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    kind: "walkin-single",
    label: "Walk-In · Single Wall",
    desc: "One wall of storage, open floor plan",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full">
        <rect x="4" y="4" width="72" height="52" rx="2" fill="none" stroke="#c4b5a5" strokeWidth="1.5" strokeDasharray="3,2"/>
        <rect x="4" y="4" width="72" height="18" rx="2" fill="#f5f0eb" stroke="#c4b5a5" strokeWidth="1.5"/>
        <line x1="22" y1="4" x2="22" y2="22" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="40" y1="4" x2="40" y2="22" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="58" y1="4" x2="58" y2="22" stroke="#d6ccc2" strokeWidth="1"/>
        <rect x="6" y="6" width="14" height="8" rx="1" fill="#e0d8ce" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="24" y="6" width="14" height="4" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="24" y="12" width="14" height="4" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="42" y="6" width="14" height="14" rx="1" fill="#ede9e4" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="60" y="6" width="12" height="5" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="0.75"/>
        <rect x="60" y="13" width="12" height="5" rx="1" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="0.75"/>
        <path d="M4 56 L4 52 L76 52" stroke="#c4b5a5" strokeWidth="1.5" fill="none"/>
        <rect x="30" y="50" width="12" height="8" fill="white" stroke="#c4b5a5" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    kind: "walkin-l",
    label: "Walk-In · L-Shape",
    desc: "Two walls of storage, L-shaped layout",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full">
        <path d="M4 4 L76 4 L76 56 L4 56 L4 4" fill="none" stroke="#c4b5a5" strokeWidth="1.5" strokeDasharray="3,2"/>
        <rect x="4" y="4" width="72" height="16" rx="0" fill="#f5f0eb" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="4" y="4" width="16" height="52" rx="0" fill="#f0ece6" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="4" y="4" width="16" height="16" rx="0" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1.5"/>
        <line x1="22" y1="4" x2="22" y2="20" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="40" y1="4" x2="40" y2="20" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="58" y1="4" x2="58" y2="20" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="4" y1="24" x2="20" y2="24" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="4" y1="38" x2="20" y2="38" stroke="#d6ccc2" strokeWidth="1"/>
        <path d="M76 56 L76 52 L20 52" stroke="#c4b5a5" strokeWidth="1.5" fill="none"/>
        <rect x="38" y="48" width="12" height="8" fill="white" stroke="#c4b5a5" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    kind: "walkin-u",
    label: "Walk-In · U-Shape",
    desc: "Three walls of storage, maximum capacity",
    svg: (
      <svg viewBox="0 0 80 60" className="w-full h-full">
        <path d="M4 4 L76 4 L76 56 L4 56 L4 4" fill="none" stroke="#c4b5a5" strokeWidth="1.5" strokeDasharray="3,2"/>
        <rect x="4" y="4" width="72" height="14" fill="#f5f0eb" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="4" y="4" width="14" height="52" fill="#f0ece6" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="62" y="4" width="14" height="52" fill="#f0ece6" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="4" y="4" width="14" height="14" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1.5"/>
        <rect x="62" y="4" width="14" height="14" fill="#e8e0d8" stroke="#c4b5a5" strokeWidth="1.5"/>
        <line x1="22" y1="4" x2="22" y2="18" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="40" y1="4" x2="40" y2="18" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="58" y1="4" x2="58" y2="18" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="4" y1="26" x2="18" y2="26" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="4" y1="40" x2="18" y2="40" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="62" y1="26" x2="76" y2="26" stroke="#d6ccc2" strokeWidth="1"/>
        <line x1="62" y1="40" x2="76" y2="40" stroke="#d6ccc2" strokeWidth="1"/>
        <path d="M22 56 L22 52 L58 52 L58 56" stroke="#c4b5a5" strokeWidth="1.5" fill="none"/>
        <rect x="34" y="48" width="12" height="8" fill="white" stroke="#c4b5a5" strokeWidth="1"/>
      </svg>
    ),
  },
];

const STUDIO_PRESETS = [
  { name: "Blank Canvas", icon: "⬜", desc: "Start from scratch", modules: [] },
  { name: "His & Hers",    icon: "👫", desc: "Symmetric hang + centre storage", modules: [
    { type: "long-hang", label: "Her Side", width: 30 },
    { type: "drawers", label: "Drawers", width: 18 },
    { type: "shoe-shelves", label: "Shoes", width: 18 },
    { type: "long-hang", label: "His Side", width: 30 },
  ]},
  { name: "Master Suite",  icon: "🏠", desc: "Full-featured walk-in", modules: [
    { type: "double-hang", label: "Double Hang", width: 24 },
    { type: "long-hang", label: "Long Hang", width: 30 },
    { type: "drawers", label: "Drawers", width: 18 },
    { type: "shoe-shelves", label: "Shoes", width: 18 },
    { type: "double-hang", label: "Double Hang", width: 24 },
  ]},
  { name: "Studio Apt",    icon: "🏢", desc: "Compact essentials", modules: [
    { type: "long-hang", label: "Long Hang", width: 30 },
    { type: "drawers", label: "Drawers", width: 18 },
    { type: "shoe-shelves", label: "Shoes", width: 18 },
  ]},
];

// ─── Step 1: Type Selection ───────────────────────────────────────────────────

function TypeStep({ value, onChange }: { value: ClosetKind; onChange: (k: ClosetKind) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <h2 className="font-serif text-2xl font-bold text-charcoal-600 mb-1 text-center">What type of closet are you designing?</h2>
      <p className="text-sm text-stone-400 mb-8 text-center">Choose the layout that matches your space</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
        {CLOSET_TYPES.map((ct) => (
          <button
            key={ct.kind}
            onClick={() => onChange(ct.kind)}
            className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-left hover:shadow-md
              ${value === ct.kind
                ? "border-taupe-500 bg-taupe-50 shadow-md"
                : "border-stone-200 bg-white hover:border-taupe-300"
              }`}
          >
            {value === ct.kind && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-taupe-500 flex items-center justify-center">
                <Check size={11} className="text-white" strokeWidth={3} />
              </span>
            )}
            <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-cream-50">
              {ct.svg}
            </div>
            <div className="w-full">
              <p className="text-sm font-semibold text-charcoal-600">{ct.label}</p>
              <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">{ct.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Visual Dimension Canvas ─────────────────────────────────────────

const CANVAS_PX_W = 560;
const CANVAS_PX_H = 300;
const MARGIN = 64;
const HANDLE_R = 7;

function DimCanvas({ wallW, wallH, wallD, setWallW, setWallH, setWallD }: {
  wallW: number; wallH: number; wallD: number;
  setWallW: (v: number) => void; setWallH: (v: number) => void; setWallD: (v: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ handle: "left" | "right" | "top"; startClientX: number; startClientY: number; startW: number; startH: number; pxPerIn: number } | null>(null);

  const maxDispW = CANVAS_PX_W - 2 * MARGIN;
  const maxDispH = CANVAS_PX_H - MARGIN - 24;
  const scaleW = maxDispW / wallW;
  const scaleH = maxDispH / wallH;
  const pxPerIn = Math.min(scaleW, scaleH, 5.5);

  const dispW = wallW * pxPerIn;
  const dispH = wallH * pxPerIn;
  const rx = (CANVAS_PX_W - dispW) / 2;
  const ry = CANVAS_PX_H - 24 - dispH;

  const startDrag = useCallback((handle: "left" | "right" | "top", e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { handle, startClientX: e.clientX, startClientY: e.clientY, startW: wallW, startH: wallH, pxPerIn };
  }, [wallW, wallH, pxPerIn]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const { handle, startClientX, startClientY, startW, startH, pxPerIn: ppi } = drag.current;
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      if (handle === "right") setWallW(Math.min(360, Math.max(36, Math.round(startW + dx / ppi))));
      if (handle === "left")  setWallW(Math.min(360, Math.max(36, Math.round(startW - dx / ppi))));
      if (handle === "top")   setWallH(Math.min(120, Math.max(72, Math.round(startH - dy / ppi))));
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [setWallW, setWallH]);

  const shelfY1 = ry + dispH * 0.28;
  const shelfY2 = ry + dispH * 0.55;
  const nDividers = Math.max(0, Math.floor(wallW / 20) - 1);
  const divStep = dispW / Math.floor(wallW / 20);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl">
      <div className="w-full bg-stone-50 rounded-2xl border border-stone-200 p-4 select-none overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_PX_W} ${CANVAS_PX_H}`}
          className="w-full"
          style={{ touchAction: "none", cursor: drag.current ? "grabbing" : "default" }}
        >
          {/* Floor line */}
          <line x1={rx - 20} y1={ry + dispH} x2={rx + dispW + 20} y2={ry + dispH} stroke="#c4b5a5" strokeWidth="1.5"/>

          {/* Wall face */}
          <rect x={rx} y={ry} width={dispW} height={dispH} fill="#f7f4f0" stroke="#c4b5a5" strokeWidth="1.5" rx="2"/>

          {/* Toe kick */}
          <rect x={rx} y={ry + dispH - 12} width={dispW} height={12} fill="#ede8e2" stroke="#c4b5a5" strokeWidth="1"/>

          {/* Dividers */}
          {Array.from({ length: nDividers }).map((_, i) => (
            <line
              key={i}
              x1={rx + divStep * (i + 1)}
              y1={ry + 4}
              x2={rx + divStep * (i + 1)}
              y2={ry + dispH - 12}
              stroke="#d6ccc2"
              strokeWidth="1"
            />
          ))}

          {/* Shelves */}
          <rect x={rx + 4} y={shelfY1} width={dispW - 8} height={3} fill="#d6ccc2" rx="1"/>
          <rect x={rx + 4} y={shelfY2} width={dispW - 8} height={3} fill="#d6ccc2" rx="1"/>

          {/* Top shelf */}
          <rect x={rx} y={ry} width={dispW} height={6} fill="#ede8e2" rx="1"/>

          {/* Width dimension line */}
          <line x1={rx} y1={ry + dispH + 14} x2={rx + dispW} y2={ry + dispH + 14} stroke="#a89080" strokeWidth="1"/>
          <line x1={rx} y1={ry + dispH + 10} x2={rx} y2={ry + dispH + 18} stroke="#a89080" strokeWidth="1"/>
          <line x1={rx + dispW} y1={ry + dispH + 10} x2={rx + dispW} y2={ry + dispH + 18} stroke="#a89080" strokeWidth="1"/>
          <text x={rx + dispW / 2} y={ry + dispH + 22} textAnchor="middle" fontSize="10" fill="#8c7a6e" fontFamily="monospace">{wallW}″</text>

          {/* Height dimension line */}
          <line x1={rx - 14} y1={ry} x2={rx - 14} y2={ry + dispH} stroke="#a89080" strokeWidth="1"/>
          <line x1={rx - 18} y1={ry} x2={rx - 10} y2={ry} stroke="#a89080" strokeWidth="1"/>
          <line x1={rx - 18} y1={ry + dispH} x2={rx - 10} y2={ry + dispH} stroke="#a89080" strokeWidth="1"/>
          <text x={rx - 22} y={ry + dispH / 2} textAnchor="middle" fontSize="10" fill="#8c7a6e" fontFamily="monospace"
            transform={`rotate(-90,${rx - 22},${ry + dispH / 2})`}>{wallH}″</text>

          {/* Drag handle — right */}
          <g style={{ cursor: "ew-resize" }} onMouseDown={(e) => startDrag("right", e)}>
            <rect x={rx + dispW - HANDLE_R} y={ry + dispH / 2 - HANDLE_R} width={HANDLE_R * 2} height={HANDLE_R * 2} rx={HANDLE_R} fill="#c4a882" stroke="white" strokeWidth="2"/>
            <text x={rx + dispW} y={ry + dispH / 2 + 1} textAnchor="middle" fontSize="8" fill="white" dominantBaseline="middle">↔</text>
          </g>

          {/* Drag handle — left */}
          <g style={{ cursor: "ew-resize" }} onMouseDown={(e) => startDrag("left", e)}>
            <rect x={rx - HANDLE_R} y={ry + dispH / 2 - HANDLE_R} width={HANDLE_R * 2} height={HANDLE_R * 2} rx={HANDLE_R} fill="#c4a882" stroke="white" strokeWidth="2"/>
            <text x={rx} y={ry + dispH / 2 + 1} textAnchor="middle" fontSize="8" fill="white" dominantBaseline="middle">↔</text>
          </g>

          {/* Drag handle — top */}
          <g style={{ cursor: "ns-resize" }} onMouseDown={(e) => startDrag("top", e)}>
            <rect x={rx + dispW / 2 - HANDLE_R} y={ry - HANDLE_R} width={HANDLE_R * 2} height={HANDLE_R * 2} rx={HANDLE_R} fill="#c4a882" stroke="white" strokeWidth="2"/>
            <text x={rx + dispW / 2} y={ry + 1} textAnchor="middle" fontSize="8" fill="white" dominantBaseline="middle">↕</text>
          </g>
        </svg>
      </div>

      {/* Numeric inputs */}
      <div className="grid grid-cols-3 gap-4 w-full">
        {[
          { label: "Width", unit: "in", value: wallW, min: 36, max: 360, step: 6, set: setWallW },
          { label: "Height", unit: "in", value: wallH, min: 72, max: 120, step: 6, set: setWallH },
          { label: "Depth", unit: "in", value: wallD, min: 14, max: 30, step: 2, set: setWallD },
        ].map(({ label, unit, value, min, max, step, set }) => (
          <div key={label} className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</label>
            <div className="flex items-center gap-1.5">
              <button onClick={() => set(Math.max(min, value - step))}
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-sm flex-shrink-0 transition-colors">−</button>
              <input
                type="number" min={min} max={max} value={value}
                onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) set(Math.min(max, Math.max(min, v))); }}
                className="flex-1 text-center text-sm font-mono border border-stone-200 rounded-lg px-1 py-1.5 text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-white"
              />
              <button onClick={() => set(Math.min(max, value + step))}
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-sm flex-shrink-0 transition-colors">+</button>
              <span className="text-xs text-stone-400 w-4 flex-shrink-0">{unit}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={(e) => set(parseInt(e.target.value))}
              className="w-full accent-taupe-500 h-1.5" />
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-400 text-center">
        Drag the handles on the wall to resize, or use the inputs. Depth is the closet's interior depth.
      </p>
    </div>
  );
}

// ─── Step 3: Drag & Drop Layout ───────────────────────────────────────────────

const COLOURS = ["#3b82f6","#ec4899","#f59e0b","#10b981","#8b5cf6","#ef4444","#14b8a6","#f97316"];

function LayoutStep({ modules, setModules, wallW, catalogue }: {
  modules: StudioModule[]; setModules: (m: StudioModule[]) => void;
  wallW: number; catalogue: CatalogueEntry[];
}) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const totalUsed = modules.reduce((s, m) => s + m.width, 0);
  const overWidth = totalUsed > wallW;
  const SCALE = Math.min(5.5, 660 / Math.max(wallW, 60));
  const CANVAS_H = 200;

  const readDrop = (e: React.DragEvent, atIdx: number) => {
    e.preventDefault(); setDragOverIdx(null);
    const src = e.dataTransfer.getData("studio-src");
    const typ = e.dataTransfer.getData("studio-type");
    if (src === "palette" && typ) {
      const cat = getCat(catalogue, typ);
      setModules([...modules.slice(0, atIdx), { id: sid(), type: typ, label: cat.label, width: cat.defaultWidth }, ...modules.slice(atIdx)]);
    } else if (src === "wall") {
      const fromId = e.dataTransfer.getData("studio-id");
      const fromIdx = modules.findIndex((m) => m.id === fromId);
      if (fromIdx === -1) return;
      const arr = [...modules];
      const [mod] = arr.splice(fromIdx, 1);
      arr.splice(Math.max(0, fromIdx < atIdx ? atIdx - 1 : atIdx), 0, mod);
      setModules(arr);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 w-full max-w-5xl mx-auto px-4">
      {/* Palette */}
      <aside className="flex-shrink-0 lg:w-44 bg-white rounded-2xl border border-stone-200 flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-stone-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Modules</p>
          <p className="text-[9px] text-stone-400 mt-0.5">Drag onto the wall</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {catalogue.map((mod) => (
            <div key={mod.type} draggable
              onDragStart={(e) => { e.dataTransfer.setData("studio-src","palette"); e.dataTransfer.setData("studio-type", mod.type); }}
              className="flex items-center gap-2 p-2 rounded-lg border cursor-grab select-none hover:shadow-sm transition-all"
              style={{ backgroundColor: mod.bg, borderColor: mod.border + "44" }}>
              <span className="text-sm w-5 text-center flex-shrink-0" style={{ color: mod.border }}>{mod.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-stone-700 truncate">{mod.label}</p>
                <p className="text-[9px] text-stone-400 truncate">{mod.defaultWidth}″</p>
              </div>
              <button onClick={() => setModules([...modules, { id: sid(), type: mod.type, label: mod.label, width: mod.defaultWidth }])}
                className="flex-shrink-0 w-5 h-5 rounded-md bg-white/60 hover:bg-white text-stone-600 flex items-center justify-center transition-all">
                <Plus size={10}/>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Preset quick-pick */}
        <div className="flex gap-2 flex-wrap">
          {STUDIO_PRESETS.map((p) => (
            <button key={p.name}
              onClick={() => setModules(p.modules.map((m) => ({ ...m, id: sid() })))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-taupe-50 hover:border-taupe-300 text-xs font-medium text-stone-600 hover:text-taupe-700 transition-all">
              <span>{p.icon}</span>{p.name}
            </button>
          ))}
        </div>

        {/* Width progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${overWidth ? "bg-red-400" : "bg-taupe-400"}`}
              style={{ width: `${Math.min(100, (totalUsed / wallW) * 100)}%` }}/>
          </div>
          <span className={`text-xs font-medium whitespace-nowrap ${overWidth ? "text-red-500" : "text-stone-500"}`}>
            {totalUsed}″ / {wallW}″{overWidth ? " · exceeds wall!" : ""}
          </span>
        </div>

        {/* Drop canvas */}
        <div
          className={`relative rounded-xl border-2 overflow-hidden select-none ${overWidth ? "border-red-300 bg-red-50" : "border-stone-300 bg-stone-100"}`}
          style={{ height: CANVAS_H + 8 }}
          onDragOver={(e) => { e.preventDefault(); setDragOverIdx(modules.length); }}
          onDrop={(e) => readDrop(e, modules.length)}
          onDragLeave={() => setDragOverIdx(null)}
        >
          {modules.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-300 gap-2">
              <p className="text-sm font-medium">Drop modules here</p>
              <p className="text-xs opacity-70">or pick a preset above</p>
            </div>
          )}
          <div className="flex items-end px-2 pb-1 h-full">
            {/* Leading drop zone */}
            <div className={`flex-shrink-0 transition-all rounded flex items-center justify-center ${dragOverIdx === 0 ? "w-8 bg-taupe-300/50" : "w-1.5"}`}
              style={{ height: CANVAS_H }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(0); }}
              onDrop={(e) => readDrop(e, 0)}>
              {dragOverIdx === 0 && <div className="w-0.5 h-full bg-taupe-500 rounded-full"/>}
            </div>

            {modules.map((mod, i) => {
              const cat = getCat(catalogue, mod.type);
              const colW = Math.max(24, mod.width * SCALE);
              return (
                <div key={mod.id} className="flex items-end flex-shrink-0">
                  <div draggable
                    onDragStart={(e) => { e.dataTransfer.setData("studio-src","wall"); e.dataTransfer.setData("studio-id", mod.id); }}
                    className="relative flex flex-col items-center cursor-grab active:cursor-grabbing rounded-t-lg group"
                    style={{ width: colW, height: CANVAS_H, backgroundColor: cat.bg, borderTop: `3px solid ${cat.border}`, borderLeft: `1px solid ${cat.border}44`, borderRight: `1px solid ${cat.border}44` }}
                  >
                    <div className="mt-1.5 opacity-30"><GripVertical size={11}/></div>
                    {colW >= 30 && (
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 text-center overflow-hidden">
                        <span className="text-lg leading-none" style={{ color: cat.border }}>{cat.icon}</span>
                        {colW >= 42 && <>
                          <span className="text-[10px] font-semibold text-stone-700 mt-1 line-clamp-2">{mod.label}</span>
                          <span className="text-[9px] font-mono text-stone-400">{mod.width}″</span>
                        </>}
                      </div>
                    )}
                    <button onClick={() => setModules(modules.filter((_,j) => j !== i))}
                      className="mb-2 p-1 rounded-md bg-red-100 hover:bg-red-200 text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={10}/>
                    </button>
                  </div>

                  <div className={`flex-shrink-0 transition-all rounded flex items-center justify-center ${dragOverIdx === i + 1 ? "w-8 bg-taupe-300/50" : "w-1.5"}`}
                    style={{ height: CANVAS_H }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i + 1); }}
                    onDrop={(e) => readDrop(e, i + 1)}>
                    {dragOverIdx === i + 1 && <div className="w-0.5 h-full bg-taupe-500 rounded-full"/>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-stone-400">
          Drag modules from the palette · hover a column to remove it · reorder by dragging
        </p>
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const steps = ["Closet Type", "Dimensions", "Place Modules"];
  return (
    <div className="flex items-center justify-center gap-0 px-6 py-4 border-b border-stone-100 bg-white flex-shrink-0">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-semibold
            ${step === i + 1 ? "bg-charcoal-600 text-white" : step > i + 1 ? "text-taupe-600" : "text-stone-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0
              ${step === i + 1 ? "bg-white text-charcoal-600" : step > i + 1 ? "bg-taupe-500 text-white" : "bg-stone-200 text-stone-500"}`}>
              {step > i + 1 ? <Check size={10} strokeWidth={3}/> : i + 1}
            </span>
            {label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px mx-1 ${step > i + 1 ? "bg-taupe-400" : "bg-stone-200"}`}/>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Load modal ──────────────────────────────────────────────────────────────

interface AnyDesign {
  id: string;
  name: string;
  savedAt?: string;
  config?: {
    source?: string;
    closetKind?: string;
    wallDimensions?: { width?: number; height?: number; depth?: number };
    builderModules?: Array<{ id?: string; type: string; label: string; width: number }>;
  };
}

function _localRename(id: string, name: string) {
  for (const key of ["alveo_saved_designs", "alveo_designs"]) {
    try {
      const arr = JSON.parse(localStorage.getItem(key) || "[]") as AnyDesign[];
      localStorage.setItem(key, JSON.stringify(arr.map((d) => d.id === id ? { ...d, name } : d)));
    } catch { /* ignore */ }
  }
}

function _localDelete(id: string) {
  for (const key of ["alveo_saved_designs", "alveo_designs"]) {
    try {
      const arr = JSON.parse(localStorage.getItem(key) || "[]") as AnyDesign[];
      localStorage.setItem(key, JSON.stringify(arr.filter((d) => d.id !== id)));
    } catch { /* ignore */ }
  }
}

function _localLoad(): AnyDesign[] {
  try {
    const a = JSON.parse(localStorage.getItem("alveo_saved_designs") || "[]") as AnyDesign[];
    const b = JSON.parse(localStorage.getItem("alveo_designs") || "[]") as AnyDesign[];
    const seen = new Set<string>();
    return [...a, ...b].filter((d) => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
  } catch { return []; }
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
}

const KIND_LABELS: Record<string, string> = {
  "reach-in": "Reach-In", "walkin-single": "Walk-In · Single", "walkin-l": "Walk-In · L", "walkin-u": "Walk-In · U",
};

interface LoadModalProps {
  onLoad: (kind: ClosetKind, wallW: number, wallH: number, wallD: number, modules: StudioModule[]) => void;
  onClose: () => void;
}

function LoadModal({ onLoad, onClose }: LoadModalProps) {
  const [designs, setDesigns] = useState<AnyDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const local = _localLoad();
      const token = getStoredToken();
      let remote: AnyDesign[] = [];
      if (token) {
        try {
          const res = await fetch(`${BASE}/api/designs`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = (await res.json()) as { designs: AnyDesign[] };
            remote = data.designs ?? [];
          }
        } catch { /* ignore */ }
      }
      if (cancelled) return;
      // Merge: remote takes precedence over local (by id)
      const seen = new Set<string>();
      const merged: AnyDesign[] = [];
      for (const d of [...remote, ...local]) {
        if (!seen.has(d.id)) { seen.add(d.id); merged.push(d); }
      }
      // Sort newest first
      merged.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
      setDesigns(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = search.trim()
    ? designs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : designs;

  const handleLoad = (d: AnyDesign) => {
    const cfg = d.config ?? {};
    const kind = (cfg.closetKind as ClosetKind) ?? "reach-in";
    const dims = cfg.wallDimensions ?? {};
    const wallW = Math.max(36, Math.min(360, dims.width ?? 120));
    const wallH = Math.max(72, Math.min(120, dims.height ?? 96));
    const wallD = Math.max(14, Math.min(30, dims.depth ?? 24));
    const modules: StudioModule[] = (cfg.builderModules ?? []).map((m) => ({
      id: sid(),
      type: m.type,
      label: m.label,
      width: m.width,
    }));
    onLoad(kind, wallW, wallH, wallD, modules);
  };

  const startRename = (d: AnyDesign) => {
    setDeletingId(null);
    setRenamingId(d.id);
    setRenameValue(d.name);
  };

  const executeRename = async (id: string) => {
    const newName = renameValue.trim();
    if (!newName) { setRenamingId(null); return; }
    setDesigns((prev) => prev.map((d) => d.id === id ? { ...d, name: newName } : d));
    setRenamingId(null);
    _localRename(id, newName);
    const token = getStoredToken();
    if (token) {
      try {
        const design = designs.find((d) => d.id === id);
        if (design) {
          await fetch(`${BASE}/api/designs`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ design: { ...design, name: newName } }),
          });
        }
      } catch { /* ignore */ }
    }
  };

  const executeDuplicate = async (d: AnyDesign) => {
    const newId = `studio_${Date.now().toString(36)}`;
    const copy: AnyDesign = {
      ...d,
      id: newId,
      name: `Copy of ${d.name}`,
      savedAt: new Date().toISOString(),
    };
    setDesigns((prev) => [copy, ...prev]);
    _localSave(copy);
    const token = getStoredToken();
    if (token) {
      try {
        await fetch(`${BASE}/api/designs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ design: copy }),
        });
      } catch { /* already added locally */ }
    }
  };

  const executeDelete = async (id: string) => {
    setDesigns((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
    _localDelete(id);
    const token = getStoredToken();
    if (token) {
      try {
        await fetch(`${BASE}/api/designs`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id }),
        });
      } catch { /* already removed from UI */ }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
          <FolderOpen size={18} className="text-taupe-500 flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-charcoal-600 text-sm">Load a Saved Design</p>
            <p className="text-xs text-stone-400 mt-0.5">Pick any design to continue editing it</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors">
            <X size={14}/>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designs…"
            className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-stone-50 text-charcoal-700"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-stone-400">
              <Loader2 size={16} className="animate-spin"/> Loading designs…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-stone-400 gap-2">
              <FolderOpen size={28} className="opacity-40"/>
              <p className="text-sm">
                {search ? "No designs match that search." : "No saved designs yet."}
              </p>
              {!search && (
                <p className="text-xs text-stone-300 text-center max-w-xs">
                  Complete step 3 and hit "Save Design" to bookmark a layout for later.
                </p>
              )}
            </div>
          )}

          {!loading && filtered.map((d) => {
            const cfg = d.config ?? {};
            const dims = cfg.wallDimensions;
            const modCount = cfg.builderModules?.length ?? 0;
            const isStudio = cfg.source === "studio";
            const kindLabel = KIND_LABELS[cfg.closetKind ?? ""] ?? "";
            const isPendingDelete = deletingId === d.id;
            const isRenaming = renamingId === d.id;
            return (
              <div key={d.id}
                className={`w-full flex items-stretch gap-0 rounded-xl border transition-all group overflow-hidden
                  ${isPendingDelete ? "border-red-300 bg-red-50"
                  : isRenaming    ? "border-taupe-400 bg-taupe-50"
                  : "border-stone-200 hover:border-taupe-300 hover:bg-taupe-50"}`}>

                {/* Load / rename area */}
                <button
                  onClick={() => { if (!isRenaming) handleLoad(d); }}
                  className={`flex items-start gap-3 flex-1 min-w-0 p-3.5 text-left ${isRenaming ? "cursor-default" : ""}`}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-colors
                    ${isPendingDelete ? "bg-red-100" : isRenaming ? "bg-taupe-100" : "bg-stone-100 group-hover:bg-taupe-100"}`}>
                    {isStudio ? "🛋️" : "🔨"}
                  </span>
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); executeRename(d.id); }
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm font-semibold text-charcoal-700 border border-taupe-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-white"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-charcoal-600 truncate">{d.name}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {kindLabel && (
                        <span className="text-[10px] font-medium text-taupe-600 bg-taupe-50 border border-taupe-100 rounded-full px-1.5 py-0.5">{kindLabel}</span>
                      )}
                      {dims && (
                        <span className="text-[10px] text-stone-400 font-mono">{dims.width}″ × {dims.height}″ × {dims.depth}″</span>
                      )}
                      {modCount > 0 && (
                        <span className="text-[10px] text-stone-400">{modCount} module{modCount !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {d.savedAt && (
                      <span className="flex items-center gap-1 text-[10px] text-stone-300 mt-1">
                        <Clock size={9}/>{fmtDate(d.savedAt)}
                      </span>
                    )}
                  </div>
                  {!isRenaming && !isPendingDelete && (
                    <span className="text-[10px] font-semibold text-taupe-500 self-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                      Load →
                    </span>
                  )}
                </button>

                {/* Actions column */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center border-l border-stone-100 px-2 gap-1.5 min-w-[56px]">
                  {isPendingDelete ? (
                    <>
                      <button onClick={() => executeDelete(d.id)}
                        className="w-full text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2 py-1 transition-colors">
                        Delete
                      </button>
                      <button onClick={() => setDeletingId(null)}
                        className="w-full text-[10px] text-stone-400 hover:text-stone-600 rounded-lg px-2 py-1 hover:bg-stone-100 transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : isRenaming ? (
                    <>
                      <button onClick={() => executeRename(d.id)}
                        className="w-full text-[10px] font-bold text-white bg-taupe-500 hover:bg-taupe-600 rounded-lg px-2 py-1 transition-colors">
                        Save
                      </button>
                      <button onClick={() => setRenamingId(null)}
                        className="w-full text-[10px] text-stone-400 hover:text-stone-600 rounded-lg px-2 py-1 hover:bg-stone-100 transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); startRename(d); }}
                        title="Rename"
                        className="p-1.5 rounded-lg text-stone-300 hover:text-taupe-600 hover:bg-taupe-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Pencil size={12}/>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); executeDuplicate(d); }}
                        title="Duplicate"
                        className="p-1.5 rounded-lg text-stone-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Copy size={12}/>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingId(d.id); setRenamingId(null); }}
                        title="Delete"
                        className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={12}/>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!loading && !getStoredToken() && designs.length > 0 && (
          <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-amber-600">
            <AlertCircle size={10}/> Showing local designs only.{" "}
            <Link href="/login" onClick={onClose} className="underline hover:text-amber-700">Log in</Link>
            {" "}to load your account designs.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Save panel ──────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SavePanelProps {
  modules: StudioModule[];
  wallW: number; wallH: number; wallD: number;
  kind: ClosetKind;
}

function SavePanel({ modules, wallW, wallH, wallD, kind }: SavePanelProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedId, setSavedId] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const isLoggedIn = !!getStoredToken();

  const save = async () => {
    const trimmed = name.trim() || "My Studio Design";
    setStatus("saving");
    setErrMsg("");

    const id = `studio_${Date.now().toString(36)}`;
    const design = {
      id,
      name: trimmed,
      config: {
        source: "studio",
        closetKind: kind,
        wallDimensions: { width: wallW, height: wallH, depth: wallD },
        builderModules: modules,
      },
      savedAt: new Date().toISOString(),
    };

    const token = getStoredToken();
    if (token) {
      try {
        const res = await fetch(`${BASE}/api/designs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ design }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSavedId(id);
        setStatus("saved");
      } catch (e) {
        setErrMsg("Could not reach the server — saved locally instead.");
        _localSave(design);
        setSavedId(id);
        setStatus("saved");
      }
    } else {
      _localSave(design);
      setSavedId(id);
      setStatus("saved");
    }
  };

  const reset = () => { setOpen(false); setStatus("idle"); setName(""); setSavedId(""); setErrMsg(""); };

  return (
    <div className="flex-shrink-0">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-taupe-600 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 transition-all"
        >
          <Bookmark size={14}/> Save Design
        </button>
      ) : (
        <div className="w-full bg-white border border-stone-200 rounded-2xl shadow-lg overflow-hidden">
          {status === "saved" ? (
            <div className="px-5 py-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <BookmarkCheck size={16} className="text-green-600"/>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal-600">Design saved!</p>
                {errMsg && <p className="text-xs text-amber-600 mt-0.5">{errMsg}</p>}
                {!isLoggedIn && !errMsg && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    Saved locally.{" "}
                    <Link href="/login" className="text-taupe-600 hover:underline">Log in</Link>
                    {" "}to sync to your account.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isLoggedIn && (
                  <Link href="/dashboard"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-taupe-600 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 transition-colors">
                    Dashboard <ExternalLink size={11}/>
                  </Link>
                )}
                <button onClick={reset}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Bookmark size={14} className="text-taupe-500 flex-shrink-0"/>
                <p className="text-sm font-semibold text-charcoal-600">Save to My Designs</p>
                {!isLoggedIn && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    <AlertCircle size={9}/> Not logged in — saves locally
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") reset(); }}
                  placeholder="e.g. Master Bedroom Walk-In"
                  className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 text-charcoal-700 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 bg-stone-50"
                />
                <button onClick={save} disabled={status === "saving"}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-taupe-500 hover:bg-taupe-600 disabled:opacity-50 transition-colors flex-shrink-0">
                  {status === "saving" ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  ) : <Bookmark size={13}/>}
                  {status === "saving" ? "Saving…" : "Save"}
                </button>
                <button onClick={reset}
                  className="px-3 py-2 rounded-xl text-sm text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function _localSave(design: object) {
  try {
    const key = "alveo_saved_designs";
    const prev = JSON.parse(localStorage.getItem(key) || "[]") as object[];
    localStorage.setItem(key, JSON.stringify([...prev, design]));
  } catch { /* ignore */ }
}

// ─── StudioPage ───────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<ClosetKind>("reach-in");
  const [wallW, setWallW] = useState(120);
  const [wallH, setWallH] = useState(96);
  const [wallD, setWallD] = useState(24);
  const [modules, setModules] = useState<StudioModule[]>([]);
  const [showLoad, setShowLoad] = useState(false);
  const catalogue = BUILTIN_CATALOGUE;

  const totalUsed = modules.reduce((s, m) => s + m.width, 0);

  const launch = () => {
    localStorage.setItem("alveo_builder_modules", JSON.stringify(modules));
    localStorage.setItem("alveo_studio_dims", JSON.stringify({ wallW, wallH, wallD }));
    navigate("/builder");
  };

  const handleLoadDesign = (
    loadedKind: ClosetKind,
    loadedW: number,
    loadedH: number,
    loadedD: number,
    loadedModules: StudioModule[],
  ) => {
    setKind(loadedKind);
    setWallW(loadedW);
    setWallH(loadedH);
    setWallD(loadedD);
    setModules(loadedModules);
    setShowLoad(false);
    // Jump straight to the layout step so the user can see + edit what they loaded
    setStep(3);
  };

  const canAdvance =
    step === 1 ? true :
    step === 2 ? (wallW >= 36 && wallH >= 72 && wallD >= 14) :
    true;

  return (
    <div className="min-h-screen bg-stone-50 pt-16 flex flex-col" style={{ height: "100dvh" }}>
      <StepBar step={step}/>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto py-6 min-h-0">
        {step === 1 && (
          <>
            <TypeStep value={kind} onChange={setKind}/>
            {/* Load saved shortcut — shown below the type cards */}
            <div className="mt-2 flex items-center gap-3">
              <div className="h-px w-16 bg-stone-200"/>
              <span className="text-xs text-stone-400">or</span>
              <div className="h-px w-16 bg-stone-200"/>
            </div>
            <button
              onClick={() => setShowLoad(true)}
              className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-taupe-600 bg-taupe-50 hover:bg-taupe-100 border border-taupe-200 transition-all shadow-sm"
            >
              <FolderOpen size={15}/> Load a Saved Design
            </button>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-4 w-full px-4">
            <div className="text-center mb-2">
              <h2 className="font-serif text-2xl font-bold text-charcoal-600">Set your wall dimensions</h2>
              <p className="text-sm text-stone-400 mt-1">Drag the handles on the wall or use the inputs below</p>
            </div>
            <DimCanvas wallW={wallW} wallH={wallH} wallD={wallD} setWallW={setWallW} setWallH={setWallH} setWallD={setWallD}/>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center justify-center gap-4 px-4 w-full">
              <div className="text-center">
                <h2 className="font-serif text-2xl font-bold text-charcoal-600">Design your layout</h2>
                <p className="text-sm text-stone-400 mt-1">Drag modules onto the wall · pick a preset to start fast</p>
              </div>
              <button
                onClick={() => setShowLoad(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-500 bg-white hover:bg-stone-50 border border-stone-200 hover:border-taupe-300 transition-all"
                title="Load a different saved design"
              >
                <FolderOpen size={13}/> Load
              </button>
            </div>
            <LayoutStep modules={modules} setModules={setModules} wallW={wallW} catalogue={catalogue}/>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="flex-shrink-0 bg-white border-t border-stone-200 px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
        {/* Left: Back / Home */}
        <div className="flex items-center">
          {step > 1 ? (
            <button onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">
              <ArrowLeft size={14}/> Back
            </button>
          ) : (
            <Link href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors">
              <ArrowLeft size={14}/> Home
            </Link>
          )}
        </div>

        {/* Centre: Save panel (step 3 only) / dim summary */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {step === 3 ? (
            <SavePanel modules={modules} wallW={wallW} wallH={wallH} wallD={wallD} kind={kind}/>
          ) : (
            <span className="text-xs text-stone-400 font-mono">
              {step === 2 ? `${wallW}″ × ${wallH}″ × ${wallD}″ deep` : ""}
            </span>
          )}
        </div>

        {/* Right: Next / Open in Builder */}
        <div className="flex items-center gap-2">
          {step === 3 && modules.length > 0 && (
            <span className={`text-xs font-medium whitespace-nowrap ${totalUsed > wallW ? "text-red-500" : "text-stone-400"}`}>
              {totalUsed}″ / {wallW}″
            </span>
          )}
          {step < 3 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-charcoal-600 hover:bg-charcoal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next <ArrowRight size={14}/>
            </button>
          ) : (
            <button onClick={launch}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white bg-taupe-500 hover:bg-taupe-600 transition-colors shadow-sm">
              Open in Builder <ArrowRight size={14}/>
            </button>
          )}
        </div>
      </div>

      {/* Load modal */}
      {showLoad && (
        <LoadModal onLoad={handleLoadDesign} onClose={() => setShowLoad(false)}/>
      )}
    </div>
  );
}
