'use client';

import { cn } from '@/lib/utils';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
}

export default function LiquidGlassCard({
  children,
  className,
  style,
  glow = false,
}: LiquidGlassCardProps) {
  return (
    <div className={cn('liquid-glass', glow && 'liquid-glass-glow', className)} style={style}>
      {/* Inner refraction layer */}
      <div className="liquid-glass-refraction" aria-hidden />
      {/* Content */}
      <div className="liquid-glass-content">{children}</div>
    </div>
  );
}
