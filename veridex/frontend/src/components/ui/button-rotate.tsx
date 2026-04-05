'use client';

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ButtonRotateProps {
  label?: string;
  className?: string;
  buttonClassName?: string;
  centerClassName?: string;
  disabled?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}

export function ButtonRotate({
  label = 'VERIFY WORLD ID',
  className,
  buttonClassName,
  centerClassName,
  disabled,
  onClick,
  interactive = true,
}: ButtonRotateProps) {
  const content = (
    <>
      <p
        className="pointer-events-none absolute inset-0 animate-[text-rotation_10s_linear_infinite]"
        aria-hidden="true"
      >
        {Array.from(label).map((char, index) => (
          <span
            key={`${char}-${index}`}
            className="absolute inset-[16px] inline-block select-none text-[18px] font-semibold uppercase tracking-[0.18em] text-white/92"
            style={{
              transform: `rotate(${16.4 * index}deg)`,
              transformOrigin: '50% 50%',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </p>

      <div
        className={cn(
          'relative flex h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-full bg-white text-[#2563EB] shadow-[0_16px_40px_rgba(37,99,235,0.24)]',
          centerClassName
        )}
      >
        <div className="absolute inset-[10px] rounded-full border border-[#2563EB]/12 bg-[radial-gradient(circle_at_30%_30%,rgba(147,197,253,0.22),transparent_48%)]" />
        <div className="absolute h-[72px] w-[72px] rounded-full border border-[#2563EB]/10 bg-[radial-gradient(circle_at_35%_30%,rgba(191,219,254,0.75),rgba(255,255,255,0.94)_58%,rgba(219,234,254,0.96)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-transform duration-500 ease-out group-hover/button:scale-[1.06]" />
        <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full">
          <div className="absolute h-[50px] w-[50px] rounded-full border border-[#2563EB]/16 opacity-70 transition-transform duration-500 ease-out group-hover/button:rotate-12" />
          <div className="absolute h-[50px] w-[26px] rounded-full border border-[#2563EB]/16 opacity-70 transition-transform duration-500 ease-out group-hover/button:-rotate-6" />
          <div className="absolute h-[26px] w-[50px] rounded-full border border-[#2563EB]/16 opacity-70 transition-transform duration-500 ease-out group-hover/button:rotate-6" />
          <Globe className="relative h-10 w-10 text-[#2563EB] transition-transform duration-500 ease-out group-hover/button:rotate-12 group-hover/button:scale-105" strokeWidth={1.75} />
        </div>
      </div>

      <style jsx>{`
        @keyframes text-rotation {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );

  return (
    <div
      className={cn(
        'inline-flex rounded-full border border-dotted border-primary/40 bg-white/70 p-2 shadow-[0_18px_50px_rgba(37,99,235,0.12)] backdrop-blur-xl',
        className
      )}
    >
      {interactive ? (
        <Button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'relative grid h-[260px] w-[260px] place-content-center overflow-hidden rounded-full border border-primary/10 bg-primary p-0 text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] hover:bg-primary disabled:opacity-70',
            buttonClassName
          )}
        >
          {content}
        </Button>
      ) : (
        <div
          className={cn(
            'group/button relative grid h-[260px] w-[260px] place-content-center overflow-hidden rounded-full border border-primary/10 bg-primary p-0 text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]',
            buttonClassName
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
