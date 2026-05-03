import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { ClosetLayout, ClosetConfiguration, ClosetWall } from "@/types/closet";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";
import { ClosetIsometricRenderer } from "@/renderer/ClosetIsometricRenderer";
import { estimateCostRange } from "@/lib/costEstimator";

interface PresentationModeProps {
  layout: ClosetLayout;
  config: Partial<ClosetConfiguration>;
  clientName?: string;
  projectRef?: string;
  onClose: () => void;
}

type Slide =
  | { kind: "title" }
  | { kind: "elevation"; wall: ClosetWall; wallIndex: number; totalWalls: number }
  | { kind: "isometric" }
  | { kind: "cost" }
  | { kind: "materials" };

function buildWallLayout(layout: ClosetLayout, wall: ClosetWall): ClosetLayout {
  return { ...layout, dimensions: { width: wall.width, height: wall.height, depth: wall.unitDepth }, zones: wall.zones, walls: [wall] };
}

export function PresentationMode({ layout, config, clientName, projectRef, onClose }: PresentationModeProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const walls = layout.walls?.length
    ? layout.walls
    : [{ wallId: "back" as const, label: "BACK WALL", elevationRef: "EL-A", width: layout.dimensions.width, height: layout.dimensions.height, unitDepth: layout.dimensions.depth, zones: layout.zones }];

  const slides: Slide[] = [
    { kind: "title" },
    ...walls.map((wall, i) => ({ kind: "elevation" as const, wall, wallIndex: i, totalWalls: walls.length })),
    { kind: "isometric" },
    { kind: "cost" },
    { kind: "materials" },
  ];

  const total = slides.length;

  const go = useCallback((dir: 1 | -1) => {
    setSlideIdx((i) => Math.max(0, Math.min(total - 1, i + dir)));
  }, [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go, onClose]);

  useEffect(() => {
    const slide = slides[slideIdx];
    if (slide.kind !== "isometric" || !canvasRef.current) return;
    const renderer = new ClosetIsometricRenderer(layout, {
      style: config.userInfo?.stylePreference ?? "modern",
      woodFinish: config.userInfo?.woodFinish ?? "medium",
      hardwareFinish: config.userInfo?.hardwareFinish ?? "chrome",
    });
    const svgString = renderer.renderIsometric();
    canvasRef.current.innerHTML = svgString;
  }, [slideIdx, layout, config]);

  const rendererOpts = {
    showDimensions: true,
    showLabels: true,
    style: config.userInfo?.stylePreference ?? "modern" as const,
    woodFinish: config.userInfo?.woodFinish ?? "medium" as const,
    hardwareFinish: config.userInfo?.hardwareFinish,
  };

  const cost = config.userInfo ? estimateCostRange(layout, config.userInfo.woodFinish) : null;

  const slide = slides[slideIdx];

  const WOOD_NAMES: Record<string, string> = {
    light: "Light Oak", medium: "Warm Walnut", dark: "Dark Espresso", white: "White Painted",
  };
  const HW_NAMES: Record<string, string> = {
    chrome: "Polished Chrome", brass: "Antique Brass", "matte-black": "Matte Black", nickel: "Brushed Nickel",
  };
  const STYLE_NAMES: Record<string, string> = {
    minimal: "Minimal", glam: "Glam", rustic: "Rustic", modern: "Modern", luxury: "Luxury",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#1a1814] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="font-serif text-xl text-white/90 tracking-tight">Alvéo</span>
          <span className="text-white/30 text-sm">·</span>
          {clientName && <span className="text-white/60 text-sm">{clientName}</span>}
          {projectRef && <span className="text-white/30 text-xs ml-1">#{projectRef}</span>}
        </div>
        <div className="flex items-center gap-6">
          <span className="text-white/40 text-sm tabular-nums">{slideIdx + 1} / {total}</span>
          <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIdx}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
          >
            {slide.kind === "title" && (
              <div className="text-center max-w-2xl mx-auto">
                <p className="text-white/30 text-xs uppercase tracking-[0.3em] mb-6">Alvéo Closet Design Studio</p>
                <h1 className="font-serif text-5xl font-bold text-white/95 mb-4 leading-tight">
                  {clientName ? `${clientName}'s Closet` : "Your Closet Design"}
                </h1>
                {projectRef && (
                  <p className="text-white/40 text-lg mb-8">Project reference: {projectRef}</p>
                )}
                <div className="grid grid-cols-3 gap-6 mt-12">
                  {[
                    { label: "Hanging rods", value: `${layout.totalStorage.hangingRods.toFixed(1)} lin ft` },
                    { label: "Drawers", value: String(layout.totalStorage.drawerCount) },
                    { label: "Utilisation", value: `${layout.utilizationScore}%` },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <p className="text-3xl font-serif font-bold text-white/90">{stat.value}</p>
                      <p className="text-white/40 text-sm mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-white/20 text-xs mt-12 tracking-widest uppercase">Press → to continue</p>
              </div>
            )}

            {slide.kind === "elevation" && (
              <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-white/40 text-xs uppercase tracking-widest">{slide.wall.elevationRef} · {slide.wall.label}</p>
                  <p className="text-white/30 text-xs">{slide.wallIndex + 1} of {slide.totalWalls} elevations</p>
                </div>
                <div className="bg-[#f8f4ef] rounded-2xl overflow-hidden shadow-2xl">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: new ClosetSVGRenderer(buildWallLayout(layout, slide.wall), rendererOpts).renderElevation(),
                    }}
                  />
                </div>
              </div>
            )}

            {slide.kind === "isometric" && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-white/40 text-xs uppercase tracking-widest">3D Isometric View</p>
                <div className="rounded-2xl overflow-hidden shadow-2xl bg-[#f8f4ef]">
                  <canvas ref={canvasRef} width={640} height={450} />
                </div>
              </div>
            )}

            {slide.kind === "cost" && cost && (() => {
              const accessoriesTotal = Math.round(
                (config.accessories ?? []).reduce((s, a) => s + a.qty * a.unitPrice, 0)
              );
              const wallCount = layout.walls.length;
              const lightingTotal = Math.round(
                ((config.lighting?.underShelfLED ? 85 * wallCount : 0) +
                 (config.lighting?.overheadRail  ? 320 : 0) +
                 (config.lighting?.puckLights    ? 210 : 0) +
                 (config.lighting?.islandPendant ? 320 : 0))
              );
              const extrasTotal = accessoriesTotal + lightingTotal;
              const grandTotal  = cost.proTotal + extrasTotal;
              const lineItems: { label: string; value: number }[] = [
                { label: "Hanging rods & rails",     value: cost.rods        },
                { label: "Shelf panels & boards",    value: cost.shelves     },
                { label: "Drawer units",             value: cost.drawers     },
                { label: "Professional installation",value: cost.baseInstall },
                ...(lightingTotal > 0   ? [{ label: "Lighting fixtures",    value: lightingTotal   }] : []),
                ...(accessoriesTotal > 0 ? [{ label: "Accessories",         value: accessoriesTotal }] : []),
              ];
              return (
                <div className="w-full max-w-xl mx-auto">
                  <p className="text-white/40 text-xs uppercase tracking-widest text-center mb-8">Investment Summary</p>
                  <div className="space-y-3">
                    {lineItems.map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-3 border-b border-white/10">
                        <span className="text-white/60 text-sm">{label}</span>
                        <span className="text-white/80 font-medium tabular-nums">${value.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-4">
                      <span className="text-white/90 font-semibold">Estimated total</span>
                      <span className="text-2xl font-serif font-bold text-white">${grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                  {extrasTotal > 0 && (
                    <p className="text-center text-white/25 text-xs mt-4">
                      Includes ${extrasTotal.toLocaleString()} in lighting &amp; accessories
                    </p>
                  )}
                </div>
              );
            })()}

            {slide.kind === "materials" && (
              <div className="w-full max-w-xl mx-auto">
                <p className="text-white/40 text-xs uppercase tracking-widest text-center mb-8">Finish Specification</p>
                <div className="space-y-4">
                  {[
                    { label: "Style", value: STYLE_NAMES[config.userInfo?.stylePreference ?? "modern"] },
                    { label: "Wood finish", value: WOOD_NAMES[config.userInfo?.woodFinish ?? "medium"] },
                    { label: "Hardware", value: HW_NAMES[config.userInfo?.hardwareFinish ?? "chrome"] },
                    { label: "Closet type", value: layout.closetType?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) },
                    { label: "Overall dimensions", value: `${layout.dimensions.width}"W × ${layout.dimensions.height}"H × ${layout.dimensions.depth}"D` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-3 border-b border-white/10">
                      <span className="text-white/50 text-sm">{label}</span>
                      <span className="text-white/85 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-white/20 text-xs mt-10 tracking-widest">CARVED FOR YOU · ALVÉO DESIGN STUDIO</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav + progress */}
      <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          disabled={slideIdx === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIdx(i)}
              className={`rounded-full transition-all ${i === slideIdx ? "w-5 h-2 bg-white/70" : "w-2 h-2 bg-white/20 hover:bg-white/40"}`}
            />
          ))}
        </div>

        <button
          onClick={() => go(1)}
          disabled={slideIdx === total - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}
