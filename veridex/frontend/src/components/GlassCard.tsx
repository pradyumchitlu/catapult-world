import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlassCard({ children, className, style }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(37,99,235,0.06)] p-12',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
