'use client';

'use client';

import Link from 'next/link';
import { Landmark, FileOutput, Receipt, TrendingDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';

export default function FinanzasHubPage() {
  const loc = useOrgLocale();
  const hubTitle = loc.isAR ? 'Archivo de Facturas' : 'Centro de documentación';
  const salesTitle = loc.isAR ? 'Mis Ventas' : 'Facturas emitidas';
  const purchasesTitle = loc.isAR ? 'Mis Compras' : 'Facturas recibidas (gastos)';
  const purchasesShort = loc.isAR ? 'Mis Compras' : 'Facturas recibidas';
  const expensesCta = loc.isAR ? 'Ir a Mis Compras' : 'Ir a comprobantes de gasto';

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 text-foreground">
      <div>
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Landmark className="h-6 w-6" />
          <span className="text-xs font-semibold uppercase tracking-wide">Finanzas</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{hubTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Separa lo que <strong className="font-medium text-foreground">cobras a clientes</strong> de lo que{' '}
          <strong className="font-medium text-foreground">pagas a proveedores</strong>. Al cerrar mes puedes generar un
          .zip con ventas y gastos para tu contador.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/invoices"
          className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileOutput className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <h2 className="mt-3 font-semibold text-card-foreground">{salesTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresos: facturas que generas en el taller para tus clientes.
          </p>
        </Link>

        <Link
          href="/dashboard/expenses"
          className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-700">
              <TrendingDown className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <h2 className="mt-3 font-semibold text-card-foreground">{purchasesTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Arrastra el PDF o foto del proveedor, importe y mes. Queda archivado para exportar.
          </p>
        </Link>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Receipt className="h-4 w-4 text-primary" />
          Exportación para contador
        </p>
        <p className="mt-1 pl-6">
          En <strong className="text-foreground">{purchasesShort}</strong> elige mes y año y pulsa{' '}
          <strong className="text-foreground">Exportar mes para contador</strong>: se descarga un ZIP con carpetas{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">YYYY-MM-Ventas</code> y{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">YYYY-MM-Gastos</code> (CSV + HTML de facturas y tus
          comprobantes).
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/dashboard/expenses">{expensesCta}</Link>
        </Button>
      </div>
    </div>
  );
}
