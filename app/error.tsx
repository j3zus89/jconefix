'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">Ha ocurrido un error</div>
            <div className="text-xs text-gray-500">digest: {error.digest || '—'}</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 whitespace-pre-wrap break-words">
          {error.message || 'Error desconocido'}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5C518] hover:bg-[#D4A915] text-[#0D1117] text-white text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

