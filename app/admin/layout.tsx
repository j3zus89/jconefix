'use client';

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { adminFetch } from '@/lib/auth/adminFetch';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import { LogOut, Shield, ChevronRight, Menu } from 'lucide-react';
import {
  ADMIN_BADGES_REFRESH_EVENT,
  ADMIN_SUPPORT_DISPLAY_PENDING_EVENT,
} from '@/lib/admin-badges-refresh';
import { AdminSupportChatProvider } from '@/contexts/AdminSupportChatContext';
import { AdminSupportChatDock } from '@/components/admin/AdminSupportChatDock';
import { MobileAdminShell } from '@/components/admin/MobileAdminShell';
import { PanelSessionHeartbeat } from '@/components/dashboard/PanelSessionHeartbeat';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AdminNavLinkList } from '@/components/admin/AdminNavLinkList';
import { AdminMobileBottomNavBar } from '@/components/admin/AdminMobileBottomNavBar';
import { AdminPwaInstallButton } from '@/components/pwa/AdminPwaInstallButton';
import { getAdminNavItems, getAdminMobileBottomNavItems } from '@/lib/admin-nav-items';

type BadgeCounts = { support: number; leads: number };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [badges, setBadges] = useState<BadgeCounts>({ support: 0, leads: 0 });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authorizedRef = useRef(false);

  // Refresca el token como mucho cada 4 min (límite de Supabase: no spamear refresh_token).
  // Nada de refresh en cada movimiento del ratón: eso generaba 429 y el panel dejaba de autorizar.
  useEffect(() => {
    if (pathname === '/admin/login') return;

    const supabase = createClient();
    const MIN_MS = 4 * 60 * 1000;
    const lastOkRef = { t: 0 };

    const refresh = async () => {
      const now = Date.now();
      if (now - lastOkRef.t < MIN_MS) return;
      try {
        const { error } = await supabase.auth.refreshSession();
        if (!error) lastOkRef.t = now;
      } catch {}
    };

    keepAliveRef.current = setInterval(refresh, MIN_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setAuthorized(true);
      setChecking(false);
      return;
    }
    // Si ya está autorizado, no volver a chequear al navegar entre páginas del admin
    if (authorizedRef.current) {
      setChecking(false);
      return;
    }
    checkAccess();
  }, [pathname]);

  const checkAccess = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.getUser();
      let isAdmin = await isSuperAdmin();
      if (!isAdmin) {
        try {
          await supabase.auth.refreshSession();
        } catch {
          /* ignore */
        }
        isAdmin = await isSuperAdmin();
        if (!isAdmin) {
          router.replace('/admin/login');
          setAuthorized(false);
          authorizedRef.current = false;
          return;
        }
      }
      setAuthorized(true);
      authorizedRef.current = true;
      fetchBadges();
    } catch {
      // Reintento breve (red inestable) antes de cerrar sesión de panel.
      await new Promise((r) => setTimeout(r, 400));
      try {
        await supabase.auth.refreshSession();
      } catch {
        /* ignore */
      }
      const fallback = await isSuperAdmin().catch(() => false);
      if (fallback) {
        setAuthorized(true);
        authorizedRef.current = true;
        fetchBadges();
      } else {
        router.replace('/admin/login');
        setAuthorized(false);
        authorizedRef.current = false;
      }
    } finally {
      setChecking(false);
    }
  };

  const fetchBadges = useCallback(async () => {
    try {
      const leadsRes = await adminFetch('/api/admin/commercial-signup-requests');
      const leadsJson = await leadsRes.json();
      const leadsCount = (leadsJson.data || []).length;
      startTransition(() => {
        setBadges((b) => ({ ...b, leads: leadsCount }));
      });
    } catch {
      /* red / 401: no machacar contadores */
    }
  }, []);

  // Antes solo se llamaba en el primer checkAccess: al navegar o responder en Soporte el badge quedaba obsoleto.
  useEffect(() => {
    if (!authorized || pathname === '/admin/login') return;
    void fetchBadges();
  }, [pathname, authorized, fetchBadges]);

  useEffect(() => {
    if (!authorized || pathname === '/admin/login') return;
    const id = setInterval(() => void fetchBadges(), 60_000);
    return () => clearInterval(id);
  }, [authorized, pathname, fetchBadges]);

  useEffect(() => {
    if (!authorized || pathname === '/admin/login') return;
    const onRefresh = () => void fetchBadges();
    window.addEventListener(ADMIN_BADGES_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(ADMIN_BADGES_REFRESH_EVENT, onRefresh);
  }, [authorized, pathname, fetchBadges]);

  useEffect(() => {
    if (!authorized || pathname === '/admin/login') return;
    const onSupportPending = (e: Event) => {
      const ce = e as CustomEvent<{ count?: number }>;
      const n = ce.detail?.count;
      if (typeof n !== 'number' || n < 0) return;
      startTransition(() => {
        setBadges((b) => ({ ...b, support: n }));
      });
    };
    window.addEventListener(ADMIN_SUPPORT_DISPLAY_PENDING_EVENT, onSupportPending);
    return () => window.removeEventListener(ADMIN_SUPPORT_DISPLAY_PENDING_EVENT, onSupportPending);
  }, [authorized, pathname]);

  useEffect(() => {
    const inPanelShell = authorized && pathname !== '/admin/login';
    if (!inPanelShell) {
      document.documentElement.removeAttribute('data-app-panel');
      return;
    }
    document.documentElement.setAttribute('data-app-panel', '');
    return () => document.documentElement.removeAttribute('data-app-panel');
  }, [authorized, pathname]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
        <div className="text-center">
          <Shield className="h-10 w-10 text-[#0d9488] mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-slate-400">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!authorized && pathname !== '/admin/login') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] gap-4 px-6">
        <p className="text-sm text-slate-400">Redirigiendo al login...</p>
        <Link href="/admin/login" className="inline-flex items-center rounded-xl bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white">
          Ir a /admin/login
        </Link>
      </div>
    );
  }

  if (!authorized) return null;
  if (pathname === '/admin/login') return <>{children}</>;

  /* ── Modo App Móvil (/admin/app/*) ─────────────────────────────── */
  if (pathname.startsWith('/admin/app')) {
    return (
      <AdminSupportChatProvider>
        <PanelSessionHeartbeat />
        <MobileAdminShell badges={badges} signOut={signOut}>
          {children}
        </MobileAdminShell>
      </AdminSupportChatProvider>
    );
  }

  const nav = getAdminNavItems(badges);
  const mobileBottomNav = getAdminMobileBottomNavItems(badges);

  const signOutRow = (
    <button
      type="button"
      onClick={signOut}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/10 hover:text-white"
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </button>
  );

  return (
    <AdminSupportChatProvider>
    <PanelSessionHeartbeat />
    <div className="flex min-h-[100dvh] min-h-screen bg-slate-50">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[min(100%,320px)] border-white/10 bg-[#0f172a] p-0 text-white sm:max-w-[320px] [&>button]:text-white [&>button]:ring-offset-[#0f172a]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menú administración</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col pt-[env(safe-area-inset-top,0px)]">
            <div className="border-b border-white/10 px-5 pb-4 pt-5">
              <Link href="/admin" className="flex items-center gap-3" onClick={() => setMobileNavOpen(false)}>
                <JcOneFixAppIcon className="h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 leading-tight">
                  <JcOneFixMark tone="onDark" className="text-sm font-bold" />
                  <p className="mt-0.5 text-[10px] text-slate-500">Panel SUPER_ADMIN</p>
                </div>
              </Link>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
              <AdminNavLinkList items={nav} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
              <div className="my-3 border-t border-white/10" />
              <a
                href={getSiteCanonicalUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
                <span>Ver web pública</span>
              </a>
            </nav>
            <div className="space-y-2 border-t border-white/10 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              <AdminPwaInstallButton />
              {signOutRow}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar — escritorio */}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-[#0f172a] md:flex">
        <div className="border-b border-white/10 px-5 pb-4 pt-5">
          <Link href="/admin" className="flex items-center gap-3">
            <JcOneFixAppIcon className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 leading-tight">
              <JcOneFixMark tone="onDark" className="text-sm font-bold" />
              <p className="mt-0.5 text-[10px] text-slate-500">Panel SUPER_ADMIN</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <AdminNavLinkList items={nav} pathname={pathname} />
          <div className="my-3 border-t border-white/10" />
          <a
            href={getSiteCanonicalUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300"
          >
            <ChevronRight className="h-4 w-4" />
            <span>Ver web pública</span>
          </a>
        </nav>

        <div className="space-y-2 border-t border-white/10 px-3 pb-4 pt-3">
          <AdminPwaInstallButton />
          {signOutRow}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[3.25rem] shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-6 md:h-14 md:min-h-0 md:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 md:hidden"
              aria-label="Abrir menú"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto text-sm text-slate-500 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {pathname.split('/').filter(Boolean).map((part, i, arr) => (
                <span key={i} className="flex shrink-0 items-center gap-1.5">
                  {i > 0 && <span className="text-slate-300">/</span>}
                  <Link
                    href={'/' + arr.slice(0, i + 1).join('/')}
                    className={cn(
                      'whitespace-nowrap capitalize hover:text-slate-800',
                      i === arr.length - 1 && 'font-medium text-slate-800'
                    )}
                  >
                    {part}
                  </Link>
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Support alert badge in topbar */}
            {badges.support > 0 && (
              <Link
                href="/admin/support"
                className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {badges.support} sin responder
              </Link>
            )}
            <span className="text-xs text-slate-400 font-medium">SUPER_ADMIN</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      <AdminMobileBottomNavBar items={mobileBottomNav} />
    </div>
    <AdminSupportChatDock />
    </AdminSupportChatProvider>
  );
}
