'use client';

/**
 * CheckTracker — Interfaz pública de seguimiento para el cliente.
 *
 * ✅ Lo que muestra: estado público amigable, barra de progreso animada,
 *    dispositivo, número de ticket, nombre del taller.
 * ❌ Lo que NUNCA muestra: notas internas, nombre del técnico,
 *    historial de cambios con horas.
 */

import type { PublicTicket } from './page';
import { repairCaseTerms } from '@/lib/locale';

/* ─── Mapa de estados internos → estado público ──────────────────────────
   REGLA: si el estado interno no está en el mapa, cae en "En proceso técnico"
   para que NINGÚN estado inesperado revele información interna.
─────────────────────────────────────────────────────────────────────────── */
type PublicStep = {
  key: string;
  emoji: string;
  label: string;
  sublabel: string;
  /** Número de paso en la barra (1-based) */
  step: number;
  /** El proceso terminó (positivo o negativo) */
  terminal?: boolean;
  /** Terminal negativo */
  cancelled?: boolean;
};

const STEPS: PublicStep[] = [
  {
    key: 'received',
    emoji: '✅',
    label: 'Recibido',
    sublabel: 'Tu equipo está registrado en nuestro sistema.',
    step: 1,
  },
  {
    key: 'diagnosis',
    emoji: '🔍',
    label: 'En Diagnóstico',
    sublabel: 'Nuestros técnicos están analizando la falla.',
    step: 2,
  },
  {
    key: 'parts',
    emoji: '📦',
    label: 'Repuestos en camino',
    sublabel: 'Piezas solicitadas. Tu equipo está en cola de prioridad.',
    step: 3,
  },
  {
    key: 'repair',
    emoji: '🛠️',
    label: 'En Reparación',
    sublabel: 'Estamos trabajando en la solución final.',
    step: 4,
  },
  {
    key: 'testing',
    emoji: '🧪',
    label: 'Pruebas Finales',
    sublabel: 'Verificando que todo funcione al 100 %.',
    step: 5,
  },
  {
    key: 'ready',
    emoji: '🎉',
    label: '¡Listo para Retirar!',
    sublabel: 'Ya puedes pasar por el local. ¡Te esperamos!',
    step: 6,
    terminal: true,
  },
];

const STEP_CANCELLED: PublicStep = {
  key: 'cancelled',
  emoji: '❌',
  label: 'Reparación Finalizada',
  sublabel: 'Comunícate con el taller para más información.',
  step: 0,
  terminal: true,
  cancelled: true,
};

/* Mapa: estado interno → clave de PublicStep */
const STATUS_MAP: Record<string, string> = {
  // Recibido
  pending:               'received',
  entrada:               'received',
  draft:                 'received',
  received:              'received',

  // Diagnóstico
  diagnostic:            'diagnosis',
  diagnostico:           'diagnosis',
  en_estudio:            'diagnosis',
  presupuesto:           'diagnosis',
  in_diagnosis:          'diagnosis',

  // Esperando repuesto / pedido
  waiting_parts:         'parts',
  pendiente_pieza:       'parts',
  pendiente_pedido:      'parts',
  esperando_repuesto:    'parts',

  // En reparación / proceso
  in_progress:           'repair',
  en_proceso:            'repair',
  prioridad:             'repair',
  envios:                'repair',
  traslado:              'repair',
  externa:               'repair',
  pendiente_cliente:     'repair',
  no_reparado_open:      'repair',

  // Testeo / calidad
  testing:               'testing',
  testeo:                'testing',
  quality_check:         'testing',

  // Listo / completado
  completed:             'ready',
  reparado:              'ready',
  repaired_collected:    'ready',
  listo:                 'ready',
  ready:                 'ready',

  // Cancelado / no reparado
  cancelled:             'cancelled',
  no_reparado:           'cancelled',
  no_repair:             'cancelled',
};

function resolvePublicStep(internalStatus: string): PublicStep {
  const key = STATUS_MAP[internalStatus.toLowerCase()] ?? 'repair';
  if (key === 'cancelled') return STEP_CANCELLED;
  return STEPS.find((s) => s.key === key) ?? STEPS[3];
}

/* ─── Componente principal ───────────────────────────────────────────────── */
export function CheckTracker({ ticket }: { ticket: PublicTicket }) {
  const rc = repairCaseTerms(ticket.region_is_argentina);
  const current = resolvePublicStep(ticket.status);
  const totalSteps = STEPS.length;
  const progressPct = current.cancelled
    ? 100
    : Math.round(((current.step - 1) / (totalSteps - 1)) * 100);

  const deviceLabel = [ticket.device_brand, ticket.device_model, ticket.device_type]
    .filter(Boolean)
    .join(' ');

  const shopLabel = ticket.shop_name ?? 'JC ONE FIX';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col items-center px-4 py-10 font-sans">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="w-full max-w-md text-center mb-8">
        {ticket.shop_logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={ticket.shop_logo_url}
            alt={shopLabel}
            className="h-14 w-auto mx-auto mb-3 rounded-xl object-contain"
          />
        ) : (
          <div className="text-3xl font-black tracking-tight text-[#F5C518] mb-3">
            {shopLabel}
          </div>
        )}
        <p className="text-sm text-gray-400">Panel de seguimiento</p>
      </header>

      {/* ── Tarjeta principal ─────────────────────────────────────────────── */}
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl overflow-hidden">

          {/* Banda de color según estado */}
          <div
            className="h-1.5 w-full"
            style={{
              background: current.cancelled
                ? '#ef4444'
                : current.key === 'ready'
                ? '#22c55e'
                : 'linear-gradient(90deg, #F5C518, #D4A915)',
            }}
          />

          {/* Info del ticket */}
          <div className="p-6 space-y-1 border-b border-white/10">
            <p className="text-xs text-gray-400 uppercase tracking-widest">{rc.nounCap}</p>
            <p className="text-2xl font-black text-[#F5C518] tracking-wide">
              {ticket.ticket_number}
            </p>
            {deviceLabel && (
              <p className="text-sm text-gray-300 mt-0.5">{deviceLabel}</p>
            )}
            <p className="text-xs text-gray-500">Ingresado el {ticket.created_date}</p>
          </div>

          {/* Estado actual */}
          <div className="px-6 py-5 text-center border-b border-white/10">
            <div
              className="text-5xl mb-3 select-none"
              aria-hidden="true"
              style={
                current.key === 'ready'
                  ? { animation: 'pulse 1.8s ease-in-out infinite' }
                  : current.terminal
                  ? undefined
                  : { animation: 'bounce 2s ease-in-out infinite' }
              }
            >
              {current.emoji}
            </div>
            <h1 className="text-xl font-bold text-white">{current.label}</h1>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {current.sublabel}
            </p>
          </div>

          {/* ── Barra de progreso ─────────────────────────────────────────── */}
          {!current.cancelled && (
            <div className="px-6 py-5 border-b border-white/10">
              {/* Barra */}
              <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background:
                      current.key === 'ready'
                        ? '#22c55e'
                        : 'linear-gradient(90deg, #F5C518, #D4A915)',
                  }}
                />
                {/* Efecto "vivo" pulsante */}
                {current.key !== 'ready' && (
                  <div
                    className="absolute inset-y-0 rounded-full opacity-60"
                    style={{
                      left: `${Math.max(progressPct - 8, 0)}%`,
                      width: '8%',
                      background: 'rgba(163,230,53,0.6)',
                      animation: 'pulse 1.4s ease-in-out infinite',
                    }}
                  />
                )}
              </div>

              {/* Paso N de M */}
              <p className="text-right text-[11px] text-gray-500 mt-1">
                Paso {current.step} de {totalSteps}
              </p>

              {/* ── Línea de vida: íconos de pasos ─────────────────────── */}
              <div className="flex justify-between mt-4 relative">
                {/* Línea de conexión */}
                <div className="absolute top-3.5 left-[7%] right-[7%] h-px bg-white/10" />
                {STEPS.map((s) => {
                  const done = current.step >= s.step;
                  const active = current.step === s.step;
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-1 relative z-10 w-1/6">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-[13px] transition-all duration-500"
                        style={{
                          background: active
                            ? 'linear-gradient(135deg,#F5C518,#D4A915)'
                            : done
                            ? 'rgba(245,197,24,0.25)'
                            : 'rgba(255,255,255,0.07)',
                          border: active
                            ? '2px solid #F5C518'
                            : done
                            ? '1.5px solid rgba(245,197,24,0.4)'
                            : '1.5px solid rgba(255,255,255,0.1)',
                          boxShadow: active ? '0 0 12px #F5C51888' : undefined,
                          animation: active ? 'pulse 1.6s ease-in-out infinite' : undefined,
                        }}
                        title={s.label}
                        aria-label={s.label}
                      >
                        <span role="img" aria-label={s.label} style={{ fontSize: 13 }}>
                          {s.emoji}
                        </span>
                      </div>
                      <span
                        className="text-[9px] text-center leading-tight max-w-[40px]"
                        style={{ color: active ? '#F5C518' : done ? '#F5C518' : '#6b7280' }}
                      >
                        {s.label.replace('¡Listo para Retirar!', 'Listo')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mensaje fijo tranquilizador */}
          {!current.terminal && (
            <div className="px-6 py-4 bg-white/3">
              <p className="text-xs text-center text-gray-400 italic leading-relaxed">
                🔧 Estamos trabajando para entregarte el equipo lo antes posible.
                <br />
                Si tienes dudas, contacta directamente con el taller.
              </p>
            </div>
          )}

          {current.key === 'ready' && (
            <div className="px-6 py-5 bg-green-950/40 text-center">
              <p className="text-sm text-green-300 font-medium">
                🎉 ¡Tu equipo está listo! Pasa a retirarlo cuando quieras.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-600 mt-6">
          {shopLabel} · Sistema de seguimiento JC ONE FIX
        </p>
      </main>

      {/* Keyframes para animaciones inline */}
      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
