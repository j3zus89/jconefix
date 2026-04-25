'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronRight,
  Loader as Loader2,
  Search,
  User,
  History,
  X,
  ArrowLeft,
  UserPlus,
} from 'lucide-react';
import {
  WarrantyReintakeCard,
  WarrantyLinkFromHistoryButton,
  type RelatedTicketPick,
} from '@/components/dashboard/WarrantyReintakeCard';
import { warrantyReintakeDescriptionPreamble } from '@/lib/ticket-warranty-reintake';
import { toast } from 'sonner';
import { DiagnosticNotesWithAi } from '@/components/dashboard/DiagnosticNotesWithAi';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  customersOrgScopeOr,
  fetchActiveOrgMemberUserIds,
} from '@/lib/repair-tickets-org-scope';
import { notifyTicketAssignedToPanelUser, isUuid } from '@/lib/panel-notifications';
import { reserveNextBoletoTicketNumber } from '@/lib/boleto-ticket-number';
import { fetchTicketRepairsSettingsForOrg } from '@/lib/fetch-ticket-repairs-settings-org';
import type { TicketNumberStyle } from '@/lib/ticket-repairs-settings';
import { humanizeRepairTicketsSchemaError } from '@/lib/supabase-setup-hints';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import {
  dashboardFormSectionHeader,
  dashboardFormSectionTitle,
} from '@/components/dashboard/dashboard-form-styles';
import { DeviceUnlockInputs } from '@/components/dashboard/DeviceUnlockInputs';
import {
  composeAccessCredentials,
} from '@/lib/ticket-access-credentials';
import { NEW_FORM_STATUSES, DEVICE_CATEGORIES } from '@/lib/ticket-form-constants';
import { isTicketBrandInCategory } from '@/lib/repair-service-device-catalog';
import { TicketEquipmentLaborFields } from '@/components/dashboard/TicketEquipmentLaborFields';
import { DeviceBrandSelect } from '@/components/dashboard/DeviceBrandSelect';
import {
  laborCountryFromOrgLocale,
  mergeEquipmentLaborDiagnostic,
  type IntakeLaborServicePick,
} from '@/lib/ticket-intake-labor-part';
import { persistRepairLaborPriceFromIntake } from '@/lib/repair-labor-intake-sync';
import {
  IVA_CONDITIONS_AR,
  shouldShowCustomerRgpdSection,
  gdprConsentForPersist,
  repairCaseTerms,
} from '@/lib/locale';
import { validateArgentinaIvaCondition } from '@/lib/invoice-validation';
import {
  formatArgentinaIdInput,
  validateArgentinaIdNumber,
} from '@/lib/argentina-id-input';
import { formatImeiInput, imeiFieldError, normalizeImeiForDb } from '@/lib/imei-input';
import { cn } from '@/lib/utils';
import { TicketIntakeWebcam } from '@/components/dashboard/TicketIntakeWebcam';
import { uploadIntakeEvidencePhotos } from '@/lib/upload-intake-photos';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  id_type?: string | null;
  id_number?: string | null;
  tax_class?: string | null;
};

type Technician = {
  id: string;
  name: string;
  email: string;
};

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

export function ReceptionWizard() {
  const loc = useOrgLocale();
  const rtc = useMemo(() => repairCaseTerms(loc.isAR), [loc.isAR]);
  const sym = loc.symbol;
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get('customerId');
  const relatedTicketFromUrl = searchParams.get('relatedTicket');
  const supabase = createClient();
  const submitGuardRef = useRef(false);
  const prevOrgCountryForIdTypeRef = useRef<string | null>(null);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [customerTab, setCustomerTab] = useState<'search' | 'new'>('search');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    organization: '',
    phone: '',
    email: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    postal_code: '',
    id_type: '',
    id_number: '',
    tax_class: '',
    gdpr_consent: false,
    notes: '',
  });

  useEffect(() => {
    const prevC = prevOrgCountryForIdTypeRef.current;
    prevOrgCountryForIdTypeRef.current = loc.country;
    const countryChanged = prevC != null && prevC !== loc.country;
    setNewCustomer((p) => {
      if (countryChanged || !p.id_type) {
        return { ...p, id_type: loc.defaultIdType };
      }
      return p;
    });
  }, [loc.country, loc.defaultIdType]);

  const [deviceHistory, setDeviceHistory] = useState<DeviceHistoryTicket[]>([]);
  const [historyDismissed, setHistoryDismissed] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [ticketNumberStyle, setTicketNumberStyle] = useState<TicketNumberStyle>('padded_four');
  const [linkedRelatedTicket, setLinkedRelatedTicket] = useState<RelatedTicketPick | null>(null);
  const relatedUrlAppliedRef = useRef(false);

  const [equipmentLabor, setEquipmentLabor] = useState<IntakeLaborServicePick | null>(null);

  const [form, setForm] = useState({
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
  });

  const [intakePhotoFiles, setIntakePhotoFiles] = useState<File[]>([]);

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const applyWarrantyLinkFields = useCallback((pick: RelatedTicketPick) => {
    setLinkedRelatedTicket(pick);
    setForm((prev) => {
      const pre = warrantyReintakeDescriptionPreamble({
        parentTicketNumber: pick.ticket_number,
        parentCreatedAt: pick.created_at,
        isArgentina: loc.isAR,
      });
      const issue =
        prev.issue_description?.includes(pick.ticket_number)
          ? prev.issue_description
          : pre + (prev.issue_description || '');
      return {
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
      };
    });
  }, [loc.isAR]);

  const copyDeviceFieldsOnly = useCallback((pick: RelatedTicketPick) => {
    setForm((prev) => ({
      ...prev,
      device_type: pick.device_type || prev.device_type,
      device_brand: pick.device_brand || prev.device_brand,
      device_category: pick.device_category || prev.device_category,
      device_model: pick.device_model || prev.device_model,
      serial_number: pick.serial_number || prev.serial_number,
      imei: pick.imei || prev.imei,
    }));
    toast.success(rtc.copyDeviceFromLinked);
  }, [rtc]);

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
      const cid = selectedCustomer?.id || form.customer_id;
      if (cid && pick.customer_id !== cid) {
        toast.error(rtc.openLinkedWrongCustomer);
        return;
      }
      applyWarrantyLinkFields(pick);
      toast.success(`Vinculado a #${pick.ticket_number} · Garantía`);
    },
    [activeOrgId, supabase, selectedCustomer?.id, form.customer_id, applyWarrantyLinkFields, rtc]
  );

  useEffect(() => {
    if (!activeOrgId || !relatedTicketFromUrl || !isUuid(relatedTicketFromUrl) || relatedUrlAppliedRef.current) {
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
        .select('id, name, email, phone, organization, id_type, id_number, tax_class')
        .eq('id', pick.customer_id)
        .or(customerScopeOr)
        .maybeSingle();
      if (cust) {
        setSelectedCustomer(cust);
        setForm((prev) => ({
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
            : warrantyReintakeDescriptionPreamble({
                parentTicketNumber: pick.ticket_number,
                parentCreatedAt: pick.created_at,
                isArgentina: loc.isAR,
              }) + (prev.issue_description || ''),
        }));
        setCustomerSearch(cust.name);
      } else {
        applyWarrantyLinkFields(pick);
      }
      setStep(2);
      toast.message(`Ingreso preparado con vínculo a #${pick.ticket_number}. Describe el fallo actual y registra.`, {
        duration: 4200,
      });
    })();
  }, [activeOrgId, relatedTicketFromUrl, supabase, applyWarrantyLinkFields, loc.isAR, rtc]);

  const searchDeviceHistory = async (imei: string, serial: string) => {
    const imeiNorm = formatImeiInput(imei);
    const val = (imeiNorm || serial).trim();
    if (val.length < 5) {
      setDeviceHistory([]);
      return;
    }
    setHistoryDismissed(false);
    try {
      const params = new URLSearchParams();
      if (imeiNorm) params.set('imei', imeiNorm);
      if (serial.trim()) params.set('serial', serial.trim());
      const res = await fetch(`/api/dashboard/device-history?${params.toString()}`);
      if (!res.ok) return;
      const json = (await res.json()) as { tickets: DeviceHistoryTicket[] };
      setDeviceHistory(json.tickets ?? []);
    } catch {
      /* silencioso */
    }
  };

  const bootstrap = useCallback(async () => {
    setBootstrapping(true);
    try {
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
        .select('id, name, email, phone, organization, id_type, id_number, tax_class')
        .or(customerScopeOr)
        .order('name');

      const { data: tData } = await (supabase as any)
        .from('technicians')
        .select('id, name, email')
        .or(`organization_id.eq.${orgId},shop_owner_id.eq.${user.id}`)
        .eq('is_active', true)
        .order('name');

      const list = cData || [];
      setCustomers(list);
      setTechnicians(tData || []);

      if (presetCustomerId) {
        const { data: row } = await supabase
          .from('customers')
          .select('id, name, email, phone, organization, id_type, id_number, tax_class')
          .eq('id', presetCustomerId)
          .or(customerScopeOr)
          .maybeSingle();
        if (row) {
          setSelectedCustomer(row);
          setForm((prev) => ({ ...prev, customer_id: row.id }));
          setCustomerSearch(row.name);
          setStep(2);
        } else {
          toast.error('Cliente no encontrado en tu organización.');
        }
      }
    } finally {
      setBootstrapping(false);
    }
  }, [supabase, presetCustomerId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone || '').includes(customerSearch)
  );

  const newCustomerCountryLabel = loc.defaultCountry;
  const showRgpdNew = shouldShowCustomerRgpdSection(loc.country, newCustomerCountryLabel);

  const assertArCustomerFiscal = (
    idType: string | null | undefined,
    idNum: string | null | undefined,
    taxClass: string | null | undefined,
  ) => {
    const idn = (idNum || '').trim();
    if (!idn) {
      toast.error('Argentina: indicá el documento del cliente.');
      return false;
    }
    const idErr = validateArgentinaIdNumber(idType || loc.defaultIdType, idn);
    if (idErr) {
      toast.error(idErr);
      return false;
    }
    const ivaErrs = validateArgentinaIvaCondition(taxClass);
    if (ivaErrs.length) {
      toast.error(ivaErrs[0]);
      return false;
    }
    return true;
  };

  const handleContinueStep1 = async () => {
    if (customerTab === 'search') {
      if (!selectedCustomer) {
        toast.error('Busca y selecciona un cliente o cambia a «Cliente nuevo».');
        return;
      }
      if (loc.isAR) {
        if (
          !assertArCustomerFiscal(
            selectedCustomer.id_type || loc.defaultIdType,
            selectedCustomer.id_number,
            selectedCustomer.tax_class,
          )
        )
          return;
      }
      setForm((prev) => ({ ...prev, customer_id: selectedCustomer.id }));
      setStep(2);
      return;
    }

    if (!newCustomer.first_name && !newCustomer.last_name && !newCustomer.organization.trim()) {
      toast.error('Indica nombre y apellidos o el nombre de la empresa.');
      return;
    }
    if (loc.isAR) {
      if (
        !assertArCustomerFiscal(
          newCustomer.id_type || loc.defaultIdType,
          newCustomer.id_number,
          newCustomer.tax_class,
        )
      )
        return;
    }

    setSavingCustomer(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }

      const fullName =
        [newCustomer.first_name, newCustomer.last_name].filter(Boolean).join(' ') ||
        newCustomer.organization.trim();

      const { data: inserted, error } = await supabase
        .from('customers')
        .insert([
          {
            user_id: user.id,
            organization_id: orgId,
            name: fullName,
            first_name: newCustomer.first_name || null,
            last_name: newCustomer.last_name || null,
            email: newCustomer.email || null,
            phone: newCustomer.phone || null,
            organization: newCustomer.organization.trim() || null,
            customer_group: 'Particular',
            how_did_you_find_us: null,
            tags: null,
            tax_class: newCustomer.tax_class.trim() || null,
            address: newCustomer.address.trim() || null,
            address2: newCustomer.address2.trim() || null,
            city: newCustomer.city.trim() || null,
            state: newCustomer.state.trim() || null,
            postal_code: newCustomer.postal_code.trim() || null,
            country: newCustomerCountryLabel,
            id_type: newCustomer.id_type || loc.defaultIdType,
            id_number: newCustomer.id_number.trim() || null,
            drivers_license: null,
            mailchimp_status: 'No suscrito',
            gdpr_consent: gdprConsentForPersist(showRgpdNew, newCustomer.gdpr_consent),
            email_notifications: true,
            contact_person: null,
            contact_phone: null,
            contact_relation: null,
            notes: newCustomer.notes || null,
          },
        ])
        .select('id, name, email, phone, organization, id_type, id_number, tax_class')
        .single();

      if (error) throw error;
      if (!inserted) throw new Error('Sin datos del cliente');

      const c: Customer = {
        id: inserted.id,
        name: inserted.name,
        email: inserted.email,
        phone: inserted.phone,
        organization: inserted.organization,
        id_type: (inserted as { id_type?: string | null }).id_type ?? null,
        id_number: (inserted as { id_number?: string | null }).id_number ?? null,
        tax_class: (inserted as { tax_class?: string | null }).tax_class ?? null,
      };
      setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCustomer(c);
      setForm((prev) => ({ ...prev, customer_id: c.id }));
      setCustomerTab('search');
      toast.success('Cliente registrado');
      setStep(2);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear el cliente';
      toast.error(msg);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    const cid = selectedCustomer?.id || form.customer_id;
    if (!cid) {
      toast.error('Falta el cliente.');
      return;
    }
    if (loc.isAR && selectedCustomer?.id === cid) {
      if (
        !assertArCustomerFiscal(
          selectedCustomer.id_type || loc.defaultIdType,
          selectedCustomer.id_number,
          selectedCustomer.tax_class,
        )
      )
        return;
    }
    if (!form.device_type) {
      toast.error('Indica el dispositivo');
      return;
    }
    if (!form.issue_description) {
      toast.error('Describe el problema');
      return;
    }

    const imeiErr = imeiFieldError(form.imei);
    if (imeiErr) {
      toast.error(imeiErr);
      return;
    }

    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    setSavingTicket(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }

      const arSnap =
        loc.isAR && selectedCustomer?.id === cid
          ? {
              customer_fiscal_id_ar: selectedCustomer.id_number?.trim() || null,
              customer_iva_condition_ar: selectedCustomer.tax_class?.trim() || null,
            }
          : {};

      const payload = {
        customer_id: cid,
        device_type: form.device_type,
        device_brand: form.device_brand || null,
        device_category: form.device_category || null,
        device_model: form.device_model || null,
        device_screen_inches:
          form.device_category === 'SMART_TV'
            ? form.device_screen_inches?.trim() || null
            : null,
        serial_number: form.serial_number || null,
        imei: normalizeImeiForDb(form.imei),
        issue_description: form.issue_description,
        status: saveAsDraft ? 'draft' : form.status,
        priority: form.priority,
        task_type: form.task_type,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        final_cost: form.final_cost ? parseFloat(form.final_cost) : null,
        deposit_amount: form.deposit_amount?.trim()
          ? parseFloat(String(form.deposit_amount).replace(',', '.'))
          : null,
        notes: form.notes || null,
        diagnostic_notes:
          mergeEquipmentLaborDiagnostic(form.diagnostic_notes, equipmentLabor, form.estimated_cost, sym) || null,
        pin_pattern: composeAccessCredentials(form.device_pin, form.unlock_pattern),
        warranty_info: form.warranty_info || null,
        related_ticket_id: linkedRelatedTicket?.id ?? null,
        assigned_to:
          form.assigned_to && form.assigned_to !== 'unassigned' ? form.assigned_to : null,
        is_urgent: form.is_urgent,
        is_draft: saveAsDraft,
        ...arSnap,
      };

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

      if (res.error) throw res.error;
      let data = res.data;
      if (!data) throw new Error('Sin datos del ticket');

      if (
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
            form.device_category === 'SMART_TV' && form.device_screen_inches?.trim()
              ? form.device_screen_inches.trim()
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
              'Ticket guardado. El aviso en la campana solo lo ve quien está enlazado como «Usuario del panel» en ese empleado.',
              { duration: 6000, id: 'notify-assign-hint-recepcion' }
            );
          }
        } catch {
          /* no bloquear */
        }
      }

      {
        const { errorMessage } = await persistRepairLaborPriceFromIntake(
          supabase,
          equipmentLabor,
          form.estimated_cost
        );
        if (errorMessage) toast.message(errorMessage, { duration: 8000 });
      }

      if (intakePhotoFiles.length > 0) {
        try {
          await uploadIntakeEvidencePhotos(supabase, data.id, user.id, intakePhotoFiles);
        } catch (upErr) {
          console.error('[recepción] fotos ingreso', upErr);
          toast.error(
            'El ingreso se registró, pero hubo un error al subir una o más fotos. Podés añadirlas desde la ficha del ticket.',
          );
        }
        setIntakePhotoFiles([]);
      }

      toast.success(saveAsDraft ? 'Borrador guardado' : 'Ingreso registrado');
      router.push(`/dashboard/tickets/${data.id}`);
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : 'Error al guardar el ticket';
      toast.error(humanizeRepairTicketsSchemaError(raw));
    } finally {
      submitGuardRef.current = false;
      setSavingTicket(false);
    }
  };

  if (bootstrapping) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-gray-600">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Preparando recepción…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-700">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/dashboard/tickets" className="hover:text-gray-700">
            Reparaciones
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">Recepción</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Recepción · Nuevo ingreso</h1>
          <p className="mt-1 text-sm text-gray-600">
            Flujo de recepción para un nuevo registro: primero el cliente y después el equipo y el ticket. La alta rápida
            usa los mismos campos que{' '}
            <Link href="/dashboard/customers/new" className="text-primary hover:underline">
              Nuevo cliente
            </Link>
            . Para abrir solo un ticket sin este asistente:{' '}
            <Link href="/dashboard/tickets/new" className="text-primary hover:underline">
              Nuevo ticket
            </Link>
            .
          </p>
        </div>

        {/* Pasos */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              step === 1
                ? 'bg-primary text-primary-foreground'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
            )}
          >
            1 · Cliente
          </button>
          <span className="text-gray-300">—</span>
          <span
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium',
              step === 2
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
            )}
          >
            2 · Equipo y ticket
          </span>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className={dashboardFormSectionHeader}>
                <h2 className={dashboardFormSectionTitle}>¿Quién trae el equipo?</h2>
              </div>
              <div className="p-5">
                <div className="mb-4 flex gap-2 rounded-lg bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setCustomerTab('search')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
                      customerTab === 'search'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <Search className="h-4 w-4" />
                    Buscar existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerTab('new')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
                      customerTab === 'new'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <UserPlus className="h-4 w-4" />
                    Cliente nuevo (rápido)
                  </button>
                </div>

                {customerTab === 'search' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">
                        Buscar <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                          <input
                            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Nombre, email o teléfono…"
                            value={customerSearch}
                            onChange={(e) => {
                              setCustomerSearch(e.target.value);
                              setShowCustomerList(true);
                            }}
                            onFocus={() => setShowCustomerList(true)}
                          />
                        </div>
                        {showCustomerList && customerSearch && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {filteredCustomers.length === 0 ? (
                              <div className="px-3 py-3 text-center text-sm text-gray-500">
                                No hay coincidencias
                              </div>
                            ) : (
                              filteredCustomers.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(c);
                                    setForm((prev) => ({ ...prev, customer_id: c.id }));
                                    setCustomerSearch(c.name);
                                    setShowCustomerList(false);
                                  }}
                                  className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                                    <User className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{c.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {c.email || c.phone || c.organization || '—'}
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedCustomer && (
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
                          <span className="text-sm font-bold text-white">
                            {selectedCustomer.name[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900">
                            {selectedCustomer.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {[selectedCustomer.phone, selectedCustomer.email]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:text-red-600"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setForm((prev) => ({ ...prev, customer_id: '' }));
                            setCustomerSearch('');
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {customerTab === 'new' && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-2.5 text-sm">
                      <p className="font-semibold text-teal-950">Alta rápida en recepción</p>
                      <p className="mt-0.5 text-xs text-teal-900/90">
                        Tipo de documento (CUIT/CUIL/DNI), número fiscal, código postal y provincia, alineados con el alta
                        completa en{' '}
                        <Link href="/dashboard/customers/new" className="font-medium text-teal-800 underline-offset-2 hover:underline">
                          Nuevo cliente
                        </Link>
                        .
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Datos básicos
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Nombre</Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.first_name}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, first_name: e.target.value }))
                            }
                            placeholder={loc.isAR ? 'Nombre' : 'Juan'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Apellidos</Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.last_name}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, last_name: e.target.value }))
                            }
                            placeholder={loc.isAR ? 'Apellidos' : 'García'}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs font-medium text-gray-600">
                            {loc.isAR ? 'Razón social (si es empresa)' : 'Empresa (si aplica)'}
                          </Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.organization}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, organization: e.target.value }))
                            }
                            placeholder={loc.isAR ? 'S.A., SRL…' : 'Nombre de la empresa…'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">
                            Correo electrónico
                          </Label>
                          <Input
                            className="mt-1 h-9"
                            type="email"
                            value={newCustomer.email}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, email: e.target.value }))
                            }
                            placeholder="correo@ejemplo.com"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Móvil</Label>
                          <div className="mt-1 flex gap-2">
                            <div className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600">
                              <span className="text-base">{loc.phoneFlag}</span>
                              <span>{loc.phonePrefix}</span>
                            </div>
                            <Input
                              className="h-9 flex-1"
                              type="tel"
                              value={newCustomer.phone}
                              onChange={(e) =>
                                setNewCustomer((p) => ({ ...p, phone: e.target.value }))
                              }
                              placeholder={loc.phonePlaceholder}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Ubicación (opcional)
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Label className="text-xs font-medium text-gray-600">Dirección</Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.address}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, address: e.target.value }))
                            }
                            placeholder={loc.isAR ? 'Calle y número' : 'Calle Mayor, 123'}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs font-medium text-gray-600">
                            Piso / Depto / Dto.
                          </Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.address2}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, address2: e.target.value }))
                            }
                            placeholder={loc.isAR ? 'Piso, departamento' : '3º B'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Ciudad</Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.city}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, city: e.target.value }))
                            }
                            placeholder={loc.cityPlaceholder}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">
                            {loc.stateLabel}
                          </Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.state}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, state: e.target.value }))
                            }
                            placeholder={loc.statePlaceholder}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">
                            {loc.isAR ? 'CPA / Código postal' : 'Código postal'}
                          </Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.postal_code}
                            onChange={(e) =>
                              setNewCustomer((p) => ({ ...p, postal_code: e.target.value }))
                            }
                            placeholder={loc.postalPlaceholder}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">País</Label>
                          <Input
                            className="mt-1 h-9 bg-gray-50 text-gray-700"
                            readOnly
                            value={newCustomerCountryLabel}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Identificación
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs font-medium text-gray-600">Tipo de ID</Label>
                          <Select
                            value={newCustomer.id_type || loc.defaultIdType}
                            onValueChange={(v) =>
                              setNewCustomer((p) => ({
                                ...p,
                                id_type: v,
                                id_number: loc.isAR ? formatArgentinaIdInput(v, p.id_number) : p.id_number,
                              }))
                            }
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {loc.isAR ? (
                                <>
                                  <SelectItem value="CUIT">CUIT</SelectItem>
                                  <SelectItem value="CUIL">CUIL</SelectItem>
                                  <SelectItem value="DNI">DNI</SelectItem>
                                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                                  <SelectItem value="Otro">Otro</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="DNI">DNI</SelectItem>
                                  <SelectItem value="NIE">NIE</SelectItem>
                                  <SelectItem value="NIF">NIF</SelectItem>
                                  <SelectItem value="CIF">CIF</SelectItem>
                                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                                  <SelectItem value="Número de seguro social">
                                    Número de seguro social
                                  </SelectItem>
                                  <SelectItem value="Otro">Otro</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-600">
                            {loc.fiscalId}
                          </Label>
                          <Input
                            className="mt-1 h-9"
                            value={newCustomer.id_number}
                            onChange={(e) =>
                              setNewCustomer((p) => ({
                                ...p,
                                id_number: loc.isAR
                                  ? formatArgentinaIdInput(p.id_type || loc.defaultIdType, e.target.value)
                                  : e.target.value,
                              }))
                            }
                            placeholder={loc.idNumberPlaceholder}
                            inputMode={
                              loc.isAR &&
                              ['CUIT', 'CUIL', 'DNI'].includes(newCustomer.id_type || loc.defaultIdType)
                                ? 'numeric'
                                : undefined
                            }
                            autoComplete="off"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs font-medium text-gray-600">
                            {loc.vat}
                          </Label>
                          <Select
                            value={newCustomer.tax_class || undefined}
                            onValueChange={(v) =>
                              setNewCustomer((p) => ({ ...p, tax_class: v }))
                            }
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue
                                placeholder={
                                  loc.isAR ? 'Condición frente al IVA…' : 'Clase de impuestos…'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {loc.isAR ? (
                                <>
                                  {IVA_CONDITIONS_AR.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </>
                              ) : (
                                <>
                                  <SelectItem value="Sin impuesto">Sin impuesto</SelectItem>
                                  <SelectItem value="IVA 10%">IVA 10%</SelectItem>
                                  <SelectItem value="IVA 21%">IVA 21%</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-gray-600">Notas internas</Label>
                      <Textarea
                        className="mt-1"
                        rows={2}
                        value={newCustomer.notes}
                        onChange={(e) =>
                          setNewCustomer((p) => ({ ...p, notes: e.target.value }))
                        }
                        placeholder="Opcional"
                      />
                    </div>

                    {showRgpdNew && (
                      <div className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50/80 p-3">
                        <Checkbox
                          id="rgpd_recepcion"
                          checked={newCustomer.gdpr_consent}
                          onCheckedChange={(v) =>
                            setNewCustomer((p) => ({ ...p, gdpr_consent: !!v }))
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <label
                            htmlFor="rgpd_recepcion"
                            className="cursor-pointer text-sm font-medium text-gray-700"
                          >
                            Conformidad con GDPR
                          </label>
                          <p className="mt-0.5 text-xs text-gray-500">
                            El cliente ha aceptado el tratamiento de datos conforme al RGPD
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={savingCustomer}
                    onClick={() => void handleContinueStep1()}
                  >
                    {savingCustomer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continuar al equipo
                  </Button>
                  <Link href="/dashboard/customers">
                    <Button type="button" variant="outline">
                      Ver todos los clientes
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && selectedCustomer && (
          <form onSubmit={handleSubmitTicket} className="space-y-5">
            <div className="overflow-hidden rounded-lg border border-teal-200 bg-teal-50/40">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
                      Cliente
                    </p>
                    <p className="truncate font-semibold text-gray-900">{selectedCustomer.name}</p>
                    <p className="truncate text-xs text-gray-600">
                      {[selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Cambiar cliente
                </Button>
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

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <div className="overflow-visible rounded-lg border border-gray-200 bg-white">
                  <div className={dashboardFormSectionHeader}>
                    <h2 className={dashboardFormSectionTitle}>Equipo</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-5">
                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-gray-600">
                        Dispositivo <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="mt-1 h-9"
                        placeholder="iPhone 16 Pro Max, Samsung S24…"
                        value={form.device_type}
                        onChange={(e) => set('device_type', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Categoría</Label>
                      <Select
                        value={form.device_category}
                        onValueChange={(v) =>
                          setForm((prev) => ({
                            ...prev,
                            device_category: v,
                            device_brand: isTicketBrandInCategory(prev.device_brand, v)
                              ? prev.device_brand
                              : '',
                            device_screen_inches: v === 'SMART_TV' ? prev.device_screen_inches : '',
                          }))
                        }
                      >
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue placeholder="Seleccionar…" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.device_category && !DEVICE_CATEGORIES.has(form.device_category) && (
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
                        className="mt-1 h-9"
                        placeholder="A2483, SM-S928B…"
                        value={form.device_model}
                        onChange={(e) => set('device_model', e.target.value)}
                      />
                    </div>

                    {form.device_category === 'SMART_TV' ? (
                      <div className="col-span-2 rounded-lg border border-teal-100 bg-teal-50/40 px-3 py-3">
                        <Label className="text-xs font-medium text-gray-700">
                          Pulgadas (pantalla){' '}
                          <span className="font-normal text-gray-500">— opcional</span>
                        </Label>
                        <Input
                          className="mt-1.5 h-9 bg-white"
                          placeholder="Ej. 55, 55 pulgadas, 55&quot;…"
                          value={form.device_screen_inches}
                          onChange={(e) => set('device_screen_inches', e.target.value)}
                          autoComplete="off"
                        />
                        <p className="text-[11px] text-gray-500 mt-1.5">
                          El cliente puede indicar la diagonal; podés dejarlo vacío si no aplica.
                        </p>
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
                        className="mt-1 h-9"
                        value={form.imei}
                        inputMode="numeric"
                        placeholder="15 dígitos (opcional)"
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
                          Opcional. Si lo cargás, exactamente 15 dígitos (sin letras ni símbolos).
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600">N.º de serie</Label>
                      <Input
                        className="mt-1 h-9"
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
                    {deviceHistory.length > 0 && !historyDismissed && (
                      <div className="col-span-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                            <History className="h-3.5 w-3.5 shrink-0" />
                            Este equipo ya estuvo en el taller
                          </div>
                          <button
                            type="button"
                            onClick={() => setHistoryDismissed(true)}
                            className="shrink-0 text-amber-500 hover:text-amber-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <ul className="space-y-1.5">
                          {deviceHistory.slice(0, 5).map((t) => (
                            <li
                              key={t.id}
                              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-900"
                            >
                              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                              <span className="inline-flex flex-wrap items-center gap-x-2">
                                <a
                                  href={`/dashboard/tickets/${t.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium underline underline-offset-2"
                                >
                                  #{t.ticket_number}
                                </a>
                                <span className="text-amber-800/90">
                                  {new Date(t.created_at).toLocaleDateString('es-ES')}
                                </span>
                                <WarrantyLinkFromHistoryButton
                                  ticketNumber={t.ticket_number}
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
                        Problema / motivo de ingreso <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        className="mt-1"
                        rows={3}
                        value={form.issue_description}
                        onChange={(e) => set('issue_description', e.target.value)}
                        required
                        placeholder="Qué ocurre, desde cuándo, si hay golpe o líquido…"
                      />
                    </div>
                    <DiagnosticNotesWithAi
                      value={form.diagnostic_notes}
                      onChange={(v) => set('diagnostic_notes', v)}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className={dashboardFormSectionHeader}>
                    <h2 className={dashboardFormSectionTitle}>Facturación</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-5">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">
                        Coste estimado ({sym})
                      </Label>
                      <Input
                        className="mt-1 h-9"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.estimated_cost}
                        onChange={(e) => set('estimated_cost', e.target.value)}
                      />
                      <p className="mt-1 text-[10px] text-gray-500">
                        Lo normal es usar el bloque <span className="font-medium text-gray-600">Servicio y precio</span> en
                        Equipo; aquí puedes corregirlo.
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600">
                        Coste final ({sym})
                      </Label>
                      <Input
                        className="mt-1 h-9"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.final_cost}
                        onChange={(e) => set('final_cost', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-gray-600">
                        Seña / adelanto ({sym})
                      </Label>
                      <Input
                        className="mt-1 h-9"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.deposit_amount}
                        onChange={(e) => set('deposit_amount', e.target.value)}
                      />
                      <p className="mt-1 text-[10px] text-gray-500">
                        Lo abonado al ingreso. El pendiente se calcula con el total del trabajo y los cobros en caja.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className={dashboardFormSectionHeader}>
                    <h2 className={dashboardFormSectionTitle}>Estado y asignación</h2>
                  </div>
                  <div className="space-y-4 p-4">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Estado</Label>
                      <Select value={form.status} onValueChange={(v) => set('status', v)}>
                        <SelectTrigger className="mt-1 h-9">
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
                      <Label className="text-xs font-medium text-gray-600">Tipo de tarea</Label>
                      <Select value={form.task_type} onValueChange={(v) => set('task_type', v)}>
                        <SelectTrigger className="mt-1 h-9">
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
                      <Label className="text-xs font-medium text-gray-600">Técnico</Label>
                      <Select
                        value={form.assigned_to || 'unassigned'}
                        onValueChange={(v) => set('assigned_to', v === 'unassigned' ? '' : v)}
                      >
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
                          {form.assigned_to &&
                            !technicians.some((t) => t.id === form.assigned_to) && (
                              <SelectItem value={form.assigned_to}>Asignado</SelectItem>
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
                      <Label className="text-xs font-medium text-gray-600">Prioridad</Label>
                      <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                        <SelectTrigger className="mt-1 h-9">
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

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className={dashboardFormSectionHeader}>
                    <h2 className={dashboardFormSectionTitle}>Garantía</h2>
                  </div>
                  <div className="p-4">
                    <Select
                      value={form.warranty_info}
                      onValueChange={(v) => set('warranty_info', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sin garantía">Sin garantía</SelectItem>
                        <SelectItem value="En garantía">En garantía</SelectItem>
                        <SelectItem value="Garantía expirada">Garantía expirada</SelectItem>
                        <SelectItem value="Garantía parcial">Garantía parcial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className={dashboardFormSectionHeader}>
                    <h2 className={dashboardFormSectionTitle}>Evidencia fotográfica al ingreso</h2>
                  </div>
                  <div className="space-y-3 p-4">
                    <TicketIntakeWebcam
                      value={intakePhotoFiles}
                      onChange={setIntakePhotoFiles}
                      disabled={savingTicket}
                      maxPhotos={3}
                      hideSectionHeader
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pb-10">
              <Button
                type="submit"
                disabled={savingTicket}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {savingTicket && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar ingreso
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={savingTicket}
                onClick={(e) => handleSubmitTicket(e, true)}
              >
                Guardar borrador
              </Button>
              <Link href="/dashboard/tickets">
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
