'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase/client';

export type PanelUiMode = 'full' | 'simple';

type PanelUiModeContextValue = {
  mode: PanelUiMode;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PanelUiModeContext = createContext<PanelUiModeContextValue>({
  mode: 'full',
  loading: true,
  refresh: async () => {},
});

const EVENT = 'jc-panel-ui-mode-changed';

export function PanelUiModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PanelUiMode>('full');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMode('full');
      setLoading(false);
      return;
    }
    const { data, error } = await (supabase as any)
      .from('shop_settings')
      .select('panel_ui_mode')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('[PanelUiMode]', error.message);
      setMode('full');
      setLoading(false);
      return;
    }

    const raw = String((data as { panel_ui_mode?: string } | null)?.panel_ui_mode ?? '')
      .toLowerCase()
      .trim();
    setMode(raw === 'simple' ? 'simple' : 'full');
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [refresh]);

  const value = useMemo(
    () => ({
      mode,
      loading,
      refresh,
    }),
    [mode, loading, refresh]
  );

  return (
    <PanelUiModeContext.Provider value={value}>{children}</PanelUiModeContext.Provider>
  );
}

export function usePanelUiMode() {
  return useContext(PanelUiModeContext);
}

export function notifyPanelUiModeChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}
