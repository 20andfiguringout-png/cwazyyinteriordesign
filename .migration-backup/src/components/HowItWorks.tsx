"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Ruler, Shirt, Download } from "lucide-react";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Tell us your space",
    description: "Enter room dimensions and basic layout preferences",
    icon: Ruler,
    details: "Width, height, depth — we'll work with any closet size",
  },
  {
    number: 2,
    title: "Tell us your wardrobe",
    description: "Shoes, clothes, bags — everything you need to store",
    icon: Shirt,
    details: "From sneakers to evening gowns, we calculate the perfect fit",
  },
  {
    number: 3,
    title: "Get your custom layout",
    description: "Instant visual plan with precise measurements",
    icon: Download,
    details: "Professional elevation drawings you can share or build from",
  },
];

export function HowItWorks() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className="font-serif text-5xl text-charcoal-600 mb-6">
          How it works
        </h2>
        <p className="text-xl text-charcoal-400 max-w-2xl mx-auto">
          From chaos to custom in three simple steps
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              className="text-center relative"
            >
              {/* Step number and icon */}
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-charcoal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-taupe-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <h3 className="font-serif text-2xl font-semibold text-charcoal-600 mb-4">
                {step.title}
              </h3>

              <p className="text-lg text-charcoal-500 mb-4">
                {step.description}
              </p>

              <p className="text-charcoal-400 text-sm">{step.details}</p>

              {/* Connection line (except for last item) — needs relative on parent */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-taupe-200 to-transparent transform translate-x-8" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Call to action */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="text-center mt-16"
      >
        <p className="text-charcoal-400 text-lg mb-6">
          Ready to see the magic happen?
        </p>
        <Link
          href="/configure"
          className="inline-flex items-center gap-2 bg-charcoal-500 hover:bg-charcoal-600 text-white px-8 py-4 rounded-lg font-medium transition-colors"
        >
          Try the Demo
          <ArrowRight size={16} />
        </Link>
      </motion.div>
    </div>
  );
}
