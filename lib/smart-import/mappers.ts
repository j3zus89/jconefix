import { z } from 'zod';
import { DEVICE_CATEGORIES, NEW_FORM_STATUSES } from '@/lib/ticket-form-constants';

const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export function parseCost(raw: string): number | null {
  const t = raw.replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function normalizeStatus(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (!s) return 'entrada';
  if (NEW_FORM_STATUSES.has(s)) return s;
  const aliases: Record<string, string> = {
    ingreso: 'entrada',
    recibido: 'entrada',
    proceso: 'en_proceso',
    reparacion: 'en_proceso',
    reparación: 'en_proceso',
    listo: 'reparado',
    cerrado: 'reparado',
    cancelado: 'cancelled',
  };
  const a = aliases[s];
  if (a && NEW_FORM_STATUSES.has(a)) return a;
  return 'entrada';
}

export function normalizePriority(raw: string): z.infer<typeof prioritySchema> {
  const s = raw.trim().toLowerCase();
  if (s === 'alta' || s === 'high') return 'high';
  if (s === 'baja' || s === 'low') return 'low';
  if (s === 'urgente' || s === 'urgent') return 'urgent';
  if (s === 'media' || s === 'medium' || s === 'normal') return 'medium';
  const p = prioritySchema.safeParse(s);
  return p.success ? p.data : 'medium';
}

export function normalizeCategory(raw: string): string | null {
  const u = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (!u) return null;
  if (DEVICE_CATEGORIES.has(u as any)) return u;
  return null;
}
