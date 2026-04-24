'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrCreatePanelSessionClientKey } from '@/lib/panel-session-client';

/** Heartbeat rápido para presencia en tiempo real (cada 10 segundos). */
const INTERVAL_MS = 10 * 1000;

/** Registra actividad del panel (IP, UA, última actividad) para Configuración → Sesiones activas. */
export function PanelSessionHeartbeat() {
  const clientKeyRef = useRef<string | null>(null);

  const ping = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const key = clientKeyRef.current || getOrCreatePanelSessionClientKey();
    if (!key) return;
    clientKeyRef.current = key;

    try {
      await fetch('/api/auth/panel-session/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_key: key,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      });
    } catch {
      /* red / tabla ausente: no bloquear el panel */
    }
  }, []);

  const disconnect = useCallback(async () => {
    const key = clientKeyRef.current;
    if (!key) return;

    try {
      // Usar sendBeacon si está disponible (más confiable para beforeunload)
      const payload = JSON.stringify({ client_key: key });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/auth/panel-session/disconnect', new Blob([payload], { type: 'application/json' }));
      } else {
        // Fallback a fetch con keepalive
        await fetch('/api/auth/panel-session/disconnect', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      /* silencioso: el usuario está cerrando la pestaña */
    }
  }, []);

  useEffect(() => {
    // Ping inicial
    void ping();

    // Intervalo de heartbeat
    const intervalId = window.setInterval(() => void ping(), INTERVAL_MS);

    // Desconexión al cerrar pestaña/navegador
    const handleBeforeUnload = () => {
      void disconnect();
    };

    // También al cambiar de visibilidad (cambio de pestaña)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void disconnect();
      } else {
        // Reconectó, enviar heartbeat inmediato
        void ping();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Intentar desconectar al desmontar (logout)
      void disconnect();
    };
  }, [ping, disconnect]);

  return null;
}
