'use client';

import { useState } from 'react';
import Image from 'next/image';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/utils';
import { Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  supportThreadShowsPending,
  useAdminSupportChat,
  type SupportThread,
} from '@/contexts/AdminSupportChatContext';
import { toast } from 'sonner';

/** Genera un color de fondo determinista a partir del user_id. */
function userColor(userId: string): string {
  const palette = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-rose-500',
    'bg-cyan-600',
  ];
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) - h) + userId.charCodeAt(i);
    h |= 0;
  }
  return palette[Math.abs(h) % palette.length];
}

function Avatar({
  src,
  name,
  colorClass,
  size = 'sm',
}: {
  src?: string | null;
  name: string;
  colorClass: string;
  size?: 'sm' | 'md';
}) {
  const [imgError, setImgError] = useState(false);
  const dim = size === 'md' ? 'h-8 w-8 text-sm' : 'h-7 w-7 text-xs';
  const initial = (name?.trim()?.[0] || '?').toUpperCase();

  if (src && !imgError) {
    return (
      <div className={cn('relative shrink-0 rounded-full ring-2 ring-white overflow-hidden', dim)}>
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
          sizes="40px"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        'shrink-0 rounded-full ring-2 ring-white flex items-center justify-center font-bold text-white',
        colorClass,
        dim
      )}
    >
      {initial}
    </div>
  );
}

export function SupportChatInbox() {
  const {
    openChat,
    openWindows,
    closeChat,
    refreshThreads,
    threads,
    windows,
    threadsLoading: loading,
    threadsError: error,
  } = useAdminSupportChat();
  const [deleteTarget, setDeleteTarget] = useState<SupportThread | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpen = (th: SupportThread) => {
    openChat(th);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminFetch(
        `/api/admin/support-chat?userId=${encodeURIComponent(deleteTarget.user_id)}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      closeChat(deleteTarget.user_id);
      setDeleteTarget(null);
      await refreshThreads();
      toast.success('Conversación eliminada');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-[#F5C518]" />
        <div>
          <h2 className="font-semibold text-gray-900">Chats de «Contacto apoyo»</h2>
          <p className="text-xs text-gray-600">
            Bandeja de conversaciones. Pulsa Abrir para desplegar el chat flotante (esquina inferior derecha).
            Actualización en tiempo casi real (Supabase Realtime).
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Usuario</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Organización</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Último mensaje</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Estado</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Chat</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 w-[100px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin inline" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                  No se pudo cargar la bandeja. Revisa el mensaje en rojo arriba y aplica la migración en Supabase.
                </td>
              </tr>
            ) : threads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500 text-sm">
                  Aún no hay conversaciones. Cuando un cliente use «Contacto apoyo» en el panel, aparecerán aquí.
                </td>
              </tr>
            ) : (
              threads.map((th) => {
                const isOpen = openWindows.includes(th.user_id);
                const showsPending = supportThreadShowsPending(th, windows);
                return (
                  <tr key={th.user_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={th.user_avatar}
                          name={th.user_name}
                          colorClass={userColor(th.user_id)}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">
                            {th.user_name}
                          </div>
                          <div className="font-mono text-[10px] text-gray-400 truncate max-w-[120px]" title={th.user_id}>
                            {th.user_id.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {th.organization_name || '—'}
                      {th.organization_id && (
                        <div className="text-[10px] text-gray-400 font-mono truncate max-w-[180px]" title={th.organization_id}>
                          {th.organization_id.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[240px]">
                      <span className="line-clamp-2">{th.last_preview}</span>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(th.last_at).toLocaleString('es')}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium',
                          showsPending ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {showsPending ? 'Pendiente' : 'Respondido'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button
                        type="button"
                        variant={isOpen ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleOpen(th)}
                      >
                        {isOpen ? 'Al frente' : 'Abrir'}
                      </Button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Eliminar conversación"
                        onClick={() => setDeleteTarget(th)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán todos los mensajes con{' '}
              <span className="font-medium text-foreground">{deleteTarget?.user_name}</span>
              {deleteTarget?.organization_name ? (
                <>
                  {' '}
                  ({deleteTarget.organization_name}).
                </>
              ) : (
                '.'
              )}{' '}
              El cliente verá el chat vacío la próxima vez que abra «Contacto apoyo». Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
