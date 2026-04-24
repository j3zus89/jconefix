'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { probeQzTray } from '@/lib/qz-tray-probe';
import { humanizeShopSettingsSchemaError } from '@/lib/supabase-setup-hints';
import { Cpu, CheckCircle2, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const QZ_DOWNLOAD = 'https://qz.io/download/';
const MAX_CERT_BYTES = 120_000;

type QzPatch = {
  qz_tray_port: number;
  qz_tray_using_secure: boolean;
  qz_tray_certificate_pem: string | null;
  qz_tray_certificate_label: string | null;
  qz_tray_direct_invoice_print: boolean;
};

type Props = {
  port: number;
  usingSecure: boolean;
  certificatePem: string | null;
  certificateLabel: string | null;
  directInvoicePrint: boolean;
  onChange: (patch: Partial<QzPatch>) => void;
};

export function QzTraySettingsSection({
  port,
  usingSecure,
  certificatePem,
  certificateLabel,
  directInvoicePrint,
  onChange,
}: Props) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>('checking');
  const [version, setVersion] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pageIsHttps, setPageIsHttps] = useState(false);

  useEffect(() => {
    setPageIsHttps(typeof window !== 'undefined' && window.location.protocol === 'https:');
  }, []);

  const runProbe = useCallback(async () => {
    setStatus('checking');
    setLastError(null);
    setVersion(null);
    const r = await probeQzTray({
      port,
      usingSecure,
      certificatePem,
    });
    if (r.ok) {
      setStatus('ok');
      setVersion(r.version);
    } else {
      setStatus('fail');
      setLastError(r.message);
    }
  }, [port, usingSecure, certificatePem]);

  useEffect(() => {
    setStatus('idle');
    setVersion(null);
    setLastError(null);
  }, [port, usingSecure, certificatePem]);

  useEffect(() => {
    void runProbe();
    // Solo al montar la sección; runProbe usa port/secure/cert del primer render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sesión no válida');
        return;
      }
      const { data: row } = await (supabase as any)
        .from('shop_settings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const payload = {
        qz_tray_port: port,
        qz_tray_using_secure: usingSecure,
        qz_tray_certificate_pem: certificatePem,
        qz_tray_certificate_label: certificateLabel,
        qz_tray_direct_invoice_print: directInvoicePrint,
        updated_at: new Date().toISOString(),
      };

      if (row) {
        const { error } = await (supabase as any)
          .from('shop_settings')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw new Error(humanizeShopSettingsSchemaError(error.message));
      } else {
        const { error } = await (supabase as any).from('shop_settings').insert({
          user_id: user.id,
          shop_name: '',
          ...payload,
        });
        if (error) throw new Error(humanizeShopSettingsSchemaError(error.message));
      }
      toast.success('Configuración QZ guardada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const onCertFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_CERT_BYTES) {
      toast.error('El archivo es demasiado grande (máx. ~120 KB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '').trim();
      if (!text.includes('-----BEGIN')) {
        toast.error('El archivo no parece un PEM válido (falta BEGIN…).');
        return;
      }
      onChange({
        qz_tray_certificate_pem: text,
        qz_tray_certificate_label: file.name,
      });
      toast.success('Certificado cargado (guardá para persistir en la nube)');
    };
    reader.onerror = () => toast.error('No se pudo leer el archivo');
    reader.readAsText(file);
  };

  const clearCert = () => {
    onChange({
      qz_tray_certificate_pem: null,
      qz_tray_certificate_label: null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-8 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Bandeja QZ</h1>
      <p className="text-sm text-gray-500 mb-6">
        Conecta impresoras físicas mediante QZ Tray para impresión directa.
      </p>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
          <h2 className="text-sm font-semibold text-gray-800">Estado de conexión</h2>
        </div>
        <div className="p-4 space-y-4">
          <div
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg border',
              status === 'ok'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-gray-50 border-gray-200'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                status === 'ok' ? 'bg-emerald-200' : 'bg-gray-200'
              )}
            >
              {status === 'ok' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              ) : (
                <Cpu className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {status === 'checking' ? (
                <>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comprobando QZ Tray…
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Asegurate de que QZ Tray esté abierto en este equipo.
                  </p>
                </>
              ) : status === 'ok' ? (
                <>
                  <p className="text-sm font-semibold text-emerald-900">QZ Tray detectado</p>
                  <p className="text-xs text-emerald-800/90 mt-0.5">
                    Versión {version ? version : 'conectada'} · Puerto {port}{' '}
                    {usingSecure ? '(WSS)' : '(WS)'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-800">
                    {status === 'idle' ? 'Conexión sin comprobar' : 'QZ Tray no detectado'}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    {lastError ? (
                      lastError
                    ) : status === 'idle' ? (
                      'Pulsá «Comprobar conexión» tras cambiar puerto, WSS o certificado.'
                    ) : (
                      'Instalá QZ Tray, dejalo en ejecución y volvé a comprobar.'
                    )}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0 items-stretch sm:items-end">
              <Button
                type="button"
                size="sm"
                className="text-sm bg-[#0f766e] text-white hover:bg-[#115e59]"
                onClick={() => void runProbe()}
                disabled={status === 'checking'}
              >
                {status === 'checking' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Comprobar conexión'
                )}
              </Button>
              <Button size="sm" className="text-sm bg-[#0f766e] text-white hover:bg-[#115e59]" asChild>
                <a href={QZ_DOWNLOAD} target="_blank" rel="noopener noreferrer">
                  Descargar QZ Tray
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5 inline" />
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qz-port">Puerto de conexión</Label>
              <Input
                id="qz-port"
                className="h-9"
                type="number"
                min={1}
                max={65535}
                value={Number.isFinite(port) ? port : 8182}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  onChange({ qz_tray_port: Number.isFinite(n) ? n : 8182 });
                }}
              />
              <p className="text-[11px] text-gray-500">
                Por defecto QZ usa <strong>8182</strong> (WS) en páginas HTTP y <strong>8181</strong>{' '}
                (WSS) con HTTPS. Si «Comprobar» falla con tu puerto, se reintenta solo con los puertos
                estándar de QZ.
              </p>
            </div>
            <div className="space-y-2 flex flex-col justify-end pb-1">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                <div>
                  <Label htmlFor="qz-secure" className="text-sm font-medium cursor-pointer">
                    Conexión segura (WSS)
                  </Label>
                  <p className="text-[11px] text-gray-500">Activá si el panel se sirve por HTTPS</p>
                </div>
                <Switch
                  id="qz-secure"
                  checked={usingSecure}
                  onCheckedChange={(v) => onChange({ qz_tray_using_secure: Boolean(v) })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
            <div>
              <Label htmlFor="qz-inv-print" className="text-sm font-medium cursor-pointer text-emerald-950">
                Imprimir facturas directamente con QZ
              </Label>
              <p className="text-[11px] text-emerald-900/80 leading-snug">
                Al crear una factura, se envía el documento a la impresora predeterminada del equipo. Si
                falla, se abre la vista en el navegador.
              </p>
            </div>
            <Switch
              id="qz-inv-print"
              checked={directInvoicePrint}
              onCheckedChange={(v) => onChange({ qz_tray_direct_invoice_print: Boolean(v) })}
            />
          </div>

          {pageIsHttps && !usingSecure && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
              Estás en <strong>HTTPS</strong>: muchos navegadores bloquean <code className="bg-amber-100 px-1 rounded">ws://</code>{' '}
              hacia localhost. Activá <strong>Conexión segura (WSS)</strong> y probá el puerto{' '}
              <strong>8181</strong>.
            </div>
          )}

          <div className="space-y-2">
            <Label>Certificado de confianza (opcional)</Label>
            <div className="flex gap-2">
              <Input
                className="h-9 flex-1"
                readOnly
                placeholder="Sin certificado"
                value={certificateLabel || (certificatePem ? 'Certificado en memoria' : '')}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pem,.crt,.txt"
                className="hidden"
                onChange={onCertFile}
              />
              <Button
                type="button"
                className="h-9 text-xs shrink-0 bg-[#0f766e] text-white hover:bg-[#115e59]"
                onClick={() => fileInputRef.current?.click()}
              >
                Subir
              </Button>
              {(certificatePem || certificateLabel) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-destructive"
                  onClick={clearCert}
                  title="Quitar certificado"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              PEM público del sitio para que QZ confíe en tu dominio. La firma digital de las
              peticiones (sin diálogo) requiere un endpoint de firma en el servidor; esta pantalla
              cubre conexión, puerto y certificado guardados por usuario.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              className="bg-[#F5C518] hover:bg-[#D4A915] text-[#0D1117]"
              onClick={() => void persist()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar configuración
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
