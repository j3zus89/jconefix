'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

/** Ancho máximo del panel del chat interno (debe coincidir con `FloatingChat`). */
export const DASHBOARD_INTERNAL_CHAT_MAX_W_PX = 420;
const SIDE_BY_SIDE_MIN_VIEWPORT_PX = 880;
const GAP_REM = 0.75;

type DockMode = 'single' | 'sideBySide' | 'stacked';

type DashboardFloatingChatsValue = {
  supportOpen: boolean;
  internalChatOpen: boolean;
  setInternalChatOpen: (open: boolean) => void;
  dockMode: DockMode;
};

const DashboardFloatingChatsContext = createContext<DashboardFloatingChatsValue | null>(null);

export function DashboardFloatingChatsProvider({
  supportOpen,
  children,
}: {
  supportOpen: boolean;
  children: ReactNode;
}) {
  const [internalChatOpen, setInternalChatOpenState] = useState(false);
  const [wideEnough, setWideEnough] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${SIDE_BY_SIDE_MIN_VIEWPORT_PX}px)`);
    const sync = () => setWideEnough(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const setInternalChatOpen = useCallback((open: boolean) => {
    setInternalChatOpenState(open);
  }, []);

  const dockMode: DockMode = useMemo(() => {
    if (!supportOpen || !internalChatOpen) return 'single';
    return wideEnough ? 'sideBySide' : 'stacked';
  }, [supportOpen, internalChatOpen, wideEnough]);

  const value = useMemo(
    () => ({
      supportOpen,
      internalChatOpen,
      setInternalChatOpen,
      dockMode,
    }),
    [supportOpen, internalChatOpen, setInternalChatOpen, dockMode]
  );

  return (
    <DashboardFloatingChatsContext.Provider value={value}>{children}</DashboardFloatingChatsContext.Provider>
  );
}

export function useDashboardFloatingChats(): DashboardFloatingChatsValue {
  const ctx = useContext(DashboardFloatingChatsContext);
  if (!ctx) {
    throw new Error('useDashboardFloatingChats must be used within DashboardFloatingChatsProvider');
  }
  return ctx;
}

/** Soporte: desplazamiento horizontal respecto al borde derecho cuando el chat interno está abierto (lado a lado). */
export function supportChatSideBySideRightStyle(): CSSProperties {
  return {
    right: `calc(1rem + min(${DASHBOARD_INTERNAL_CHAT_MAX_W_PX}px, 100vw - 2rem) + ${GAP_REM}rem)`,
  };
}

/** Soporte: apilado encima del panel del chat interno (vista estrecha). */
export function supportChatStackedBottomStyle(): CSSProperties {
  return {
    bottom: `calc(1rem + min(70vh, 520px) + ${GAP_REM}rem)`,
  };
}

export function internalChatSideBySideRightStyle(): CSSProperties {
  return {
    right: `calc(1rem + min(${DASHBOARD_INTERNAL_CHAT_MAX_W_PX}px, 100vw - 2rem) + ${GAP_REM}rem)`,
  };
}
