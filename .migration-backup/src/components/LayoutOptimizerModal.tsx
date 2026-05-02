"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ClosetConfiguration } from "@/types/closet";
import { ClosetLayoutEngine } from "@/engine/ClosetLayoutEngine";

interface LayoutOptimizerModalProps {
  open: boolean;
  onClose: () => void;
  config: Partial<ClosetConfiguration>;
  onApply: (nextConfig: Partial<ClosetConfiguration>) => void;
}

export function LayoutOptimizerModal({
  open,
  onClose,
  config,
  onApply,
}: LayoutOptimizerModalProps) {
  const options = useMemo(() => {
    if (!config.dimensions || !config.wardrobe || !config.shoes || !config.userInfo) {
      return [];
    }
    return ClosetLayoutEngine.calcOptimizedLayouts({
      closetType: config.closetType,
      dimensions: config.dimensions,
      roomDimensions: config.roomDimensions,
      wardrobe: config.wardrobe,
      shoes: config.shoes,
      userInfo: config.userInfo,
      amenities: config.amenities,
      zoneOverrides: config.zoneOverrides,
    });
  }, [config]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60]"
        >
          <div className="absolute inset-0 bg-black/35" onClick={onClose} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[94vw] max-w-4xl max-h-[85vh] overflow-auto bg-white rounded-2xl border border-cream-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
              <h3 className="font-serif text-2xl text-charcoal-600">Optimizer</h3>
              <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid md:grid-cols-3 gap-4">
              {options.map((opt) => (
                <div key={opt.id} className="rounded-xl border border-cream-200 bg-cream-50 p-4">
                  <p className="font-semibold text-charcoal-600">{opt.label}</p>
                  <p className="text-xs text-charcoal-400 mt-1">{opt.description}</p>
                  <div className="mt-3 text-xs text-charcoal-500 space-y-1">
                    <p>Utilization: <strong>{opt.layout.utilizationScore}%</strong></p>
                    <p>Rods: <strong>{opt.layout.totalStorage.hangingRods} ft</strong></p>
                    <p>Shoes: <strong>{opt.layout.totalStorage.shoeCapacity}</strong></p>
                    <p>Drawers: <strong>{opt.layout.totalStorage.drawerCount}</strong></p>
                  </div>
                  <button
                    onClick={() => {
                      if (!config.userInfo) return;
                      onApply({
                        ...config,
                        userInfo: {
                          ...config.userInfo,
                          ...opt.userInfoPatch,
                        },
                      });
                      onClose();
                    }}
                    className="mt-4 w-full bg-charcoal-600 hover:bg-charcoal-500 text-white text-sm font-medium px-3 py-2 rounded-lg"
                  >
                    Apply this layout
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
