'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">
          Algo salió mal
        </h1>
        <p className="max-w-sm text-sm text-gray-500">
          Se produjo un error inesperado. Puedes intentar recargar la sección o volver al inicio.
        </p>
        {error?.digest && (
          <p className="text-xs text-gray-400 font-mono">
            Ref: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f766e] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
