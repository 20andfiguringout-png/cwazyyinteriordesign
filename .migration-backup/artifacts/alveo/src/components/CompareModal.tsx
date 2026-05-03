
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SavedDesign } from "@/types/closet";
import { ClosetLayoutEngine } from "@/engine/ClosetLayoutEngine";
import { ClosetSVGRenderer } from "@/renderer/ClosetSVGRenderer";
import { estimateCostRange } from "@/lib/costEstimator";

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  designs: SavedDesign[];
}

export function CompareModal({ open, onClose, designs }: CompareModalProps) {
  const [leftId, setLeftId] = useState<string>(designs[0]?.id ?? "");
  const [rightId, setRightId] = useState<string>(designs[1]?.id ?? "");

  const compared = useMemo(() => {
    const left = designs.find((d) => d.id === leftId);
    const right = designs.find((d) => d.id === rightId);
    return [left, right].map((design) => {
      if (!design) return null;
      const c = design.config;
      if (!c.dimensions || !c.wardrobe || !c.shoes || !c.userInfo) return null;
      try {
        const engine = new ClosetLayoutEngine({
          closetType: c.closetType,
          dimensions: c.dimensions,
          roomDimensions: c.roomDimensions,
          wardrobe: c.wardrobe,
          shoes: c.shoes,
          userInfo: c.userInfo,
          amenities: c.amenities,
          zoneOverrides: c.zoneOverrides,
        });
        const layout = engine.calculateLayout();
        const svg = new ClosetSVGRenderer(layout, {
          showDimensions: true,
          showLabels: true,
          style: c.userInfo.stylePreference,
          woodFinish: c.userInfo.woodFinish,
        }).renderElevation();
        const costs = estimateCostRange(layout, c.userInfo.woodFinish);
        return { design, layout, svg, costs };
      } catch {
        return null;
      }
    });
  }, [designs, leftId, rightId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60]"
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="absolute inset-3 md:inset-8 bg-white rounded-2xl border border-cream-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
              <h3 className="font-serif text-2xl text-charcoal-600">Compare designs</h3>
              <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-cream-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={leftId}
                onChange={(e) => setLeftId(e.target.value)}
                className="border border-cream-300 rounded-lg px-3 py-2 text-sm"
              >
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                value={rightId}
                onChange={(e) => setRightId(e.target.value)}
                className="border border-cream-300 rounded-lg px-3 py-2 text-sm"
              >
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-cream-50">
              {compared.map((entry, i) => (
                <div key={i} className="bg-white rounded-xl border border-cream-200 p-4 space-y-3">
                  {!entry ? (
                    <p className="text-sm text-charcoal-400">Unable to render this design.</p>
                  ) : (
                    <>
                      <p className="font-semibold text-charcoal-600">{entry.design.name}</p>
                      <div className="rounded-lg border border-cream-200 overflow-hidden bg-cream-50" dangerouslySetInnerHTML={{ __html: entry.svg }} />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-cream-50 rounded p-2">Utilization: <strong>{entry.layout.utilizationScore}%</strong></div>
                        <div className="bg-cream-50 rounded p-2">Drawers: <strong>{entry.layout.totalStorage.drawerCount}</strong></div>
                        <div className="bg-cream-50 rounded p-2">Rods: <strong>{entry.layout.totalStorage.hangingRods} ft</strong></div>
                        <div className="bg-cream-50 rounded p-2">Shoes: <strong>{entry.layout.totalStorage.shoeCapacity}</strong></div>
                      </div>
                      <p className="text-xs text-charcoal-500">
                        Cost range: <strong>${entry.costs.diyTotal.toLocaleString()}</strong> DIY to <strong>${entry.costs.proTotal.toLocaleString()}</strong> professional install.
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
