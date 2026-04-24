'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, X, Wifi, WifiOff, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MaiaChatPanel } from './MaiaChatPanel';

export type MaiaConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'qr_required' | 'error';

export interface MaiaStatus {
  status: MaiaConnectionStatus;
  qr_code?: string | null;
  qr_expires_at?: string | null;
  last_error?: string;
}

export function MaiaFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<MaiaStatus>({
    status: 'disconnected',
  });
  const [loading, setLoading] = useState(false);

  // Cargar estado de conexión
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/maia/status', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setConnectionStatus(data.status);
    } catch (error) {
      console.error('Error loading MAIA status:', error);
    }
  }, []);

  // Cargar contador de no leídos
  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/maia/conversations', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      // Contar conversaciones con mensajes nuevos del cliente
      let count = 0;
      for (const conv of data.conversations || []) {
        const lastMsg = conv.whatsapp_messages?.[conv.whatsapp_messages.length - 1];
        if (lastMsg?.sender_type === 'customer') {
          count++;
        }
      }
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  // Polling de estado
  useEffect(() => {
    loadStatus();
    loadUnreadCount();
    
    const interval = setInterval(() => {
      if (!isOpen) {
        loadStatus();
        loadUnreadCount();
      }
    }, 10000); // cada 10 segundos

    return () => clearInterval(interval);
  }, [isOpen, loadStatus, loadUnreadCount]);

  // Resetear contador al abrir
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-[#F5C518]" />;
      case 'qr_required':
        return <QrCode className="h-3 w-3 text-amber-400" />;
      case 'connecting':
        return <div className="h-3 w-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />;
      case 'error':
      case 'disconnected':
      default:
        return <WifiOff className="h-3 w-3 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return 'bg-[#F5C518]';
      case 'qr_required':
        return 'bg-amber-500';
      case 'connecting':
        return 'bg-amber-500';
      case 'error':
      case 'disconnected':
      default:
        return 'bg-red-500';
    }
  };

  return (
    <>
      {/* Widget flotante - posicionado a la izquierda del botón de Chat */}
      {!isOpen && (
        <div className="fixed bottom-4 right-20 z-40 flex flex-row items-center gap-2">
          {/* Badge de estado compacto (solo icono) */}
          <div 
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-all",
              connectionStatus.status === 'connected' ? 'bg-emerald-600' : 'bg-amber-600'
            )}
            title={connectionStatus.status === 'connected' ? 'MAIA conectada' : 
                   connectionStatus.status === 'qr_required' ? 'QR requerido' : 'Sin conexión'}
          >
            {getStatusIcon()}
          </div>
          
          {/* Botón principal circular (solo icono) */}
          <button
            onClick={() => setIsOpen(true)}
            type="button"
            className={cn(
              "relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 hover:shadow-xl text-white",
              getStatusColor()
            )}
            title="Abrir MAIA"
          >
            <MessageCircle className="h-6 w-6" />
            
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow-md ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      )}

      {/* Panel de chat */}
      {isOpen && (
        <MaiaChatPanel
          onClose={() => setIsOpen(false)}
          connectionStatus={connectionStatus}
          onRefreshStatus={loadStatus}
        />
      )}
    </>
  );
}
