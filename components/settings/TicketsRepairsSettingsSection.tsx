'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  TICKET_LABEL_TEMPLATES,
  TICKET_NUMBER_STYLE_OPTIONS,
  type TicketRepairsSettings,
  type TicketNumberStyle,
} from '@/lib/ticket-repairs-settings';

const AI_DISCLAIMER_STORAGE = 'hide_ticket_repairs_ai_disclaimer';

export type TicketsRepairsStatusOption = {
  id: string;
  name: string;
  is_active: boolean;
};

type SubTab = 'entradas' | 'reparaciones' | 'mas_opciones';

type Props = {
  settings: TicketRepairsSettings;
  patch: (p: Partial<TicketRepairsSettings>) => void;
  statuses: TicketsRepairsStatusOption[];
  onJumpToTicketStatuses: () => void;
  onSave: () => void;
  saving: boolean;
};

function NewBadge() {
  return (
    <span className="bg-[#F5C518] text-[#0D1117] text-[10px] px-1.5 py-0.5 rounded ml-1">Nuevo</span>
  );
}

export function TicketsRepairsSettingsSection({
  settings,
  patch,
  statuses,
  onJumpToTicketStatuses,
  onSave,
  saving,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>('entradas');
  const [hideAiDisclaimer, setHideAiDisclaimer] = useState(false);

  useEffect(() => {
    try {
      setHideAiDisclaimer(localStorage.getItem(AI_DISCLAIMER_STORAGE) === '1');
    } catch {
      setHideAiDisclaimer(false);
    }
  }, []);

  const dismissAiDisclaimer = () => {
    try {
      localStorage.setItem(AI_DISCLAIMER_STORAGE, '1');
    } catch {
      /* ignore */
    }
    setHideAiDisclaimer(true);
  };

  const activeStatuses = statuses.filter((s) => s.is_active);

  return (
    <div className="max-w-4xl mx-auto px-8 py-6">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        <span>Reparaciones</span>
        <ChevronRight className="h-3 w-3" />
        <span>Entradas y reparaciones</span>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entradas y reparaciones</h1>
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-[#F5C518] hover:bg-[#D4A915] text-[#0D1117] gap-2"
        >
          {saving ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          Guardar
        </Button>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mb-6 flex-wrap">
        {(
          [
            { id: 'entradas' as const, label: 'Entradas' },
            { id: 'reparaciones' as const, label: 'Reparaciones' },
            { id: 'mas_opciones' as const, label: 'Más opciones' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={cn(
              'pb-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              subTab === t.id
                ? 'text-[#F5C518] border-[#F5C518]'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'entradas' && (
        <>
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Interfaz y pantalla</h2>
            <div className="space-y-4">
              {(
                [
                  {
                    key: 'show_inventory_section' as const,
                    label: 'Mostrar sección de inventario',
                    desc: 'Muestra detalles de inventario en la ficha del ticket para talleres que gestionan stock.',
                  },
                  {
                    key: 'show_closed_cancelled_in_list' as const,
                    label: 'Mostrar entradas cerradas y canceladas en la página de listado',
                    desc: 'Incluye tickets completados o cancelados en Administrar tickets.',
                  },
                  {
                    key: 'show_empty_tickets_in_list' as const,
                    label: 'Mostrar tickets vacíos en Administrar tickets',
                    desc: 'Incluye tickets sin líneas o servicios en el listado (cuando el módulo lo soporte).',
                  },
                  {
                    key: 'show_parts_column_in_list' as const,
                    label: 'Mostrar campo de piezas en Administrar tickets',
                    desc: 'Muestra la columna de piezas en el listado; desactívala para una vista más compacta.',
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 py-3 border-b border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={(v) => patch({ [item.key]: Boolean(v) })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Identificación del ticket (número de orden)</h2>
            <div className="space-y-3 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">Formato al crear un ticket nuevo</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Afecta solo a altas nuevas. El número sigue un contador interno por taller en la base de datos; no se
                  reinicia al cambiar la dirección web (dominio).
                </p>
              </div>
              <select
                className="w-full max-w-md rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]/30"
                value={settings.ticket_number_style}
                onChange={(e) =>
                  patch({ ticket_number_style: e.target.value as TicketNumberStyle })
                }
              >
                {TICKET_NUMBER_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {
                  TICKET_NUMBER_STYLE_OPTIONS.find((o) => o.id === settings.ticket_number_style)
                    ?.example
                }
              </p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-3 text-xs text-sky-950 space-y-2">
              <p className="font-semibold text-sky-900">¿Por qué a veces el panel se ve vacío?</p>
              <p>
                Los clientes, tickets y facturas están guardados en la base de datos en la nube (Supabase), no en la
                URL del navegador. <strong className="font-medium">Cambiar de dominio</strong> (por ejemplo de{' '}
                <span className="whitespace-nowrap">.vercel.app</span> a <span className="whitespace-nowrap">.com.ar</span>)
                <strong className="font-medium"> no borra esos datos por sí solo.</strong>
              </p>
              <p>
                Si un día no ves órdenes que esperabas: revisá la pestaña de fechas en Administrar tickets (p. ej. «Todo»
                en lugar de «Hoy»), que estés en la cuenta correcta, y en el alojamiento (Vercel) que las variables de
                entorno apunten al <strong className="font-medium">mismo proyecto Supabase</strong> que antes.
              </p>
              <p className="text-sky-800/90">
                Si el primer ticket salió como 0-2248 sin tener órdenes, suele ser un{' '}
                <strong className="font-medium">contador huérfano</strong> en base de datos (pruebas, migraciones o
                entorno compartido), no 2247 tickets reales. Tras aplicar la migración del RPC más reciente, al no haber
                ningún ticket en el taller el contador se alinea y el siguiente alta vuelve a ser 0-0001.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Reglas y permisos</h2>
            <div className="space-y-4">
              {(
                [
                  {
                    key: 'allow_edit_closed_tickets' as const,
                    label: 'Permitir a los empleados actualizar los tickets cerrados',
                    desc: 'Permite modificar el registro después de finalizar la reparación.',
                  },
                  {
                    key: 'allow_delete_ticket_after_invoice' as const,
                    label: 'Permitir la eliminación de tickets después de la generación de la factura',
                    desc: 'Eliminar un ticket puede eliminar también factura y venta asociadas.',
                  },
                  {
                    key: 'allow_edit_ticket_after_invoice' as const,
                    label: 'Permitir la edición de tickets después de la generación de facturas',
                    desc: 'Permite cambios en el ticket después de facturar.',
                  },
                  {
                    key: 'auto_close_ticket_on_final_invoice' as const,
                    label: 'Permitir el cierre automático de tickets después de la creación de la factura',
                    desc: 'Marca el ticket como cerrado al generar la factura final.',
                  },
                  {
                    key: 'all_staff_see_all_tickets' as const,
                    label: 'Permitir que todos los empleados vean los tickets (asignados o no asignados)',
                    desc: 'Visibilidad de todos los tickets para coordinar el equipo.',
                  },
                  {
                    key: 'require_repair_stopwatch_to_close' as const,
                    label: 'Requerir el uso de un cronómetro de tiempo de reparación',
                    desc: 'Exige registrar tiempo con el temporizador antes de cerrar el ticket.',
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 py-3 border-b border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={(v) => patch({ [item.key]: Boolean(v) })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Cronómetro de reparación</h2>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Temporizador de reparación de arranque automático <NewBadge />
                  </p>
                  <p className="text-xs text-gray-500">
                    Inicia el temporizador al pasar el ticket a los estados seleccionados (Ctrl/Cmd + clic).
                  </p>
                </div>
                <div className="flex flex-col gap-1 min-w-[220px] max-w-full">
                  <select
                    multiple
                    size={Math.min(8, Math.max(4, activeStatuses.length || 1))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm min-h-[100px]"
                    value={settings.timer_auto_start_status_ids}
                    onChange={(e) =>
                      patch({
                        timer_auto_start_status_ids: Array.from(
                          e.target.selectedOptions,
                          (o) => o.value
                        ),
                      })
                    }
                  >
                    {activeStatuses.length === 0 ? (
                      <option value="" disabled>
                        Seleccionar estados…
                      </option>
                    ) : (
                      activeStatuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                  <span className="text-[11px] text-gray-400">Seleccionar estados…</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Temporizador de reparación con parada automática <NewBadge />
                  </p>
                  <p className="text-xs text-gray-500">
                    Detiene el temporizador al aplicar estos estados (Ctrl/Cmd + clic).
                  </p>
                </div>
                <div className="flex flex-col gap-1 min-w-[220px] max-w-full">
                  <select
                    multiple
                    size={Math.min(8, Math.max(4, activeStatuses.length || 1))}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm min-h-[100px]"
                    value={settings.timer_auto_stop_status_ids}
                    onChange={(e) =>
                      patch({
                        timer_auto_stop_status_ids: Array.from(
                          e.target.selectedOptions,
                          (o) => o.value
                        ),
                      })
                    }
                  >
                    {activeStatuses.length === 0 ? (
                      <option value="" disabled>
                        Seleccionar estados…
                      </option>
                    ) : (
                      activeStatuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                  <span className="text-[11px] text-gray-400">Seleccionar estados…</span>
                </div>
              </div>
              {statuses.length === 0 ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                  No hay estados personalizados. Creálos en{' '}
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={onJumpToTicketStatuses}
                  >
                    Refacción → Estado del ticket
                  </button>
                  .
                </p>
              ) : null}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Flujo de entradas</h2>
            <div className="space-y-4">
              {(
                [
                  {
                    key: 'allow_estimates_for_entries' as const,
                    label: 'Permitir la creación de presupuestos para entradas',
                    desc: 'Permite generar presupuesto antes de comprometer piezas y mano de obra.',
                  },
                  {
                    key: 'auto_status_on_customer_email_sms' as const,
                    label:
                      'Actualizar automáticamente el estado del ticket cuando el cliente responda por correo o SMS',
                    desc: 'Puede mover el ticket a un estado tipo «Cliente respondido» al recibir mensaje.',
                  },
                  {
                    key: 'copy_notes_to_warranty_ticket' as const,
                    label: 'Copiar notas al ticket de reparación en garantía',
                    desc: 'Transfiere notas del ticket original al de garantía.',
                  },
                  {
                    key: 'clear_device_access_on_ticket_close' as const,
                    label:
                      'Eliminar automáticamente el código de acceso o patrón del dispositivo al cerrar el ticket',
                    desc: 'Borra PIN/patrón almacenados al cerrar (cuando la ficha lo aplique).',
                    nuevo: true,
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 py-3 border-b border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.label}
                      {'nuevo' in item && item.nuevo ? <NewBadge /> : null}
                    </p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={(v) => patch({ [item.key]: Boolean(v) })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Predeterminados</h2>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Establecer la vista predeterminada Administrar tickets
                  </p>
                  <p className="text-xs text-gray-500">Lista o calendario al abrir el módulo.</p>
                </div>
                <select
                  className="h-9 min-w-[180px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={settings.tickets_admin_initial_view}
                  onChange={(e) =>
                    patch({
                      tickets_admin_initial_view: e.target.value as 'list' | 'calendar',
                    })
                  }
                >
                  <option value="list">Listado</option>
                  <option value="calendar">Calendario</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Establecer vista de tickets predeterminada
                  </p>
                  <p className="text-xs text-gray-500">Filtro inicial del listado (hoy, vencidos, activos).</p>
                </div>
                <select
                  className="h-9 min-w-[200px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={settings.tickets_list_initial_filter}
                  onChange={(e) =>
                    patch({
                      tickets_list_initial_filter: e.target.value as
                        | 'today'
                        | 'overdue'
                        | 'all_active',
                    })
                  }
                >
                  <option value="today">Hoy</option>
                  <option value="overdue">Vencidos</option>
                  <option value="all_active">Todos los activos</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Establecer vista de fecha predeterminada
                  </p>
                  <p className="text-xs text-gray-500">Criterio de fecha principal en listados.</p>
                </div>
                <select
                  className="h-9 min-w-[200px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={settings.tickets_default_date_field}
                  onChange={(e) =>
                    patch({
                      tickets_default_date_field: e.target.value as 'created_at' | 'appointment',
                    })
                  }
                >
                  <option value="created_at">Fecha de creación</option>
                  <option value="appointment">Fecha de cita</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Establecer paginación de tickets predeterminada
                  </p>
                  <p className="text-xs text-gray-500">Cuántos tickets por página en el listado.</p>
                </div>
                <select
                  className="h-9 min-w-[120px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={settings.tickets_per_page}
                  onChange={(e) =>
                    patch({
                      tickets_per_page: Number(e.target.value) as 10 | 25 | 50 | 100,
                    })
                  }
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Establecer el orden de clasificación de tickets predeterminado
                  </p>
                  <p className="text-xs text-gray-500">Orden inicial al cargar Administrar tickets.</p>
                </div>
                <select
                  className="h-9 min-w-[240px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={settings.tickets_default_sort}
                  onChange={(e) =>
                    patch({
                      tickets_default_sort: e.target.value as TicketRepairsSettings['tickets_default_sort'],
                    })
                  }
                >
                  <option value="date_status">Por fecha y estado</option>
                  <option value="date_only">Solo por fecha</option>
                  <option value="status_only">Por estado</option>
                  <option value="due_date">Por fecha de vencimiento</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Establecer el estado del ticket personalizado después de la creación de la estimación
                  </p>
                  <p className="text-xs text-gray-500">
                    Al enviar un presupuesto, mover el ticket al estado elegido.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Switch
                    checked={settings.estimate_send_change_status_enabled}
                    onCheckedChange={(v) =>
                      patch({ estimate_send_change_status_enabled: Boolean(v) })
                    }
                  />
                  {settings.estimate_send_change_status_enabled ? (
                    <select
                      className="h-9 w-full min-w-[200px] max-w-[280px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                      value={settings.estimate_send_target_status_id ?? ''}
                      onChange={(e) =>
                        patch({
                          estimate_send_target_status_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Elegir estado…</option>
                      {activeStatuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">
              Plantillas de etiquetas de billetes
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Estilo de la etiqueta para taller / QZ. El contenido impreso puede ajustarse en el módulo de
              impresión.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {TICKET_LABEL_TEMPLATES.map((template) => {
                const selected = settings.label_template === template.id;
                return (
                  <div
                    key={template.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => patch({ label_template: template.id })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        patch({ label_template: template.id });
                      }
                    }}
                    className={cn(
                      'text-left border rounded-lg p-3 transition-shadow cursor-pointer',
                      selected
                        ? 'border-[#F5C518] ring-1 ring-[#F5C518]'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {selected ? (
                          <div className="w-4 h-4 rounded-full bg-[#F5C518] flex items-center justify-center text-[#0D1117] text-[10px] shrink-0">
                            ✓
                          </div>
                        ) : null}
                        <span className="text-sm font-medium text-gray-800 truncate">{template.name}</span>
                      </div>
                      {selected ? (
                        <button
                          type="button"
                          className="text-[10px] text-[#F5C518] shrink-0 hover:underline"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            toast.message('Editor de plantillas de etiqueta: próximamente.');
                          }}
                        >
                          Editar
                        </button>
                      ) : null}
                    </div>
                    {selected && template.preview ? (
                      <div className="bg-white border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-600 h-20 overflow-hidden whitespace-pre-line">
                        {template.preview}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {subTab === 'reparaciones' && (
        <>
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Flujo de trabajo</h2>
            <div className="space-y-4">
              {(
                [
                  {
                    key: 'require_device_check_pre_repair' as const,
                    label: 'Requerir verificación del estado del dispositivo antes de la reparación',
                    desc: 'Checklist funcional antes de reservar o iniciar la reparación.',
                  },
                  {
                    key: 'require_device_check_post_repair' as const,
                    label: 'Requerir verificación del estado del dispositivo posterior a la reparación',
                    desc: 'Comprobación tras completar el trabajo.',
                  },
                  {
                    key: 'require_parts_entry' as const,
                    label: 'Requerir entrada de piezas',
                    desc: 'Exige piezas o inventario antes de avanzar.',
                  },
                  {
                    key: 'require_customer_info' as const,
                    label: 'Requerir información del cliente',
                    desc: 'Datos mínimos del cliente obligatorios.',
                  },
                  {
                    key: 'require_diagnostic_notes' as const,
                    label: 'Requerir notas de diagnóstico',
                    desc: 'Documentación del problema antes de iniciar.',
                  },
                  {
                    key: 'require_imei_or_serial' as const,
                    label: 'Requiere dispositivo IMEI/Serial',
                    desc: 'IMEI o número de serie obligatorio.',
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 py-3 border-b border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={(v) => patch({ [item.key]: Boolean(v) })}
                  />
                </div>
              ))}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">Asignación predeterminada de tickets</p>
                  <p className="text-xs text-gray-500">Criterio para asignar nuevos tickets automáticamente.</p>
                </div>
                <select
                  className="h-9 min-w-[200px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={settings.default_ticket_assignment}
                  onChange={(e) =>
                    patch({
                      default_ticket_assignment: e.target.value as TicketRepairsSettings['default_ticket_assignment'],
                    })
                  }
                >
                  <option value="default">Predeterminado</option>
                  <option value="round_robin">Rotación entre técnicos</option>
                  <option value="creator">Asignar al creador</option>
                  <option value="unassigned">Sin asignar</option>
                </select>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Detallar cada reparación como un elemento de línea separado <NewBadge />
                  </p>
                  <p className="text-xs text-gray-500">
                    Cada reparación como línea propia con precio y descuento individual.
                  </p>
                </div>
                <Switch
                  checked={settings.repair_detail_separate_line_items}
                  onCheckedChange={(v) => patch({ repair_detail_separate_line_items: Boolean(v) })}
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Predeterminados</h2>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Período de garantía predeterminado para reparaciones
                  </p>
                  <p className="text-xs text-gray-500">Cobertura estándar de piezas y mano de obra.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    className="h-9 w-20"
                    value={settings.default_warranty_amount}
                    onChange={(e) =>
                      patch({
                        default_warranty_amount: Math.min(
                          999,
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        ),
                      })
                    }
                  />
                  <select
                    className="h-9 min-w-[120px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={settings.default_warranty_unit}
                    onChange={(e) =>
                      patch({
                        default_warranty_unit: e.target.value as TicketRepairsSettings['default_warranty_unit'],
                      })
                    }
                  >
                    <option value="days">Días</option>
                    <option value="weeks">Semanas</option>
                    <option value="months">Meses</option>
                    <option value="years">Años</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">Criterios de entrada predeterminados</p>
                  <p className="text-xs text-gray-500">Identificador por defecto en nuevos tickets.</p>
                </div>
                <select
                  className="h-9 min-w-[200px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={settings.default_entry_identifier}
                  onChange={(e) =>
                    patch({
                      default_entry_identifier: e.target.value as TicketRepairsSettings['default_entry_identifier'],
                    })
                  }
                >
                  <option value="imei">IMEI</option>
                  <option value="serial">Número de serie</option>
                  <option value="either">IMEI o serial</option>
                  <option value="none">Ninguno</option>
                </select>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Fecha de vencimiento predeterminada basada en el tiempo promedio de reparación
                  </p>
                  <p className="text-xs text-gray-500">
                    Calcula la fecha límite con el tiempo medio de trabajo (cuando el sistema lo calcule).
                  </p>
                </div>
                <Switch
                  checked={settings.due_date_from_avg_repair_time}
                  onCheckedChange={(v) => patch({ due_date_from_avg_repair_time: Boolean(v) })}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Fecha y hora de vencimiento de la reparación predeterminada
                  </p>
                  <p className="text-xs text-gray-500">
                    Los tickets nuevos reciben vencimiento = ahora + este intervalo (si no usa promedio).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={99999}
                    className="h-9 w-24"
                    value={settings.default_due_offset_amount}
                    onChange={(e) =>
                      patch({
                        default_due_offset_amount: Math.min(
                          99999,
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        ),
                      })
                    }
                  />
                  <select
                    className="h-9 min-w-[120px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={settings.default_due_offset_unit}
                    onChange={(e) =>
                      patch({
                        default_due_offset_unit: e.target.value as TicketRepairsSettings['default_due_offset_unit'],
                      })
                    }
                  >
                    <option value="minutes">Minutos</option>
                    <option value="hours">Horas</option>
                    <option value="days">Días</option>
                  </select>
                </div>
              </div>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Calcular el precio del servicio como la suma del precio minorista parcial y los cargos por
                    servicio
                  </p>
                  <p className="text-xs text-gray-500">Total = piezas al por menor + cargos de servicio.</p>
                </div>
                <Switch
                  checked={settings.service_price_retail_plus_charges}
                  onCheckedChange={(v) => patch({ service_price_retail_plus_charges: Boolean(v) })}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {subTab === 'mas_opciones' && (
        <>
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">Importación / exportación</h2>
            <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Incluir precios de grupos de clientes en importación/exportación
                </p>
                <p className="text-xs text-gray-500">
                  Importar o exportar servicios junto con precios por grupo de clientes.
                </p>
              </div>
              <Switch
                checked={settings.include_customer_group_prices_in_import_export}
                onCheckedChange={(v) =>
                  patch({ include_customer_group_prices_in_import_export: Boolean(v) })
                }
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-[#F5C518] mb-4">
              Notas generadas por IA <NewBadge />
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Utilice IA para refinar sus notas para lograr mayor claridad, estructura y profesionalismo sin
              cambiar su significado.
            </p>

            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-sm font-medium text-gray-800">Notas diagnósticas</p>
                  <Switch
                    checked={settings.ai_refine_diagnostic_notes}
                    onCheckedChange={(v) => patch({ ai_refine_diagnostic_notes: Boolean(v) })}
                  />
                </div>
                <Textarea
                  rows={10}
                  className="font-mono text-xs"
                  value={settings.ai_diagnostic_notes_prompt}
                  onChange={(e) => patch({ ai_diagnostic_notes_prompt: e.target.value })}
                  disabled={!settings.ai_refine_diagnostic_notes}
                />
              </div>
              <div className="border-b border-gray-100 pb-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-sm font-medium text-gray-800">Comentarios privados</p>
                  <Switch
                    checked={settings.ai_refine_private_comments}
                    onCheckedChange={(v) => patch({ ai_refine_private_comments: Boolean(v) })}
                  />
                </div>
                <Textarea
                  rows={10}
                  className="font-mono text-xs"
                  value={settings.ai_private_comments_prompt}
                  onChange={(e) => patch({ ai_private_comments_prompt: e.target.value })}
                  disabled={!settings.ai_refine_private_comments}
                />
              </div>
            </div>

            {!hideAiDisclaimer ? (
              <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 space-y-2">
                <p>
                  Usamos OpenAI para reescribir notas. Solo se comparten el contenido de la nota, el nombre del
                  dispositivo y el estado. No se envía información del cliente y las respuestas se utilizan solo
                  en tiempo de ejecución y no se almacenan. OpenAI puede cometer errores, así que revise los
                  resultados cuidadosamente.
                </p>
                <button
                  type="button"
                  className="text-[#F5C518] font-medium hover:underline"
                  onClick={dismissAiDisclaimer}
                >
                  No volver a mostrar este aviso
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
