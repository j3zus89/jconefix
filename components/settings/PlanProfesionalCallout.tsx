import Link from 'next/link';

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

/** Aviso en ajustes: función reservada al plan completo (JC ONE FIX) */
export function PlanProfesionalCallout({ title, children, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50/80 px-4 py-3 text-sm text-amber-950 shadow-sm ${className}`}
    >
      <p className="font-semibold text-amber-900">{title}</p>
      <div className="mt-1.5 leading-relaxed text-amber-900/85">{children}</div>
      <Link
        href="/dashboard/settings?tab=facturacion_cuenta"
        className="mt-2 inline-flex text-sm font-semibold text-[#F5C518] hover:text-[#D4A915] underline-offset-2 hover:underline"
      >
        Facturación y cuenta
      </Link>
    </div>
  );
}
