'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrCreatePanelSessionClientKey } from '@/lib/panel-session-client';

/** Cada minuto: suficiente para que Super Admin vea «en línea» sin saturar. */
const INTERVAL_MS = 60 * 1000;

/** Registra actividad del panel (IP, UA, última actividad) para Configuración → Sesiones activas. */
export function PanelSessionHeartbeat() {
  useEffect(() => {
    const ping = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const key = getOrCreatePanelSessionClientKey();
      if (!key) return;
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
    };

    void ping();
    const id = window.setInterval(() => void ping(), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
