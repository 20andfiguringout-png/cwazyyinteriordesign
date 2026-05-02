"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

// ─── Inspiration Gallery ────────────────────────────────────────────────────
const galleryItems = [
  {
    label: "Minimal",
    palette: ["#F5F0EB", "#DDD5C8", "#2C2C2C"],
    desc: "Clean lines, white oak, nothing unnecessary.",
  },
  {
    label: "Glam",
    palette: ["#F8F0E8", "#C9A96E", "#1A1A1A"],
    desc: "Velvet drawers, brass rail, mirror panels.",
  },
  {
    label: "Small Space",
    palette: ["#EFF0F2", "#B0B8C1", "#3A3A3A"],
    desc: "Every centimetre earning its keep.",
  },
  {
    label: "Luxury",
    palette: ["#F0EBE3", "#8B6F47", "#1C1C1C"],
    desc: "Dark walnut, island seating, full-height shelving.",
  },
  {
    label: "Modern",
    palette: ["#EBEBED", "#9899A6", "#2A2A2E"],
    desc: "Flat-front drawers, integrated LED, lacquer finish.",
  },
  {
    label: "Rustic",
    palette: ["#EDE8E0", "#A0896A", "#3C3028"],
    desc: "Reclaimed pine, wrought-iron brackets, woven baskets.",
  },
];

export function InspirationGallery() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        custom={0}
        variants={fadeUp}
        className="text-center mb-16"
      >
        <span className="text-xs font-medium tracking-widest uppercase text-taupe-400">
          Styles
        </span>
        <h2 className="font-serif text-4xl md:text-5xl text-charcoal-600 mt-4 mb-4">
          Find your aesthetic
        </h2>
        <p className="text-lg text-charcoal-400 max-w-xl mx-auto">
          Six distinct moods — each one a starting point, not a constraint.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {galleryItems.map(({ label, palette, desc }, i) => (
          <motion.div
            key={label}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            custom={i}
            variants={fadeUp}
            className="group relative bg-cream-50 rounded-2xl overflow-hidden border border-cream-200 hover:border-taupe-300 transition-colors"
          >
            {/* Colour palette preview */}
            <div className="flex h-24" aria-hidden>
              {palette.map((c, j) => (
                <div
                  key={j}
                  className="flex-1"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="p-5">
              <h3 className="font-serif text-lg text-charcoal-600 mb-1">
                {label}
              </h3>
              <p className="text-sm text-charcoal-400 leading-relaxed">
                {desc}
              </p>
            </div>

            <Link
              href="/gallery"
              className="absolute inset-0 flex items-end p-5 bg-gradient-to-t from-charcoal-600/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="text-white text-sm font-medium flex items-center gap-1">
                See full gallery <ArrowRight size={14} />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Why Alvéo ──────────────────────────────────────────────────────────────
const features = [
  {
    number: "01",
    title: "Precision-calculated",
    description:
      "Every shelf height, rod position and drawer stack is derived from your actual wardrobe count — not a generic template.",
  },
  {
    number: "02",
    title: "Architect-grade drawings",
    description:
      "The output is a scaled SVG elevation — the same format professional designers hand to carpenters. Print it, share it, build from it.",
  },
  {
    number: "03",
    title: "Instant & free",
    description:
      "No account, no waiting, no sales call. Fill in four steps and your layout is ready to download in under 5 minutes.",
  },
];

export function WhyUs() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        custom={0}
        variants={fadeUp}
        className="text-center mb-20"
      >
        <span className="text-xs font-medium tracking-widest uppercase text-taupe-400">
          Why Alvéo
        </span>
        <h2 className="font-serif text-4xl md:text-5xl text-charcoal-600 mt-4">
          Built different, by design
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-10 md:gap-16">
        {features.map(({ number, title, description }, i) => (
          <motion.div
            key={number}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            custom={i + 1}
            variants={fadeUp}
          >
            <p className="font-serif text-4xl text-taupe-200 mb-4 leading-none">
              {number}
            </p>
            <h3 className="font-serif text-xl text-charcoal-600 mb-3">
              {title}
            </h3>
            <p className="text-charcoal-400 leading-relaxed text-sm">
              {description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
