'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  applyVisualPreferencesToDocument,
  DEFAULT_VISUAL_PREFERENCES,
  readPanelVisualPreferences,
  VISUAL_PREFS_EVENT,
} from '@/lib/visual-preferences';

export function VisualPreferencesSync() {
  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const prefs = user?.id ? readPanelVisualPreferences(user.id) : { ...DEFAULT_VISUAL_PREFERENCES };
      applyVisualPreferencesToDocument(prefs);
    };

    void run();
    const onStorage = () => void run();
    window.addEventListener(VISUAL_PREFS_EVENT, onStorage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(VISUAL_PREFS_EVENT, onStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return null;
}
