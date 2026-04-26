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
    <div className="min-h-full bg-background p-4 md:p-6 text-foreground">
      <div className="mx-auto max-w-3xl space-y-4 md:space-y-6">
        {/* Vista PC: Mantiene el checklist y el mensaje de panel sencillo */}
        <div className="hidden md:block">
          <DashboardOnboardingChecklist />
        </div>

        {/* PC: Header completo con descripción */}
        <div className="hidden md:block">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            Panel sencillo
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{organizationName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Lo esencial para el día a día. Activa el panel completo en{' '}
            <Link
              href="/dashboard/settings?tab=config_general"
              className="font-medium text-[#0d9488] hover:underline"
            >
              Configuración → Configuración general
            </Link>
            {' '}(sección Experiencia del panel) cuando lo necesites.
          </p>
        </div>

        {/* Botón Nuevo Ingreso: PC */}
        <Link href="/dashboard/recepcion" className="hidden md:block">
          <div className="rounded-2xl bg-gradient-to-br from-[#0d9488] to-[#0f766e] p-6 text-white shadow-lg shadow-teal-900/15 transition-transform hover:scale-[1.01] active:scale-[0.99]">
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

        {/* PC: Grid normal de 3 columnas */}
        <div className="hidden md:grid grid-cols-3 gap-3">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{pendingTickets}</p>
              <p className="text-xs text-gray-600">Pendientes</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{inProgressTickets}</p>
              <p className="text-xs text-gray-600">En curso</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{totalTickets}</p>
              <p className="text-xs text-gray-600">Activos en taller</p>
            </CardContent>
          </Card>
        </div>

        {/* PC: Botones de acción */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          <WorkshopReportPdfMenu
            shopName={organizationName}
            currencySymbol={currencySymbol}
            compact
          />
          <Button asChild variant="outline" className="gap-2 border-gray-300">
            <Link href="/dashboard/tickets">
              <Wrench className="h-4 w-4 text-[#0d9488]" />
              Ver tickets
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 border-gray-300">
            <Link href="/dashboard/customers">
              <Users className="h-4 w-4 text-[#0d9488]" />
              Clientes
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 border-gray-300">
            <Link href="/dashboard/pos">Nueva venta</Link>
          </Button>
        </div>

        {/* MÓVIL: Solo 4 elementos - Nuevo Ingreso, Gestión de Tickets, Clientes, Últimos Trabajos */}
        <div className="md:hidden space-y-3">
          {/* 1. NUEVO INGRESO */}
          <Link href="/dashboard/recepcion">
            <div className="rounded-xl bg-gradient-to-br from-[#0d9488] to-[#0f766e] p-4 text-white shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <ClipboardSignature className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Nuevo ingreso</p>
                  <p className="text-xs text-white/80">Cliente y equipo</p>
                </div>
                <ChevronRight className="h-5 w-5 ml-auto opacity-80" />
              </div>
            </div>
          </Link>

          {/* 2. GESTIÓN DE TICKETS */}
          <Link href="/dashboard/tickets">
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                  <Wrench className="h-5 w-5 text-[#0d9488]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Gestión de tickets</p>
                  <p className="text-xs text-gray-500">{totalTickets} activos en taller</p>
                </div>
                <ChevronRight className="h-5 w-5 ml-auto text-gray-400" />
              </div>
            </div>
          </Link>

          {/* 3. CLIENTES */}
          <Link href="/dashboard/customers">
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                  <Users className="h-5 w-5 text-[#0d9488]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Clientes</p>
                  <p className="text-xs text-gray-500">Ver y gestionar clientes</p>
                </div>
                <ChevronRight className="h-5 w-5 ml-auto text-gray-400" />
              </div>
            </div>
          </Link>
        </div>

        {/* Últimos tickets: PC muestra lista completa, móvil lista compacta */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 px-3 md:px-6 py-2 md:py-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm md:text-base font-semibold">Últimos tickets</CardTitle>
              <Link
                href="/dashboard/tickets"
                className="text-[10px] md:text-xs font-medium text-[#0d9488] hover:underline"
              >
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentTickets.length === 0 ? (
              <p className="px-3 md:px-4 py-6 md:py-8 text-center text-xs md:text-sm text-gray-500">
                Aún no hay tickets. Usa «Nuevo ingreso» para el primero.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentTickets.slice(0, 4).map((t) => {
                  const sc = getTicketStatusBadge(t.status);
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/dashboard/tickets/${t.id}`}
                        className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="font-medium text-[#0d9488] text-xs md:text-sm">
                              {t.ticket_number}
                            </span>
                            <span className="truncate text-xs md:text-sm text-gray-900">
                              {t.device_type}
                            </span>
                          </div>
                          <p className="truncate text-[10px] md:text-xs text-gray-500">
                            {t.customers?.name ?? '—'} · {formatDate(t.created_at)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-semibold',
                            sc.cls
                          )}
                        >
                          {sc.label}
                        </span>
                        <span className="hidden md:block shrink-0 text-sm font-medium text-gray-900">
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
