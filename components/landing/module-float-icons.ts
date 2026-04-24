import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BrainCircuit,
  Calendar,
  ClipboardList,
  Cpu,
  CreditCard,
  MessageCircle,
  Package,
  Settings2,
  ShoppingCart,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';

/** Dos iconos finos por módulo (overlay sobre imagen, estilo flotante). */
export const MODULE_FLOATING_GLYPHS: Record<string, LucideIcon[]> = {
  reparaciones: [Wrench, Cpu],
  clientes: [Users, MessageCircle],
  inventario: [Package, ClipboardList],
  pos: [ShoppingCart, CreditCard],
  comunicacion: [MessageCircle, Users],
  informes: [BarChart3, Calendar],
  gastos: [CreditCard, BarChart3],
  operacion: [Calendar, ClipboardList],
  configuracion: [Settings2, Cpu],
  ia: [BrainCircuit, Sparkles],
};

export function getModuleFloatingGlyphs(id: string): LucideIcon[] {
  return MODULE_FLOATING_GLYPHS[id] ?? [Wrench, Package];
}
