'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown, Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { displayOrgOrShopName } from '@/lib/display-name';
import { resolveShopDisplayName } from '@/lib/resolve-shop-display-name';
import {
  resolveOrgChatLogoUrl,
  SHOP_LOGO_UPDATED_EVENT,
} from '@/lib/resolve-org-chat-logo';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  settingsGroupIdForTab,
  type NavItem,
  type NavSubItem,
} from '@/components/dashboard/dashboard-nav-config';
import { getDashboardNavForMode } from '@/lib/dashboard-nav-for-mode';
import { usePanelUiMode } from '@/components/dashboard/PanelUiModeContext';
import { RegionWavingFlag } from '@/components/dashboard/RegionWavingFlag';
import shopNameBrand from '@/components/branding/shop-name-gradient.module.css';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { openCashDrawer, shopSettingsToQzConnect } from '@/lib/cash-drawer';
import { toast } from 'sonner';

function subItemHref(child: NavSubItem): string {
  if (!child.query || Object.keys(child.query).length === 0) return child.href;
  return `${child.href}?${new URLSearchParams(child.query).toString()}`;
}

function isChildActive(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  child: NavSubItem
): boolean {
  if (pathname !== child.href) return false;
  if (!child.query) return true;
  return Object.entries(child.query).every(([k, v]) => {
    const g = searchParams.get(k);
    if (k === 'tab' && child.href === '/dashboard/settings') {
      return (g ?? 'config_general') === v;
    }
    return g === v;
  });
}

function isActiveParent(pathname: string, item: NavItem): boolean {
  if (item.href === '/dashboard' && pathname === '/dashboard') return true;
  if (item.href !== '/dashboard' && pathname.startsWith(item.href)) return true;
  if (item.href === '/dashboard/tickets' && pathname.startsWith('/dashboard/recepcion')) return true;
  if (
    item.href === '/dashboard/finanzas' &&
    (pathname.startsWith('/dashboard/invoices') ||
      pathname.startsWith('/dashboard/devoluciones') ||
      pathname.startsWith('/dashboard/expenses'))
  ) {
    return true;
  }
  return false;
}

export function DashboardTopNav({ searchSlot }: { searchSlot?: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mode: panelMode } = usePanelUiMode();
  const navItems = getDashboardNavForMode(panelMode, true);
  const supabase = createClient();
  const [shopName, setShopName] = useState<string>('Mi Taller');
  /** Logo del taller / organización (Configuración); si no hay, icono JC por defecto. */
  const [shopLogoUrl, setShopLogoUrl] = useState<string | null>(null);
  const [openMenuHref, setOpenMenuHref] = useState<string | null>(null);
  const [expandedSettingGroups, setExpandedSettingGroups] = useState<Record<string, boolean>>({});
  const [openingDrawer, setOpeningDrawer] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSettingGroup = (id: string) => {
    setExpandedSettingGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const cancelCloseMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleCloseMenu = () => {
    cancelCloseMenu();
    closeTimerRef.current = setTimeout(() => {
      setOpenMenuHref(null);
      closeTimerRef.current = null;
    }, 220);
  };

  const openMenuByHref = (href: string) => {
    cancelCloseMenu();
    setOpenMenuHref(href);
  };

  useEffect(() => {
    return () => cancelCloseMenu();
  }, []);

  const handleOpenDrawer = async () => {
    setOpeningDrawer(true);
    try {
      const orgId = await getActiveOrganizationId(supabase);
      let shopRow: any = null;
      if (orgId) {
        const { data } = await (supabase as any)
          .from('shop_settings')
          .select('qz_tray_port,qz_tray_using_secure,qz_tray_certificate_pem')
          .eq('organization_id', orgId)
          .maybeSingle();
        shopRow = data;
      }
      if (!shopRow) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await (supabase as any)
            .from('shop_settings')
            .select('qz_tray_port,qz_tray_using_secure,qz_tray_certificate_pem')
            .eq('user_id', user.id)
            .maybeSingle();
          shopRow = data;
        }
      }
      const qzConn = shopSettingsToQzConnect(shopRow);
      const result = await openCashDrawer(qzConn);
      if (result.ok) toast.success('Cajón abierto');
      else toast.error('No se pudo abrir el cajón: ' + result.message);
    } catch (e: any) {
      toast.error('Error: ' + (e?.message ?? 'desconocido'));
    } finally {
      setOpeningDrawer(false);
    }
  };

  /** Al abrir el menú Configuración, desplegar el grupo de la pestaña actual. */
  useEffect(() => {
    if (openMenuHref !== '/dashboard/settings') return;
    if (pathname !== '/dashboard/settings') return;
    const gid = settingsGroupIdForTab(searchParams.get('tab'));
    if (gid) {
      setExpandedSettingGroups((prev) => ({ ...prev, [gid]: true }));
    }
  }, [openMenuHref, pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const syncShopIdentity = async () => {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        if (!cancelled) {
          setShopName('Mi Taller');
          setShopLogoUrl(null);
        }
        return;
      }
      const [resolvedName, logoUrl] = await Promise.all([
        resolveShopDisplayName(supabase, orgId),
        resolveOrgChatLogoUrl(supabase, orgId),
      ]);
      if (cancelled) return;
      setShopName(resolvedName ?? 'Mi Taller');
      setShopLogoUrl(logoUrl);
    };

    void syncShopIdentity();

    const handleNameChange = (e: Event) => {
      const name = (e as CustomEvent<{ name?: string }>).detail?.name;
      if (name?.trim()) {
        setShopName(displayOrgOrShopName(name));
      } else {
        void syncShopIdentity();
      }
    };

    const handleLogoUpdated = () => void syncShopIdentity();

    window.addEventListener('org-name-changed', handleNameChange);
    window.addEventListener(SHOP_LOGO_UPDATED_EVENT, handleLogoUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('org-name-changed', handleNameChange);
      window.removeEventListener(SHOP_LOGO_UPDATED_EVENT, handleLogoUpdated);
    };
  }, [supabase]);

  /** Mismo panel para Inventario, Informes, etc. (sin max-height: el scroll interno del menú Configuración causaba saltos). */
  const menuPanelClass =
    'w-auto min-w-[14rem] max-w-[min(100vw-2rem,20rem)] rounded-md border border-white/10 bg-[var(--panel-menu-bg)] p-0 py-1 text-white shadow-xl outline-none z-[200] hover:!scale-100 motion-reduce:hover:!scale-100';

  /** Solo Configuración: más ancho, sin capa de scroll forzada, barras ocultas si hubiera overflow. */
  const settingsMenuPanelClass = cn(
    menuPanelClass,
    'min-w-[240px] max-w-[min(100vw-1.5rem,22rem)] h-auto max-h-none overflow-x-hidden overflow-y-visible',
    '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
  );

  const shopInitial = (shopName || 'M').trim().charAt(0).toUpperCase() || 'M';

  return (
    <div className="flex min-w-0 w-full max-w-full flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-2">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-2 rounded-lg py-1 pr-2 transition-opacity hover:opacity-95">
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span className="relative inline-flex h-9 w-9 shrink-0 animate-region-heartbeat items-center justify-center overflow-hidden rounded-full bg-white/20 ring-1 ring-white/25">
            {shopLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL pública de Storage / organización
              <img
                src={shopLogoUrl}
                alt=""
                className="h-full w-full object-contain object-center"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-sm font-semibold uppercase text-white">
                {shopInitial}
              </span>
            )}
          </span>
          {/* Móvil: bandera junto al logo (el nombre del taller va oculto) */}
          <RegionWavingFlag country="AR" className="sm:hidden opacity-95" />
        </span>
        <div className="hidden min-w-0 sm:block">
          <div className="flex max-w-[10rem] items-center gap-1.5 overflow-visible lg:max-w-[14rem]">
            <div className={cn(shopNameBrand.wrap, 'min-w-0 flex-1')}>
              <span
                className={cn(shopNameBrand.label, shopNameBrand.gradient, 'max-w-full truncate')}
              >
                {shopName}
              </span>
            </div>
            <RegionWavingFlag country="AR" className="hidden sm:inline-flex shrink-0 opacity-95" />
          </div>
          <span className="mt-0.5 block text-[10px] leading-none text-white/50">
            {panelMode === 'simple' ? 'Panel sencillo' : 'Centro de Reparaciones'}
          </span>
        </div>
      </Link>

      {/* Menú de navegación: Solo en PC, oculto en móvil */}
      <nav
        className="hidden md:flex min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto overflow-y-visible py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Principal"
      >
        {navItems.map((item) => {
          const activeParent = isActiveParent(pathname, item);
          const Icon = item.icon;

          if (!item.children && !item.settingsBlocks) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs whitespace-nowrap transition-colors sm:text-sm',
                  activeParent
                    ? 'bg-white/20 font-semibold text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                <span>{item.label}</span>
              </Link>
            );
          }

          const isOpen = openMenuHref === item.href;
          const isSettingsMenu = Boolean(item.settingsBlocks);

          return (
            <span key={item.href} className="contents">
              <Popover
                modal={false}
                open={isOpen}
                onOpenChange={(next) => {
                  if (next) {
                    cancelCloseMenu();
                    setOpenMenuHref(item.href);
                  } else {
                    setOpenMenuHref((cur) => (cur === item.href ? null : cur));
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'group flex shrink-0 items-center gap-1 rounded-md px-2 py-2 text-xs whitespace-nowrap transition-colors outline-none sm:text-sm data-[state=open]:bg-white/20 data-[state=open]:text-white',
                      activeParent ? 'bg-white/20 font-semibold text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                    onMouseEnter={() => openMenuByHref(item.href)}
                    onMouseLeave={scheduleCloseMenu}
                    aria-expanded={isOpen}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" />
                    <span>{item.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={6}
                  collisionPadding={12}
                  className={isSettingsMenu ? settingsMenuPanelClass : menuPanelClass}
                  onMouseEnter={cancelCloseMenu}
                  onMouseLeave={scheduleCloseMenu}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  {item.settingsBlocks
                    ? item.settingsBlocks.map((block) => {
                        if (block.kind === 'link') {
                          const child = block.item;
                          const href = subItemHref(child);
                          const childActive = isChildActive(pathname, searchParams, child);
                          return (
                            <Link
                              key={`${child.label}-${child.query?.tab ?? ''}`}
                              href={href}
                              className={cn(
                                'block px-3 py-2 text-left text-xs transition-colors sm:text-sm',
                                childActive
                                  ? 'bg-white/15 font-semibold text-white'
                                  : 'text-white/75 hover:bg-white/10 hover:text-white'
                              )}
                              onClick={() => setOpenMenuHref(null)}
                            >
                              {child.label}
                            </Link>
                          );
                        }
                        const open = !!expandedSettingGroups[block.id];
                        return (
                          <div key={block.id} className="border-b border-white/10 last:border-b-0">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/10 sm:text-sm"
                              onClick={() => toggleSettingGroup(block.id)}
                              aria-expanded={open}
                            >
                              <span className="font-medium text-white/90">{block.label}</span>
                              <ChevronDown
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0 text-white/60 transition-transform',
                                  open && 'rotate-180'
                                )}
                              />
                            </button>
                            {open ? (
                              <div className="border-t border-white/5 bg-black/15 pb-1">
                                {block.items.map((child) => {
                                  const href = subItemHref(child);
                                  const childActive = isChildActive(pathname, searchParams, child);
                                  return (
                                    <Link
                                      key={`${child.label}-${child.query?.tab ?? ''}`}
                                      href={href}
                                      className={cn(
                                        'block py-1.5 pl-5 pr-3 text-left text-[11px] transition-colors sm:text-xs',
                                        childActive
                                          ? 'bg-white/10 font-semibold text-white'
                                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                                      )}
                                      onClick={() => setOpenMenuHref(null)}
                                    >
                                      {child.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    : item.children!.map((child) => {
                        const href = subItemHref(child);
                        const childActive = isChildActive(pathname, searchParams, child);
                        return (
                          <Link
                            key={child.label}
                            href={href}
                            className={cn(
                              'block px-3 py-2 text-left text-xs transition-colors sm:text-sm',
                              childActive
                                ? 'bg-white/15 font-semibold text-white'
                                : 'text-white/75 hover:bg-white/10 hover:text-white'
                            )}
                            onClick={() => setOpenMenuHref(null)}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                </PopoverContent>
              </Popover>

              {item.label === 'Configuración' && searchSlot ? (
                <div className="ml-1 flex min-w-0 w-[min(26rem,calc(100vw-10rem))] max-w-[26rem] shrink-0 items-center sm:ml-2">
                  {searchSlot}
                </div>
              ) : null}
            </span>
          );
        })}
        {/* Botón Caja: Solo en PC */}
        <button
          type="button"
          onClick={() => void handleOpenDrawer()}
          disabled={openingDrawer}
          title="Abrir cajón portamonedas (QZ Tray)"
          className="hidden md:flex shrink-0 items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <Archive className="h-3.5 w-3.5 shrink-0" />
          <span>{openingDrawer ? 'Abriendo…' : 'Abrir caja'}</span>
        </button>
      </nav>
    </div>
  );
}
