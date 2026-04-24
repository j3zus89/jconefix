import { cn } from '@/lib/utils';

export { JcOneFixAppIcon, JcOneFixWrenchGlyph, JcOneFixOneOSymbol } from '@/components/jc-one-fix-brand-icons';

type Props = {
  /** «ONE» en el mismo color que antes era NE (blanco en oscuro; slate en claro). JC y FIX en gold. */
  tone?: 'onDark' | 'onLight';
  className?: string;
};

/**
 * Wordmark tipográfico: JC (gold) + ONE (texto, misma pesa que NE) + FIX (gold).
 * Texto real para SEO y lectores de pantalla (la O ya no es solo SVG decorativo).
 */
export function JcOneFixMark({ tone = 'onDark', className }: Props) {
  const oneClass = tone === 'onLight' ? 'text-slate-900' : 'text-white';
  return (
    <span
      className={cn(
        'inline-flex items-baseline align-middle gap-[0.12em] flex-wrap font-sans tracking-tight leading-none',
        className,
      )}
    >
      <span className="text-[#F5C518]">JC</span>
      <span className={cn(oneClass)}>ONE</span>
      <span className="text-[#F5C518]">FIX</span>
    </span>
  );
}
