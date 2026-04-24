import { z } from 'zod';
import { validateArgentinaIdNumber } from '@/lib/argentina-id-input';

/** Coincide con `customers` en Supabase: textos opcionales salvo `name` (derivado en el submit). */
export const newCustomerFormSchema = z
  .object({
    customer_group: z.string().min(1, 'Elegí un grupo de clientes'),
    organization: z.string().default(''),
    first_name: z.string().default(''),
    last_name: z.string().default(''),
    email: z
      .string()
      .default('')
      .refine((v) => v.trim() === '' || z.string().email().safeParse(v.trim()).success, {
        message: 'El correo electrónico no es válido',
      }),
    phone: z.string().max(80, 'El teléfono es demasiado largo').default(''),
    how_did_you_find_us: z.string().default(''),
    tags: z.string().default(''),
    tax_class: z.string().default(''),
    address: z.string().default(''),
    address2: z.string().default(''),
    city: z.string().default(''),
    state: z.string().default(''),
    postal_code: z.string().max(32, 'El código postal es demasiado largo').default(''),
    country: z.string().min(1, 'Elegí un país'),
    id_type: z.string().default(''),
    id_number: z.string().max(64, 'El número de documento es demasiado largo').default(''),
    contact_person: z.string().default(''),
    contact_phone: z.string().max(80, 'El teléfono de contacto es demasiado largo').default(''),
    contact_relation: z.string().default(''),
    gdpr_consent: z.boolean(),
    email_notifications: z.boolean(),
    notes: z.string().max(20000, 'Las notas no pueden superar 20000 caracteres').default(''),
  })
  .superRefine((data, ctx) => {
    const org = data.organization.trim();
    const fn = data.first_name.trim();
    const ln = data.last_name.trim();
    if (!fn && !ln && !org) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá nombre y apellido o el nombre de la organización',
        path: ['first_name'],
      });
    }
    if (data.country.trim() === 'Argentina') {
      const idErr = validateArgentinaIdNumber(data.id_type, data.id_number);
      if (idErr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: idErr,
          path: ['id_number'],
        });
      }
    }
  });

export type NewCustomerFormValues = z.infer<typeof newCustomerFormSchema>;

const moneyString = z
  .string()
  .default('')
  .refine((s) => {
    const t = s.trim();
    if (!t) return true;
    const n = Number(t.replace(',', '.'));
    return !Number.isNaN(n) && Number.isFinite(n) && n >= 0;
  }, 'El importe debe ser un número válido mayor o igual que 0');

const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: 'Elegí una prioridad válida' }),
});

/** Alineado con `repair_tickets`: obligatorios customer_id, device_type, issue_description; costes numéricos opcionales. */
export const newTicketFormSchema = z
  .object({
    customer_id: z
      .string()
      .min(1, 'Seleccioná un cliente de la lista')
      .uuid('El cliente seleccionado no es válido; elegí uno de la lista'),
    device_type: z
      .string()
      .trim()
      .min(1, 'El dispositivo es obligatorio')
      .max(2000, 'El nombre del dispositivo es demasiado largo'),
    device_brand: z.string().default(''),
    device_category: z.string().default(''),
    device_model: z.string().default(''),
    device_screen_inches: z.string().default(''),
    serial_number: z.string().max(500, 'El número de serie es demasiado largo').default(''),
    imei: z
      .string()
      .max(32, 'El IMEI es demasiado largo')
      .default('')
      .refine((s) => {
        const d = s.replace(/\D/g, '');
        if (!d) return true;
        return d.length === 15;
      }, 'El IMEI debe tener exactamente 15 dígitos, o dejalo vacío.'),
    issue_description: z
      .string()
      .trim()
      .min(1, 'La descripción del problema es obligatoria')
      .max(20000, 'La descripción es demasiado larga'),
    status: z.string().min(1, 'Elegí un estado'),
    priority: ticketPrioritySchema,
    task_type: z.string().min(1, 'Elegí un tipo de tarea'),
    estimated_cost: moneyString,
    final_cost: moneyString,
    deposit_amount: moneyString,
    notes: z.string().max(20000, 'Las notas son demasiado largas').default(''),
    diagnostic_notes: z.string().max(20000, 'Las notas de diagnóstico son demasiado largas').default(''),
    device_pin: z.string().max(500, 'El PIN es demasiado largo').default(''),
    unlock_pattern: z.string().max(500, 'El patrón es demasiado largo').default(''),
    warranty_info: z.string().min(1, 'Elegí el estado de garantía'),
    assigned_to: z.string().default(''),
    is_urgent: z.boolean(),
    is_draft: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.device_category === 'SMART_TV') {
      const inches = data.device_screen_inches?.trim() ?? '';
      if (!inches) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Indicá las pulgadas de la TV',
          path: ['device_screen_inches'],
        });
      }
    }
  });

export type NewTicketFormValues = z.infer<typeof newTicketFormSchema>;

export const posPaymentMethodSchema = z.enum(['cash', 'card', 'bizum'], {
  errorMap: () => ({ message: 'Elegí un método de pago' }),
});

/** Campos del panel derecho del POS; `discount` y montos alineados con `pos_sales` (NUMERIC). */
export const posCheckoutFormSchema = z
  .object({
    payMethod: posPaymentMethodSchema,
    discount: z
      .string()
      .default('0')
      .refine((s) => {
        const t = s.trim().replace(',', '.');
        if (t === '') return true;
        const n = Number(t);
        return !Number.isNaN(n) && Number.isFinite(n) && n >= 0 && n <= 100;
      }, 'El descuento debe ser un porcentaje entre 0 y 100'),
    cashGiven: z.string().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.payMethod !== 'cash') return;
    const t = data.cashGiven.trim().replace(',', '.');
    if (!t) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá cuánto efectivo recibiste',
        path: ['cashGiven'],
      });
      return;
    }
    const n = Number(t);
    if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El efectivo recibido debe ser un número válido',
        path: ['cashGiven'],
      });
    }
  });

export type PosCheckoutFormValues = z.infer<typeof posCheckoutFormSchema>;
