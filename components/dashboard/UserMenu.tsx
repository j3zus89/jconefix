'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  User,
  Settings,
  Clock,
  Calendar,
  CreditCard,
  Wallet,
  Mail,
  Send,
  Puzzle,
  LogOut,
  ChevronDown,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard/profile', icon: User, label: 'Mi perfil' },
  { href: '/dashboard/settings', icon: Settings, label: 'Ajustes de la tienda' },
  { href: '/dashboard/clock', icon: Clock, label: 'Reloj de entrada / salida' },
  { href: '/dashboard/shift', icon: Calendar, label: 'Comienzo de Turno' },
  { href: '/dashboard/transactions', icon: CreditCard, label: 'Registro de Transacciones' },
  { href: '/dashboard/cash-flow', icon: Wallet, label: 'Entrada/salida de efectivo' },
  { href: '/dashboard/inbox', icon: Mail, label: 'Bandeja de entrada' },
  { href: '/dashboard/outbox', icon: Send, label: 'Bandeja de salida' },
  { href: '/dashboard/integrations', icon: Puzzle, label: 'Integraciones' },
];

const PROFILE_AVATAR_EVENT = 'jc-profile-avatar-updated';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const loadAccount = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      setAvatarUrl(null);
      setAvatarBroken(false);
      return;
    }
    const { data: prof } = await (supabase as any)
      .from('profiles')
      .select('avatar_url, first_name, last_name, full_name')
      .eq('id', authUser.id)
      .maybeSingle();
    const url = (prof?.avatar_url as string | undefined)?.trim() || null;
    setAvatarUrl(url);
    setAvatarBroken(false);
    const fn = (prof?.first_name as string | undefined)?.trim() || '';
    const ln = (prof?.last_name as string | undefined)?.trim() || '';
    const combined = [fn, ln].filter(Boolean).join(' ').trim();
    const fromFull = (prof?.full_name as string | undefined)?.trim() || '';
    const displayName =
      combined ||
      fromFull ||
      (authUser.user_metadata?.full_name as string | undefined)?.trim() ||
      authUser.email?.split('@')[0] ||
      'Usuario';
    setUser({
      email: authUser.email || '',
      name: displayName,
    });
  }, [supabase]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount, pathname]);

  useEffect(() => {
    const onAvatar = () => void loadAccount();
    window.addEventListener(PROFILE_AVATAR_EVENT, onAvatar);
    return () => window.removeEventListener(PROFILE_AVATAR_EVENT, onAvatar);
  }, [loadAccount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión cerrada exitosamente');
    router.push('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Menú de cuenta"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-full p-0 text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-1 ring-white/25">
          {avatarUrl && !avatarBroken ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-white/70 transition-transform hidden sm:block', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[200] mt-2 w-72 rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
              {avatarUrl && !avatarBroken ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <User className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="truncate text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="py-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <item.icon className="h-4 w-4 text-gray-400" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}
