import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { AccessoryItem } from "@/types/closet";

interface AccessoriesTabProps {
  accessories: AccessoryItem[];
  onChange: (items: AccessoryItem[]) => void;
}

type Category = AccessoryItem["category"];

const CATALOGUE: Omit<AccessoryItem, "qty">[] = [
  { id: "velvet-divider-tray",   name: "Velvet Jewellery Tray",         category: "drawer-insert", unitPrice: 48 },
  { id: "ring-roll-insert",      name: "Ring Roll Insert",               category: "drawer-insert", unitPrice: 36 },
  { id: "tie-belt-insert",       name: "Tie & Belt Drawer Insert",       category: "drawer-insert", unitPrice: 38 },
  { id: "watch-pillow-insert",   name: "Watch Pillow Insert (6-slot)",   category: "drawer-insert", unitPrice: 55 },
  { id: "belt-rack-pullout",     name: "Pull-Out Belt Rack",             category: "hanging",       unitPrice: 85 },
  { id: "scarf-hanger",          name: "Multi-Scarf Hanger",             category: "hanging",       unitPrice: 32 },
  { id: "valet-hook-single",     name: "Single Valet Hook (chrome)",     category: "hanging",       unitPrice: 24 },
  { id: "tie-rack-pullout",      name: "Pull-Out Tie Rack (20 bars)",    category: "hanging",       unitPrice: 72 },
  { id: "pull-out-hamper",       name: "Pull-Out Laundry Hamper",        category: "storage",       unitPrice: 145 },
  { id: "pant-rack-pullout",     name: "Pull-Out Pant Rack (10 bars)",   category: "storage",       unitPrice: 98 },
  { id: "pull-out-shoe-drawer",  name: "Pull-Out Shoe Drawer",           category: "storage",       unitPrice: 165 },
  { id: "corner-carousel",       name: "Corner Carousel Unit",           category: "storage",       unitPrice: 320 },
  { id: "full-length-mirror",    name: "Full-Length Swing Mirror",       category: "mirror",        unitPrice: 280 },
  { id: "tilt-vanity-mirror",    name: "Tilt-Out Vanity Mirror",         category: "mirror",        unitPrice: 195 },
  { id: "wall-mirror-panel",     name: "Floor-to-Ceiling Mirror Panel",  category: "mirror",        unitPrice: 440 },
  { id: "led-strip-kit",         name: "LED Strip Kit (per zone)",       category: "lighting",      unitPrice: 55 },
  { id: "puck-lights-4pk",       name: "Recessed Puck Lights (4-pack)", category: "lighting",      unitPrice: 68 },
  { id: "sensor-light-bar",      name: "Motion-Sensor Light Bar",       category: "lighting",      unitPrice: 92 },
];

const CATEGORY_META: Record<Category, { label: string; icon: string; color: string }> = {
  "drawer-insert": { label: "Drawer Inserts",    icon: "◻",  color: "bg-amber-50 border-amber-200"  },
  "hanging":       { label: "Hanging Hardware",  icon: "⌂",  color: "bg-stone-50 border-stone-200"  },
  "storage":       { label: "Pull-Out Storage",  icon: "⇄",  color: "bg-blue-50 border-blue-200"    },
  "mirror":        { label: "Mirrors",           icon: "◇",  color: "bg-purple-50 border-purple-200" },
  "lighting":      { label: "Lighting",          icon: "◎",  color: "bg-yellow-50 border-yellow-200" },
};

const CATEGORIES: Category[] = ["drawer-insert", "hanging", "storage", "mirror", "lighting"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function AccessoriesTab({ accessories, onChange }: AccessoriesTabProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("drawer-insert");

  const getQty = (id: string) => accessories.find((a) => a.id === id)?.qty ?? 0;

  const setQty = (item: Omit<AccessoryItem, "qty">, qty: number) => {
    if (qty <= 0) {
      onChange(accessories.filter((a) => a.id !== item.id));
    } else {
      const existing = accessories.find((a) => a.id === item.id);
      if (existing) {
        onChange(accessories.map((a) => (a.id === item.id ? { ...a, qty } : a)));
      } else {
        onChange([...accessories, { ...item, qty }]);
      }
    }
  };

  const subtotal = accessories.reduce((sum, a) => sum + a.qty * a.unitPrice, 0);
  const itemCount = accessories.reduce((sum, a) => sum + a.qty, 0);

  const catItems = CATALOGUE.filter((c) => c.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-charcoal-600">Accessories & Upgrades</p>
          <p className="text-xs text-stone-400 mt-0.5">Select individual items to add to your design</p>
        </div>
        {itemCount > 0 && (
          <div className="flex items-center gap-1.5 bg-taupe-50 border border-taupe-200 rounded-lg px-3 py-1.5">
            <ShoppingBag size={13} className="text-taupe-500" />
            <span className="text-xs font-semibold text-taupe-600">{itemCount} items · {fmt(subtotal)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const { label, icon } = CATEGORY_META[cat];
          const hasItems = accessories.some((a) => a.category === cat && a.qty > 0);
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeCategory === cat
                  ? "bg-charcoal-600 text-white border-charcoal-600"
                  : "bg-white text-charcoal-400 border-cream-200 hover:border-taupe-300"
              }`}
            >
              <span>{icon}</span>
              {label}
              {hasItems && <span className="w-1.5 h-1.5 rounded-full bg-taupe-400 ml-0.5" />}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {catItems.map((item) => {
          const qty = getQty(item.id);
          const { color } = CATEGORY_META[item.category];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                qty > 0 ? color : "bg-white border-cream-200"
              } transition-colors`}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-charcoal-600 truncate">{item.name}</p>
                <p className="text-xs text-stone-400">{fmt(item.unitPrice)} each</p>
              </div>
              <div className="flex items-center gap-2">
                {qty > 0 && (
                  <span className="text-xs font-semibold text-taupe-600 w-12 text-right">
                    {fmt(qty * item.unitPrice)}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQty(item, qty - 1)}
                    disabled={qty === 0}
                    className="w-6 h-6 rounded-full border border-cream-200 flex items-center justify-center text-charcoal-400 hover:border-taupe-400 hover:text-taupe-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="w-5 text-center text-sm font-medium text-charcoal-600">{qty}</span>
                  <button
                    onClick={() => setQty(item, qty + 1)}
                    className="w-6 h-6 rounded-full border border-cream-200 flex items-center justify-center text-charcoal-400 hover:border-taupe-400 hover:text-taupe-500 transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {accessories.length > 0 && (
        <div className="pt-3 border-t border-cream-200 space-y-1.5">
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest">Selected items</p>
          {accessories.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs text-charcoal-500">
              <span className="truncate max-w-[60%]">{a.name} × {a.qty}</span>
              <span className="font-medium">{fmt(a.qty * a.unitPrice)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm font-semibold text-charcoal-600 pt-1 border-t border-cream-100">
            <span>Accessories total</span>
            <span>{fmt(subtotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
