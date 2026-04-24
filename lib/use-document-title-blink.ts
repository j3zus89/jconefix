import { useEffect, useRef } from 'react';

/**
 * Parpadea el título de la pestaña mientras `active` sea true (p. ej. mensaje nuevo con chat minimizado).
 */
export function useDocumentTitleBlink(active: boolean, alternateTitle: string) {
  const originalRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!active) {
      if (originalRef.current != null) {
        document.title = originalRef.current;
        originalRef.current = null;
      }
      return;
    }
    if (originalRef.current == null) {
      originalRef.current = document.title;
    }
    let on = false;
    const id = window.setInterval(() => {
      on = !on;
      document.title = on ? alternateTitle : (originalRef.current || document.title);
    }, 900);
    return () => {
      window.clearInterval(id);
      if (originalRef.current != null) {
        document.title = originalRef.current;
        originalRef.current = null;
      }
    };
  }, [active, alternateTitle]);
}
