
import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * AnimatedClosetHero - An architectural SVG animation that draws a closet
 * line by line, mimicking an architect's hand drawing the elevation.
 */
export function AnimatedClosetHero() {
  const [isDrawing, setIsDrawing] = useState(true);
  const controls = useAnimation();

  useEffect(() => {
    const sequence = async () => {
      await controls.start("visible");
      setIsDrawing(false);
    };
    sequence();
  }, [controls]);

  // Staggered draw animation for architectural effect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pathVariants: any = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          duration: 0.8,
          delay: i * 0.15,
          ease: [0.43, 0.13, 0.23, 0.96],
        },
        opacity: { duration: 0.2, delay: i * 0.15 },
      },
    }),
  };

  const fillVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: { duration: 0.4, delay: i * 0.15 + 0.5 },
    }),
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Blueprint grid background */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="blueprint-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#1a1512"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
        </svg>
      </div>

      {/* Main closet SVG */}
      <svg
        viewBox="0 0 400 300"
        className="w-full h-auto"
        role="img"
        aria-label="Architectural elevation drawing of a custom closet with long-hang, double-hang, and drawer zones"
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}
      >
        <defs>
          {/* Wood grain pattern */}
          <pattern
            id="wood-grain"
            patternUnits="userSpaceOnUse"
            width="40"
            height="8"
          >
            <rect width="40" height="8" fill="#e8e0d5" />
            <line
              x1="0"
              y1="2"
              x2="40"
              y2="2"
              stroke="#d4cabb"
              strokeWidth="0.5"
              opacity="0.6"
            />
            <line
              x1="0"
              y1="5"
              x2="40"
              y2="5"
              stroke="#d4cabb"
              strokeWidth="0.3"
              opacity="0.4"
            />
          </pattern>

          {/* Warm cream background */}
          <linearGradient id="warmBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#faf8f5" />
            <stop offset="100%" stopColor="#f5f0eb" />
          </linearGradient>

          {/* Shadow filter */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.1" />
          </filter>
        </defs>

        {/* Background */}
        <rect
          x="40"
          y="30"
          width="320"
          height="240"
          fill="url(#warmBg)"
          rx="2"
        />

        {/* ═══ STRUCTURAL SHELL ═══ */}

        {/* Outer boundary - draws first */}
        <motion.rect
          x="50"
          y="40"
          width="300"
          height="210"
          fill="none"
          stroke="#1a1512"
          strokeWidth="3"
          filter="url(#shadow)"
          variants={pathVariants}
          initial="hidden"
          animate={controls}
          custom={0}
        />

        {/* Top shelf */}
        <motion.rect
          x="50"
          y="40"
          width="300"
          height="8"
          fill="url(#wood-grain)"
          stroke="#b5a089"
          strokeWidth="1"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={1}
        />

        {/* Left panel */}
        <motion.rect
          x="50"
          y="40"
          width="6"
          height="210"
          fill="url(#wood-grain)"
          stroke="#c4b096"
          strokeWidth="0.5"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={2}
        />

        {/* Right panel */}
        <motion.rect
          x="344"
          y="40"
          width="6"
          height="210"
          fill="url(#wood-grain)"
          stroke="#c4b096"
          strokeWidth="0.5"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={2}
        />

        {/* ═══ LONG HANG ZONE (Left) ═══ */}

        {/* Vertical divider panel */}
        <motion.rect
          x="147"
          y="40"
          width="6"
          height="210"
          fill="url(#wood-grain)"
          stroke="#c4b096"
          strokeWidth="0.5"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={3}
        />

        {/* Long hang rod */}
        <motion.line
          x1="65"
          y1="70"
          x2="140"
          y2="70"
          stroke="#4a4540"
          strokeWidth="2"
          strokeDasharray="6,4"
          strokeLinecap="round"
          variants={pathVariants}
          initial="hidden"
          animate={controls}
          custom={4}
        />

        {/* Rod brackets */}
        <motion.circle
          cx="65"
          cy="70"
          r="3"
          fill="#4a4540"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={4}
        />
        <motion.circle
          cx="140"
          cy="70"
          r="3"
          fill="#4a4540"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={4}
        />

        {/* Dress silhouettes */}
        {[75, 95, 115].map((x, i) => (
          <motion.path
            key={`dress-${i}`}
            d={`M${x - 8},78 L${x - 12},180 L${x + 12},180 L${x + 8},78 Z`}
            fill="#f0ebe5"
            stroke="#bbb5a8"
            strokeWidth="0.8"
            variants={fillVariants}
            initial="hidden"
            animate={controls}
            custom={5 + i * 0.3}
          />
        ))}

        {/* Hangers */}
        {[75, 95, 115].map((x, i) => (
          <motion.g
            key={`hanger-${i}`}
            variants={pathVariants}
            initial="hidden"
            animate={controls}
            custom={5 + i * 0.3}
          >
            <polyline
              points={`${x},70 ${x - 7},78 ${x + 7},78`}
              fill="none"
              stroke="#666"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <circle
              cx={x}
              cy="70"
              r="1.5"
              fill="none"
              stroke="#666"
              strokeWidth="0.8"
            />
          </motion.g>
        ))}

        {/* ═══ DOUBLE HANG ZONE (Middle) ═══ */}

        {/* Second divider */}
        <motion.rect
          x="247"
          y="40"
          width="6"
          height="210"
          fill="url(#wood-grain)"
          stroke="#c4b096"
          strokeWidth="0.5"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={6}
        />

        {/* Upper rod */}
        <motion.line
          x1="165"
          y1="70"
          x2="240"
          y2="70"
          stroke="#4a4540"
          strokeWidth="2"
          strokeDasharray="6,4"
          strokeLinecap="round"
          variants={pathVariants}
          initial="hidden"
          animate={controls}
          custom={7}
        />

        {/* Upper rod brackets */}
        <motion.circle
          cx="165"
          cy="70"
          r="3"
          fill="#4a4540"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={7}
        />
        <motion.circle
          cx="240"
          cy="70"
          r="3"
          fill="#4a4540"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={7}
        />

        {/* Separator shelf between bays */}
        <motion.rect
          x="160"
          y="130"
          width="86"
          height="4"
          fill="url(#wood-grain)"
          stroke="#c4b096"
          strokeWidth="0.5"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={8}
        />

        {/* Lower rod */}
        <motion.line
          x1="165"
          y1="140"
          x2="240"
          y2="140"
          stroke="#4a4540"
          strokeWidth="2"
          strokeDasharray="6,4"
          strokeLinecap="round"
          variants={pathVariants}
          initial="hidden"
          animate={controls}
          custom={9}
        />

        {/* Lower rod brackets */}
        <motion.circle
          cx="165"
          cy="140"
          r="3"
          fill="#4a4540"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={9}
        />
        <motion.circle
          cx="240"
          cy="140"
          r="3"
          fill="#4a4540"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={9}
        />

        {/* Upper bay shirts */}
        {[175, 190, 205, 220].map((x, i) => (
          <motion.path
            key={`shirt-${i}`}
            d={`M${x - 6},78 L${x - 7},105 L${x + 7},105 L${x + 6},78 Z`}
            fill="#ece8e2"
            stroke="#c4bdb0"
            strokeWidth="0.6"
            variants={fillVariants}
            initial="hidden"
            animate={controls}
            custom={10 + i * 0.2}
          />
        ))}

        {/* Lower bay trousers */}
        {[175, 195, 215].map((x, i) => (
          <motion.path
            key={`trouser-${i}`}
            d={`M${x - 4},148 L${x - 4},200 M${x + 4},148 L${x + 4},200`}
            fill="none"
            stroke="#a8a090"
            strokeWidth="3"
            strokeLinecap="round"
            variants={pathVariants}
            initial="hidden"
            animate={controls}
            custom={11 + i * 0.2}
          />
        ))}

        {/* ═══ DRAWER ZONE (Right) ═══ */}

        {/* Drawer faces */}
        {[60, 100, 140, 180].map((y, i) => (
          <motion.g key={`drawer-${i}`}>
            <motion.rect
              x="260"
              y={y}
              width="80"
              height="32"
              fill="#f5f0e8"
              stroke="#c4b096"
              strokeWidth="1"
              rx="1"
              variants={fillVariants}
              initial="hidden"
              animate={controls}
              custom={12 + i * 0.3}
            />
            {/* Drawer handle */}
            <motion.rect
              x="285"
              y={y + 13}
              width="30"
              height="6"
              fill="#9c8d7e"
              rx="3"
              variants={fillVariants}
              initial="hidden"
              animate={controls}
              custom={12.5 + i * 0.3}
            />
          </motion.g>
        ))}

        {/* ═══ DIMENSION LINES ═══ */}

        {/* Bottom dimension - overall */}
        <motion.g
          variants={pathVariants}
          initial="hidden"
          animate={controls}
          custom={15}
        >
          <line
            x1="50"
            y1="265"
            x2="350"
            y2="265"
            stroke="#888"
            strokeWidth="0.6"
          />
          <line
            x1="50"
            y1="260"
            x2="50"
            y2="270"
            stroke="#888"
            strokeWidth="0.6"
          />
          <line
            x1="350"
            y1="260"
            x2="350"
            y2="270"
            stroke="#888"
            strokeWidth="0.6"
          />
        </motion.g>

        <motion.text
          x="200"
          y="275"
          textAnchor="middle"
          fontSize="10"
          fill="#666"
          fontFamily="Inter, sans-serif"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={16}
        >
          8'-0"
        </motion.text>

        {/* Section dimensions */}
        <motion.g
          variants={pathVariants}
          initial="hidden"
          animate={controls}
          custom={16}
        >
          <line
            x1="50"
            y1="258"
            x2="147"
            y2="258"
            stroke="#aaa"
            strokeWidth="0.4"
          />
          <line
            x1="153"
            y1="258"
            x2="247"
            y2="258"
            stroke="#aaa"
            strokeWidth="0.4"
          />
          <line
            x1="253"
            y1="258"
            x2="350"
            y2="258"
            stroke="#aaa"
            strokeWidth="0.4"
          />
        </motion.g>

        {/* ═══ ZONE LABELS ═══ */}

        <motion.text
          x="100"
          y="225"
          textAnchor="middle"
          fontSize="8"
          fill="#8a7a68"
          fontFamily="Inter, sans-serif"
          letterSpacing="1.5"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={17}
        >
          LONG HANG
        </motion.text>

        <motion.text
          x="200"
          y="225"
          textAnchor="middle"
          fontSize="8"
          fill="#8a7a68"
          fontFamily="Inter, sans-serif"
          letterSpacing="1.5"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={17}
        >
          DOUBLE HANG
        </motion.text>

        <motion.text
          x="300"
          y="225"
          textAnchor="middle"
          fontSize="8"
          fill="#8a7a68"
          fontFamily="Inter, sans-serif"
          letterSpacing="1.5"
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={17}
        >
          DRAWERS
        </motion.text>

        {/* ═══ TITLE BLOCK ═══ */}

        <motion.g
          variants={fillVariants}
          initial="hidden"
          animate={controls}
          custom={18}
        >
          <text
            x="350"
            y="18"
            textAnchor="end"
            fontSize="6"
            fill="#aaa"
            fontFamily="Inter, sans-serif"
          >
            SCALE: 1:24
          </text>
          <text
            x="50"
            y="18"
            textAnchor="start"
            fontSize="6"
            fill="#aaa"
            fontFamily="Inter, sans-serif"
          >
            EL-A BACK WALL
          </text>
        </motion.g>
      </svg>

      {/* Drawing indicator */}
      {isDrawing && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 0.5 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-taupe-400"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-taupe-300 border-t-transparent rounded-full"
          />
          Drawing elevation...
        </motion.div>
      )}
    </div>
  );
}

/**
 * ArchitecturalGrid - Subtle blueprint grid overlay
 */
export function ArchitecturalGrid({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-[0.02]"
      >
        <defs>
          <pattern
            id="arch-grid-small"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#1a1512"
              strokeWidth="0.3"
            />
          </pattern>
          <pattern
            id="arch-grid-large"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <rect width="50" height="50" fill="url(#arch-grid-small)" />
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#1a1512"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#arch-grid-large)" />
      </svg>
    </div>
  );
}
