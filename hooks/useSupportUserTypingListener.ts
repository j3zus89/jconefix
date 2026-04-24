'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  SUPPORT_TYPING_BROADCAST_EVENT,
  supportTypingChannelId,
} from '@/lib/support-chat-typing';

/**
 * Escucha si el usuario del panel (userId) está escribiendo en el chat de soporte.
 * Usar solo en admin con sesión Supabase válida.
 */
export function useSupportUserTypingListener(userId: string | null, enabled: boolean): boolean {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!userId || !enabled) {
      setTyping(false);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(supportTypingChannelId(userId), {
      config: { broadcast: { self: false } },
    });

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const clearHide = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    channel.on('broadcast', { event: SUPPORT_TYPING_BROADCAST_EVENT }, (payload) => {
      const active = !!(payload.payload as { active?: boolean })?.active;
      clearHide();
      if (active) {
        setTyping(true);
        hideTimer = setTimeout(() => {
          setTyping(false);
          hideTimer = null;
        }, 4000);
      } else {
        setTyping(false);
      }
    });

    channel.subscribe();

    return () => {
      clearHide();
      setTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [userId, enabled]);

  return typing;
}
