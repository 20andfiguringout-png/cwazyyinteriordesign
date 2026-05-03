'use client';

import { motion } from 'framer-motion';

/**
 * ArchitecturalLoader - Animated blueprint-style loading indicator
 */
export function ArchitecturalLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 40, md: 60, lg: 80 };
  const s = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <svg width={s} height={s} viewBox="0 0 60 60">
        {/* Rotating outer square */}
        <motion.rect
          x="5" y="5" width="50" height="50"
          fill="none"
          stroke="#c4b096"
          strokeWidth="1.5"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center' }}
        />
        
        {/* Drawing inner blueprint pattern */}
        <motion.path
          d="M15,15 L45,15 L45,45 L15,45 Z"
          fill="none"
          stroke="#8a7a68"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Center cross */}
        <motion.path
          d="M30,20 L30,40 M20,30 L40,30"
          fill="none"
          stroke="#a89880"
          strokeWidth="0.8"
          strokeDasharray="2,2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        
        {/* Pulsing center point */}
        <motion.circle
          cx="30" cy="30" r="3"
          fill="#8a7a68"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </svg>
      
      <motion.p
        className="text-sm text-taupe-400 tracking-wide"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Calculating layout...
      </motion.p>
    </div>
  );
}

/**
 * SkeletonPreview - Skeleton loader for closet preview
 */
export function SkeletonPreview() {
  return (
    <div className="w-full aspect-[4/3] bg-cream-100 rounded-xl overflow-hidden relative">
      {/* Animated shimmer effect */}
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{ translateX: ['100%', '-100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
        }}
      />
      
      {/* Blueprint-style skeleton structure */}
      <div className="p-8 h-full flex flex-col">
        {/* Top bar */}
        <div className="h-4 bg-taupe-200/50 rounded w-full mb-4" />
        
        {/* Main content area */}
        <div className="flex-1 flex gap-4">
          {/* Left column */}
          <div className="w-1/4 space-y-3">
            <div className="h-3 bg-taupe-200/40 rounded w-full" />
            <div className="flex-1 bg-taupe-200/30 rounded h-32" />
          </div>
          
          {/* Middle column */}
          <div className="w-2/4 space-y-3">
            <div className="h-3 bg-taupe-200/40 rounded w-3/4" />
            <div className="flex-1 bg-taupe-200/30 rounded h-32" />
            <div className="h-3 bg-taupe-200/40 rounded w-1/2" />
          </div>
          
          {/* Right column */}
          <div className="w-1/4 space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-taupe-200/40 rounded" />
            ))}
          </div>
        </div>
        
        {/* Bottom dimension line */}
        <div className="h-3 bg-taupe-200/50 rounded w-full mt-4" />
      </div>
    </div>
  );
}

/**
 * SkeletonCard - Generic skeleton card
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-cream-100 rounded-xl overflow-hidden relative ${className}`}>
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{ translateX: ['100%', '-100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
        }}
      />
      
      <div className="p-6 space-y-4">
        <div className="h-4 bg-taupe-200/50 rounded w-3/4" />
        <div className="h-3 bg-taupe-200/40 rounded w-full" />
        <div className="h-3 bg-taupe-200/40 rounded w-5/6" />
        <div className="h-3 bg-taupe-200/40 rounded w-4/6" />
      </div>
    </div>
  );
}

/**
 * SkeletonLine - Single line skeleton
 */
export function SkeletonLine({ width = 'full', className = '' }: { width?: string; className?: string }) {
  return (
    <div className={`h-4 bg-taupe-200/50 rounded ${className}`} style={{ width }} />
  );
}

/**
 * LoadingDots - Animated dots loading indicator
 */
export function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 bg-taupe-400 rounded-full"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/**
 * ProgressBar - Animated progress bar
 */
export function ProgressBar({ progress, className = '' }: { progress: number; className?: string }) {
  return (
    <div className={`h-1.5 bg-taupe-200 rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full bg-gradient-to-r from-taupe-400 to-taupe-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

/**
 * SpinnerRing - Modern ring spinner
 */
export function SpinnerRing({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <motion.div
      className={`border-2 border-taupe-200 border-t-taupe-500 rounded-full ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
}
