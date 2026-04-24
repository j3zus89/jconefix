'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, CircleDashed, FileCheck, Loader2, Radio, Shield, UploadCloud, XCircle } from 'lucide-react';

type ArcaMeta = {
  hasCredentials: boolean;
  production: boolean;
  puntoVenta: number | null;
  updatedAt: string | null;
  afipSdkConfigured: boolean;
  masterKeyConfigured: boolean;
};

type CertInfo = {
  cuitDetected: string | null;
  expiresAt: string | null;
  subjectCN: string | null;
};

type TestStep = {
  name: string;
  status: 'ok' | 'fail' | 'skip';
  detail: string;
};

type TestResult = {
  ok: boolean;
  isMock: boolean;
  environment?: string;
  steps: TestStep[];
  salesPoints: number[];
  lastVoucherNumber?: number;
  puntoVentaMismatch?: boolean;
  message: string;
} | null;

type InvoiceTestResult = {
  ok: boolean;
  isMock?: boolean;
  cae?: string;
  voucherNumber?: number;
  message: string;
} | null;

export function ArcaIntegrationSettings({ shopCuit }: { shopCuit?: string }) {
  const supabase = createClient();
  const certRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const p12Ref = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<ArcaMeta | null>(null);
  /** Un solo archivo .p12 suele ser lo más simple para el taller; .crt+.key queda como alternativa. */
  const [uploadMode, setUploadMode] = useState<'pem' | 'p12'>('p12');
  const [p12Password, setP12Password] = useState('');
  const [saving, setSaving] = useState(false);
  const [production, setProduction] = useState(false);
  const [togglingEnv, setTogglingEnv] = useState(false);
  const [puntoVentaDraft, setPuntoVentaDraft] = useState('');
  const [savingPv, setSavingPv] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [testingInvoice, setTestingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<InvoiceTestResult>(null);
  const [certInfo, setCertInfo] = useState<CertInfo | null>(null);
  const [allowInvoiceWithoutAfip, setAllowInvoiceWithoutAfip] = useState(false);
  const [savingAllowInternal, setSavingAllowInternal] = useState(false);

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const t = session?.access_token;
    if (!t) return null;
    return { Authorization: `Bearer ${t}` } as Record<string, string>;
  }, [supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = await authHeader();
      if (!h) {
        setMeta(null);
        return;
      }
      const res = await fetch('/api/dashboard/arca-settings', { headers: h });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || res.statusText);
      }
      const j = (await res.json()) as ArcaMeta;
      setMeta(j);
      setProduction(j.production);
      setPuntoVentaDraft(j.puntoVenta != null ? String(j.puntoVenta) : '');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar ARCA');
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('shop_settings')
        .select('ar_allow_invoice_without_afip')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data) {
        setAllowInvoiceWithoutAfip(Boolean((data as { ar_allow_invoice_without_afip?: boolean }).ar_allow_invoice_without_afip));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const toggleAllowInvoiceWithoutAfip = async (checked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Sesión expirada');
      return;
    }
    setSavingAllowInternal(true);
    try {
      const { error } = await supabase
        .from('shop_settings')
        .update({ ar_allow_invoice_without_afip: checked })
        .eq('user_id', user.id);
      if (error) throw error;
      setAllowInvoiceWithoutAfip(checked);
      toast.success(
        checked
          ? 'Activado: al cobrar se puede elegir comprobante interno sin CAE.'
          : 'Desactivado: si ARCA está configurado, se vuelve a pedir CAE al cobrar.'
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la preferencia');
    } finally {
      setSavingAllowInternal(false);
    }
  };

  const handleUpload = async () => {
    const h = await authHeader();
    if (!h) {
      toast.error('Sesión expirada');
      return;
    }
    const fd = new FormData();
    fd.set('mode', uploadMode);
    if (uploadMode === 'pem') {
      const cf = certRef.current?.files?.[0];
      const kf = keyRef.current?.files?.[0];
      if (!cf || !kf) {
        toast.error('Seleccioná archivo .crt/.pem y .key');
        return;
      }
      fd.set('cert', cf);
      fd.set('key', kf);
    } else {
      const f = p12Ref.current?.files?.[0];
      if (!f) {
        toast.error('Seleccioná el archivo .p12 / .pfx');
        return;
      }
      fd.set('p12', f);
      fd.set('p12Password', p12Password);
    }
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/arca-credentials', { method: 'POST', headers: h, body: fd });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        cuitDetected?: string | null;
        expiresAt?: string | null;
        subjectCN?: string | null;
      };
      if (!res.ok) throw new Error(j.error || 'Error al guardar');
      if (j.cuitDetected || j.expiresAt) {
        setCertInfo({ cuitDetected: j.cuitDetected ?? null, expiresAt: j.expiresAt ?? null, subjectCN: j.subjectCN ?? null });
      }
      toast.success('Credenciales ARCA guardadas de forma cifrada');
      certRef.current && (certRef.current.value = '');
      keyRef.current && (keyRef.current.value = '');
      p12Ref.current && (p12Ref.current.value = '');
      setP12Password('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePuntoVenta = async () => {
    const h = await authHeader();
    if (!h) {
      toast.error('Sesión expirada');
      return;
    }
    const n = parseInt(puntoVentaDraft.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 9999) {
      toast.error('Punto de venta: número entero entre 1 y 9999 (ej. 1 para el típico 0001).');
      return;
    }
    setSavingPv(true);
    try {
      const res = await fetch('/api/dashboard/arca-settings', {
        method: 'PATCH',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ puntoVenta: n }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || 'No se pudo guardar');
      toast.success('Punto de venta guardado');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingPv(false);
    }
  };

  const handleTestAfipConnection = async () => {
    const h = await authHeader();
    if (!h) { toast.error('Sesión expirada'); return; }
    setTestingConnection(true);
    setTestResult(null);
    setInvoiceResult(null);
    try {
      const res = await fetch('/api/dashboard/arca-test-connection', { method: 'POST', headers: h });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        isMock?: boolean;
        environment?: string;
        steps?: TestStep[];
        salesPoints?: number[];
        lastVoucherNumber?: number;
        puntoVentaMismatch?: boolean;
        message?: string;
        error?: string;
      };
      const result: TestResult = {
        ok: j.ok ?? false,
        isMock: j.isMock ?? false,
        environment: j.environment,
        steps: j.steps ?? [],
        salesPoints: j.salesPoints ?? [],
        lastVoucherNumber: j.lastVoucherNumber,
        puntoVentaMismatch: j.puntoVentaMismatch,
        message: j.message ?? j.error ?? 'Sin respuesta del servidor',
      };
      setTestResult(result);
    } catch (e) {
      setTestResult({
        ok: false,
        isMock: false,
        steps: [{ name: 'Conexión', status: 'fail', detail: e instanceof Error ? e.message : 'Error de red al contactar el servidor.' }],
        salesPoints: [],
        message: e instanceof Error ? e.message : 'Error de red',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestInvoice = async () => {
    const h = await authHeader();
    if (!h) { toast.error('Sesión expirada'); return; }
    setTestingInvoice(true);
    setInvoiceResult(null);
    try {
      const res = await fetch('/api/dashboard/arca-test-invoice', { method: 'POST', headers: h });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        isMock?: boolean;
        cae?: string;
        voucherNumber?: number;
        message?: string;
        error?: string;
      };
      setInvoiceResult({
        ok: j.ok ?? false,
        isMock: j.isMock,
        cae: j.cae,
        voucherNumber: j.voucherNumber,
        message: j.message ?? j.error ?? 'Sin respuesta del servidor',
      });
    } catch (e) {
      setInvoiceResult({
        ok: false,
        message: e instanceof Error ? e.message : 'Error de red',
      });
    } finally {
      setTestingInvoice(false);
    }
  };

  const handleProductionToggle = async (next: boolean) => {
    const h = await authHeader();
    if (!h) {
      toast.error('Sesión expirada');
      return;
    }
    setTogglingEnv(true);
    try {
      const res = await fetch('/api/dashboard/arca-settings', {
        method: 'PATCH',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ production: next }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || 'No se pudo cambiar el modo');
      setProduction(next);
      toast.success(next ? 'Modo producción ARCA activado' : 'Modo homologación activado');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setTogglingEnv(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando integración ARCA…
      </div>
    );
  }

  if (!meta) return null;

  const serverReady = meta.masterKeyConfigured && meta.afipSdkConfigured;
  const formDisabled = !serverReady;

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 space-y-5">
      {!serverReady ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 leading-relaxed"
          role="status"
        >
          <p className="font-bold text-amber-950">Solo para quien instala u hospeda JC ONE FIX (no es un fallo del taller)</p>
          <p className="mt-2">
            La facturación con ARCA/AFIP necesita que el <strong>servidor</strong> tenga listas dos cosas: cifrar certificados de
            cada cliente y conectar con los servicios de AFIP. Eso se hace una sola vez en el hosting (Vercel, VPS, etc.), no
            desde esta pantalla.
          </p>
          <p className="mt-2 font-mono text-[11px] text-amber-900/95 break-all">
            ARCA_CREDENTIALS_MASTER_KEY · AFIP_SDK_ACCESS_TOKEN
          </p>
          <p className="mt-2 text-amber-900/90">
            Hasta que eso esté configurado, <strong>ningún</strong> taller podrá guardar el certificado ni obtener CAE, aunque
            el monotributista haga bien los pasos. El dueño del software o soporte técnico debe completar esa parte.
          </p>
          <details className="mt-3 border-t border-amber-200/80 pt-2">
            <summary className="cursor-pointer font-semibold text-amber-950 hover:underline">
              Ya las cargué en Vercel (u otro hosting) y sigo viendo este aviso
            </summary>
            <ul className="mt-2 list-disc pl-4 space-y-1.5 text-amber-900/95">
              <li>
                <strong>Redeploy:</strong> en Vercel, al crear o cambiar variables suele hacer falta un deployment nuevo (
                <em>Deployments → … → Redeploy</em>) para que el runtime las vea.
              </li>
              <li>
                <strong>Misma app:</strong> comprobá que la URL del panel coincide con el proyecto donde están los secretos (no
                otro preview ni otro equipo).
              </li>
              <li>
                <strong>Localhost:</strong> el panel de Vercel no aplica a <code className="rounded bg-amber-100/80 px-1">npm run dev</code>.
                Copiá los mismos nombres (sin espacios) en{' '}
                <code className="rounded bg-amber-100/80 px-1">.env.local</code> y reiniciá el servidor de desarrollo.
              </li>
              <li>
                Los nombres deben ser exactos:{' '}
                <code className="rounded bg-amber-100/80 px-1">ARCA_CREDENTIALS_MASTER_KEY</code> y{' '}
                <code className="rounded bg-amber-100/80 px-1">AFIP_SDK_ACCESS_TOKEN</code> (sin comillas en el valor).
              </li>
            </ul>
          </details>
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-teal-950">Conectar tu taller con AFIP (factura electrónica)</h3>
          <p className="text-xs text-teal-900/85 mt-1 leading-relaxed">
            Pensado para <strong>monotributo</strong> y otros regímenes: con el mismo CUIT que usás en AFIP, subís el
            certificado y el punto de venta. Al <strong>cobrar</strong>, el panel puede pedir el <strong>CAE</strong> solo.
          </p>
          <details className="mt-2 text-[11px] text-teal-900/90">
            <summary className="cursor-pointer font-medium text-teal-800 hover:underline">
              Antes de empezar: CUIT, condición IVA y ayuda paso a paso
            </summary>
            <ol className="mt-2 list-decimal pl-4 space-y-1.5 rounded-md border border-teal-100 bg-white/60 px-3 py-2">
              <li>
                En <strong>Configuración → General</strong>: CUIT del taller y condición frente al IVA (monotributo, etc.).
              </li>
              <li>
                En <strong>AFIP</strong> con tu CUIT: factura electrónica + certificado para el web service (si no lo tenés,
                tu contador o los tutoriales de AFIP suelen ayudar).
              </li>
              <li>
                <strong>Abajo:</strong> primero guardá el <strong>certificado</strong>; después el <strong>punto de venta</strong>{' '}
                (el mismo número que en AFIP, ej. <strong>1</strong> si ves 0001).
              </li>
              <li>
                En <strong>Avanzado</strong> podés elegir pruebas (homologación) o comprobantes reales (producción).
              </li>
              <li>
                En <strong>Clientes</strong> cargá DNI/CUIT e IVA del cliente; al cobrar un ticket esperá a que termine el CAE.
              </li>
            </ol>
          </details>
        </div>
      </div>

      <div className="rounded-lg border border-teal-200 bg-white/90 px-4 py-3 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-gray-900">Permitir cobrar sin AFIP (opcional)</p>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Si lo activás, en el <strong>cobro de tickets</strong> aparece la opción de registrar un comprobante interno{' '}
            <strong>sin solicitar CAE</strong>, aunque tengas certificado ARCA. Seguí usando AFIP cuando corresponda; esto solo
            habilita la excepción operativa que elijas en cada cobro.
          </p>
        </div>
        <Switch
          checked={allowInvoiceWithoutAfip}
          disabled={savingAllowInternal}
          onCheckedChange={(v) => void toggleAllowInvoiceWithoutAfip(v)}
          className="shrink-0 data-[state=checked]:bg-[#F5C518]"
        />
      </div>

      <div className="space-y-3 rounded-lg border border-teal-100 bg-white/90 px-4 py-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              1
            </span>{' '}
            Certificado de AFIP
          </p>
          <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
            Lo generás o descargás desde el sitio de AFIP. <strong>Lo más simple suele ser un solo archivo</strong>{' '}
            <code className="rounded bg-slate-100 px-1">.p12</code> o <code className="rounded bg-slate-100 px-1">.pfx</code>{' '}
            y la contraseña que definiste al crearlo. Si AFIP te dio dos archivos separados, usá la opción .crt + .key.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={uploadMode === 'p12' ? 'default' : 'outline'}
            disabled={formDisabled}
            onClick={() => setUploadMode('p12')}
          >
            Un archivo (.p12 / .pfx) — recomendado
          </Button>
          <Button
            type="button"
            size="sm"
            variant={uploadMode === 'pem' ? 'default' : 'outline'}
            disabled={formDisabled}
            onClick={() => setUploadMode('pem')}
          >
            Dos archivos (.crt + .key)
          </Button>
        </div>

        {uploadMode === 'pem' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Certificado (.crt / .pem)</Label>
              <input
                ref={certRef}
                type="file"
                accept=".crt,.pem,.txt"
                disabled={formDisabled}
                className="mt-1 block w-full text-xs disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label className="text-xs">Clave privada (.key)</Label>
              <input
                ref={keyRef}
                type="file"
                accept=".key,.pem,.txt"
                disabled={formDisabled}
                className="mt-1 block w-full text-xs disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Tu archivo .p12 o .pfx</Label>
              <input
                ref={p12Ref}
                type="file"
                accept=".p12,.pfx"
                disabled={formDisabled}
                className="mt-1 block w-full text-xs disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label className="text-xs">Contraseña de ese archivo (la que definiste en AFIP)</Label>
              <input
                type="password"
                disabled={formDisabled}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                value={p12Password}
                onChange={(e) => setP12Password(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        <Button type="button" disabled={formDisabled || saving} onClick={() => void handleUpload()} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          Guardar certificado
        </Button>

        {certInfo && (() => {
          const now = new Date();
          const expires = certInfo.expiresAt ? new Date(certInfo.expiresAt) : null;
          const isExpired = expires ? expires < now : false;
          const shopCuitDigits = (shopCuit || '').replace(/\D/g, '');
          const certCuitDigits = (certInfo.cuitDetected || '').replace(/\D/g, '');
          const cuitMismatch =
            shopCuitDigits.length === 11 &&
            certCuitDigits.length === 11 &&
            shopCuitDigits !== certCuitDigits;

          return (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs space-y-1.5">
              <p className="font-semibold text-slate-700 mb-1">Información del certificado detectada</p>
              {certInfo.subjectCN && (
                <p className="text-slate-600">Titular: <span className="font-mono">{certInfo.subjectCN}</span></p>
              )}
              {certInfo.cuitDetected ? (
                <div className="flex items-center gap-1.5">
                  {cuitMismatch ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  )}
                  <span>
                    CUIT en certificado: <span className="font-mono">{certInfo.cuitDetected}</span>
                    {cuitMismatch && (
                      <span className="ml-1 text-amber-700 font-semibold">
                        ≠ CUIT del taller ({shopCuit}). AFIP rechazará si no coinciden.
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <p className="text-slate-500 italic">No se detectó CUIT en el certificado (campo no estándar).</p>
              )}
              {expires ? (
                <div className="flex items-center gap-1.5">
                  {isExpired ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  )}
                  <span className={isExpired ? 'text-red-700 font-semibold' : 'text-slate-600'}>
                    Vence: {expires.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {isExpired && ' — VENCIDO: renovalo en AFIP antes de seguir.'}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })()}
      </div>

      <div className="rounded-lg border border-teal-100 bg-white/90 px-4 py-4 shadow-sm space-y-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              2
            </span>{' '}
            Punto de venta
          </p>
          <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
            El mismo número que diste de alta en AFIP para facturación electrónica (si en AFIP ves <strong>0001</strong>, acá
            poné <strong>1</strong>). Se habilita después de guardar el certificado.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            type="number"
            min={1}
            max={9999}
            className="h-9 w-28 text-sm"
            placeholder="ej. 1"
            value={puntoVentaDraft}
            onChange={(e) => setPuntoVentaDraft(e.target.value)}
            disabled={formDisabled || !meta.hasCredentials}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={formDisabled || !meta.hasCredentials || savingPv}
            onClick={() => void handleSavePuntoVenta()}
          >
            {savingPv ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar punto de venta
          </Button>
        </div>
        <div className="pt-3 border-t border-teal-100/80 mt-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2 border-teal-300 text-teal-900 hover:bg-teal-50"
              disabled={formDisabled || !meta.hasCredentials || testingConnection}
              onClick={() => void handleTestAfipConnection()}
            >
              {testingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Probar conexión AFIP
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2 border-blue-300 text-blue-800 hover:bg-blue-50"
              disabled={formDisabled || !meta.hasCredentials || testingInvoice || production}
              onClick={() => void handleTestInvoice()}
              title={production ? 'Solo disponible en homologación (pruebas)' : 'Emite una Factura C de $1 en homologación AFIP'}
            >
              {testingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
              Factura de prueba
            </Button>
          </div>

          {testResult && (
            <div className={`rounded-lg border px-4 py-3 text-xs space-y-2 ${testResult.ok ? 'border-teal-200 bg-teal-50/60' : 'border-red-200 bg-red-50/50'}`}>
              <div className="flex items-center gap-2 mb-1">
                {testResult.ok
                  ? <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <span className="font-semibold text-slate-800">
                  {testResult.ok ? 'Conexión verificada' : 'Error en la conexión'}
                  {testResult.isMock && <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">SIMULACIÓN</span>}
                  {testResult.environment && !testResult.isMock && (
                    <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded ${testResult.environment === 'produccion' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {testResult.environment === 'produccion' ? 'Producción' : 'Homologación'}
                    </span>
                  )}
                </span>
              </div>
              {testResult.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 pl-1">
                  {step.status === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />}
                  {step.status === 'fail' && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                  {step.status === 'skip' && <CircleDashed className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />}
                  <div>
                    <span className="font-medium text-slate-700">{step.name}: </span>
                    <span className={step.status === 'fail' ? 'text-red-700' : step.status === 'skip' ? 'text-slate-500 italic' : 'text-slate-600'}>{step.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {invoiceResult && (
            <div className={`rounded-lg border px-4 py-3 text-xs space-y-1 ${invoiceResult.ok ? 'border-blue-200 bg-blue-50/60' : 'border-red-200 bg-red-50/50'}`}>
              <div className="flex items-center gap-2">
                {invoiceResult.ok
                  ? <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <span className="font-semibold text-slate-800">
                  {invoiceResult.ok ? 'Factura de prueba autorizada' : 'Error al emitir factura de prueba'}
                  {invoiceResult.isMock && <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">SIMULACIÓN</span>}
                </span>
              </div>
              <p className="pl-6 text-slate-600">{invoiceResult.message}</p>
              {invoiceResult.ok && invoiceResult.cae && (
                <p className="pl-6 font-mono text-teal-800">CAE: {invoiceResult.cae}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <details className="rounded-lg border border-teal-100 bg-white/70 px-4 py-3 group">
        <summary className="cursor-pointer text-sm font-medium text-gray-800 hover:text-gray-950 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/80 text-xs font-bold text-slate-700 mr-1.5">
              3
            </span>
            Avanzado: pruebas (homologación) o comprobantes reales (producción)
          </span>
          <span className="text-xs font-normal text-gray-500 shrink-0 group-open:hidden">Mostrar</span>
          <span className="text-xs font-normal text-gray-500 shrink-0 hidden group-open:inline">Ocultar</span>
        </summary>
        <div className="mt-3 flex flex-col gap-2 border-t border-teal-100/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600">
            {production
              ? 'Estás en producción: los comprobantes tienen validez fiscal plena.'
              : 'Homologación: AFIP de prueba. Usalo hasta estar seguro; después pasá a producción.'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600">Pruebas</span>
            <Switch
              checked={production}
              disabled={formDisabled || !meta.hasCredentials || togglingEnv}
              onCheckedChange={(v) => void handleProductionToggle(v)}
            />
            <span className="text-xs text-gray-600">Producción</span>
          </div>
        </div>
      </details>

      <p className="text-[11px] text-gray-500">
        Estado:{' '}
        {meta.hasCredentials
          ? `certificado guardado${meta.updatedAt ? ` · ${new Date(meta.updatedAt).toLocaleString('es-AR')}` : ''}`
          : 'sin certificado cargado'}
        . El CUIT emisor se toma de «CUIT / Número de IVA» en configuración general del taller.
        {formDisabled ? (
          <span className="block mt-1 text-amber-800/90">
            Las acciones de certificado y punto de venta están desactivadas hasta que el servidor esté configurado (mensaje
            amarillo arriba).
          </span>
        ) : null}
      </p>
    </div>
  );
}
