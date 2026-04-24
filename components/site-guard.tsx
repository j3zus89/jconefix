'use client';

/**
 * SiteGuard — Capa de disuasión anti-copia/robo de código.
 *
 * Lo que hace:
 *  1. Bloquea el menú contextual fuera de inputs/textareas (impide "Guardar imagen" y "Ver fuente" rápido)
 *  2. Bloquea atajos de teclado típicos de extracción:
 *       Ctrl/Cmd + U  → Ver fuente
 *       Ctrl/Cmd + S  → Guardar página
 *       Ctrl/Cmd + Shift + I / J / C  → DevTools panels
 *       F12  → DevTools
 *       Ctrl/Cmd + P  → Imprimir / PDF completo
 *  3. Impide arrastrar imágenes fuera del sitio
 *  4. Detecta apertura de DevTools por diferencia de dimensiones y muestra
 *     aviso (no bloquea la app — es un disuasor, no una guerra imposible de ganar)
 *  5. Sobrescribe la consola del navegador con ASCII art + aviso legal
 *     para que un curioso vea el mensaje antes de intentar nada
 *
 * Limitaciones honestas:
 *  - Un atacante determinado SIEMPRE puede extraer JS del bundle ya descargado.
 *  - Estas medidas disuaden a curiosos y bots simples; no a pentesters serios.
 *  - La protección real del código de negocio debe estar en el SERVIDOR (API routes).
 */

import { useEffect } from 'react';

const ALLOWED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'A', 'BUTTON']);

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  const tag = el.tagName?.toUpperCase();
  if (ALLOWED_TAGS.has(tag)) return true;
  // Permitir clic derecho en el panel del dashboard (trabajo real)
  if (el.closest('[data-allow-context-menu]')) return true;
  return false;
}

export function SiteGuard() {
  useEffect(() => {
    /* ── 1. Consola: aviso legal con estilo ── */
    const c = console;
    const BRAND =
      '%c\n ██████╗ ██╗      ██████╗ ███╗   ██╗███████╗███████╗██╗██╗  ██╗\n' +
      '     ██╔════╝ ██║     ██╔═══██╗████╗  ██║██╔════╝██╔════╝██║╚██╗██╔╝\n' +
      '     ██║      ██║     ██║   ██║██╔██╗ ██║█████╗  █████╗  ██║ ╚███╔╝ \n' +
      '     ██║      ██║     ██║   ██║██║╚██╗██║██╔══╝  ██╔══╝  ██║ ██╔██╗ \n' +
      '     ╚██████╗ ███████╗╚██████╔╝██║ ╚████║███████╗██║     ██║██╔╝ ██╗\n' +
      '      ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝\n';

    c.log(
      BRAND,
      'color:#F5C518;font-family:monospace;font-size:11px;line-height:1.4',
    );
    c.log(
      '%c⚠️  STOP — Propiedad Intelectual Protegida',
      'color:#ff4444;font-size:16px;font-weight:bold',
    );
    c.log(
      '%cEste sitio y su código fuente son propiedad exclusiva de JC ONE FIX.\n' +
      'La copia, reproducción, distribución o ingeniería inversa sin autorización\n' +
      'expresa y por escrito constituye una infracción civil y penal.\n\n' +
      '© ' + new Date().getFullYear() + ' JC ONE FIX — Todos los derechos reservados.',
      'color:#e2e8f0;font-size:13px;line-height:1.6',
    );

    /* ── 2. Menú contextual ── */
    const onContextMenu = (e: MouseEvent) => {
      if (!isInteractiveTarget(e.target)) {
        e.preventDefault();
      }
    };

    /* ── 3. Atajos de teclado de extracción ── */
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+U (fuente), Ctrl+S (guardar), Ctrl+P (imprimir)
      if (ctrl && ['u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+I / J / C (paneles DevTools)
      if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
      // F12 - DESACTIVADO TEMPORALMENTE PARA DIAGNÓSTICO
      // if (e.key === 'F12') {
      //   e.preventDefault();
      // }
    };

    /* ── 4. Impedir arrastrar imágenes fuera del sitio ── */
    const onDragStart = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault();
      }
    };

    /* ── 5. Detección de DevTools por dimensiones ── */
    const THRESHOLD = 160;
    let devToolsOpen = false;
    const checkDevTools = () => {
      const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
      const nowOpen = widthDiff > THRESHOLD || heightDiff > THRESHOLD;
      if (nowOpen && !devToolsOpen) {
        devToolsOpen = true;
        c.warn(
          '%c🔍 DevTools detectado. ' +
          'Recuerda: el acceso no autorizado al código fuente está prohibido.',
          'color:#fbbf24;font-size:13px;font-weight:bold',
        );
      } else if (!nowOpen) {
        devToolsOpen = false;
      }
    };
    const devToolsTimer = window.setInterval(checkDevTools, 1500);

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('dragstart', onDragStart, true);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('dragstart', onDragStart, true);
      window.clearInterval(devToolsTimer);
    };
  }, []);

  return null;
}
