'use client';

import Link from 'next/link';
import { CreditCard, Info, ArrowRight } from 'lucide-react';
import { JC_SINGLE_PLAN } from '@/lib/plan-marketing';

export default function AdminPlansPage() {
  const p = JC_SINGLE_PLAN;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plan & Licencias</h1>
        <p className="text-sm text-gray-500 mt-1">
          Un solo plan de venta; la licencia por organización se ajusta en cada tenant (periodo, caducidad, overrides).
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-700 mt-0.5" />
        <div className="text-sm text-amber-900">
          Los límites y funciones viven en <code className="text-xs bg-white/80 px-1 rounded">organizations</code> (plan_type,
          billing_cycle, license_expires_at, features). Filas con plan histórico restringido pueden migrarse desde el detalle
          de la organización.
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 max-w-xl">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-900">{p.title}</div>
          <CreditCard className="h-4 w-4 text-gray-400" />
        </div>
        <div className="text-sm text-gray-600 mt-2">
          ${p.priceMonth.toLocaleString('es-AR')} ARS/mes · ${p.priceYear.toLocaleString('es-AR')} ARS/año
        </div>
        <div className="text-sm text-gray-500 mt-1">Usuarios y tickets ilimitados</div>
        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          {p.features.map((f) => (
            <li key={f}>- {f}</li>
          ))}
        </ul>
        <div className="mt-4">
          <Link
            href="/admin/organizations"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#F5C518] hover:underline"
          >
            Gestionar organizaciones <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="font-semibold text-gray-900">Overrides por organización</div>
        <div className="text-sm text-gray-500 mt-1">
          Abre el detalle de una org para licencia, usuarios/tickets y notas de SUPER_ADMIN.
        </div>
        <div className="mt-3">
          <Link
            href="/admin/organizations"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5C518] hover:bg-[#D4A915] text-white text-sm font-medium"
          >
            Ir a Organizaciones <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
