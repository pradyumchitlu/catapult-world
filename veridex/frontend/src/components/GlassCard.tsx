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
        'liquid-glass p-12',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
