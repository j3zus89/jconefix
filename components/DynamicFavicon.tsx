'use client';

import { useEffect, useState } from 'react';

const VISUAL_PREFS_STORAGE_KEY = 'jc_visual_preferences_v1';

export function DynamicFavicon() {
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    // Leer favicon desde localStorage
    const loadFavicon = () => {
      try {
        const userId = localStorage.getItem('jc_last_user_id');
        if (!userId) return;
        
        const key = `${VISUAL_PREFS_STORAGE_KEY}_u_${userId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return;
        
        const prefs = JSON.parse(raw);
        if (prefs?.faviconUrl) {
          setFaviconUrl(prefs.faviconUrl);
        }
      } catch {
        // Ignorar errores
      }
    };

    loadFavicon();

    // Escuchar cambios en localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.includes(VISUAL_PREFS_STORAGE_KEY)) {
        loadFavicon();
      }
    };

    window.addEventListener('storage', handleStorage);
    
    // Escuchar evento personalizado
    const handlePrefsChange = () => loadFavicon();
    window.addEventListener('jc-visual-prefs-changed', handlePrefsChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('jc-visual-prefs-changed', handlePrefsChange);
    };
  }, []);

  // Actualizar el favicon en el DOM
  useEffect(() => {
    if (!faviconUrl) {
      // Si no hay favicon, remover el link existente
      const existing = document.querySelector('link[rel="icon"]');
      if (existing) existing.remove();
      return;
    }

    // Buscar o crear el link de favicon
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }
    
    link.href = faviconUrl;
  }, [faviconUrl]);

  return null; // No renderiza nada
}
