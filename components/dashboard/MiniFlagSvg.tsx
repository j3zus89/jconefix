import { cn } from '@/lib/utils';

type Props = {
  country: 'AR' | 'ES';
  className?: string;
};

/** SVG mini de bandera AR/ES (mismo dibujo que el panel). */
export function MiniFlagSvg({ country, className }: Props) {
  const base = 'h-[12px] w-[20px] sm:h-[13px] sm:w-[22px]';
  if (country === 'AR') {
    return (
      <svg viewBox="0 0 30 18" className={cn(base, className)} aria-hidden>
        <rect width="30" height="6" fill="#74ACDF" />
        <rect y="6" width="30" height="6" fill="#FFFFFF" />
        <rect y="12" width="30" height="6" fill="#74ACDF" />
        <circle cx="15" cy="9" r="2" fill="#F6B40E" stroke="#85340A" strokeWidth="0.3" />
        <circle cx="15" cy="9" r="0.9" fill="#85340A" opacity="0.35" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 30 18" className={cn(base, className)} aria-hidden>
      <rect width="30" height="4.5" fill="#AA151B" />
      <rect y="4.5" width="30" height="9" fill="#F1BF00" />
      <rect y="13.5" width="30" height="4.5" fill="#AA151B" />
    </svg>
  );
}
