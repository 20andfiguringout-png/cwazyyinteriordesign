"use client";

import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode, useRef } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition - Smooth fade and slide transitions between pages
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * FadeIn - Simple fade in animation wrapper
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideIn - Slide in from specified direction
 */
export function SlideIn({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  className?: string;
}) {
  const directionMap = {
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
    up: { x: 0, y: -40 },
    down: { x: 0, y: 40 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerContainer - Stagger children animations
 */
export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className = "",
}: {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem - Individual item in stagger container
 */
export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * PulseGlow - Subtle pulsing glow effect
 */
export function PulseGlow({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/**
 * FloatingElement - Gentle floating animation
 */
export function FloatingElement({
  children,
  amplitude = 10,
  duration = 3,
  className = "",
}: {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      animate={{
        y: [-amplitude, amplitude, -amplitude],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * HoverScale - Scale on hover with spring
 */
export function HoverScale({
  children,
  scale = 1.02,
  className = "",
}: {
  children: ReactNode;
  scale?: number;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * DrawLine - SVG line that draws itself
 */
export function DrawLine({
  d,
  stroke = "#1a1512",
  strokeWidth = 2,
  duration = 1,
  delay = 0,
  className = "",
}: {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration, delay, ease: "easeInOut" }}
      className={className}
    />
  );
}

/**
 * RevealOnScroll - Reveal element when scrolled into view
 */
export function RevealOnScroll({
  children,
  threshold = 0.2,
  className = "",
}: {
  children: ReactNode;
  threshold?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * ParallaxScroll - Parallax effect on scroll
 */
export function ParallaxScroll({
  children,
  speed = 0.5,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${-speed * 60}px`, `${speed * 60}px`],
  );

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * MorphingShape - Background shape that morphs between states
 */
export function MorphingShape({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`absolute bg-gradient-to-br from-taupe-200/30 to-cream-200/30 blur-3xl ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 90, 0],
        borderRadius: ["30% 70% 70% 30%", "50% 50% 50% 50%", "30% 70% 70% 30%"],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
