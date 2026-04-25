'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, Loader as Loader2, Search, User, History, AlertTriangle, X } from 'lucide-react';
import {
  WarrantyReintakeCard,
  WarrantyLinkFromHistoryButton,
  type RelatedTicketPick,
} from '@/components/dashboard/WarrantyReintakeCard';
import { warrantyReintakeDescriptionPreamble } from '@/lib/ticket-warranty-reintake';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  customersOrgScopeOr,
  fetchActiveOrgMemberUserIds,
  repairTicketsOrgScopeOr,
} from '@/lib/repair-tickets-org-scope';
import { notifyTicketAssignedToPanelUser, isUuid } from '@/lib/panel-notifications';
import { humanizeRepairTicketsSchemaError } from '@/lib/supabase-setup-hints';
import { reserveNextBoletoTicketNumber } from '@/lib/boleto-ticket-number';
import { fetchTicketRepairsSettingsForOrg } from '@/lib/fetch-ticket-repairs-settings-org';
import type { TicketNumberStyle } from '@/lib/ticket-repairs-settings';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { repairCaseTerms } from '@/lib/locale';
import { dashboardFormSectionTitle } from '@/components/dashboard/dashboard-form-styles';
import { DeviceUnlockInputs } from '@/components/dashboard/DeviceUnlockInputs';
import {
  composeAccessCredentials,
  parseStoredAccessCredentials,
} from '@/lib/ticket-access-credentials';
import { NEW_FORM_STATUSES, DEVICE_CATEGORIES, costToInput } from '@/lib/ticket-form-constants';
import { isTicketBrandInCategory } from '@/lib/repair-service-device-catalog';
import { TicketEquipmentLaborFields } from '@/components/dashboard/TicketEquipmentLaborFields';
import { formatImeiInput, imeiFieldError, normalizeImeiForDb } from '@/lib/imei-input';
import { DeviceBrandSelect } from '@/components/dashboard/DeviceBrandSelect';
import {
  laborCountryFromOrgLocale,
  mergeEquipmentLaborDiagnostic,
  type IntakeLaborServicePick,
} from '@/lib/ticket-intake-labor-part';
import { persistRepairLaborPriceFromIntake } from '@/lib/repair-labor-intake-sync';
import {
  newTicketFormSchema,
  type NewTicketFormValues,
} from '@/lib/form-schemas/high-risk-forms';
import { TicketIntakeWebcam } from '@/components/dashboard/TicketIntakeWebcam';
import { uploadIntakeEvidencePhotos } from '@/lib/upload-intake-photos';
import { DiagnosticNotesWithAi } from '@/components/dashboard/DiagnosticNotesWithAi';

const TICKET_FORM_DEFAULTS: NewTicketFormValues = {
  customer_id: '',
  device_type: '',
  device_brand: '',
  device_category: '',
  device_model: '',
  device_screen_inches: '',
  serial_number: '',
  imei: '',
  issue_description: '',
  status: 'entrada',
  priority: 'medium',
  task_type: 'TIENDA',
  estimated_cost: '',
  final_cost: '',
  deposit_amount: '',
  notes: '',
  diagnostic_notes: '',
  device_pin: '',
  unlock_pattern: '',
  warranty_info: 'Sin garantía',
  assigned_to: '',
  is_urgent: false,
  is_draft: false,
};

/** Cabeceras de bloque más bajas que el estándar del panel (menos scroll en alta de ticket). */
const NEW_TICKET_SECTION_HD = 'bg-primary border-b border-white/20 px-4 py-2';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
};

type Technician = {
  id: string;
  name: string;
  email: string;
};

export default function NewTicketPage() {
  const loc = useOrgLocale();
  const rtc = useMemo(() => repairCaseTerms(loc.isAR), [loc.isAR]);
  const sym = loc.symbol;
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTicketId = searchParams.get('edit');
  const presetCustomerId = searchParams.get('customerId');
  const relatedTicketFromUrl = searchParams.get('relatedTicket');
  const supabase = createClient();
  const ticketRf = useForm<NewTicketFormValues>({
    resolver: zodResolver(newTicketFormSchema),
    defaultValues: TICKET_FORM_DEFAULTS,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });
  const form = ticketRf.watch();
  const billingPreview = useMemo(() => {
    const parseMoney = (s: string) => {
      const t = String(s ?? '').trim().replace(',', '.');
      if (!t) return 0;
      const n = parseFloat(t);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    const total = parseMoney(form.final_cost) || parseMoney(form.estimated_cost);
    const dep = parseMoney(form.deposit_amount);
    const pending = Math.max(0, Math.round((total - dep) * 100) / 100);
    return { total, dep, pending };
  }, [form.final_cost, form.estimated_cost, form.deposit_amount]);
  const [bootstrapping, setBootstrapping] = useState(!!editTicketId);
  const [editingTicketNumber, setEditingTicketNumber] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  /** Fotos de evidencia al ingreso (antes de crear el ticket se guardan en memoria; luego se suben a Storage). */
  const [intakePhotoFiles, setIntakePhotoFiles] = useState<File[]>([]);

  type DeviceHistoryTicket = {
    id: string;
    ticket_number: string;
    status: string;
    issue_description: string;
    created_at: string;
    device_type: string;
    device_brand: string | null;
    device_model: string | null;
    imei: string | null;
    serial_number: string | null;
    customer_id?: string | null;
    customers: { id: string; name: string } | null;
  };
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistoryTicket[]>([]);
  const [historyDismissed, setHistoryDismissed] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [ticketNumberStyle, setTicketNumberStyle] = useState<TicketNumberStyle>('padded_four');
  const [linkedRelatedTicket, setLinkedRelatedTicket] = useState<RelatedTicketPick | null>(null);
  const relatedUrlAppliedRef = useRef(false);

  const [equipmentLabor, setEquipmentLabor] = useState<IntakeLaborServicePick | null>(null);

  const searchDeviceHistory = async (imei: string, serial: string) => {
    const imeiNorm = formatImeiInput(imei);
    const val = (imeiNorm || serial).trim();
    if (val.length < 5) { setDeviceHistory([]); return; }
    setHistoryDismissed(false);
    try {
      const params = new URLSearchParams();
      if (imeiNorm) params.set('imei', imeiNorm);
      if (serial.trim()) params.set('serial', serial.trim());
      if (editTicketId) params.set('exclude', editTicketId);
      const res = await fetch(`/api/dashboard/device-history?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json() as { tickets: DeviceHistoryTicket[] };
      setDeviceHistory(json.tickets ?? []);
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    if (!editTicketId) setEditingTicketNumber(null);
  }, [editTicketId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootstrapping(!!editTicketId);
      try {
        const scope = await loadData();
        if (cancelled) return;
        if (editTicketId) {
          await loadTicketForEdit(editTicketId);
        } else if (presetCustomerId && scope?.customerScopeOr) {
          await applyPresetCustomer(presetCustomerId, {
            customerScopeOr: scope.customerScopeOr,
          });
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editTicketId, presetCustomerId]);

  useEffect(() => {
    relatedUrlAppliedRef.current = false;
  }, [relatedTicketFromUrl]);

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const orgId = await getActiveOrganizationId(supabase);
    if (!orgId) {
      toast.error('No hay organización activa.');
      setCustomers([]);
      setActiveOrgId(null);
      return;
    }

    setActiveOrgId(orgId);
    const tr = await fetchTicketRepairsSettingsForOrg(supabase, orgId);
    setTicketNumberStyle(tr.ticket_number_style);
    const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
    const customerScopeOr = customersOrgScopeOr(orgId, memberIds);

    const { data: cData } = await supabase
      .from('customers')
      .select('id, name, email, phone, organization')
      .or(customerScopeOr)
      .order('name');

    const { data: tData } = await (supabase as any)
      .from('technicians')
      .select('id, name, email')
      .or(`organization_id.eq.${orgId},shop_owner_id.eq.${user.id}`)
      .eq('is_active', true)
      .order('name');

    setCustomers(cData || []);
    setTechnicians(tData || []);
    return { orgId, memberIds, customerScopeOr, userId: user.id };
  };

  const applyPresetCustomer = async (
    customerId: string,
    scope: { customerScopeOr: string }
  ) => {
    const { data: row } = await supabase
      .from('customers')
      .select('id, name, email, phone, organization')
      .eq('id', customerId)
      .or(scope.customerScopeOr)
      .maybeSingle();
    if (!row) {
      toast.error('No se encontró el cliente o no pertenece a tu organización.');
      return;
    }
    setSelectedCustomer(row);
    ticketRf.setValue('customer_id', row.id, { shouldValidate: true });
    setCustomerSearch(row.name);
    setShowCustomerList(false);
  };

  const loadTicketForEdit = async (ticketId: string) => {
    const orgId = await getActiveOrganizationId(supabase);
    if (!orgId) {
      toast.error('No hay organización activa.');
      router.replace('/dashboard/tickets');
      return;
    }
    const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
    const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
    const { data: row, error } = await (supabase as any)
      .from('repair_tickets')
      .select(
        'id, ticket_number, customer_id, related_ticket_id, device_type, device_brand, device_category, device_model, device_screen_inches, serial_number, imei, issue_description, status, priority, task_type, estimated_cost, final_cost, deposit_amount, notes, diagnostic_notes, pin_pattern, warranty_info, assigned_to, is_urgent, is_draft, customers(id, name, email, phone, organization)'
      )
      .eq('id', ticketId)
      .or(ticketScopeOr)
      .maybeSingle();

    if (error || !row) {
      toast.error('No se pudo cargar el ticket para editar.');
      router.replace('/dashboard/tickets');
      return;
    }

    setLinkedRelatedTicket(null);
    const relId = row.related_ticket_id as string | null | undefined;
    if (relId) {
      const parentSel =
        'id, ticket_number, status, customer_id, created_at, device_type, device_brand, device_category, device_model, serial_number, imei';
      const { data: parentRow } = await (supabase as any)
        .from('repair_tickets')
        .select(parentSel)
        .eq('id', relId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (parentRow) setLinkedRelatedTicket(parentRow as RelatedTicketPick);
    }

    setEditingTicketNumber(row.ticket_number || null);

    const cust = row.customers;
    if (cust) {
      setSelectedCustomer({
        id: cust.id,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        organization: cust.organization,
      });
      setCustomerSearch(cust.name || '');
    }

    const st = row.status || 'entrada';
    const cat = row.device_category || '';
    const brand = row.device_brand || '';
    const { pin, pattern } = parseStoredAccessCredentials(row.pin_pattern);

    ticketRf.reset({
      customer_id: row.customer_id || '',
      device_type: row.device_type || '',
      device_brand: brand,
      device_category: cat,
      device_model: row.device_model || '',
      device_screen_inches: (row as { device_screen_inches?: string | null }).device_screen_inches || '',
      serial_number: row.serial_number || '',
      imei: row.imei || '',
      issue_description: row.issue_description || '',
      status: st,
      priority: (row.priority || 'medium') as NewTicketFormValues['priority'],
      task_type: row.task_type || 'TIENDA',
      estimated_cost: costToInput(row.estimated_cost),
      final_cost: costToInput(row.final_cost),
      deposit_amount: costToInput((row as { deposit_amount?: number | null }).deposit_amount),
      notes: row.notes || '',
      diagnostic_notes: row.diagnostic_notes || '',
      device_pin: pin,
      unlock_pattern: pattern,
      warranty_info: row.warranty_info || 'Sin garantía',
      assigned_to: row.assigned_to || '',
      is_urgent: !!row.is_urgent,
      is_draft: !!row.is_draft,
    });
  };

  const set = (key: keyof NewTicketFormValues, value: string | boolean) =>
    ticketRf.setValue(key, value as never, { shouldDirty: true, shouldTouch: true });

  const applyWarrantyLinkFields = useCallback((pick: RelatedTicketPick) => {
    setLinkedRelatedTicket(pick);
    const prev = ticketRf.getValues();
    const pre = warrantyReintakeDescriptionPreamble({
      parentTicketNumber: pick.ticket_number,
      parentCreatedAt: pick.created_at,
      isArgentina: loc.isAR,
    });
    const issue =
      prev.issue_description?.includes(pick.ticket_number)
        ? prev.issue_description
        : pre + (prev.issue_description || '');
    ticketRf.reset({
      ...prev,
      device_type: pick.device_type || prev.device_type,
      device_brand: pick.device_brand || prev.device_brand,
      device_category: pick.device_category || prev.device_category,
      device_model: pick.device_model || prev.device_model,
      serial_number: pick.serial_number || prev.serial_number,
      imei: pick.imei || prev.imei,
      warranty_info: 'En garantía',
      task_type: 'GARANTIA',
      issue_description: issue,
    });
  }, [loc.isAR, ticketRf]);

  const copyDeviceFieldsOnly = useCallback((pick: RelatedTicketPick) => {
    const prev = ticketRf.getValues();
    ticketRf.reset({
      ...prev,
      device_type: pick.device_type || prev.device_type,
      device_brand: pick.device_brand || prev.device_brand,
      device_category: pick.device_category || prev.device_category,
      device_model: pick.device_model || prev.device_model,
      serial_number: pick.serial_number || prev.serial_number,
      imei: pick.imei || prev.imei,
    });
    toast.success(rtc.copyDeviceFromLinked);
  }, [rtc, ticketRf]);

  const linkWarrantyFromHistoryById = useCallback(
    async (ticketId: string) => {
      if (!activeOrgId) return;
      const sel =
        'id, ticket_number, status, customer_id, created_at, device_type, device_brand, device_category, device_model, serial_number, imei';
      const { data: row, error } = await (supabase as any)
        .from('repair_tickets')
        .select(sel)
        .eq('id', ticketId)
        .eq('organization_id', activeOrgId)
        .maybeSingle();
      if (error || !row) {
        toast.error(rtc.loadLinkedFailed);
        return;
      }
      const pick = row as RelatedTicketPick;
      const cid = ticketRf.getValues('customer_id');
      if (cid && pick.customer_id !== cid) {
        toast.error('Ese equipo consta con otro cliente. Elige el cliente correcto primero.');
        return;
      }
      applyWarrantyLinkFields(pick);
      toast.success(`Vinculado a #${pick.ticket_number}`);
    },
    [activeOrgId, supabase, applyWarrantyLinkFields, rtc, ticketRf]
  );

  useEffect(() => {
    if (
      editTicketId ||
      !activeOrgId ||
      !relatedTicketFromUrl ||
      !isUuid(relatedTicketFromUrl) ||
      relatedUrlAppliedRef.current
    ) {
      return;
    }
    relatedUrlAppliedRef.current = true;
    void (async () => {
      const sel =
        'id, ticket_number, status, customer_id, created_at, device_type, device_brand, device_category, device_model, serial_number, imei';
      const { data: row, error } = await (supabase as any)
        .from('repair_tickets')
        .select(sel)
        .eq('id', relatedTicketFromUrl)
        .eq('organization_id', activeOrgId)
        .maybeSingle();
      if (error || !row) {
        toast.error(rtc.warrantyNotFoundOrg);
        relatedUrlAppliedRef.current = false;
        return;
      }
      const pick = row as RelatedTicketPick;
      setLinkedRelatedTicket(pick);
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, activeOrgId);
      const customerScopeOr = customersOrgScopeOr(activeOrgId, memberIds);
      const { data: cust } = await supabase
        .from('customers')
        .select('id, name, email, phone, organization')
        .eq('id', pick.customer_id)
        .or(customerScopeOr)
        .maybeSingle();
      if (cust) {
        setSelectedCustomer(cust);
        const prev = ticketRf.getValues();
        const pre = warrantyReintakeDescriptionPreamble({
          parentTicketNumber: pick.ticket_number,
          parentCreatedAt: pick.created_at,
          isArgentina: loc.isAR,
        });
        ticketRf.reset({
          ...prev,
          customer_id: cust.id,
          device_type: pick.device_type || prev.device_type,
          device_brand: pick.device_brand || prev.device_brand,
          device_category: pick.device_category || prev.device_category,
          device_model: pick.device_model || prev.device_model,
          serial_number: pick.serial_number || prev.serial_number,
          imei: pick.imei || prev.imei,
          warranty_info: 'En garantía',
          task_type: 'GARANTIA',
          issue_description: (prev.issue_description || '').includes(pick.ticket_number)
            ? prev.issue_description
            : pre + (prev.issue_description || ''),
        });
        setCustomerSearch(cust.name);
      } else {
        applyWarrantyLinkFields(pick);
      }
      toast.message(`Vínculo a #${pick.ticket_number}. Completa el formulario y guarda.`, { duration: 4000 });
    })();
  }, [activeOrgId, relatedTicketFromUrl, supabase, editTicketId, applyWarrantyLinkFields, loc.isAR, rtc, ticketRf]);

  const persistTicket = async (values: NewTicketFormValues, saveAsDraft: boolean, intakeFiles: File[] = []) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Tenés que iniciar sesión para guardar el ticket.');
        return;
      }
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa. No se puede guardar el ticket.');
        return;
      }

      const est = values.estimated_cost.trim();
      const fin = values.final_cost.trim();
      const dep = values.deposit_amount.trim();
      const payload = {
        customer_id: values.customer_id,
        device_type: values.device_type,
        device_brand: values.device_brand || null,
        device_category: values.device_category || null,
        device_model: values.device_model || null,
        device_screen_inches:
          values.device_category === 'SMART_TV'
            ? values.device_screen_inches?.trim() || null
            : null,
        serial_number: values.serial_number || null,
        imei: normalizeImeiForDb(values.imei),
        issue_description: values.issue_description,
        status: saveAsDraft ? 'draft' : values.status,
        priority: values.priority,
        task_type: values.task_type,
        estimated_cost: est ? parseFloat(est.replace(',', '.')) : null,
        final_cost: fin ? parseFloat(fin.replace(',', '.')) : null,
        deposit_amount: dep ? parseFloat(dep.replace(',', '.')) : null,
        notes: values.notes || null,
        diagnostic_notes:
          mergeEquipmentLaborDiagnostic(values.diagnostic_notes, equipmentLabor, values.estimated_cost, sym) || null,
        pin_pattern: composeAccessCredentials(values.device_pin, values.unlock_pattern),
        warranty_info: values.warranty_info || null,
        assigned_to:
          values.assigned_to && values.assigned_to !== 'unassigned'
            ? values.assigned_to
            : null,
        is_urgent: values.is_urgent,
        is_draft: saveAsDraft,
        related_ticket_id: linkedRelatedTicket?.id ?? null,
      };

      let data: { id: string; ticket_number: string; assigned_to: string | null; device_brand: string | null; device_model: string | null; device_type: string };
      let error: Error | null = null;

      if (editTicketId) {
        const res = await (supabase as any)
          .from('repair_tickets')
          .update(payload)
          .eq('id', editTicketId)
          .select('id, ticket_number, assigned_to, device_brand, device_model, device_type')
          .single();
        error = res.error;
        data = res.data;
      } else {
        const ticketNumber = await reserveNextBoletoTicketNumber(supabase, orgId, ticketNumberStyle);
        const res = await (supabase as any)
          .from('repair_tickets')
          .insert([
            {
              user_id: user.id,
              organization_id: orgId,
              ticket_number: ticketNumber,
              ...payload,
            },
          ])
          .select('id, ticket_number, assigned_to, device_brand, device_model, device_type')
          .single();
        error = res.error;
        data = res.data;
      }

      if (error) throw error;
      if (!data) throw new Error('Sin datos del ticket');

      if (
        !editTicketId &&
        data.assigned_to &&
        !isUuid(data.assigned_to) &&
        technicians.some(
          (t) =>
            t.name.trim().toLowerCase() === String(data.assigned_to).trim().toLowerCase()
        )
      ) {
        const match = technicians.find(
          (t) =>
            t.name.trim().toLowerCase() === String(data.assigned_to).trim().toLowerCase()
        );
        if (match) {
          await (supabase as any)
            .from('repair_tickets')
            .update({ assigned_to: match.id })
            .eq('id', data.id);
          data = { ...data, assigned_to: match.id };
        }
      }

      if (!saveAsDraft && data.assigned_to) {
        try {
          const deviceSummary = [
            data.device_brand,
            values.device_category === 'SMART_TV' && values.device_screen_inches?.trim()
              ? values.device_screen_inches.trim()
              : null,
            data.device_model,
            data.device_type,
          ]
            .filter(Boolean)
            .join(' ')
            .trim();
          const { assigneeNotified } = await notifyTicketAssignedToPanelUser(supabase, {
            organizationId: orgId,
            ticketId: data.id,
            ticketNumber: data.ticket_number,
            deviceSummary,
            technicianId: data.assigned_to,
          });
          if (!assigneeNotified) {
            toast.message(
              'Ticket guardado. El aviso en la campana solo lo ve quien está enlazado como «Usuario del panel» en ese empleado (Ajustes → Empleados), o con el mismo email que su usuario si no hay enlace.',
              { duration: 6000, id: 'notify-assign-hint' }
            );
          }
        } catch {
          /* no bloquear el flujo si falla la notificación */
        }
      }

      {
        const { errorMessage } = await persistRepairLaborPriceFromIntake(
          supabase,
          equipmentLabor,
          values.estimated_cost
        );
        if (errorMessage) toast.message(errorMessage, { duration: 8000 });
      }

      if (intakeFiles.length > 0) {
        try {
          await uploadIntakeEvidencePhotos(supabase, data.id, user.id, intakeFiles);
        } catch (upErr) {
          console.error('[ticket] intake photos', upErr);
          toast.error(
            'El ticket se guardó, pero hubo un error al subir una o más fotos. Podés añadirlas desde la ficha del ticket.',
          );
        }
        setIntakePhotoFiles([]);
      }

      toast.success(
        saveAsDraft
          ? 'Ticket guardado como borrador'
          : editTicketId
            ? 'Ticket actualizado'
            : 'Ticket creado'
      );
      router.push(`/dashboard/tickets/${data.id}`);
    } catch (error: unknown) {
      const raw =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'Error al guardar el ticket';
      toast.error(humanizeRepairTicketsSchemaError(raw));
    }
  };

  const submitPublished = ticketRf.handleSubmit((vals) => persistTicket(vals, false, intakePhotoFiles));
  const submitDraftOnly = ticketRf.handleSubmit((vals) => persistTicket(vals, true, intakePhotoFiles));

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone || '').includes(customerSearch)
  );

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="border-b border-gray-200 bg-white px-4 py-2 sm:px-6">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-700">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/dashboard/tickets" className="hover:text-gray-700">
            Tickets
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900 font-medium">
            {editTicketId ? 'Editar ticket' : 'Crear ticket'}
          </span>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 py-3 sm:px-5">
        {bootstrapping ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-gray-600">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Cargando datos del ticket…</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-3 sm:text-2xl">
              {editTicketId
                ? editingTicketNumber
                  ? `Editar ticket · ${rtc.nounCap} ${editingTicketNumber}`
                  : 'Editar ticket'
                : 'Crear nuevo ticket'}
            </h1>

            <form onSubmit={submitPublished} className="space-y-3" noValidate>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] xl:items-stretch xl:gap-3">
            <div className="order-1 min-w-0 space-y-3 xl:order-none">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className={NEW_TICKET_SECTION_HD}>
                  <h2 className={dashboardFormSectionTitle}>Información del cliente</h2>
                </div>
                <div className="p-3">
                  <Label className="text-xs font-medium text-gray-600">
                    Buscar cliente <span className="text-red-500">*</span>
                  </Label>
                  {ticketRf.formState.errors.customer_id?.message ? (
                    <p className="text-sm text-red-600 mt-1" role="alert">
                      {ticketRf.formState.errors.customer_id.message}
                    </p>
                  ) : null}
                  <div className="relative mt-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Nombre, email o teléfono..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerList(true);
                        }}
                        onFocus={() => setShowCustomerList(true)}
                      />
                    </div>

                    {showCustomerList && customerSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                        {filteredCustomers.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-gray-500 text-center">
                            No se encontraron clientes
                          </div>
                        ) : (
                          filteredCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                set('customer_id', c.id);
                                setCustomerSearch(c.name);
                                setShowCustomerList(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                                <User className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {c.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {c.email || c.phone || c.organization || ''}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {selectedCustomer && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 sm:gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
                        <span className="text-sm font-bold text-primary-foreground">
                          {selectedCustomer.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {selectedCustomer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                          {selectedCustomer.phone && (
                            <span className="ml-2">{selectedCustomer.phone}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ml-auto text-xs text-gray-500 hover:text-red-500"
                        onClick={() => {
                          setSelectedCustomer(null);
                          set('customer_id', '');
                          setCustomerSearch('');
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    <Link
                      href="/dashboard/recepcion"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Asistente de recepción (cliente + equipo)
                    </Link>
                    <Link
                      href="/dashboard/customers/new"
                      className="text-xs text-gray-600 hover:text-primary hover:underline"
                    >
                      + Ficha completa de cliente
                    </Link>
                  </div>
                </div>
              </div>

              {activeOrgId ? (
                <WarrantyReintakeCard
                  supabase={supabase}
                  organizationId={activeOrgId}
                  selectedCustomerId={selectedCustomer?.id ?? null}
                  linked={linkedRelatedTicket}
                  onLinkedChange={(row) => {
                    if (!row) {
                      setLinkedRelatedTicket(null);
                      return;
                    }
                    applyWarrantyLinkFields(row);
                  }}
                  onCopyDeviceFrom={copyDeviceFieldsOnly}
                  isArgentina={loc.isAR}
                />
              ) : null}

              <div className="bg-white rounded-lg border border-gray-200 overflow-visible">
                <div className={NEW_TICKET_SECTION_HD}>
                  <h2 className={dashboardFormSectionTitle}>Información del dispositivo</h2>
                </div>
                <div className="grid grid-cols-2 gap-2.5 gap-x-3 p-3">
                  <div className="col-span-2">
                    <Label className="text-xs font-medium text-gray-600">
                      Dispositivo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="mt-1 h-8"
                      placeholder="iPhone 16 Pro Max, Samsung S24..."
                      value={form.device_type}
                      onChange={(e) => set('device_type', e.target.value)}
                      aria-invalid={!!ticketRf.formState.errors.device_type}
                    />
                    {ticketRf.formState.errors.device_type?.message ? (
                      <p className="text-sm text-red-600 mt-1" role="alert">
                        {ticketRf.formState.errors.device_type.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600">
                      Categoría
                    </Label>
                    <Select
                      value={form.device_category}
                      onValueChange={(v) => {
                        const prev = ticketRf.getValues();
                        ticketRf.setValue('device_category', v);
                        ticketRf.setValue(
                          'device_brand',
                          isTicketBrandInCategory(prev.device_brand, v) ? prev.device_brand : ''
                        );
                        ticketRf.setValue(
                          'device_screen_inches',
                          v === 'SMART_TV' ? prev.device_screen_inches : ''
                        );
                      }}
                    >
                      <SelectTrigger className="mt-1 h-8">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {form.device_category &&
                          !DEVICE_CATEGORIES.has(form.device_category) && (
                            <SelectItem value={form.device_category}>
                              {form.device_category}
                            </SelectItem>
                          )}
                        <SelectItem value="SMARTPHONES">SMARTPHONES</SelectItem>
                        <SelectItem value="TABLETS">TABLETS</SelectItem>
                        <SelectItem value="LAPTOPS">LAPTOPS Y PC</SelectItem>
                        <SelectItem value="CONSOLAS">CONSOLAS</SelectItem>
                        <SelectItem value="SMARTWATCH">SMARTWATCH</SelectItem>
                        <SelectItem value="AURICULARES">AURICULARES</SelectItem>
                        <SelectItem value="SMART_TV">SMART TV</SelectItem>
                        <SelectItem value="AUDIO_VIDEO">EQUIPOS DE AUDIO Y VÍDEO</SelectItem>
                        <SelectItem value="OTROS">OTROS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600">Marca</Label>
                    <DeviceBrandSelect
                      categoryKey={form.device_category}
                      brandValue={form.device_brand}
                      onBrandChange={(v) => set('device_brand', v)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600">Modelo</Label>
                    <Input
                      className="mt-1 h-8"
                      placeholder="A2483, SM-S928B..."
                      value={form.device_model}
                      onChange={(e) => set('device_model', e.target.value)}
                    />
                  </div>

                  {form.device_category === 'SMART_TV' ? (
                    <div className="col-span-2 rounded-lg border border-teal-100 bg-teal-50/40 px-3 py-2">
                      <Label className="text-xs font-medium text-gray-700">
                        Pulgadas (pantalla){' '}
                        <span className="font-normal text-red-600">*</span>
                      </Label>
                      <Input
                        className="mt-1.5 h-8 bg-white"
                        placeholder="Ej. 55, 55 pulgadas, 55&quot;…"
                        value={form.device_screen_inches}
                        onChange={(e) => set('device_screen_inches', e.target.value)}
                        autoComplete="off"
                        aria-invalid={!!ticketRf.formState.errors.device_screen_inches}
                      />
                      {ticketRf.formState.errors.device_screen_inches?.message ? (
                        <p className="text-sm text-red-600 mt-1.5" role="alert">
                          {ticketRf.formState.errors.device_screen_inches.message}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-500 mt-1.5">
                          Obligatorio para la categoría Smart TV.
                        </p>
                      )}
                    </div>
                  ) : null}

                  <TicketEquipmentLaborFields
                    supabase={supabase}
                    organizationId={activeOrgId}
                    laborCountry={laborCountryFromOrgLocale(loc.isAR)}
                    deviceCategory={form.device_category}
                    deviceBrand={form.device_brand}
                    deviceModel={form.device_model}
                    currencySymbol={sym}
                    selectedLabor={equipmentLabor}
                    onLaborChange={setEquipmentLabor}
                    servicePriceInput={form.estimated_cost}
                    onServicePriceChange={(v) => set('estimated_cost', v)}
                  />

                  <div>
                    <Label className="text-xs font-medium text-gray-600">IMEI</Label>
                    <Input
                      className="mt-1 h-8"
                      placeholder="15 dígitos (opcional)"
                      inputMode="numeric"
                      value={form.imei}
                      onChange={(e) => set('imei', formatImeiInput(e.target.value))}
                      onBlur={() => void searchDeviceHistory(form.imei, form.serial_number)}
                      aria-invalid={!!imeiFieldError(form.imei)}
                    />
                    {imeiFieldError(form.imei) ? (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {imeiFieldError(form.imei)}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Opcional. Si lo cargás, exactamente 15 dígitos.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">N.º de serie</Label>
                    <Input
                      className="mt-1 h-8"
                      placeholder="F2LWH1234567"
                      value={form.serial_number}
                      onChange={(e) => set('serial_number', e.target.value)}
                      onBlur={() => void searchDeviceHistory(form.imei, form.serial_number)}
                    />
                  </div>

                  <div className="col-span-2">
                    <DeviceUnlockInputs
                      pin={form.device_pin}
                      pattern={form.unlock_pattern}
                      onPinChange={(v) => set('device_pin', v)}
                      onPatternChange={(v) => set('unlock_pattern', v)}
                    />
                  </div>

                  {/* Historial del dispositivo */}
                  {deviceHistory.length > 0 && !historyDismissed && (
                    <div className="col-span-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-xs">
                          <History className="h-3.5 w-3.5 shrink-0" />
                          Este dispositivo ya estuvo en el taller — {deviceHistory.length} visita{deviceHistory.length > 1 ? 's' : ''} anterior{deviceHistory.length > 1 ? 'es' : ''}
                        </div>
                        <button type="button" onClick={() => setHistoryDismissed(true)} className="shrink-0 text-amber-500 hover:text-amber-700">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <ul className="space-y-1.5">
                        {deviceHistory.slice(0, 5).map((t) => (
                          <li
                            key={t.id}
                            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-900"
                          >
                            <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="inline-flex flex-wrap items-center gap-x-2">
                              <a
                                href={`/dashboard/tickets/${t.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium underline underline-offset-2 hover:text-amber-700"
                              >
                                #{t.ticket_number}
                              </a>
                              <span className="text-amber-800/90">
                                {new Date(t.created_at).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-amber-900/95 max-w-full">
                                {t.issue_description?.slice(0, 60)}
                                {(t.issue_description?.length ?? 0) > 60 ? '…' : ''}
                              </span>
                              <WarrantyLinkFromHistoryButton
                                ticketNumber={t.ticket_number}
                                disabled={editTicketId === t.id}
                                onClick={() => void linkWarrantyFromHistoryById(t.id)}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="col-span-2">
                    <Label className="text-xs font-medium text-gray-600">
                      Descripción del problema <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      className="mt-1 min-h-[4.5rem] resize-y text-sm"
                      rows={2}
                      placeholder="Describe el problema detalladamente..."
                      value={form.issue_description}
                      onChange={(e) => set('issue_description', e.target.value)}
                      aria-invalid={!!ticketRf.formState.errors.issue_description}
                    />
                    {ticketRf.formState.errors.issue_description?.message ? (
                      <p className="text-sm text-red-600 mt-1" role="alert">
                        {ticketRf.formState.errors.issue_description.message}
                      </p>
                    ) : null}
                  </div>

                  <DiagnosticNotesWithAi
                    value={form.diagnostic_notes}
                    onChange={(v) => set('diagnostic_notes', v)}
                    placeholder="Observaciones iniciales del técnico..."
                  />
                </div>
              </div>
            </div>

            <div className="order-2 min-w-0 xl:order-none xl:flex xl:min-h-full xl:flex-col">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="shrink-0">
                  <div className={NEW_TICKET_SECTION_HD}>
                    <h2 className={dashboardFormSectionTitle}>Estado y asignación</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Estado</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => set('status', v)}
                    >
                      <SelectTrigger className="mt-1 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {form.status && !NEW_FORM_STATUSES.has(form.status) && (
                          <SelectItem value={form.status}>{form.status}</SelectItem>
                        )}
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="entrada">ENTRADA</SelectItem>
                        <SelectItem value="en_proceso">EN PROCESO</SelectItem>
                        <SelectItem value="pendiente_pedido">PENDIENTE DE PEDIDO</SelectItem>
                        <SelectItem value="pendiente_pieza">PENDIENTE DE PIEZA</SelectItem>
                        <SelectItem value="presupuesto">PRESUPUESTO</SelectItem>
                        <SelectItem value="diagnostico">DIAGNOSTICO</SelectItem>
                        <SelectItem value="externa">EXTERNA</SelectItem>
                        <SelectItem value="reparado">REPARADO</SelectItem>
                        <SelectItem value="no_reparado">NO REPARADO</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600">
                      Tipo de tarea
                    </Label>
                    <Select
                      value={form.task_type}
                      onValueChange={(v) => set('task_type', v)}
                    >
                      <SelectTrigger className="mt-1 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TIENDA">TIENDA</SelectItem>
                        <SelectItem value="ONLINE">ONLINE</SelectItem>
                        <SelectItem value="DOMICILIO">DOMICILIO</SelectItem>
                        <SelectItem value="GARANTIA">GARANTIA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600">
                      Asignar técnico
                    </Label>
                    <Select
                      value={form.assigned_to || 'unassigned'}
                      onValueChange={(v) => set('assigned_to', v === 'unassigned' ? '' : v)}
                    >
                      <SelectTrigger className="mt-1 h-8">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Sin asignar</SelectItem>
                        {form.assigned_to &&
                          !technicians.some((t) => t.id === form.assigned_to) && (
                            <SelectItem value={form.assigned_to}>
                              Técnico asignado
                            </SelectItem>
                          )}
                        {technicians.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600">
                      Prioridad
                    </Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => set('priority', v)}
                    >
                      <SelectTrigger className="mt-1 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                </div>

                <div className="shrink-0 border-t border-gray-100">
                  <div className={NEW_TICKET_SECTION_HD}>
                    <h2 className={dashboardFormSectionTitle}>Garantía</h2>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="text-[10px] leading-snug text-gray-500">
                      Si no sos servicio oficial, en la práctica casi siempre va{' '}
                      <span className="font-medium text-gray-700">Sin garantía</span> (TV, celular, pantalla nueva, etc.):
                      es trabajo facturable normal. Cambiá solo si es reingreso por un arreglo nuestro (mejor vinculando
                      la orden arriba) o si querés marcar un acuerdo especial en la orden.
                    </p>
                    {linkedRelatedTicket ? (
                      <p
                        className="rounded-md border border-teal-200 bg-teal-50/80 px-2.5 py-1.5 text-[11px] leading-snug text-teal-900"
                        role="status"
                      >
                        Reingreso vinculado a{' '}
                        <span className="font-semibold tabular-nums">
                          #{linkedRelatedTicket.ticket_number}
                        </span>
                        . Se usa <span className="font-medium">En garantía</span> para este caso. Quitá el vínculo si
                        necesitás otro valor.
                      </p>
                    ) : null}
                    <div>
                      <Label className="text-xs font-medium text-gray-600" htmlFor="new-ticket-warranty-info">
                        Estado (taller)
                      </Label>
                      <Select
                        value={form.warranty_info}
                        onValueChange={(v) => set('warranty_info', v)}
                        disabled={!!linkedRelatedTicket}
                      >
                        <SelectTrigger
                          id="new-ticket-warranty-info"
                          className="mt-1 h-8"
                          aria-describedby="new-ticket-warranty-hint"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sin garantía">Sin garantía — ingreso normal / a cobrar</SelectItem>
                          <SelectItem value="En garantía">
                            En garantía — reingreso por trabajo previo del taller
                          </SelectItem>
                          <SelectItem value="Garantía expirada">
                            Garantía expirada — acordaste que no cubre (detalle en la falla)
                          </SelectItem>
                          <SelectItem value="Garantía parcial">
                            Garantía parcial — cubre solo parte (mano de obra, pieza, etc.)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p id="new-ticket-warranty-hint" className="mt-1.5 text-[10px] leading-snug text-gray-500">
                        No describe el aparato: solo si este ingreso entra como cobrado o cubierto por acuerdo / garantía
                        del taller.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 border-t border-gray-100">
                  <div className={NEW_TICKET_SECTION_HD}>
                    <h2 className={dashboardFormSectionTitle}>Facturación</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Coste estimado ({sym})</Label>
                    <Input
                      className="mt-1 h-8"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.estimated_cost}
                      onChange={(e) => set('estimated_cost', e.target.value)}
                      aria-invalid={!!ticketRf.formState.errors.estimated_cost}
                    />
                    {ticketRf.formState.errors.estimated_cost?.message ? (
                      <p className="text-xs text-red-600 mt-1" role="alert">
                        {ticketRf.formState.errors.estimated_cost.message}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] leading-snug text-gray-500">
                        Desde <span className="font-medium text-gray-600">Servicio y precio</span> o aquí.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Coste final ({sym})</Label>
                    <Input
                      className="mt-1 h-8"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.final_cost}
                      onChange={(e) => set('final_cost', e.target.value)}
                      aria-invalid={!!ticketRf.formState.errors.final_cost}
                    />
                    {ticketRf.formState.errors.final_cost?.message ? (
                      <p className="text-xs text-red-600 mt-1" role="alert">
                        {ticketRf.formState.errors.final_cost.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-medium text-gray-600">Seña / adelanto ({sym})</Label>
                    <Input
                      className="mt-1 h-8"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.deposit_amount}
                      onChange={(e) => set('deposit_amount', e.target.value)}
                      aria-invalid={!!ticketRf.formState.errors.deposit_amount}
                    />
                    {ticketRf.formState.errors.deposit_amount?.message ? (
                      <p className="text-xs text-red-600 mt-1" role="alert">
                        {ticketRf.formState.errors.deposit_amount.message}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] leading-snug text-gray-500">
                        Al crear el ticket aún no hay cobros en caja; el pendiente es estimado.
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2 rounded-md border border-gray-100 bg-gray-50/90 px-3 py-2 text-[11px] text-gray-800">
                    <div className="flex justify-between gap-2 tabular-nums">
                      <span className="text-gray-600">Total trabajo (estim.)</span>
                      <span className="font-medium">
                        {sym} {billingPreview.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex justify-between gap-2 tabular-nums text-gray-600">
                      <span>− Seña</span>
                      <span>
                        {sym} {billingPreview.dep.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex justify-between gap-2 border-t border-gray-200 pt-1.5 font-semibold tabular-nums">
                      <span>Pendiente (estimado)</span>
                      <span className="text-primary">
                        {sym} {billingPreview.pending.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col border-t border-gray-100">
                  <div className={NEW_TICKET_SECTION_HD}>
                    <h2 className={dashboardFormSectionTitle}>Evidencia fotográfica al ingreso</h2>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-3">
                  <TicketIntakeWebcam
                    value={intakePhotoFiles}
                    onChange={setIntakePhotoFiles}
                    disabled={ticketRf.formState.isSubmitting}
                    maxPhotos={3}
                    hideSectionHeader
                  />
                </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 pb-4">
            <Button
              type="submit"
              disabled={ticketRf.formState.isSubmitting}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {ticketRf.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTicketId ? 'Guardar cambios' : 'Crear ticket'}
            </Button>
            <Button
              type="button"
              className="bg-primary text-white hover:bg-primary/90"
              disabled={ticketRf.formState.isSubmitting}
              onClick={() => {
                void submitDraftOnly();
              }}
            >
              Guardar como borrador
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={ticketRf.formState.isSubmitting}
              onClick={() =>
                router.push(editTicketId ? `/dashboard/tickets/${editTicketId}` : '/dashboard/tickets')
              }
            >
              Cancelar
            </Button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
