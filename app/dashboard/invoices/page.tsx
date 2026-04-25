'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, FileCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { deliverInvoiceDocument, shopRowToQzConnect } from '@/lib/invoice-print-deliver';
import { buildInvoicePrintFullHtmlDocument, type InvoicePrintPayload } from '@/lib/invoice-print-html';
import {
  validateArgentinaIvaCondition,
  validateBillingIdentity,
  validateDraftLines,
  validateInvoiceAmounts,
  validateLinesProductStock,
  type InvoiceDraftLine,
} from '@/lib/invoice-validation';
import { IVA_CONDITIONS_AR } from '@/lib/locale';
import { InvoicesAdminDashboard } from '@/components/invoices/InvoicesAdminDashboard';

type ShopPrintRow = {
  shop_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  registration_number: string | null;
  currency_symbol: string | null;
  qz_tray_port: number | null;
  qz_tray_using_secure: boolean | null;
  qz_tray_certificate_pem: string | null;
  qz_tray_direct_invoice_print: boolean | null;
  iva_condition?: string | null;
  footer_text?: string | null;
  terms_text_es?: string | null;
  terms_text_ar?: string | null;
  invoice_show_terms?: boolean | null;
  ar_allow_invoice_without_afip?: boolean | null;
};

type NewInvoiceForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_tax_id: string;
  customer_billing_address: string;
  customer_iva_condition_ar: string;
  external_reference: string;
  payment_method: string;
  notes: string;
  due_date: string;
  discount_amount: string;
  tax_amount: string;
};

type ArManualEmissionMode = 'afip_electronic' | 'internal_only';

type InvoiceLineRow = {
  id: string;
  description: string;
  qty: string;
  unit_price: string;
  /** UUID de `products` (opcional) para comprobar stock. */
  product_id: string;
};

const DEFAULT_NEW_INVOICE: NewInvoiceForm = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_tax_id: '',
  customer_billing_address: '',
  customer_iva_condition_ar: '',
  external_reference: '',
  payment_method: 'cash',
  notes: '',
  due_date: '',
  discount_amount: '0',
  tax_amount: '0',
};

function newLineRow(): InvoiceLineRow {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return { id, description: '', qty: '1', unit_price: '0', product_id: '' };
}

function parseDraftLines(rows: InvoiceLineRow[]): InvoiceDraftLine[] {
  return rows.map((r) => ({
    description: r.description.trim(),
    quantity: Number(r.qty),
    unitPrice: Number(r.unit_price),
    productId: r.product_id.trim() || null,
  }));
}

export default function InvoicesPage() {
  const supabase = useMemo(() => createClient(), []);
  const loc = useOrgLocale();
  const money = (n: number) => loc.format(n);
  const [dashReload, setDashReload] = useState(0);
  const [newDialog, setNewDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInvoice, setNewInvoice] = useState<NewInvoiceForm>(DEFAULT_NEW_INVOICE);
  const [lineRows, setLineRows] = useState<InvoiceLineRow[]>(() => [newLineRow()]);
  const [shopRow, setShopRow] = useState<ShopPrintRow | null>(null);
  const [invoiceDocBusy, setInvoiceDocBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [invoiceVerified, setInvoiceVerified] = useState(false);
  const [verifyErrors, setVerifyErrors] = useState<string[]>([]);
  const [arEmissionMode, setArEmissionMode] = useState<ArManualEmissionMode>('afip_electronic');

  const invalidateVerification = useCallback(() => {
    setInvoiceVerified(false);
    setVerifyErrors([]);
  }, []);

  const resetNewInvoiceDialog = useCallback(() => {
    setNewInvoice(DEFAULT_NEW_INVOICE);
    setLineRows([newLineRow()]);
    setInvoiceVerified(false);
    setVerifyErrors([]);
    setVerifying(false);
    setArEmissionMode('afip_electronic');
  }, []);

  const loadShopForPrint = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('shop_settings')
        .select(
          'shop_name, address, phone, email, registration_number, currency_symbol, iva_condition, footer_text, terms_text_es, terms_text_ar, invoice_show_terms, qz_tray_port, qz_tray_using_secure, qz_tray_certificate_pem, qz_tray_direct_invoice_print, ar_allow_invoice_without_afip'
        )
        .eq('user_id', user.id)
        .maybeSingle();
      setShopRow(data as ShopPrintRow | null);
    } catch {
      setShopRow(null);
    }
  }, [supabase]);

  useEffect(() => {
    void loadShopForPrint();
  }, [loadShopForPrint]);

  const setForm = (k: keyof NewInvoiceForm, v: string) => {
    invalidateVerification();
    setNewInvoice((prev) => ({ ...prev, [k]: v }));
  };

  const updateLineRow = (id: string, patch: Partial<Omit<InvoiceLineRow, 'id'>>) => {
    invalidateVerification();
    setLineRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addLineRow = () => {
    invalidateVerification();
    setLineRows((rows) => [...rows, newLineRow()]);
  };

  const removeLineRow = (id: string) => {
    invalidateVerification();
    setLineRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  };

  const runVerification = useCallback(
    async (opts?: { quietSuccess?: boolean }): Promise<boolean> => {
      setVerifying(true);
      setVerifyErrors([]);
      try {
        if (!newInvoice.customer_name.trim()) {
          const e = ['El nombre del cliente es obligatorio.'];
          setVerifyErrors(e);
          toast.error('Verificación incompleta');
          setInvoiceVerified(false);
          return false;
        }

        const draftLines = parseDraftLines(lineRows);
        const errs: string[] = [
          ...validateBillingIdentity(newInvoice.customer_tax_id, newInvoice.customer_billing_address),
        ];

        const { errors: lineErrs, linesSubtotal } = validateDraftLines(draftLines);
        errs.push(...lineErrs);

        const discount = Math.max(0, Number(newInvoice.discount_amount || 0));
        const tax = Math.max(0, Number(newInvoice.tax_amount || 0));
        errs.push(...validateInvoiceAmounts(linesSubtotal, discount, tax));

        const stockErrs = await validateLinesProductStock(supabase, draftLines);
        errs.push(...stockErrs);

        if (loc.isAR && arEmissionMode === 'afip_electronic') {
          errs.push(...validateArgentinaIvaCondition(newInvoice.customer_iva_condition_ar));
        }

        if (errs.length) {
          setVerifyErrors(errs);
          setInvoiceVerified(false);
          toast.error('La verificación encontró incidencias');
          return false;
        }

        setVerifyErrors([]);
        setInvoiceVerified(true);
        if (!opts?.quietSuccess) {
          toast.success('Verificación correcta: listo para crear la factura');
        }
        return true;
      } finally {
        setVerifying(false);
      }
    },
    [arEmissionMode, lineRows, loc.isAR, newInvoice, supabase]
  );

  const createInvoice = async () => {
    if (!(await runVerification({ quietSuccess: true }))) {
      return;
    }

    const draftLines = parseDraftLines(lineRows);
    const { linesSubtotal } = validateDraftLines(draftLines);
    const discount = Math.max(0, Number(newInvoice.discount_amount || 0));
    const tax = Math.max(0, Number(newInvoice.tax_amount || 0));
    const total = Math.max(0, linesSubtotal - discount + tax);

    const rollbackManualInvoice = async (invId: string) => {
      await (supabase as any).from('invoice_items').delete().eq('invoice_id', invId);
      await (supabase as any).from('invoices').delete().eq('id', invId);
    };

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sesión inválida');
        return;
      }

      const organizationId = await getActiveOrganizationId(supabase);

      let orgName: string | null = null;
      let billingJurisdiction: 'ES' | 'AR' | 'OTHER' = 'AR';
      if (organizationId) {
        const { data: orgRow } = await (supabase as any)
          .from('organizations')
          .select('name, country')
          .eq('id', organizationId)
          .maybeSingle();
        orgName = orgRow?.name ?? null;
        billingJurisdiction = 'AR';
      }

      const arInternalOnly = billingJurisdiction === 'AR' && arEmissionMode === 'internal_only';
      const ivaCondAr =
        billingJurisdiction === 'AR' ? newInvoice.customer_iva_condition_ar.trim() || null : null;

      const { data: insertedInvoice, error: invErr } = await (supabase as any)
        .from('invoices')
        .insert([
          {
            shop_owner_id: user.id,
            organization_id: organizationId,
            customer_name: newInvoice.customer_name.trim(),
            customer_email: newInvoice.customer_email.trim() || null,
            customer_phone: newInvoice.customer_phone.trim() || null,
            customer_tax_id: newInvoice.customer_tax_id.trim() || null,
            customer_billing_address: newInvoice.customer_billing_address.trim() || null,
            customer_iva_condition_ar: ivaCondAr,
            ar_internal_only: arInternalOnly,
            external_reference: newInvoice.external_reference.trim() || null,
            created_by_user_id: user.id,
            billing_jurisdiction: billingJurisdiction,
            subtotal: linesSubtotal,
            discount_amount: discount,
            tax_amount: tax,
            total_amount: total,
            status: 'draft',
            payment_status: 'pending',
            payment_method: newInvoice.payment_method,
            paid_amount: 0,
            refunded_amount: 0,
            notes: newInvoice.notes.trim() || null,
            due_date: newInvoice.due_date || null,
            invoice_number: `INV-${Date.now()}`,
          },
        ])
        .select('id')
        .single();

      if (invErr || !insertedInvoice?.id) throw invErr || new Error('No se pudo crear la factura');

      const newInvoiceId = insertedInvoice.id as string;

      const itemRows = draftLines.map((L) => ({
        invoice_id: newInvoiceId,
        description: L.description,
        quantity: Math.max(1, Math.round(L.quantity)),
        unit_price: L.unitPrice,
        total_price: L.quantity * L.unitPrice,
      }));

      const { error: itemErr } = await (supabase as any).from('invoice_items').insert(itemRows);
      if (itemErr) {
        await rollbackManualInvoice(newInvoiceId);
        throw itemErr;
      }

      if (billingJurisdiction === 'AR' && !arInternalOnly) {
        const { data: { session } } = await supabase.auth.getSession();
        const tok = session?.access_token;
        if (!tok) {
          await rollbackManualInvoice(newInvoiceId);
          throw new Error('Sesión expirada. Volvé a iniciar sesión.');
        }
        let arRes: Response;
        try {
          arRes = await fetch('/api/dashboard/invoices/arca-authorize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: newInvoiceId }),
          });
        } catch {
          await rollbackManualInvoice(newInvoiceId);
          throw new Error(
            'No se pudo contactar al servidor para autorizar en ARCA. La factura no se guardó; revisá la conexión.'
          );
        }
        const arJson = (await arRes.json().catch(() => ({}))) as {
          error?: string;
          skipped?: boolean;
          ar_cae?: string | null;
        };
        if (!arRes.ok) {
          await rollbackManualInvoice(newInvoiceId);
          throw new Error(
            arJson.error ||
              (arRes.status >= 500
                ? 'El servidor no pudo autorizar en ARCA. Intentá de nuevo en unos minutos.'
                : 'ARCA/AFIP rechazó la autorización.')
          );
        }
        if (!arJson.skipped && !String(arJson.ar_cae || '').trim()) {
          await rollbackManualInvoice(newInvoiceId);
          throw new Error(
            'ARCA/AFIP no devolvió CAE. Revisá certificado, CUIT y punto de venta en Ajustes → ARCA.'
          );
        }
      }

      const { data: invPrint, error: invPrintErr } = await (supabase as any)
        .from('invoices')
        .select('*')
        .eq('id', newInvoiceId)
        .single();
      if (invPrintErr || !invPrint) {
        await rollbackManualInvoice(newInvoiceId);
        throw invPrintErr || new Error('No se pudo leer la factura creada.');
      }

      toast.success(
        arInternalOnly
          ? 'Venta interna registrada (sin CAE).'
          : billingJurisdiction === 'AR'
            ? 'Factura creada y registrada en ARCA/AFIP cuando correspondía.'
            : 'Factura creada correctamente'
      );
      setNewDialog(false);
      resetNewInvoiceDialog();

      let shop = shopRow;
      if (!shop) {
        const { data: fresh } = await (supabase as any)
          .from('shop_settings')
          .select(
            'shop_name, address, phone, email, registration_number, currency_symbol, iva_condition, footer_text, terms_text_es, terms_text_ar, invoice_show_terms, qz_tray_port, qz_tray_using_secure, qz_tray_certificate_pem, qz_tray_direct_invoice_print'
          )
          .eq('user_id', user.id)
          .maybeSingle();
        shop = fresh as ShopPrintRow | null;
        if (fresh) setShopRow(fresh as ShopPrintRow);
      }

      const printLines = draftLines.map((L) => ({
        description: L.description,
        quantity: Math.max(1, Math.round(L.quantity)),
        unit_price: L.unitPrice,
        total_price: L.quantity * L.unitPrice,
      }));

      const payload: InvoicePrintPayload = {
        invoice: {
          invoice_number: String(invPrint.invoice_number),
          created_at: String(invPrint.created_at),
          customer_name: String(invPrint.customer_name || ''),
          customer_email: invPrint.customer_email,
          customer_phone: invPrint.customer_phone,
          customer_tax_id: invPrint.customer_tax_id,
          customer_iva_condition_ar: invPrint.customer_iva_condition_ar,
          customer_billing_address: invPrint.customer_billing_address,
          subtotal: Number(invPrint.subtotal ?? linesSubtotal),
          discount_amount: Number(invPrint.discount_amount ?? discount),
          tax_amount: Number(invPrint.tax_amount ?? tax),
          total_amount: Number(invPrint.total_amount ?? total),
          notes: invPrint.notes,
          due_date: invPrint.due_date,
          payment_method: invPrint.payment_method,
          external_reference: invPrint.external_reference,
          billing_jurisdiction: invPrint.billing_jurisdiction,
          organization_name: orgName,
          organization_country: billingJurisdiction,
          ar_cae: invPrint.ar_cae ?? null,
          ar_cae_expires_at: invPrint.ar_cae_expires_at ?? null,
          ar_cbte_tipo: invPrint.ar_cbte_tipo != null ? Number(invPrint.ar_cbte_tipo) : null,
          ar_punto_venta: invPrint.ar_punto_venta != null ? Number(invPrint.ar_punto_venta) : null,
          ar_numero_cbte: invPrint.ar_numero_cbte != null ? Number(invPrint.ar_numero_cbte) : null,
          ar_cuit_emisor: invPrint.ar_cuit_emisor ?? null,
          ar_internal_only: Boolean(invPrint.ar_internal_only),
        },
        lines: printLines,
        shop: {
          shop_name: shop?.shop_name?.trim() || 'Mi Taller',
          address: shop?.address,
          phone: shop?.phone,
          email: shop?.email,
          registration_number: shop?.registration_number,
          currency_symbol: shop?.currency_symbol,
          iva_condition: shop?.iva_condition,
          footer_text: shop?.footer_text ?? null,
          terms_text_es: shop?.terms_text_es ?? null,
          terms_text_ar: shop?.terms_text_ar ?? null,
          invoice_show_terms: Boolean(shop?.invoice_show_terms),
        },
      };

      const htmlDoc = buildInvoicePrintFullHtmlDocument(payload);
      const preferQz = Boolean(shop?.qz_tray_direct_invoice_print);
      const qzConnect = shopRowToQzConnect(shop);

      setInvoiceDocBusy(true);
      setDashReload((n) => n + 1);
      try {
        await deliverInvoiceDocument({
          invoiceId: newInvoiceId,
          htmlDocumentForQz: htmlDoc,
          preferQz,
          qzConnect,
        });
      } finally {
        setInvoiceDocBusy(false);
      }
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo crear la factura');
    } finally {
      setSaving(false);
    }
  };

  const linesSubtotalPreview = useMemo(() => {
    const draft = parseDraftLines(lineRows);
    return draft.reduce((s, L) => s + (Number.isFinite(L.quantity) && Number.isFinite(L.unitPrice) ? L.quantity * L.unitPrice : 0), 0);
  }, [lineRows]);

  const totalPreview = useMemo(() => {
    const d = Math.max(0, Number(newInvoice.discount_amount || 0));
    const t = Math.max(0, Number(newInvoice.tax_amount || 0));
    return Math.max(0, linesSubtotalPreview - d + t);
  }, [linesSubtotalPreview, newInvoice.discount_amount, newInvoice.tax_amount]);

  return (
    <div className="h-full bg-gray-50 overflow-y-auto relative">
      {invoiceDocBusy ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-[#0d9488]" />
            <p className="text-sm font-medium text-gray-800">Generando documento…</p>
          </div>
        </div>
      ) : null}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <InvoicesAdminDashboard
          reloadToken={dashReload}
          onCreateInvoice={() => {
            resetNewInvoiceDialog();
            setNewDialog(true);
          }}
        />
      </div>

      <Dialog
        open={newDialog}
        onOpenChange={(open) => {
          setNewDialog(open);
          if (!open) {
            setDashReload((n) => n + 1);
            resetNewInvoiceDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cliente *">
                <Input value={newInvoice.customer_name} onChange={(e) => setForm('customer_name', e.target.value)} />
              </Field>
              <Field label="DNI / NIF / CIF / CUIT *">
                <Input
                  value={newInvoice.customer_tax_id}
                  onChange={(e) => setForm('customer_tax_id', e.target.value)}
                  placeholder="Documento fiscal"
                />
              </Field>
              <Field label="Dirección fiscal *" className="col-span-2">
                <Input
                  value={newInvoice.customer_billing_address}
                  onChange={(e) => setForm('customer_billing_address', e.target.value)}
                  placeholder="Calle, número, CP, ciudad"
                />
              </Field>
              <Field label="Email cliente">
                <Input type="email" value={newInvoice.customer_email} onChange={(e) => setForm('customer_email', e.target.value)} />
              </Field>
              <Field label="Teléfono">
                <Input value={newInvoice.customer_phone} onChange={(e) => setForm('customer_phone', e.target.value)} />
              </Field>

              {loc.isAR ? (
                <div className="col-span-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3 space-y-3">
                  <p className="text-xs font-semibold text-teal-950">Emisión en Argentina</p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-sm text-gray-800">
                      <input
                        type="radio"
                        name="arManualEmit"
                        className="mt-1"
                        checked={arEmissionMode === 'afip_electronic'}
                        onChange={() => {
                          setArEmissionMode('afip_electronic');
                          invalidateVerification();
                        }}
                      />
                      <span>
                        <strong>Emitir factura electrónica (AFIP)</strong> — se solicita CAE en ARCA si el taller tiene
                        certificado configurado. Si ARCA falla, la factura no se guarda.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer text-sm text-gray-800">
                      <input
                        type="radio"
                        name="arManualEmit"
                        className="mt-1"
                        checked={arEmissionMode === 'internal_only'}
                        onChange={() => {
                          setArEmissionMode('internal_only');
                          invalidateVerification();
                        }}
                      />
                      <span>
                        <strong>Solo registrar venta interna</strong> — comprobante del taller sin CAE (útil sin internet o
                        con fallas en AFIP).
                      </span>
                    </label>
                  </div>
                  {arEmissionMode === 'afip_electronic' ? (
                    <Field label="Condición IVA del cliente (AFIP) *">
                      <Select
                        value={newInvoice.customer_iva_condition_ar || '_none'}
                        onValueChange={(v) =>
                          setForm('customer_iva_condition_ar', v === '_none' ? '' : v)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Elegir…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Elegir condición IVA…</SelectItem>
                          {IVA_CONDITIONS_AR.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  ) : null}
                  {shopRow?.ar_allow_invoice_without_afip ? (
                    <p className="text-[11px] text-teal-900/80 leading-relaxed border-t border-teal-100 pt-2">
                      El taller tiene activada la opción de <strong>cobrar sin AFIP</strong> en tickets; en esta pantalla seguís
                      eligiendo aquí entre factura electrónica o venta interna.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Field
                label={loc.isAR ? 'Referencia (orden, pedido…)' : 'Referencia (ticket, pedido…)'}
                className="col-span-2"
              >
                <Input
                  value={newInvoice.external_reference}
                  onChange={(e) => setForm('external_reference', e.target.value)}
                  placeholder="Opcional · ej. 0-17207"
                />
              </Field>
              <Field label="Fecha vencimiento">
                <Input type="date" value={newInvoice.due_date} onChange={(e) => setForm('due_date', e.target.value)} />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-600">Líneas de factura</Label>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addLineRow}>
                  Añadir línea
                </Button>
              </div>
              <div className="space-y-2 rounded-lg border border-gray-200 p-3 bg-gray-50/50">
                {lineRows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-[10px] text-gray-500">Concepto {idx + 1}</Label>
                      <Input
                        className="h-9 mt-0.5"
                        value={row.description}
                        onChange={(e) => updateLineRow(row.id, { description: e.target.value })}
                        placeholder="Descripción"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[10px] text-gray-500">Cant.</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-9 mt-0.5"
                        value={row.qty}
                        onChange={(e) => updateLineRow(row.id, { qty: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[10px] text-gray-500">P. unit.</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-9 mt-0.5"
                        value={row.unit_price}
                        onChange={(e) => updateLineRow(row.id, { unit_price: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-3">
                      <Label className="text-[10px] text-gray-500">ID producto (stock)</Label>
                      <Input
                        className="h-9 mt-0.5 font-mono text-[11px]"
                        value={row.product_id}
                        onChange={(e) => updateLineRow(row.id, { product_id: e.target.value })}
                        placeholder="UUID opcional"
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end pb-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-gray-500"
                        disabled={lineRows.length <= 1}
                        onClick={() => removeLineRow(row.id)}
                        aria-label="Quitar línea"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Subtotal líneas: <strong>{money(linesSubtotalPreview)}</strong> · Total estimado:{' '}
                <strong>{money(totalPreview)}</strong> (tras descuento e impuestos)
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Descuento">
                <Input type="number" min={0} step="0.01" value={newInvoice.discount_amount} onChange={(e) => setForm('discount_amount', e.target.value)} />
              </Field>
              <Field label="Impuesto (importe)">
                <Input type="number" min={0} step="0.01" value={newInvoice.tax_amount} onChange={(e) => setForm('tax_amount', e.target.value)} />
              </Field>
              <Field label="Método de pago">
                <Select value={newInvoice.payment_method} onValueChange={(v) => setForm('payment_method', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Notas">
              <Input value={newInvoice.notes} onChange={(e) => setForm('notes', e.target.value)} />
            </Field>

            <div className="flex flex-wrap gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void runVerification()}
                disabled={verifying}
                className={cn(
                  invoiceVerified && 'border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                )}
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando…
                  </>
                ) : invoiceVerified ? (
                  <>
                    <span className="mr-1.5" aria-hidden>
                      ✅
                    </span>
                    Verificado
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Verificar
                  </>
                )}
              </Button>
              <Button
                onClick={() => void createInvoice()}
                disabled={saving || verifying}
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  'Crear factura'
                )}
              </Button>
              <Button variant="outline" onClick={() => setNewDialog(false)}>
                Cancelar
              </Button>
            </div>

            <p className="text-[11px] text-gray-500">
              «Crear factura» ejecuta la misma comprobación que «Verificar» antes de guardar. Usá «Verificar» si querés ver el resultado sin crear aún.
            </p>

            {verifyErrors.length > 0 ? (
              <ul className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 list-disc list-inside space-y-0.5">
                {verifyErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
