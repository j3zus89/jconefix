'use client';

import './globals.css';
import Link from 'next/link';
import { AlertOctagon, ArrowLeft } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <AlertOctagon className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Fallo crítico</div>
              <div className="text-xs text-gray-500">digest: {error.digest || '—'}</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 whitespace-pre-wrap break-words">
            {error.message || 'Error desconocido'}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-medium"
            >
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
      </body>
    </html>
  );
}

