'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardTopNav } from '@/components/dashboard/dashboard-top-nav';
import { FloatingChat } from '@/components/dashboard/FloatingChat';
import { MariFloatingWidget } from '@/components/mari';
// import { MaiaFloatingWidget } from '@/components/maia';
import { UserMenu } from '@/components/dashboard/UserMenu';
import { SupportContactDialog } from '@/components/dashboard/SupportContactDialog';
import { Search, X, Megaphone, Eye } from 'lucide-react';
import { SupportAssistantMascot } from '@/components/dashboard/SupportAssistantMascot';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { primeDashboardUiAudio } from '@/lib/dashboard-ui-sound';
import { JcOneFixMark } from '@/components/jc-one-fix-mark';
import { PanelSessionHeartbeat } from '@/components/dashboard/PanelSessionHeartbeat';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';
import { VisualPreferencesSync } from '@/components/dashboard/VisualPreferencesSync';
import { PanelUiModeProvider } from '@/components/dashboard/PanelUiModeContext';
import { DashboardFloatingChatsProvider } from '@/components/dashboard/DashboardFloatingChatsContext';
import { getBrandingLogoForSignedInUser, VISUAL_PREFS_EVENT } from '@/lib/visual-preferences';
import { CapacitorPanelStatusBarSync } from '@/components/capacitor/CapacitorPanelStatusBarSync';
import { CapacitorBottomNav } from '@/components/capacitor/CapacitorBottomNav';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

function NavFallback() {
  return (
    <div className="flex min-h-[2.75rem] flex-1 items-center gap-2">
      <div className="h-8 w-8 shrink-0 rounded-lg bg-white/10" />
      <div className="h-6 flex-1 max-w-md rounded bg-white/10" />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportUnread, setSupportUnread] = useState(0);
  /** Primera comprobación de facturación antes de mostrar el panel */
  const [billingChecked, setBillingChecked] = useState(false);
  const [billingBanner, setBillingBanner] = useState<{
    message: string;
    ctaHref: string;
  } | null>(null);
  /** Aviso global del super admin (mantenimiento / novedades). */
  const [ownerBroadcast, setOwnerBroadcast] = useState<{ message: string; updated_at: string } | null>(null);
  /** Sesión abierta vía magic link de suplantación (super admin). */
  const [supportGhostMode, setSupportGhostMode] = useState(false);
  const supportPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const SUPPORT_LAST_SEEN_KEY = 'support_chat_last_seen';
  const BROADCAST_DISMISS_KEY = 'jc_panel_broadcast_dismissed_updated_at';
  const SUPPORT_SESSION_STORAGE = 'jc_support_mode';
  const router = useRouter();
  const [splashBrandingLogo, setSplashBrandingLogo] = useState<string | null>(null);

  useEffect(() => {
    const syncLogo = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setSplashBrandingLogo(getBrandingLogoForSignedInUser(user?.id));
    };
    void syncLogo();
    const onPrefs = () => void syncLogo();
    window.addEventListener(VISUAL_PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(VISUAL_PREFS_EVENT, onPrefs);
  }, []);

  // ── Polling de mensajes no leídos del soporte (solo cuando el chat está cerrado) ──
  const checkSupportUnread = async () => {
    try {
      const res  = await fetch('/api/dashboard/support-chat', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json() as { messages?: { sender: string; is_bot_message?: boolean; created_at: string }[] };
      const msgs = json.messages ?? [];
      const lastSeen = parseFloat(localStorage.getItem(SUPPORT_LAST_SEEN_KEY) || '0');
      const unread = msgs.filter(
        (m) => m.sender === 'admin' && !m.is_bot_message &&
               new Date(m.created_at).getTime() > lastSeen
      ).length;
      setSupportUnread(unread);
    } catch { /* silencioso */ }
  };

  // Arrancar/parar polling según si el chat está abierto
  useEffect(() => {
    if (supportOpen) {
      // Marcar como leído al abrir
      localStorage.setItem(SUPPORT_LAST_SEEN_KEY, String(Date.now()));
      setSupportUnread(0);
      if (supportPollRef.current) { clearInterval(supportPollRef.current); supportPollRef.current = null; }
    } else {
      // Polling del badge cuando el chat está cerrado (no marca lectura en servidor)
      void checkSupportUnread();
      supportPollRef.current = setInterval(() => void checkSupportUnread(), 8_000);
    }
    return () => {
      if (supportPollRef.current) { clearInterval(supportPollRef.current); supportPollRef.current = null; }
    };
  }, [supportOpen]);

  useEffect(() => {
    if (authorized !== true) {
      document.documentElement.removeAttribute('data-app-panel');
      return;
    }
    document.documentElement.setAttribute('data-app-panel', '');
    return () => document.documentElement.removeAttribute('data-app-panel');
  }, [authorized]);

  useEffect(() => {
    if (authorized !== true) return;
    let cancelled = false;
    const loadBilling = async () => {
      try {
        const res = await fetch('/api/dashboard/billing-warning', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setBillingChecked(true);
          return;
        }
        const json = (await res.json()) as {
          preventiveBanner?: { message: string; ctaHref: string } | null;
        };
        const b = json.preventiveBanner;
        if (cancelled) return;
        if (b?.message && b.ctaHref) {
          setBillingBanner({ message: b.message, ctaHref: b.ctaHref });
        } else {
          setBillingBanner(null);
        }
        setBillingChecked(true);
      } catch {
        if (!cancelled) setBillingChecked(true);
      }
    };
    void loadBilling();
    const id = window.setInterval(() => void loadBilling(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authorized, router]);

  useEffect(() => {
    if (authorized !== true) return;
    let cancelled = false;
    const loadBroadcast = async () => {
      try {
        const res = await fetch('/api/dashboard/system-broadcast', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { message?: string | null; updated_at?: string | null };
        if (cancelled) return;
        const msg = typeof json.message === 'string' && json.message.trim() ? json.message.trim() : null;
        const u = typeof json.updated_at === 'string' && json.updated_at ? json.updated_at : null;
        if (msg && u) setOwnerBroadcast({ message: msg, updated_at: u });
        else setOwnerBroadcast(null);
      } catch {
        if (!cancelled) setOwnerBroadcast(null);
      }
    };
    void loadBroadcast();
    const id = window.setInterval(() => void loadBroadcast(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authorized]);

  useEffect(() => {
    if (authorized !== true) return;
    if (typeof window === 'undefined') return;
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('jc_support_session') === '1') {
        sessionStorage.setItem(SUPPORT_SESSION_STORAGE, '1');
        u.searchParams.delete('jc_support_session');
        const qs = u.searchParams.toString();
        window.history.replaceState({}, '', u.pathname + (qs ? `?${qs}` : '') + u.hash);
      }
      if (sessionStorage.getItem(SUPPORT_SESSION_STORAGE) === '1') {
        setSupportGhostMode(true);
      }
    } catch {
      /* ignore */
    }
  }, [authorized]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthorized(true);
      } else {
        window.location.replace('/login');
      }
    });
  }, []);


  // Evita scroll del body fuera del contenedor del dashboard
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    let busy = false;
    const prime = () => {
      if (busy) return;
      busy = true;
      void primeDashboardUiAudio().finally(() => {
        window.setTimeout(() => {
          busy = false;
        }, 100);
      });
    };
    window.addEventListener('pointerdown', prime, { passive: true });
    window.addEventListener('touchstart', prime, { passive: true });
    window.addEventListener('keydown', prime);
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('touchstart', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  // Navega al Enter: si parece número de ticket → tickets, si no → clientes
  const navigateSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSearchQuery('');
    // Patrón de número de ticket: solo dígitos, dígito-dígitos, o prefijo con guión
    const isTicketNumber = /^\d[\d-]*$/.test(trimmed);
    if (isTicketNumber) {
      router.push(`/dashboard/tickets?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/dashboard/customers?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const searchSlot = (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 transition-colors hover:bg-white/20">
        <Search className="h-4 w-4 text-white/60 flex-shrink-0" />
        <input
          type="text"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-white/50 focus:outline-none"
          placeholder="Buscar clientes, tickets, teléfonos... (Enter)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') navigateSearch(searchQuery);
            if (e.key === 'Escape') setSearchQuery('');
          }}
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')}>
            <X className="h-3.5 w-3.5 text-white/50 hover:text-white" />
          </button>
        )}
      </div>
    </div>
  );

  if (authorized !== true) {
    return (
      <>
        <VisualPreferencesSync />
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-slate-50 px-4">
          <img
            src={splashBrandingLogo || '/jc-one-fix-logo.png'}
            alt="JC ONE FIX"
            className="max-h-16 w-auto max-w-[min(100%,240px)] object-contain"
          />
          <div className="h-8 w-8 shrink-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </>
    );
  }

  const broadcastDismissed =
    ownerBroadcast &&
    typeof window !== 'undefined' &&
    sessionStorage.getItem(BROADCAST_DISMISS_KEY) === ownerBroadcast.updated_at;

  const dismissOwnerBroadcast = () => {
    if (!ownerBroadcast) return;
    try {
      sessionStorage.setItem(BROADCAST_DISMISS_KEY, ownerBroadcast.updated_at);
    } catch {
      /* ignore */
    }
    setOwnerBroadcast(null);
  };

  const leaveSupportImpersonationSession = async () => {
    try {
      sessionStorage.removeItem(SUPPORT_SESSION_STORAGE);
    } catch {
      /* ignore */
    }
    setSupportGhostMode(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `${getSiteCanonicalUrl()}/admin/login`;
  };

  if (!billingChecked) {
    return (
      <>
        <VisualPreferencesSync />
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-50 px-4">
          <img
            src={splashBrandingLogo || '/jc-one-fix-logo.png'}
            alt="JC ONE FIX"
            className="max-h-16 w-auto max-w-[min(100%,240px)] object-contain"
          />
          <div className="h-8 w-8 shrink-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 text-center max-w-xs">Comprobando acceso…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <VisualPreferencesSync />
      <CapacitorPanelStatusBarSync />
      <PanelUiModeProvider>
      <DashboardFloatingChatsProvider supportOpen={supportOpen}>
      <div
        data-cap-app-shell
        className="flex h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background"
      >
      <PanelSessionHeartbeat />
      {supportGhostMode && (
        <div
          role="status"
          className="z-[48] flex w-full max-w-full shrink-0 flex-wrap items-center justify-between gap-2 border-b border-violet-400/90 bg-violet-950 px-2 py-1.5 text-xs text-violet-50 sm:py-1.5"
        >
          <span className="inline-flex min-w-0 flex-1 items-center gap-2">
            <Eye className="h-3.5 w-3.5 shrink-0 text-violet-200" aria-hidden />
            <span className="font-bold tracking-wide text-violet-100">MODO SOPORTE</span>
            <span className="text-violet-200/95">
              Estás viendo el panel como otro usuario. No compartas capturas con datos sensibles; al terminar, salí de la
              sesión.
            </span>
          </span>
          <button
            type="button"
            onClick={() => void leaveSupportImpersonationSession()}
            className="shrink-0 rounded border border-white/30 bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/20"
          >
            Salir y volver al admin
          </button>
        </div>
      )}
      {ownerBroadcast && !broadcastDismissed && (
        <div
          role="status"
          className="z-[46] flex w-full max-w-full shrink-0 items-start gap-2 border-b border-amber-200/90 bg-amber-50 px-2 py-1.5 text-xs text-amber-950 sm:items-center sm:py-1"
        >
          <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 sm:mt-0" aria-hidden />
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words leading-snug">{ownerBroadcast.message}</p>
          <button
            type="button"
            onClick={dismissOwnerBroadcast}
            className="shrink-0 rounded border border-amber-300/80 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100/80"
          >
            Cerrar
          </button>
        </div>
      )}
      {billingBanner && (
        <div
          role="status"
          className="z-[45] flex w-full max-w-full shrink-0 flex-nowrap items-center justify-center gap-2 overflow-x-auto overflow-y-hidden border-b border-red-100 bg-white px-2 py-0.5 text-xs leading-none text-red-600 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <span className="whitespace-nowrap">{billingBanner.message}</span>
          <Link
            href={billingBanner.ctaHref}
            className="shrink-0 rounded border border-red-600 bg-white px-2 py-0.5 text-[11px] font-bold leading-none text-red-600 hover:bg-red-50"
          >
            Ir a pago
          </Link>
        </div>
      )}
      <header
        data-cap-safe-top
        className="sticky top-0 z-40 flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-black/10 bg-[var(--panel-header-bg)] px-2 py-2 text-white sm:flex-nowrap sm:gap-3 sm:px-3"
      >
        <div className="order-1 min-w-0 w-full flex-1 basis-0 sm:order-none sm:w-auto">
          <Suspense fallback={<NavFallback />}>
            <DashboardTopNav searchSlot={searchSlot} />
          </Suspense>
        </div>

        <div className="order-2 flex w-full shrink-0 items-center justify-end gap-4 sm:order-none sm:ml-auto sm:w-auto">
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            aria-label="Soporte — JC BOT FIX"
            title="JC BOT FIX · soporte"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="relative flex h-9 w-9 items-center justify-center">
              <SupportAssistantMascot
                size="nav"
                frame="circle"
                title="JC BOT FIX"
              />
              <span
                className="pointer-events-none absolute right-0 top-0 z-[1] h-2 w-2 translate-x-px -translate-y-px rounded-full border-2 border-[var(--panel-header-bg)] bg-emerald-400"
                aria-hidden
              />
            </span>
            {supportUnread > 0 && (
              <span className="absolute -right-1 -top-1 z-[1] flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white shadow ring-2 ring-[var(--panel-header-bg)]">
                {supportUnread > 9 ? '9+' : supportUnread}
              </span>
            )}
          </button>
          <NotificationBell />
          <UserMenu />
        </div>
      </header>
      <main
        data-cap-app-main
        className="min-h-0 flex-1 overflow-y-auto bg-background text-foreground"
      >
        {children}
      </main>

      {/* Sello corporativo: capa oscura + texto claro para legible con cualquier primario del panel */}
      <footer
        data-web-chrome
        className="relative flex shrink-0 items-center justify-center overflow-hidden border-t border-white/15 bg-[var(--panel-footer-bg)]"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-black/30"
          aria-hidden
        />
        <div className="relative z-[1] flex items-center justify-center gap-2 px-4 py-1.5">
          <span className="select-none text-[11px] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
            {new Date().getFullYear()}
          </span>
          <JcOneFixMark
            tone="onDark"
            className="text-[11px] font-bold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          />
          <span className="select-none text-[11px] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
            · Todos los derechos reservados.
          </span>
        </div>
      </footer>

      <FloatingChat />
      <MariFloatingWidget />
      {/* <MaiaFloatingWidget /> */}
      <WelcomeModal />
      <CapacitorBottomNav />

      {/* Soporte solo desde el teléfono del header: al cerrar no queda ningún icono flotante */}
      <SupportContactDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
      </DashboardFloatingChatsProvider>
      </PanelUiModeProvider>
    </>
  );
}
