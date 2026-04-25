import Link from 'next/link';
import { Mail, ExternalLink } from 'lucide-react';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import { NOTIFICATIONS_INBOX_EMAIL } from '@/lib/notifications/notifications-inbox';

const NAV_LINKS = [
  { label: 'Qué incluye', href: '/#que-incluye' },
  { label: 'Precios', href: '/#pricing' },
  { label: 'Importar datos', href: '/ayuda/importar-datos-taller' },
  { label: 'Blog', href: '/comparar' },
] as const;

const COMPARISON_LINKS = [
  { label: 'vs SAT Network', href: '/comparar/jconefix-vs-sat-network-taller-argentina' },
  { label: 'vs Líder Gestión', href: '/comparar/jconefix-vs-lider-gestion-taller-argentina' },
] as const;

export function MarketingFooter({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const isDark = variant === 'dark';
  const sub = isDark ? 'text-slate-500' : 'text-slate-500';
  const navHover = isDark ? 'hover:text-[#F5C518]' : 'hover:text-[#0D1117]';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <footer
      data-web-chrome
      className={`border-t ${isDark ? 'border-white/10 bg-[#0D1117]' : 'border-slate-200 bg-white'}`}
    >
      {/* Main Footer - 4 Columnas Compactas */}
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          
          {/* Columna 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-2">
              <JcOneFixAppIcon className="!h-6 !w-6 rounded-md p-0.5" />
              <JcOneFixMark tone={isDark ? 'onDark' : 'onLight'} className="text-sm font-bold" />
            </Link>
            <p className={`text-[11px] ${textMuted} leading-relaxed`}>
              El futuro de tu taller. IA + gestión en un solo panel.
            </p>
          </div>

          {/* Columna 2: Navegación */}
          <div>
            <h3 className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Navegación
            </h3>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-[11px] ${sub} ${navHover} transition-colors`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Columna 3: Comparativas */}
          <div>
            <h3 className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Comparativas
            </h3>
            <nav className="flex flex-col gap-1">
              {COMPARISON_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-[11px] ${sub} ${navHover} transition-colors inline-flex items-center gap-1`}
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h3 className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Contacto
            </h3>
            <a
              href={`mailto:${NOTIFICATIONS_INBOX_EMAIL}`}
              className={`text-[11px] ${isDark ? 'text-slate-300 hover:text-[#F5C518]' : 'text-slate-700 hover:text-[#0D1117]'} transition-colors inline-flex items-center gap-1.5`}
            >
              <Mail className="h-3 w-3" />
              {NOTIFICATIONS_INBOX_EMAIL}
            </a>
            <p className={`text-[10px] ${sub} mt-2 leading-relaxed`}>
              Soporte especializado para talleres de Argentina
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Legales */}
      <div className={`border-t ${isDark ? 'border-white/10 bg-[#0a0e14]' : 'border-slate-100 bg-slate-50'}`}>
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              © 2026 JC ONE FIX. Todos los derechos reservados.
            </p>
            <div className={`flex items-center gap-3 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              <Link href="/privacidad" className={`transition-colors ${navHover}`}>
                Privacidad
              </Link>
              <span aria-hidden>·</span>
              <Link href="/terminos" className={`transition-colors ${navHover}`}>
                Términos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
