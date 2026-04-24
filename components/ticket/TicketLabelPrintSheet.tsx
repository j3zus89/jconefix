'use client';

import type { Ref } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { TicketLabelTemplateId } from '@/lib/ticket-repairs-settings';
import type { TicketLabelPrintData } from '@/lib/ticket-label-print-data';
import { repairCaseTerms } from '@/lib/locale';

/** Genera un data-URL SVG del QR y lo inyecta en un <img>. */
function QrCode({ url, size = 64 }: { url: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    void import('qrcode').then((QR) => {
      void QR.toDataURL(url, {
        width: size * 2,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setSrc);
    });
  }, [url, size]);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="QR seguimiento" width={size} height={size} style={{ display: 'block' }} />
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: TicketLabelTemplateId;
  data: TicketLabelPrintData;
  /** AR → «orden»; resto → «ticket». */
  isArgentina?: boolean;
};

function renderBarcode(
  mount: HTMLDivElement | null,
  value: string,
  templateId: TicketLabelTemplateId
) {
  if (!mount) return;
  mount.innerHTML = '';
  const code = value.trim() || '0';

  void import('jsbarcode').then(({ default: JsBarcode }) => {
    if (!mount.isConnected) return;
    mount.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mount.appendChild(svg);
    const common = { margin: 0, format: 'CODE128' as const };
    try {
      if (templateId === 'long_queue') {
        JsBarcode(svg, code, {
          ...common,
          width: 1.1,
          height: 52,
          displayValue: false,
        });
      } else if (templateId === 'compact') {
        JsBarcode(svg, code, {
          ...common,
          width: 1.2,
          height: 28,
          displayValue: true,
          fontSize: 8,
          textMargin: 0,
        });
      } else if (templateId === 'professional') {
        JsBarcode(svg, code, {
          ...common,
          width: 1.15,
          height: 34,
          displayValue: true,
          fontSize: 9,
          textMargin: 2,
        });
      } else {
        JsBarcode(svg, code, {
          ...common,
          width: 1.35,
          height: 38,
          displayValue: true,
          fontSize: 10,
          textMargin: 2,
        });
      }
    } catch {
      try {
        JsBarcode(svg, code, {
          format: 'CODE39',
          width: 1,
          height: 30,
          displayValue: true,
          margin: 0,
        });
      } catch {
        mount.textContent = code;
      }
    }
  });
}

export function TicketLabelPrintSheet({ open, onOpenChange, templateId, data, isArgentina = false }: Props) {
  const barcodeRef = useRef<HTMLDivElement>(null);
  const labelKind = repairCaseTerms(isArgentina).labelPrint.toLowerCase();

  useLayoutEffect(() => {
    if (!open) return;
    renderBarcode(barcodeRef.current, data.ticketNumber, templateId);
  }, [open, templateId, data.ticketNumber]);

  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-black/40 print:bg-white print:static print:inset-auto">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ticket-label-print-mount,
          #ticket-label-print-mount * { visibility: visible !important; }
          #ticket-label-print-mount {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .tl-no-print { display: none !important; }
        }
        .tl-root { font-family: Arial, Helvetica, sans-serif; color: #111; box-sizing: border-box; }
        .tl-root * { box-sizing: border-box; }
      `}</style>

      <div className="tl-no-print flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-gray-800">Vista previa — {labelKind}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" size="sm" className="bg-[#F5C518] hover:bg-[#D4A915] text-[#0D1117]" onClick={handlePrint}>
            Imprimir etiqueta
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 print:overflow-visible print:p-0">
        <div
          id="ticket-label-print-mount"
          className="tl-root mx-auto bg-white p-4 shadow-md print:shadow-none print:p-2"
          style={{ maxWidth: templateId === 'long_queue' ? 420 : templateId === 'compact' ? 360 : 340 }}
        >
          {templateId === 'default' && <LayoutDefault data={data} barcodeRef={barcodeRef} />}
          {templateId === 'professional' && <LayoutProfessional data={data} barcodeRef={barcodeRef} />}
          {templateId === 'long_queue' && <LayoutRatTail data={data} barcodeRef={barcodeRef} />}
          {templateId === 'compact' && <LayoutBarbell data={data} barcodeRef={barcodeRef} />}
        </div>
      </div>
    </div>
  );
}

function LayoutDefault({
  data,
  barcodeRef,
}: {
  data: TicketLabelPrintData;
  barcodeRef: Ref<HTMLDivElement>;
}) {
  return (
    <div
      className="border-2 border-gray-800 rounded-sm p-3"
      style={{ width: '100%', minHeight: 200 }}
    >
      <div className="text-base font-bold leading-tight">{data.deviceLine}</div>
      <div className="mt-1 text-sm text-gray-800 leading-snug">{data.repairLine}</div>
      <div className="mt-2 text-xs text-gray-600">{data.dueLine}</div>
      <div className="mt-3 flex justify-center">
        <div ref={barcodeRef} className="max-w-full overflow-hidden" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold">Repair Ticket # {data.ticketNumber}</div>
          <div className="text-xs text-gray-700">{data.customerName}</div>
        </div>
        {data.trackingUrl && (
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <QrCode url={data.trackingUrl} size={52} />
            <span className="text-[8px] text-gray-400 text-center">Seguimiento</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LayoutProfessional({
  data,
  barcodeRef,
}: {
  data: TicketLabelPrintData;
  barcodeRef: Ref<HTMLDivElement>;
}) {
  return (
    <div className="border-2 border-gray-900 overflow-hidden rounded-sm" style={{ width: '100%' }}>
      <div
        className="flex items-stretch justify-between px-3 py-2 text-white"
        style={{ background: '#0f172a' }}
      >
        <div className="min-w-0 pr-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Taller</div>
          <div className="truncate text-sm font-bold">{data.shopName}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-slate-400">Ticket</div>
          <div className="text-lg font-bold leading-none">{data.ticketNumber}</div>
        </div>
      </div>
      <div className="border-b border-gray-200 px-3 py-2">
        <div className="text-sm font-semibold text-gray-900">{data.deviceLine}</div>
        <div className="text-xs text-gray-700 mt-0.5 leading-snug">/ {data.repairLine}</div>
        <div className="text-[11px] text-gray-500 mt-1">{data.dueLine}</div>
      </div>
      <div className="flex gap-2 px-3 py-2">
        <div className="min-w-0 flex-1 text-[10px] leading-relaxed text-gray-700">
          <div>
            <span className="font-semibold">Tel:</span> {data.customerPhone}
          </div>
          <div className="mt-0.5 break-all">
            <span className="font-semibold">Email:</span> {data.customerEmail}
          </div>
          <div className="mt-0.5">
            <span className="font-semibold">Cliente:</span> {data.customerName}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div ref={barcodeRef} className="max-w-[140px] overflow-hidden" />
          <div
            className="border border-gray-800 px-2 py-0.5 text-center text-[10px] font-bold"
            style={{ minWidth: 52 }}
          >
            CODE {data.codeShort}
          </div>
          {data.trackingUrl && (
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <QrCode url={data.trackingUrl} size={56} />
              <span className="text-[8px] text-gray-400">Estado online</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LayoutRatTail({
  data,
  barcodeRef,
}: {
  data: TicketLabelPrintData;
  barcodeRef: Ref<HTMLDivElement>;
}) {
  return (
    <div className="flex items-center border-2 border-gray-900" style={{ width: '100%', minHeight: 140 }}>
      <div
        className="flex h-full w-[72px] shrink-0 items-center justify-center border-r-2 border-gray-900 bg-white py-1"
        style={{ minHeight: 130 }}
      >
        <div
          className="flex items-center justify-center overflow-visible"
          style={{ transform: 'rotate(-90deg)', width: 120, height: 56 }}
        >
          <div ref={barcodeRef} className="origin-center" />
        </div>
      </div>
      <div className="min-w-0 flex-1 px-3 py-2 text-xs leading-snug">
        <div className="font-bold text-sm">{data.ticketNumber}</div>
        <div className="mt-1 font-medium">{data.customerName}</div>
        <div className="mt-1 text-gray-800">{data.deviceLine}</div>
        <div className="mt-1 text-[11px] text-gray-600">
          {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </div>
        <div className="mt-2 border-t border-gray-200 pt-1 text-[10px]">
          <span className="font-semibold">PRIORIDAD</span> {data.priorityLabel}
        </div>
        {data.trackingUrl && (
          <div className="mt-2 flex items-center gap-1">
            <QrCode url={data.trackingUrl} size={40} />
            <span className="text-[8px] text-gray-400 leading-tight">Estado<br />online</span>
          </div>
        )}
      </div>
      <div
        className="w-24 shrink-0 self-stretch border-l-2 border-dashed border-gray-400 bg-gray-50"
        title="Cola para colgar / enrollar"
      />
    </div>
  );
}

function LayoutBarbell({
  data,
  barcodeRef,
}: {
  data: TicketLabelPrintData;
  barcodeRef: Ref<HTMLDivElement>;
}) {
  return (
    <div className="flex items-stretch justify-center" style={{ width: '100%' }}>
      <div
        className="flex w-[42%] flex-col items-center justify-center rounded-l-lg border-2 border-r-0 border-gray-900 bg-white px-2 py-2"
      >
        <div ref={barcodeRef} className="max-w-full scale-90 overflow-hidden" />
        <div className="mt-1 text-center text-[11px] font-bold">{data.ticketNumber}</div>
        <div className="text-[10px] text-gray-600">
          {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </div>
      </div>
      <div
        className="w-6 shrink-0 border-y-2 border-gray-900 bg-gray-100"
        style={{ marginTop: 24, marginBottom: 24 }}
      />
      <div
        className="flex min-w-0 flex-1 flex-col justify-center rounded-r-lg border-2 border-l-0 border-gray-900 bg-white px-3 py-2 text-xs"
      >
        <div className="text-[10px] font-bold uppercase text-gray-500">{data.shopName}</div>
        <div className="mt-1 font-semibold text-gray-900">{data.customerName}</div>
        <div className="mt-1 leading-snug text-gray-800">{data.deviceLine}</div>
        <div className="mt-2 text-[10px]">
          <span className="font-semibold">PRIORIDAD</span> {data.priorityLabel}
        </div>
        {data.trackingUrl && (
          <div className="mt-2 flex items-center gap-1">
            <QrCode url={data.trackingUrl} size={40} />
            <span className="text-[8px] text-gray-400 leading-tight">Estado<br />online</span>
          </div>
        )}
      </div>
    </div>
  );
}
