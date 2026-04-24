'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  dashboardFormSectionHeader,
  dashboardFormSectionTitle,
} from '@/components/dashboard/dashboard-form-styles';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { shouldShowCustomerRgpdSection, gdprConsentForPersist } from '@/lib/locale';
import {
  formatArgentinaIdInput,
  formatStoredArgentinaIdForDisplay,
  validateArgentinaIdNumber,
} from '@/lib/argentina-id-input';
import { WhatsAppQuickSendModal } from '@/components/whatsapp/WhatsAppQuickSendModal';
import { WhatsAppLogo } from '@/components/whatsapp/WhatsAppLogo';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const supabase = createClient();
  const loc = useOrgLocale();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerOrgId, setCustomerOrgId] = useState<string | null>(null);
  const [orgCountry, setOrgCountry] = useState<string>('');
  const [waOpen, setWaOpen] = useState(false);

  const [form, setForm] = useState({
    customer_group: 'Particular',
    organization: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    how_did_you_find_us: '',
    tags: '',
    tax_class: '',
    work_network: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Argentina',
    id_type: '',
    id_number: '',
    drivers_license: '',
    mailchimp_status: 'No suscrito',
    contact_person: '',
    contact_phone: '',
    contact_relation: '',
    gdpr_consent: false,
    email_notifications: true,
    notes: '',
  });

  useEffect(() => {
    loadCustomer();
    (async () => {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) return;
      const { data } = await (supabase as any)
        .from('organizations')
        .select('country')
        .eq('id', orgId)
        .maybeSingle();
      if (data?.country) setOrgCountry(data.country);
    })();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      if (data) {
        setCustomerOrgId((data as { organization_id?: string | null }).organization_id ?? null);
        setForm({
          customer_group:
            data.customer_group === 'Individual'
              ? 'Particular'
              : data.customer_group || 'Particular',
          organization: data.organization || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          how_did_you_find_us: data.how_did_you_find_us || '',
          tags: data.tags || '',
          tax_class: data.tax_class || '',
          work_network: data.work_network || '',
          address: data.address || '',
          address2: data.address2 || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          country: data.country || 'Argentina',
          id_type: data.id_type || '',
          id_number: formatStoredArgentinaIdForDisplay(data.id_type, data.id_number || ''),
          drivers_license: data.drivers_license || '',
          mailchimp_status: data.mailchimp_status || 'No suscrito',
          contact_person: data.contact_person || '',
          contact_phone: data.contact_phone || '',
          contact_relation: data.contact_relation || '',
          gdpr_consent: data.gdpr_consent || false,
          email_notifications: data.email_notifications ?? true,
          notes: data.notes || '',
        });
      }
    } catch (error: any) {
      toast.error('Error al cargar cliente');
      router.push('/dashboard/customers');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name && !form.last_name && !form.organization) {
      toast.error('Por favor ingresa un nombre o organización');
      return;
    }

    if (orgCountry === 'AR') {
      const idErr = validateArgentinaIdNumber(form.id_type, form.id_number);
      if (idErr) {
        toast.error(idErr);
        return;
      }
    }

    setSaving(true);
    try {
      const fullName =
        [form.first_name, form.last_name].filter(Boolean).join(' ') ||
        form.organization;

      const showRgpd = shouldShowCustomerRgpdSection(loc.country, form.country);

      const activeOrgId = await getActiveOrganizationId(supabase);
      const patchOrg =
        !customerOrgId && activeOrgId ? { organization_id: activeOrgId } : {};

      const { error } = await supabase
        .from('customers')
        .update({
          ...patchOrg,
          name: fullName,
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          email: form.email || null,
          phone: form.phone || null,
          organization: form.organization || null,
          customer_group: form.customer_group,
          how_did_you_find_us: form.how_did_you_find_us || null,
          tags: form.tags || null,
          tax_class: form.tax_class || null,
          work_network: form.work_network || null,
          address: form.address || null,
          address2: form.address2 || null,
          city: form.city || null,
          state: form.state || null,
          postal_code: form.postal_code || null,
          country: form.country || null,
          id_type: form.id_type || null,
          id_number: form.id_number || null,
          drivers_license: form.drivers_license || null,
          mailchimp_status: form.mailchimp_status,
          gdpr_consent: gdprConsentForPersist(showRgpd, form.gdpr_consent),
          email_notifications: form.email_notifications,
          contact_person: form.contact_person || null,
          contact_phone: form.contact_phone || null,
          contact_relation: form.contact_relation || null,
          notes: form.notes || null,
        })
        .eq('id', customerId);

      if (error) throw error;
      if (patchOrg.organization_id) setCustomerOrgId(patchOrg.organization_id);
      toast.success('Cliente actualizado correctamente');
      router.push('/dashboard/customers');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar cliente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const customerDisplayName =
    [form.first_name, form.last_name].filter(Boolean).join(' ').trim() ||
    form.organization.trim() ||
    'Cliente';

  const showRgpdSection = shouldShowCustomerRgpdSection(loc.country, form.country);

  return (
    <div className="min-h-full bg-primary text-foreground">
      <div className="bg-primary border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-700">Inicio</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/dashboard/customers" className="hover:text-gray-700">Clientes</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900 font-medium">Editar</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Editar cliente</h1>
          <Button
            type="button"
            className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-white"
            disabled={!form.phone?.trim()}
            title={!form.phone?.trim() ? 'Añade un móvil al cliente' : undefined}
            onClick={() => setWaOpen(true)}
          >
            <WhatsAppLogo className="h-4 w-4 shrink-0" />
            Enviar
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-primary rounded-lg border border-gray-200 overflow-hidden">
            <div className={dashboardFormSectionHeader}>
              <h2 className={dashboardFormSectionTitle}>Información básica</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-gray-600">Grupo de clientes</Label>
                <Select value={form.customer_group} onValueChange={(v) => set('customer_group', v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Particular">Particular</SelectItem>
                    <SelectItem value="Empresa">Empresa</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Mayorista">Mayorista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Organización</Label>
                <Input className="mt-1 h-9" placeholder="Nombre de la empresa..." value={form.organization} onChange={(e) => set('organization', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Nombre</Label>
                <Input className="mt-1 h-9" placeholder="Juan" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Apellido</Label>
                <Input className="mt-1 h-9" placeholder="García" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Correo electrónico</Label>
                <Input className="mt-1 h-9" type="email" placeholder="juan@ejemplo.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Móvil</Label>
                <div className="flex mt-1 gap-2">
                  <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2.5 h-9 text-sm text-gray-600 bg-gray-50 flex-shrink-0">
                    <span className="text-base">{loc.phoneFlag}</span>
                    <span>{loc.phonePrefix}</span>
                  </div>
                  <Input className="h-9 flex-1" type="tel" placeholder={loc.phonePlaceholder} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary rounded-lg border border-gray-200 overflow-hidden">
            <div className={dashboardFormSectionHeader}>
              <h2 className={dashboardFormSectionTitle}>Dirección</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs font-medium text-gray-600">Dirección</Label>
                <Input className="mt-1 h-9" placeholder="Calle Mayor, 123" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium text-gray-600">Piso / Apartamento</Label>
                <Input className="mt-1 h-9" placeholder="3º B" value={form.address2} onChange={(e) => set('address2', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Ciudad</Label>
                <Input className="mt-1 h-9" placeholder={loc.cityPlaceholder} value={form.city} onChange={(e) => set('city', e.target.value)} autoComplete="off" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Provincia</Label>
                <Input className="mt-1 h-9" placeholder={loc.statePlaceholder} value={form.state} onChange={(e) => set('state', e.target.value)} autoComplete="off" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Código Postal</Label>
                <Input className="mt-1 h-9" placeholder={loc.postalPlaceholder} value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} autoComplete="off" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">País</Label>
                <Select value={form.country} onValueChange={(v) => set('country', v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="México">México</SelectItem>
                    <SelectItem value="Argentina">Argentina</SelectItem>
                    <SelectItem value="Colombia">Colombia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-primary rounded-lg border border-gray-200 overflow-hidden">
            <div className={dashboardFormSectionHeader}>
              <h2 className={dashboardFormSectionTitle}>Información adicional</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-gray-600">Tipo de ID</Label>
                <Select
                  value={form.id_type}
                  onValueChange={(v) => {
                    setForm((prev) => ({
                      ...prev,
                      id_type: v,
                      id_number:
                        orgCountry === 'AR' ? formatArgentinaIdInput(v, prev.id_number) : prev.id_number,
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {orgCountry === 'AR' ? (
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
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="Número de seguro social">Número de seguro social</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Número de identificación</Label>
                <Input
                  className="mt-1 h-9"
                  placeholder={orgCountry === 'AR' ? '20-12345678-9' : '12345678A'}
                  value={form.id_number}
                  onChange={(e) =>
                    set(
                      'id_number',
                      orgCountry === 'AR'
                        ? formatArgentinaIdInput(form.id_type, e.target.value)
                        : e.target.value
                    )
                  }
                  inputMode={
                    orgCountry === 'AR' && ['CUIT', 'CUIL', 'DNI'].includes(form.id_type)
                      ? 'numeric'
                      : undefined
                  }
                  autoComplete="off"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium text-gray-600">Notas</Label>
                <Textarea className="mt-1" rows={3} placeholder="Notas adicionales..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-primary rounded-lg border border-gray-200 overflow-hidden">
            <div className={dashboardFormSectionHeader}>
              <h2 className={dashboardFormSectionTitle}>Configuración</h2>
            </div>
            <div className="p-5 space-y-4">
              {showRgpdSection && (
                <div className="flex items-start gap-3">
                  <Checkbox id="gdpr" checked={form.gdpr_consent} onCheckedChange={(v) => set('gdpr_consent', !!v)} className="mt-0.5" />
                  <div>
                    <label htmlFor="gdpr" className="text-sm font-medium text-gray-700 cursor-pointer">Conformidad con GDPR</label>
                    <p className="text-xs text-gray-500 mt-0.5">El cliente ha aceptado el tratamiento de datos</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Checkbox id="email_notif" checked={form.email_notifications} onCheckedChange={(v) => set('email_notifications', !!v)} className="mt-0.5" />
                <div>
                  <label htmlFor="email_notif" className="text-sm font-medium text-gray-700 cursor-pointer">Notificaciones por email</label>
                  <p className="text-xs text-gray-500 mt-0.5">Enviar actualizaciones de tickets</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-8">
            <Button type="submit" disabled={saving} className="gap-2 bg-primary text-white hover:bg-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/customers')}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>

      <WhatsAppQuickSendModal
        open={waOpen}
        onOpenChange={setWaOpen}
        customerName={customerDisplayName}
        phone={form.phone}
      />
    </div>
  );
}
