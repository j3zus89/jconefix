'use client';

import Link from 'next/link';
import { ClipboardSignature, Wrench, Users, ChevronRight } from 'lucide-react';
import { WorkshopReportPdfMenu } from '@/components/dashboard/WorkshopReportPdfMenu';
import { DashboardOnboardingChecklist } from '@/components/dashboard/DashboardOnboardingChecklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getTicketStatusBadge } from '@/lib/ticket-status-badge';

type RecentTicket = {
  id: string;
  ticket_number: string;
  device_type: string;
  status: string;
  final_cost: number | null;
  estimated_cost: number | null;
  created_at: string;
  customers: { name: string } | null;
};

type Props = {
  organizationName: string;
  currencySymbol: string;
  pendingTickets: number;
  inProgressTickets: number;
  totalTickets: number;
  recentTickets: RecentTicket[];
  formatDate: (d: string) => string;
  formatCurrency: (n: number) => string;
};

export function DashboardSimpleHome({
  organizationName,
  currencySymbol,
  pendingTickets,
  inProgressTickets,
  totalTickets,
  recentTickets,
  formatDate,
  formatCurrency,
}: Props) {
  return (
    <div className="min-h-full bg-background p-6 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <DashboardOnboardingChecklist />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            Panel sencillo
          </p>
          <h1 className="mt-1 text-2xl font-bold text-primary">{organizationName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Lo esencial para el día a día. Activa el panel completo en{' '}
            <Link
              href="/dashboard/settings?tab=config_general"
              className="font-medium text-primary hover:underline"
            >
              Configuración → Configuración general
            </Link>
            {' '}(sección Experiencia del panel) cuando lo necesites.
          </p>
        </div>

        <Link href="/dashboard/recepcion" className="block">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-[#D4A915] p-6 text-white shadow-lg shadow-teal-900/15 transition-transform hover:scale-[1.01] active:scale-[0.99]">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <ClipboardSignature className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-tight">Nuevo ingreso</p>
                <p className="mt-1 text-sm text-white/90">
                  Cliente y equipo en un solo flujo guiado
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 opacity-80" />
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{pendingTickets}</p>
              <p className="text-xs text-gray-600">Pendientes</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{inProgressTickets}</p>
              <p className="text-xs text-gray-600">En curso</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalTickets}</p>
              <p className="text-xs text-gray-600">Activos en taller</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WorkshopReportPdfMenu
            shopName={organizationName}
            currencySymbol={currencySymbol}
            compact
          />
          <Button asChild className="gap-2 bg-[#0f766e] text-white hover:bg-[#115e59]">
            <Link href="/dashboard/tickets">
              <Wrench className="h-4 w-4" />
              Ver tickets
            </Link>
          </Button>
          <Button asChild className="gap-2 bg-[#0f766e] text-white hover:bg-[#115e59]">
            <Link href="/dashboard/customers">
              <Users className="h-4 w-4" />
              Clientes
            </Link>
          </Button>
          <Button asChild className="gap-2 bg-[#0f766e] text-white hover:bg-[#115e59]">
            <Link href="/dashboard/pos">Nueva venta</Link>
          </Button>
        </div>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">Últimos tickets</CardTitle>
              <Link
                href="/dashboard/tickets"
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentTickets.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                Aún no hay tickets. Usa «Nuevo ingreso» para el primero.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentTickets.slice(0, 6).map((t) => {
                  const sc = getTicketStatusBadge(t.status);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/dashboard/tickets/${t.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/90"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary">
                              {t.ticket_number}
                            </span>
                            <span className="truncate text-sm text-primary">
                              {t.device_type}
                            </span>
                          </div>
                          <p className="truncate text-xs text-gray-500">
                            {t.customers?.name ?? '—'} · {formatDate(t.created_at)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            sc.cls
                          )}
                        >
                          {sc.label}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-primary">
                          {formatCurrency(t.final_cost ?? t.estimated_cost ?? 0)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
