'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ChevronRight, Loader as Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { dashboardFormSectionHeader } from '@/components/dashboard/dashboard-form-styles';
import {
  fiscalIdLabel,
  type OrgCountry,
  shouldShowCustomerRgpdSection,
  gdprConsentForPersist,
} from '@/lib/locale';
import { formatArgentinaIdInput } from '@/lib/argentina-id-input';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import {
  newCustomerFormSchema,
  type NewCustomerFormValues,
} from '@/lib/form-schemas/high-risk-forms';

export default function NewCustomerPage() {
  const router = useRouter();
  const supabase = createClient();
  const loc = useOrgLocale();
  const [orgCountry, setOrgCountry] = useState<OrgCountry>('AR');

  const form = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerFormSchema),
    defaultValues: {
      customer_group: 'Particular',
      organization: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      how_did_you_find_us: '',
      tags: '',
      tax_class: '',
      address: '',
      address2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Argentina',
      id_type: 'Número de seguro social',
      id_number: '',
      contact_person: '',
      contact_phone: '',
      contact_relation: '',
      gdpr_consent: false,
      email_notifications: true,
      notes: '',
    },
  });

  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) return;
      const { data } = await (supabase as any)
        .from('organizations')
        .select('country')
        .eq('id', orgId)
        .maybeSingle();
      if (data) {
        setOrgCountry('AR');
        form.setValue('id_type', 'CUIT');
        form.setValue('country', 'Argentina');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showRgpdSection = shouldShowCustomerRgpdSection(loc.country, form.watch('country'));

  const onSubmit = async (values: NewCustomerFormValues) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Tenés que iniciar sesión para crear un cliente.');
        return;
      }

      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa. No se puede crear el cliente.');
        return;
      }

      const fullName =
        [values.first_name, values.last_name].filter(Boolean).join(' ') ||
        values.organization.trim();

      const showRgpd = shouldShowCustomerRgpdSection(loc.country, values.country);

      const { error } = await supabase.from('customers').insert([
        {
          user_id: user.id,
          organization_id: orgId,
          name: fullName,
          first_name: values.first_name.trim() || null,
          last_name: values.last_name.trim() || null,
          email: values.email.trim() || null,
          phone: values.phone.trim() || null,
          organization: values.organization.trim() || null,
          customer_group: values.customer_group,
          how_did_you_find_us: values.how_did_you_find_us.trim() || null,
          tags: values.tags.trim() || null,
          tax_class: values.tax_class.trim() || null,
          address: values.address.trim() || null,
          address2: values.address2.trim() || null,
          city: values.city.trim() || null,
          state: values.state.trim() || null,
          postal_code: values.postal_code.trim() || null,
          country: values.country.trim() || null,
          id_type: values.id_type.trim() || null,
          id_number: values.id_number.trim() || null,
          drivers_license: null,
          mailchimp_status: 'No suscrito',
          gdpr_consent: gdprConsentForPersist(showRgpd, values.gdpr_consent),
          email_notifications: values.email_notifications,
          contact_person: values.contact_person.trim() || null,
          contact_phone: values.contact_phone.trim() || null,
          contact_relation: values.contact_relation.trim() || null,
          notes: values.notes.trim() || null,
        },
      ]);

      if (error) throw error;
      toast.success('Cliente creado correctamente');
      router.push('/dashboard/customers');
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'Error desconocido';
      toast.error(
        msg || 'No se pudo guardar el cliente. Revisá tu conexión o los permisos en Supabase.'
      );
    }
  };

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-700">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/dashboard/customers" className="hover:text-gray-700">
            Clientes
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900 font-medium">Crear</span>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Agregar cliente</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 xl:items-stretch">
              <div className="min-w-0 order-1 xl:order-none xl:col-start-1 xl:row-start-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className={cn(dashboardFormSectionHeader, 'px-3 py-2')}>
                <h2 className="text-xs font-semibold text-white">Información básica</h2>
              </div>
              <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2">
                <FormField
                  control={form.control}
                  name="customer_group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Grupo de clientes
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="mt-0.5 h-8">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Particular">Particular</SelectItem>
                          <SelectItem value="Empresa">Empresa</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                          <SelectItem value="Mayorista">Mayorista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Organización
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="mt-0.5 h-8"
                          placeholder="Nombre de la empresa..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Nombre <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input className="mt-0.5 h-8" placeholder="Juan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Apellido
                      </FormLabel>
                      <FormControl>
                        <Input className="mt-0.5 h-8" placeholder="García" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Correo electrónico
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="mt-0.5 h-8"
                          type="email"
                          placeholder="juan@ejemplo.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="col-span-2 md:col-span-3">
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Móvil
                      </FormLabel>
                      <div className="flex mt-0.5 gap-2">
                        <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2.5 h-8 text-sm text-gray-600 bg-gray-50 flex-shrink-0">
                          <span className="text-base">{loc.phoneFlag}</span>
                          <span>{loc.phonePrefix}</span>
                        </div>
                        <FormControl>
                          <Input
                            className="h-8 flex-1"
                            type="tel"
                            placeholder={loc.phonePlaceholder}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="how_did_you_find_us"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        ¿Cómo nos conociste?
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger className="mt-0.5 h-8">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Google">Google</SelectItem>
                          <SelectItem value="Redes sociales">Redes sociales</SelectItem>
                          <SelectItem value="Recomendación">Recomendación</SelectItem>
                          <SelectItem value="Publicidad">Publicidad</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax_class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Clase de impuestos
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger className="mt-0.5 h-8">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Sin impuesto">Sin impuesto</SelectItem>
                          <SelectItem value="IVA 10%">IVA 10%</SelectItem>
                          <SelectItem value="IVA 21%">IVA 21%</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem className="col-span-2 md:col-span-3">
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Etiquetas
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="mt-0.5 h-8"
                          placeholder="VIP, frecuente, corporativo…"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                        Separá con comas
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            </div>

            <div className="min-w-0 order-3 xl:order-none xl:col-start-2 xl:row-start-1 xl:row-span-2 flex flex-col">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full min-h-0">
              <div className={cn(dashboardFormSectionHeader, 'px-3 py-2 shrink-0')}>
                <h2 className="text-xs font-semibold text-white">
                  Información adicional y alertas
                </h2>
              </div>
              <div className="p-3 grid grid-cols-2 gap-x-3 gap-y-2 flex-1 min-h-0">
                <FormField
                  control={form.control}
                  name="id_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Tipo de ID
                      </FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (orgCountry === 'AR') {
                            const cur = form.getValues('id_number');
                            form.setValue('id_number', formatArgentinaIdInput(v, cur), {
                              shouldValidate: true,
                            });
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="mt-0.5 h-8">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-600">
                        {fiscalIdLabel(orgCountry)}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="mt-0.5 h-8"
                          placeholder={orgCountry === 'AR' ? '20-12345678-9' : '12345678A'}
                          name={field.name}
                          ref={field.ref}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={(e) => {
                            const idType = form.watch('id_type');
                            field.onChange(
                              orgCountry === 'AR'
                                ? formatArgentinaIdInput(idType, e.target.value)
                                : e.target.value
                            );
                          }}
                          inputMode={
                            orgCountry === 'AR' &&
                            ['CUIT', 'CUIL', 'DNI'].includes(form.watch('id_type'))
                              ? 'numeric'
                              : undefined
                          }
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2">
                  <p className="text-[10px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Persona de contacto
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="contact_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-gray-600">
                            Persona de contacto
                          </FormLabel>
                          <FormControl>
                            <Input className="mt-0.5 h-8" placeholder="María García" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-gray-600">
                            Teléfono
                          </FormLabel>
                          <div className="flex mt-0.5 gap-2">
                            <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2.5 h-8 text-sm text-gray-600 bg-gray-50 flex-shrink-0">
                              <span className="text-base">{loc.phoneFlag}</span>
                              <span>{loc.phonePrefix}</span>
                            </div>
                            <FormControl>
                              <Input
                                className="h-8 flex-1"
                                type="tel"
                                placeholder={loc.phonePlaceholder}
                                {...field}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_relation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-gray-600">
                            Relación
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="mt-0.5 h-8"
                              placeholder="Cónyuge, Familiar..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs font-medium text-gray-600">
                        Notas internas
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="mt-0.5 min-h-[19rem] w-full resize-y text-sm"
                          rows={12}
                          placeholder="Notas adicionales sobre el cliente…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 border-t border-gray-100 pt-2.5 mt-0.5 space-y-2.5">
                  {showRgpdSection && (
                    <FormField
                      control={form.control}
                      name="gdpr_consent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-0.5 leading-tight">
                            <FormLabel className="text-xs font-medium text-gray-700 cursor-pointer">
                              Conformidad con GDPR (RGPD)
                            </FormLabel>
                            <p className="text-[10px] text-gray-500">
                              El cliente aceptó el tratamiento de datos
                            </p>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="email_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                        </FormControl>
                        <div className="space-y-0.5 leading-tight">
                          <FormLabel className="text-xs font-medium text-gray-700 cursor-pointer">
                            Notificaciones por correo
                          </FormLabel>
                          <p className="text-[10px] text-gray-500">
                            Enviar actualizaciones de tickets por email
                          </p>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            </div>

            <div className="min-w-0 order-2 xl:order-none xl:col-start-1 xl:row-start-2">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className={cn(dashboardFormSectionHeader, 'px-3 py-2')}>
                  <h2 className="text-xs font-semibold text-white">Dirección</h2>
                </div>
                <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-4">
                        <FormLabel className="text-xs font-medium text-gray-600">
                          Dirección
                        </FormLabel>
                        <FormControl>
                          <Input className="mt-0.5 h-8" placeholder="Calle Mayor, 123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address2"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-4">
                        <FormLabel className="text-xs font-medium text-gray-600">
                          Piso / Apartamento / Número
                        </FormLabel>
                        <FormControl>
                          <Input className="mt-0.5 h-8" placeholder="3º B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          Ciudad
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="mt-0.5 h-8"
                            placeholder={loc.cityPlaceholder}
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          {loc.stateLabel}
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="mt-0.5 h-8"
                            placeholder={loc.statePlaceholder}
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          Código Postal
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="mt-0.5 h-8"
                            placeholder={loc.postalPlaceholder}
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-600">
                          País
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="mt-0.5 h-8">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="México">México</SelectItem>
                            <SelectItem value="Argentina">Argentina</SelectItem>
                            <SelectItem value="Colombia">Colombia</SelectItem>
                            <SelectItem value="Chile">Chile</SelectItem>
                            <SelectItem value="Francia">Francia</SelectItem>
                            <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 mt-1 pb-4">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="gap-2 bg-[#0d9488] text-white hover:bg-[#0f766e]"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/customers')}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
