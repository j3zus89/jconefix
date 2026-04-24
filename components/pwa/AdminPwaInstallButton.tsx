'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isStandaloneDisplay } from '@/lib/pwa-utils';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Botón sutil para instalar la PWA (Chrome/Edge/Android). En iOS no hay `beforeinstallprompt`.
 */
export function AdminPwaInstallButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const onClick = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
  }, [deferred]);

  if (installed || !deferred) return null;

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white',
        className
      )}
    >
      <Download className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      Instalar como app
    </button>
  );
}
