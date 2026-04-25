'use client';

import { useEffect, useState, useRef, useMemo, Fragment } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight, Building2, Users, Receipt, Package, ShoppingCart, CircleUser as UserCircle, ChartBar as BarChart3, MessageSquare, Plus, Pencil, Trash2, Loader as Loader2, Check, GripVertical, Circle, Shield, Coins, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';
import { PlanProfesionalCallout } from '@/components/settings/PlanProfesionalCallout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadProfileAvatar } from '@/lib/upload-profile-avatar';
import { uploadShopLogo } from '@/lib/upload-shop-logo';
import { displayOrgOrShopName } from '@/lib/display-name';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { notifyShopLogoUpdated } from '@/lib/resolve-org-chat-logo';
import { markDashboardOnboardingSettingsVisited } from '@/lib/dashboard-onboarding-storage';
import { humanizeTechniciansSchemaError, humanizeShopSettingsSchemaError } from '@/lib/supabase-setup-hints';
import { notifyPanelUiModeChanged } from '@/components/dashboard/PanelUiModeContext';
import { QzTraySettingsSection } from '@/components/settings/QzTraySettingsSection';
import { PrintNodeSettingsSection } from '@/components/settings/PrintNodeSettingsSection';
import { ArcaIntegrationSettings } from '@/components/settings/ArcaIntegrationSettings';
import {
  IVA_CONDITIONS_AR,
  cityPlaceholder,
  isStaleSpainCityValueForArgentina,
  isStaleSpainPostalCodeForArgentina,
  isStaleStatePlaceholderText,
  postalPlaceholder,
  statePlaceholder,
  type OrgCountry,
} from '@/lib/locale';
import { formatOrgMemberRoleLabel } from '@/lib/org-role-labels';
import { useOrgLocale, notifyOrgLocaleRefresh } from '@/lib/hooks/useOrgLocale';
import { getSettingsNavTrailForTab } from '@/lib/settings-nav-labels';
import {
  countryCodeFromCurrency,
  currencySymbolFromCode,
  isArgentinaCurrency,
  resolveTimezoneForCurrency,
  shopCountryNameFromCurrency,
} from '@/lib/currency-region';
import { phoneDigitsForWaMe, waMeUrlForPhone } from '@/lib/wa-me';
import {
  parseCustomerNotifyChannels,
  DEFAULT_CUSTOMER_NOTIFY_CHANNELS,
  type CustomerNotifyChannels,
  type CustomerNotifyChannelKey,
} from '@/lib/customer-notify-channels';
import {
  parseTicketRepairsSettings,
  DEFAULT_TICKET_REPAIRS_SETTINGS,
  type TicketRepairsSettings,
} from '@/lib/ticket-repairs-settings';
import { TicketsRepairsSettingsSection } from '@/components/settings/TicketsRepairsSettingsSection';
import { SmartImportSettingsSection } from '@/components/settings/SmartImportSettingsSection';
import { ActiveSessionsSection } from '@/components/settings/ActiveSessionsSection';
import { VisualPersonalizationSection } from '@/components/settings/VisualPersonalizationSection';
import { SubscriptionSettingsSection } from '@/components/settings/SubscriptionSettingsSection';
import { Switch } from '@/components/ui/switch';

const STATUS_COLORS = [
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#f97316', label: 'Naranja' },
  { hex: '#eab308', label: 'Amarillo' },
  { hex: '#22c55e', label: 'Verde' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#06b6d4', label: 'Cian' },
  { hex: '#8b5cf6', label: 'Violeta' },
  { hex: '#ec4899', label: 'Rosa' },
  { hex: '#f9a8d4', label: 'Rosa claro' },
  { hex: '#6b7280', label: 'Gris' },
  { hex: '#0d9488', label: 'Azul oscuro' },
  { hex: '#000000', label: 'Negro' },
];

function SettingsNavBreadcrumb({
  activeTab,
  isArgentina,
  className,
}: {
  activeTab: string;
  isArgentina: boolean;
  className?: string;
}) {
  const trail = getSettingsNavTrailForTab(activeTab, isArgentina);
  if (!trail) return null;
  const segments: string[] = ['Inicio', 'Ajustes'];
  if (trail.groupLabel) segments.push(trail.groupLabel);
  segments.push(trail.pageLabel);
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mb-1', className)}>
      {segments.map((seg, i) => (
        <Fragment key={`${i}-${seg}`}>
          {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0" aria-hidden /> : null}
          <span className={i === segments.length - 1 ? 'font-medium text-gray-800' : undefined}>{seg}</span>
        </Fragment>
      ))}
    </div>
  );
}

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  can_create_tickets: true,
  can_edit_tickets: true,
  can_delete_tickets: false,
  can_view_reports: false,
  can_manage_inventory: true,
  can_manage_customers: true,
  can_manage_settings: false,
  can_create_invoices: true,
  can_view_all_tickets: true,
  can_manage_pos: false,
  can_manage_expenses: false,
  can_export_data: false,
  can_collect_payment: false,
  can_open_drawer: false,
};

const PERMISSION_LABELS: Record<string, string> = {
  can_create_tickets: 'Crear tickets',
  can_edit_tickets: 'Editar tickets',
  can_delete_tickets: 'Eliminar tickets',
  can_view_reports: 'Ver informes',
  can_manage_inventory: 'Gestionar inventario',
  can_manage_customers: 'Gestionar clientes',
  can_manage_settings: 'Gestionar configuración',
  can_create_invoices: 'Crear facturas',
  can_view_all_tickets: 'Ver todos los tickets',
  can_manage_pos: 'Usar punto de venta',
  can_manage_expenses: 'Gestionar gastos',
  can_export_data: 'Exportar datos',
  can_collect_payment: '💰 Cobrar tickets / clientes',
  can_open_drawer: '🗄️ Abrir cajón portamonedas',
};

/** Controles de seguridad (PIN): mismas filas en bloque global y por rol. */
const SECURITY_PIN_ITEMS = [
  { id: 's1', label: 'Ajustes previos al acceso' },
  { id: 's2', label: 'Transacciones previas a las entradas/salidas manuales' },
  { id: 's3', label: 'Previo a comenzar/finalizar el turno' },
  { id: 's4', label: 'Anterior a la transferencia de inventario' },
  { id: 's5', label: 'Previo a agregar/editar comentarios del ticket' },
  { id: 's6', label: 'Antes de agregar o editar consulta' },
  { id: 's7', label: 'Antes de agregar o editar presupuesto' },
] as const;

type SecurityControlsState = {
  employeePinChecks: Record<string, boolean>;
  rolePinChecks: Record<string, Record<string, boolean>>;
};

function emptySecurityPinChecks(): Record<string, boolean> {
  return Object.fromEntries(SECURITY_PIN_ITEMS.map((i) => [i.id, false])) as Record<string, boolean>;
}

function parseSecurityControls(raw: unknown): SecurityControlsState {
  const base = emptySecurityPinChecks();
  const employeePinChecks = { ...base };
  const rolePinChecks: Record<string, Record<string, boolean>> = {};
  if (!raw || typeof raw !== 'object') {
    return { employeePinChecks, rolePinChecks };
  }
  const o = raw as Record<string, unknown>;
  const emp = o.employeePinChecks;
  if (emp && typeof emp === 'object') {
    for (const id of Object.keys(employeePinChecks)) {
      const v = (emp as Record<string, unknown>)[id];
      if (typeof v === 'boolean') employeePinChecks[id] = v;
    }
  }
  const rp = o.rolePinChecks;
  if (rp && typeof rp === 'object') {
    for (const [roleKey, row] of Object.entries(rp)) {
      if (!row || typeof row !== 'object') continue;
      const r = { ...base };
      for (const id of Object.keys(r)) {
        const v = (row as Record<string, unknown>)[id];
        if (typeof v === 'boolean') r[id] = v;
      }
      rolePinChecks[roleKey] = r;
    }
  }
  return { employeePinChecks, rolePinChecks };
}

const ROLE_PRESETS: Record<string, Record<string, boolean>> = {
  admin: {
    can_create_tickets: true, can_edit_tickets: true, can_delete_tickets: true,
    can_view_reports: true, can_manage_inventory: true, can_manage_customers: true,
    can_manage_settings: true, can_create_invoices: true, can_view_all_tickets: true,
    can_manage_pos: true, can_manage_expenses: true, can_export_data: true,
    can_collect_payment: true, can_open_drawer: true,
  },
  manager: {
    can_create_tickets: true, can_edit_tickets: true, can_delete_tickets: true,
    can_view_reports: true, can_manage_inventory: true, can_manage_customers: true,
    can_manage_settings: false, can_create_invoices: true, can_view_all_tickets: true,
    can_manage_pos: true, can_manage_expenses: true, can_export_data: true,
    can_collect_payment: true, can_open_drawer: true,
  },
  tech_3: {
    can_create_tickets: true, can_edit_tickets: true, can_delete_tickets: true,
    can_view_reports: true, can_manage_inventory: true, can_manage_customers: true,
    can_manage_settings: false, can_create_invoices: true, can_view_all_tickets: true,
    can_manage_pos: true, can_manage_expenses: true, can_export_data: true,
    can_collect_payment: false, can_open_drawer: false,
  },
  tech_2: {
    can_create_tickets: true, can_edit_tickets: true, can_delete_tickets: false,
    can_view_reports: true, can_manage_inventory: true, can_manage_customers: true,
    can_manage_settings: false, can_create_invoices: true, can_view_all_tickets: true,
    can_manage_pos: true, can_manage_expenses: false, can_export_data: false,
    can_collect_payment: false, can_open_drawer: false,
  },
  tech_1: {
    can_create_tickets: true, can_edit_tickets: true, can_delete_tickets: false,
    can_view_reports: false, can_manage_inventory: false, can_manage_customers: true,
    can_manage_settings: false, can_create_invoices: false, can_view_all_tickets: false,
    can_manage_pos: false, can_manage_expenses: false, can_export_data: false,
    can_collect_payment: false, can_open_drawer: false,
  },
  receptionist: {
    can_create_tickets: true, can_edit_tickets: false, can_delete_tickets: false,
    can_view_reports: false, can_manage_inventory: false, can_manage_customers: true,
    can_manage_settings: false, can_create_invoices: true, can_view_all_tickets: true,
    can_manage_pos: true, can_manage_expenses: false, can_export_data: false,
    // La recepcionista SIEMPRE puede cobrar y abrir cajón — es su función principal
    can_collect_payment: true, can_open_drawer: true,
  },
  technician: {
    can_create_tickets: true, can_edit_tickets: true, can_delete_tickets: false,
    can_view_reports: false, can_manage_inventory: true, can_manage_customers: true,
    can_manage_settings: false, can_create_invoices: true, can_view_all_tickets: true,
    can_manage_pos: false, can_manage_expenses: false, can_export_data: false,
    can_collect_payment: false, can_open_drawer: false,
  },
};

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador', desc: 'Acceso total al sistema' },
  { value: 'tech_3', label: 'Técnico Nivel 3', desc: 'Técnico senior, casi todos los permisos' },
  { value: 'tech_2', label: 'Técnico Nivel 2', desc: 'Técnico intermedio con acceso a informes' },
  { value: 'tech_1', label: 'Técnico Nivel 1', desc: 'Técnico básico, permisos limitados' },
  { value: 'receptionist', label: 'Recepcionista', desc: 'Recepción y atención al cliente' },
  { value: 'technician', label: 'Técnico (general)', desc: 'Técnico estándar sin nivel específico' },
];

/** Rol en `organization_members` al crear cuenta de panel desde la ficha de empleado. */
function mapTechRoleToOrgRole(techRole: string): string {
  const r = techRole || 'technician';
  if (r === 'admin' || r === 'manager' || r === 'receptionist') return r;
  if (r === 'tech_1' || r === 'tech_2' || r === 'tech_3' || r === 'technician') return 'technician';
  return r;
}

const TECH_COLORS = [
  '#0d9488', '#2563eb', '#dc2626', '#d97706',
  '#0891b2', '#059669', '#db2777', '#65a30d',
];

type ShopSettings = {
  shop_name: string;
  alt_name: string;
  email: string;
  phone: string;
  phone2: string;
  fax: string;
  city: string;
  postal_code: string;
  state: string;
  country: string;
  address: string;
  website: string;
  registration_number: string;
  currency: string;
  currency_symbol: string;
  tax_rate: number;
  tax_included: boolean;
  accounting_method: string;
  time_format: string;
  language: string;
  start_time: string;
  end_time: string;
  invoice_prefix: string;
  ticket_prefix: string;
  default_warranty: string;
  footer_text: string;
  receive_emails: boolean;
  restocking_fee: boolean;
  deposit_repairs: boolean;
  screen_timeout: string;
  decimal_places: string;
  price_format: string;
  iva_condition: string | null;
  timezone: string;
  /** URL pública del logo (Storage); también se intenta copiar a `organizations.logo_url`. */
  logo_url: string;
  /** Términos y condiciones / garantía (plantilla legacy). */
  terms_text_es: string;
  /** Términos y condiciones / garantía para Argentina. */
  terms_text_ar: string;
  /** Si true, los términos y condiciones aparecen al pie de la factura impresa. */
  invoice_show_terms: boolean;
  /** Solo dígitos con prefijo país (p. ej. 34612345678) para wa.me */
  whatsapp_phone: string;
  /** Bandeja QZ — WebSocket a QZ Tray en este equipo */
  qz_tray_port: number;
  qz_tray_using_secure: boolean;
  qz_tray_certificate_pem: string | null;
  qz_tray_certificate_label: string | null;
  /** Si true, al crear factura se intenta imprimir vía QZ Tray antes de abrir el navegador */
  qz_tray_direct_invoice_print: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  customer_notify_channels: CustomerNotifyChannels;
  /** Portal del cliente */
  portal_enabled: boolean;
  portal_require_login: boolean;
  portal_show_diagnostic_notes: boolean;
  portal_allow_quote_approval: boolean;
  portal_show_invoices: boolean;
  ticket_repairs_settings: TicketRepairsSettings;
  /** full = menú e inicio completos; simple = panel reducido para tiendas pequeñas */
  panel_ui_mode: 'full' | 'simple';
  /** Chat interno entre miembros del equipo */
  chat_enabled: boolean;
};

type CustomStatus = {
  id: string;
  name: string;
  color: string;
  category: string;
  sort_order: number;
  is_active: boolean;
};

type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  color: string;
  panel_user_id?: string | null;
  /** PIN para fichar en Reloj entrada/salida; vacío = no exige PIN */
  clock_pin?: string | null;
};

type OrgCustomRole = {
  id: string;
  organization_id: string;
  role_key: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
};

type OrgRoleLabelOverride = {
  id: string;
  name: string;
  description: string;
  color: string;
};

const DEFAULT_SHOP: ShopSettings = {
  shop_name: '',
  alt_name: '',
  email: '',
  phone: '',
  phone2: '',
  fax: '',
  city: '',
  postal_code: '',
  state: '',
  country: 'Argentina',
  address: '',
  website: '',
  registration_number: '',
  currency: 'ARS',
  currency_symbol: '$',
  tax_rate: 21,
  tax_included: true,
  accounting_method: 'accrual',
  time_format: '24',
  language: 'Spanish',
  start_time: '10:00:00',
  end_time: '20:00:00',
  invoice_prefix: 'F-',
  ticket_prefix: '0-',
  default_warranty: 'Sin garantía',
  footer_text: '',
  receive_emails: true,
  restocking_fee: false,
  deposit_repairs: false,
  screen_timeout: 'Never',
  decimal_places: '2',
  timezone: 'America/Argentina/Buenos_Aires',
  price_format: 'Decimal',
  iva_condition: null,
  logo_url: '',
  terms_text_es: '',
  terms_text_ar: '',
  invoice_show_terms: false,
  whatsapp_phone: '',
  qz_tray_port: 8182,
  qz_tray_using_secure: false,
  qz_tray_certificate_pem: null,
  qz_tray_certificate_label: null,
  qz_tray_direct_invoice_print: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_password: '',
  customer_notify_channels: { ...DEFAULT_CUSTOMER_NOTIFY_CHANNELS },
  portal_enabled: false,
  portal_require_login: false,
  portal_show_diagnostic_notes: false,
  portal_allow_quote_approval: false,
  portal_show_invoices: false,
  ticket_repairs_settings: { ...DEFAULT_TICKET_REPAIRS_SETTINGS },
  panel_ui_mode: 'full',
  chat_enabled: false,
};

type SimpleItem = { id: string; name: string; is_active: boolean; sort_order: number };

const DEFAULT_TASK_TYPES = ['TIENDA', 'ONLINE', 'DOMICILIO', 'GARANTIA', 'EMPRESA'];
const DEFAULT_PAYMENT_METHODS = ['Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia bancaria', 'Bizum'];
const DEFAULT_REPAIR_CATS = ['Smartphone', 'Tablet', 'Laptop / PC', 'Smartwatch', 'Consola de videojuegos', 'Cámara', 'Auriculares', 'Impresora'];

const CUSTOMER_NOTIFY_ROWS: {
  key: CustomerNotifyChannelKey;
  label: string;
  desc: string;
}[] = [
  {
    key: 'ticket_created',
    label: 'Ticket creado',
    desc: 'Notificar al cliente cuando se registra su dispositivo',
  },
  {
    key: 'status_change',
    label: 'Cambio de estado',
    desc: 'Notificar al cliente cuando cambia el estado de su reparación',
  },
  {
    key: 'ready_pickup',
    label: 'Listo para recoger',
    desc: 'Notificar al cliente cuando la reparación está completada',
  },
  {
    key: 'estimate_pending',
    label: 'Presupuesto pendiente',
    desc: 'Enviar presupuesto al cliente para su aprobación',
  },
  {
    key: 'invoice_issued',
    label: 'Factura emitida',
    desc: 'Enviar factura al cliente automáticamente',
  },
];

const PORTAL_CLIENTE_ROWS: {
  key: keyof Pick<
    ShopSettings,
    | 'portal_enabled'
    | 'portal_require_login'
    | 'portal_show_diagnostic_notes'
    | 'portal_allow_quote_approval'
    | 'portal_show_invoices'
  >;
  label: string;
  desc: string;
}[] = [
  {
    key: 'portal_enabled',
    label: 'Activar portal del cliente',
    desc: 'Permite que los clientes consulten el estado de sus reparaciones',
  },
  {
    key: 'portal_require_login',
    label: 'Requerir inicio de sesión',
    desc: 'Los clientes deben autenticarse para ver sus tickets',
  },
  {
    key: 'portal_show_diagnostic_notes',
    label: 'Mostrar notas de diagnóstico',
    desc: 'Los clientes pueden ver las notas técnicas de sus reparaciones',
  },
  {
    key: 'portal_allow_quote_approval',
    label: 'Permitir aprobación de presupuesto',
    desc: 'El cliente puede aprobar o rechazar el presupuesto desde el portal',
  },
  {
    key: 'portal_show_invoices',
    label: 'Mostrar facturas en el portal',
    desc: 'Los clientes pueden descargar sus facturas desde el portal',
  },
];

export default function SettingsPage() {
  const loc = useOrgLocale();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeKey, setActiveKey] = useState('config_general');

  const [shopSettings, setShopSettings] = useState<ShopSettings>(DEFAULT_SHOP);
  const [savingSettings, setSavingSettings] = useState(false);

  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [statusDialog, setStatusDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CustomStatus | null>(null);
  const [statusForm, setStatusForm] = useState({ name: '', color: '#3b82f6', category: 'open', is_active: true });
  const [savingStatus, setSavingStatus] = useState(false);

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamDialogMode, setTeamDialogMode] = useState<'create' | 'edit-tech' | 'edit-user'>('create');
  const [createPanelAccount, setCreatePanelAccount] = useState(true);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [techForm, setTechForm] = useState({
    name: '', email: '', phone: '', role: 'tech_1',
    color: '#0d9488', is_active: true,
    permissions: { ...ROLE_PRESETS.tech_1 },
    panel_user_id: 'none' as string,
    clock_pin: '',
  });
  const [savingTech, setSavingTech] = useState(false);

  const [taskTypes, setTaskTypes] = useState<SimpleItem[]>([]);
  const [taskTypeDialog, setTaskTypeDialog] = useState(false);
  const [editingTaskType, setEditingTaskType] = useState<SimpleItem | null>(null);
  const [taskTypeForm, setTaskTypeForm] = useState({ name: '', is_active: true });

  const [paymentMethods, setPaymentMethods] = useState<SimpleItem[]>([]);
  const [payMethodDialog, setPayMethodDialog] = useState(false);
  const [editingPayMethod, setEditingPayMethod] = useState<SimpleItem | null>(null);
  const [payMethodForm, setPayMethodForm] = useState({ name: '', is_active: true });

  const [repairCats, setRepairCats] = useState<SimpleItem[]>([]);
  const [repairCatDialog, setRepairCatDialog] = useState(false);
  const [editingRepairCat, setEditingRepairCat] = useState<SimpleItem | null>(null);
  const [repairCatForm, setRepairCatForm] = useState({ name: '', is_active: true });

  const [productCategories, setProductCategories] = useState<Array<{id: string; name: string; description: string | null; is_active: boolean; sort_order: number}>>([]);
  const [productCategoryDialog, setProductCategoryDialog] = useState(false);
  const [editingProductCategory, setEditingProductCategory] = useState<{id: string; name: string; description: string | null; is_active: boolean; sort_order: number} | null>(null);
  const [productCategoryForm, setProductCategoryForm] = useState({ name: '', description: '', is_active: true });
  const [savingProductCategory, setSavingProductCategory] = useState(false);

  const [rolePerms, setRolePerms] = useState<Record<string, Record<string, boolean>>>({});
  const [savingRolePerms, setSavingRolePerms] = useState(false);

  // User management states
  const [systemUsers, setSystemUsers] = useState<Array<{id: string, email: string, full_name: string, role: string, is_active: boolean, created_at: string}>>([]);
  const [userEntitlements, setUserEntitlements] = useState<{
    planLabel: string;
    maxUsers: number | null;
    unlimitedUsers: boolean;
    activeUsers: number;
    canAddUser: boolean;
    smsAutomation: boolean;
    integrations: boolean;
  } | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'technician',
    is_active: true,
  });
  const [savingUser, setSavingUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountAvatarUrl, setAccountAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const perfilAvatarInputRef = useRef<HTMLInputElement>(null);
  const [orgCountry, setOrgCountry] = useState<OrgCountry>('AR');
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [customRoles, setCustomRoles] = useState<OrgCustomRole[]>([]);
  const [customRoleDialog, setCustomRoleDialog] = useState(false);
  const [customRoleForm, setCustomRoleForm] = useState({
    name: '',
    description: '',
    color: '#6b7280',
  });
  const [savingCustomRole, setSavingCustomRole] = useState(false);
  const [roleLabelOverrides, setRoleLabelOverrides] = useState<Record<string, OrgRoleLabelOverride>>({});
  const [predefinedRoleDialog, setPredefinedRoleDialog] = useState(false);
  const [editingPredefinedRoleKey, setEditingPredefinedRoleKey] = useState<string | null>(null);
  const [predefinedRoleForm, setPredefinedRoleForm] = useState({
    name: '',
    description: '',
    color: '',
  });
  const [savingPredefinedRole, setSavingPredefinedRole] = useState(false);

  const [securityControls, setSecurityControls] = useState<SecurityControlsState>(() => ({
    employeePinChecks: emptySecurityPinChecks(),
    rolePinChecks: {},
  }));
  const [securityRoleSelect, setSecurityRoleSelect] = useState<string>('admin');
  const [savingSecurityControls, setSavingSecurityControls] = useState(false);

  const [shopLogoUploading, setShopLogoUploading] = useState(false);
  const shopLogoInputRef = useRef<HTMLInputElement>(null);

  const mergedRoleOptions = useMemo(() => {
    const base = ROLE_OPTIONS.map((r) => {
      const o = roleLabelOverrides[r.value];
      const colorTrim = o?.color?.trim() || '';
      return {
        value: r.value,
        label: (o?.name?.trim() || r.label) as string,
        desc: (o?.description?.trim() || r.desc) as string,
        isCustom: false as const,
        color: colorTrim ? colorTrim : (null as string | null),
      };
    });
    const extra = customRoles.map((cr) => ({
      value: cr.role_key,
      label: cr.name,
      desc: cr.description?.trim() || 'Rol definido por tu empresa',
      isCustom: true as const,
      color: cr.color,
    }));
    return [...base, ...extra];
  }, [customRoles, roleLabelOverrides]);

  useEffect(() => {
    loadAll();
    checkIfAdmin();
    loadSystemUsers();
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const oid = await getActiveOrganizationId(supabase);
      markDashboardOnboardingSettingsVisited(user.id, oid);
    })();
  }, [supabase]);

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw === 'empleados' || raw === 'gestion_usuarios') {
      router.replace('/dashboard/settings?tab=equipo', { scroll: false });
      setActiveKey('equipo');
      return;
    }
    if (raw) setActiveKey(raw);
    else setActiveKey('config_general');
  }, [searchParams, router]);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setAccountEmail(user.email ?? '');
    setAccountName(String(user.user_metadata?.full_name ?? '').trim());

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    setAccountAvatarUrl((profileRow as { avatar_url?: string } | null)?.avatar_url ?? '');

    const [
      { data: settings },
      { data: stats },
      { data: techs },
      { data: tt },
      { data: pm },
      { data: rc },
      { data: rp },
      { data: pc },
    ] = await Promise.all([
      (supabase as any).from('shop_settings').select('*').eq('user_id', user.id).maybeSingle(),
      (supabase as any).from('custom_ticket_statuses').select('*').eq('user_id', user.id).order('sort_order'),
      (supabase as any).from('technicians').select('*').eq('shop_owner_id', user.id).order('name'),
      (supabase as any).from('task_types').select('*').eq('user_id', user.id).order('sort_order'),
      (supabase as any).from('payment_methods').select('*').eq('user_id', user.id).order('sort_order'),
      (supabase as any).from('repair_categories').select('*').eq('user_id', user.id).order('sort_order'),
      (supabase as any).from('role_permissions').select('*').eq('user_id', user.id),
      (supabase as any).from('product_categories').select('*').order('sort_order'),
    ]);

    // Load organization name (primary source) and country
    const orgId = await getActiveOrganizationId(supabase);
    let orgDisplayName = '';
    let orgRow: { country?: string; name?: string } | null = null;
    let customRolesRows: OrgCustomRole[] = [];
    const overridesMap: Record<string, OrgRoleLabelOverride> = {};
    if (orgId) {
      setActiveOrgId(orgId);
      const { data } = await (supabase as any)
        .from('organizations')
        .select('country, name')
        .eq('id', orgId)
        .maybeSingle();
      orgRow = data ?? null;
      // organizations.name es la fuente de verdad principal para el nombre del negocio
      orgDisplayName = orgRow?.name?.trim() || '';
      const { data: crRows, error: crErr } = await (supabase as any)
        .from('organization_custom_roles')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order', { ascending: true });
      if (!crErr) customRolesRows = (crRows || []) as OrgCustomRole[];
      else console.warn('[loadAll] organization_custom_roles:', crErr.message);

      const { data: ovRows, error: ovErr } = await (supabase as any)
        .from('organization_role_label_overrides')
        .select('id, role_key, name, description, color')
        .eq('organization_id', orgId);
      if (!ovErr) {
        for (const row of ovRows || []) {
          const rk = String((row as { role_key?: string }).role_key || '').trim();
          if (!rk) continue;
          overridesMap[rk] = {
            id: String((row as { id?: string }).id || ''),
            name: String((row as { name?: string }).name || ''),
            description: String((row as { description?: string }).description || ''),
            color: String((row as { color?: string }).color || ''),
          };
        }
      } else {
        console.warn('[loadAll] organization_role_label_overrides:', ovErr.message);
      }
    } else {
      setActiveOrgId(null);
    }
    setCustomRoles(customRolesRows);
    setRoleLabelOverrides(overridesMap);

    if (settings) {
      const str = (v: unknown) => (v == null || v === undefined ? '' : String(v));
      // Preferir organizations.name; si está vacío/genérico usar shop_settings.shop_name
      const bestName = orgDisplayName || str(settings.shop_name);

      // Panel solo Argentina (ARS); datos legacy en EUR se normalizan a ARS al cargar.
      const correctedCurrency = 'ARS';
      setOrgCountry('AR');
      const isAR = true;
      const rawSymbol = str(settings.currency_symbol) || DEFAULT_SHOP.currency_symbol;
      const correctedSymbol = rawSymbol || '$';
      const correctedCountry = 'Argentina';
      const rawTimezone = str((settings as any).timezone);
      const correctedTimezone = resolveTimezoneForCurrency('ARS', rawTimezone);

      let cityVal = str(settings.city);
      if (isAR && isStaleSpainCityValueForArgentina(cityVal)) {
        cityVal = '';
      }
      let postalVal = str(settings.postal_code);
      if (isAR && isStaleSpainPostalCodeForArgentina(postalVal)) {
        postalVal = '';
      }
      let stateVal = str(settings.state);
      if (isAR && isStaleStatePlaceholderText(stateVal, true)) {
        stateVal = '';
      }

      setShopSettings({
        ...DEFAULT_SHOP,
        ...settings,
        shop_name: displayOrgOrShopName(bestName, ''),
        alt_name: str(settings.alt_name),
        email: str(settings.email),
        phone: str(settings.phone),
        phone2: str(settings.phone2),
        fax: str(settings.fax),
        city: cityVal,
        postal_code: postalVal,
        state: stateVal,
        country: 'Argentina',
        address: str(settings.address),
        website: str(settings.website),
        registration_number: str(settings.registration_number),
        footer_text: str(settings.footer_text),
        terms_text_es: str((settings as any).terms_text_es),
        terms_text_ar: str((settings as any).terms_text_ar),
        invoice_show_terms: Boolean((settings as any).invoice_show_terms),
        currency: correctedCurrency,
        currency_symbol: correctedSymbol,
        invoice_prefix: str(settings.invoice_prefix) || DEFAULT_SHOP.invoice_prefix,
        ticket_prefix: str(settings.ticket_prefix) || DEFAULT_SHOP.ticket_prefix,
        default_warranty: str(settings.default_warranty) || DEFAULT_SHOP.default_warranty,
        time_format: str(settings.time_format) || DEFAULT_SHOP.time_format,
        language: str(settings.language) || DEFAULT_SHOP.language,
        start_time: str(settings.start_time) || DEFAULT_SHOP.start_time,
        end_time: str(settings.end_time) || DEFAULT_SHOP.end_time,
        accounting_method: str(settings.accounting_method) || DEFAULT_SHOP.accounting_method,
        screen_timeout: str(settings.screen_timeout) || DEFAULT_SHOP.screen_timeout,
        decimal_places: str(settings.decimal_places) || DEFAULT_SHOP.decimal_places,
        price_format: str(settings.price_format) || DEFAULT_SHOP.price_format,
        timezone: correctedTimezone,
        tax_rate: typeof settings.tax_rate === 'number' ? settings.tax_rate : parseFloat(str(settings.tax_rate)) || DEFAULT_SHOP.tax_rate,
        tax_included: Boolean(settings.tax_included),
        receive_emails: settings.receive_emails !== false,
        restocking_fee: Boolean(settings.restocking_fee),
        deposit_repairs: Boolean(settings.deposit_repairs),
        iva_condition: settings.iva_condition ?? null,
        logo_url: str((settings as { logo_url?: string }).logo_url),
        whatsapp_phone: phoneDigitsForWaMe(str((settings as { whatsapp_phone?: string }).whatsapp_phone)),
        qz_tray_port: (() => {
          const raw = (settings as { qz_tray_port?: unknown }).qz_tray_port;
          const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
          return Number.isFinite(n) ? n : DEFAULT_SHOP.qz_tray_port;
        })(),
        qz_tray_using_secure: Boolean(
          (settings as { qz_tray_using_secure?: unknown }).qz_tray_using_secure
        ),
        qz_tray_certificate_pem:
          (settings as { qz_tray_certificate_pem?: string | null }).qz_tray_certificate_pem ?? null,
        qz_tray_certificate_label:
          (settings as { qz_tray_certificate_label?: string | null }).qz_tray_certificate_label ??
          null,
        qz_tray_direct_invoice_print: Boolean(
          (settings as { qz_tray_direct_invoice_print?: unknown }).qz_tray_direct_invoice_print
        ),
        smtp_host: str((settings as { smtp_host?: string }).smtp_host),
        smtp_port: (() => {
          const raw = (settings as { smtp_port?: unknown }).smtp_port;
          const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
          return Number.isFinite(n) && n > 0 && n <= 65535 ? n : DEFAULT_SHOP.smtp_port;
        })(),
        smtp_user: str((settings as { smtp_user?: string }).smtp_user),
        smtp_password: str((settings as { smtp_password?: string }).smtp_password),
        customer_notify_channels: parseCustomerNotifyChannels(
          (settings as { customer_notify_channels?: unknown }).customer_notify_channels
        ),
        portal_enabled: Boolean((settings as { portal_enabled?: unknown }).portal_enabled),
        portal_require_login: Boolean(
          (settings as { portal_require_login?: unknown }).portal_require_login
        ),
        portal_show_diagnostic_notes: Boolean(
          (settings as { portal_show_diagnostic_notes?: unknown }).portal_show_diagnostic_notes
        ),
        portal_allow_quote_approval: Boolean(
          (settings as { portal_allow_quote_approval?: unknown }).portal_allow_quote_approval
        ),
        portal_show_invoices: Boolean(
          (settings as { portal_show_invoices?: unknown }).portal_show_invoices
        ),
        ticket_repairs_settings: parseTicketRepairsSettings(
          (settings as { ticket_repairs_settings?: unknown }).ticket_repairs_settings
        ),
        panel_ui_mode:
          String((settings as { panel_ui_mode?: string }).panel_ui_mode || '').toLowerCase() ===
          'simple'
            ? 'simple'
            : 'full',
      });
    } else {
      // Sin shop_settings aún — semilla Argentina (mercado actual del producto)
      setOrgCountry('AR');
      setShopSettings({ ...DEFAULT_SHOP });
    }
    setStatuses(stats || []);
    setTechnicians(techs || []);

    const listSeedUpsert = {
      onConflict: 'user_id,name',
      ignoreDuplicates: true,
    } as const;

    if (!tt || tt.length === 0) {
      const seeds = DEFAULT_TASK_TYPES.map((name, i) => ({
        user_id: user.id,
        name,
        sort_order: i,
        is_active: true,
      }));
      await (supabase as any).from('task_types').upsert(seeds, listSeedUpsert);
      const { data: freshTt } = await (supabase as any)
        .from('task_types')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order');
      setTaskTypes(freshTt || []);
    } else {
      setTaskTypes(tt);
    }

    if (!pm || pm.length === 0) {
      const seeds = DEFAULT_PAYMENT_METHODS.map((name, i) => ({
        user_id: user.id,
        name,
        sort_order: i,
        is_active: true,
      }));
      await (supabase as any).from('payment_methods').upsert(seeds, listSeedUpsert);
      const { data: freshPm } = await (supabase as any)
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order');
      setPaymentMethods(freshPm || []);
    } else {
      setPaymentMethods(pm);
    }

    if (!rc || rc.length === 0) {
      const seeds = DEFAULT_REPAIR_CATS.map((name, i) => ({
        user_id: user.id,
        name,
        sort_order: i,
        is_active: true,
      }));
      await (supabase as any).from('repair_categories').upsert(seeds, listSeedUpsert);
      const { data: freshRc } = await (supabase as any)
        .from('repair_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order');
      setRepairCats(freshRc || []);
    } else {
      setRepairCats(rc);
    }

    if (!pc || pc.length === 0) {
      const seeds = [
        { name: 'Smartphones', description: 'Teléfonos móviles y smartphones', sort_order: 1, is_active: true },
        { name: 'Tablets', description: 'Tablets e iPads', sort_order: 2, is_active: true },
        { name: 'Laptops', description: 'Computadoras portátiles', sort_order: 3, is_active: true },
        { name: 'Accesorios', description: 'Accesorios generales', sort_order: 4, is_active: true },
        { name: 'Repuestos', description: 'Repuestos y piezas de repuesto', sort_order: 5, is_active: true },
        { name: 'Cables', description: 'Cables y conectores', sort_order: 6, is_active: true },
        { name: 'Fundas', description: 'Fundas y protectores', sort_order: 7, is_active: true },
        { name: 'Cargadores', description: 'Cargadores y adaptadores', sort_order: 8, is_active: true },
      ].map((s, i) => ({ ...s, user_id: user.id, sort_order: i }));
      await (supabase as any).from('product_categories').upsert(seeds, listSeedUpsert);
      const { data: freshPc } = await (supabase as any)
        .from('product_categories')
        .select('*')
        .order('sort_order');
      setProductCategories(freshPc || []);
    } else {
      setProductCategories(pc);
    }

    const permsMap: Record<string, Record<string, boolean>> = {};
    const roleKeys = Array.from(
      new Set<string>([
        ...Object.keys(ROLE_PRESETS),
        ...customRolesRows.map((c) => c.role_key),
      ])
    );
    for (const rk of roleKeys) {
      const saved = (rp || []).find((r: any) => r.role === rk);
      const preset =
        (ROLE_PRESETS as Record<string, Record<string, boolean>>)[rk] ?? ROLE_PRESETS.technician;
      permsMap[rk] = saved?.permissions
        ? { ...preset, ...(saved.permissions as Record<string, boolean>) }
        : { ...preset };
    }
    setRolePerms(permsMap);
    setSecurityControls(parseSecurityControls((settings as { security_controls?: unknown } | null)?.security_controls));
  };

  useEffect(() => {
    if (mergedRoleOptions.length === 0) return;
    if (!mergedRoleOptions.some((o) => o.value === securityRoleSelect)) {
      setSecurityRoleSelect(mergedRoleOptions[0]!.value);
    }
  }, [mergedRoleOptions, securityRoleSelect]);

  const persistSecurityControls = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Sesión no válida');
      return;
    }
    setSavingSecurityControls(true);
    try {
      const { data: row } = await (supabase as any)
        .from('shop_settings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const payload = {
        employeePinChecks: securityControls.employeePinChecks,
        rolePinChecks: securityControls.rolePinChecks,
      };
      if (row) {
        const { error } = await (supabase as any)
          .from('shop_settings')
          .update({
            security_controls: payload,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        if (error) throw new Error(humanizeShopSettingsSchemaError(error.message));
      } else {
        const { error } = await (supabase as any).from('shop_settings').insert({
          ...DEFAULT_SHOP,
          user_id: user.id,
          security_controls: payload,
        });
        if (error) throw new Error(humanizeShopSettingsSchemaError(error.message));
      }
      toast.success('Controles de seguridad guardados');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSavingSecurityControls(false);
    }
  };

  /**
   * Propaga el nombre del negocio a todas las tablas que lo usan.
   * organizations.name  → fuente de verdad principal (topnav, tickets, facturas)
   * shop_settings.shop_name → usado en impresión térmica / facturas
   * profiles.shop_name  → fallback del topnav cuando no hay org
   */
  const syncOrgName = async (userId: string, newName: string) => {
    const trimmed = newName?.trim();
    if (!trimmed) return;
    const orgId = activeOrgId ?? await getActiveOrganizationId(supabase);
    await Promise.all([
      // Fuente de verdad: organizations.name (aislada por org)
      orgId
        ? (supabase as any)
            .from('organizations')
            .update({ name: trimmed })
            .eq('id', orgId)
        : Promise.resolve(),
      // Copia en shop_settings para impresión / facturas
      (supabase as any)
        .from('shop_settings')
        .update({ shop_name: trimmed })
        .eq('user_id', userId),
      // NOTA: NO se actualiza profiles.shop_name — ese campo es por usuario,
      // no por organización, y causaría que otras orgs del mismo usuario hereden el nombre.
    ]);
    // Caché local con clave org-específica para evitar contaminación cross-org
    if (orgId) {
      try { localStorage.setItem(`jcof_shop_name_${orgId}`, trimmed); } catch {}
    }
  };

  /** Notifica a todos los componentes del dashboard del nuevo nombre de negocio.
   *  Pasa el nombre en event.detail para que la actualización sea inmediata,
   *  sin depender de un re-fetch a la base de datos. */
  const broadcastNameChange = (name: string) => {
    const trimmed = name?.trim();
    if (!trimmed) return;
    // Clave org-específica para que cada org mantenga su propio nombre en caché
    if (activeOrgId) {
      try { localStorage.setItem(`jcof_shop_name_${activeOrgId}`, trimmed); } catch {}
    }
    window.dispatchEvent(new CustomEvent('org-name-changed', { detail: { name: trimmed } }));
  };

  /** Guarda fila shop_settings y, si hay org activa, intenta reflejar el logo en organizations (RLS: suele requerir ser propietario). */
  const persistShopSettingsSnapshot = async (row: ShopSettings, userId: string) => {
    const { error } = await (supabase as any)
      .from('shop_settings')
      .upsert([{ ...row, user_id: userId }], { onConflict: 'user_id' });
    if (error) throw new Error(humanizeShopSettingsSchemaError(error.message));
    const orgId = activeOrgId ?? (await getActiveOrganizationId(supabase));
    if (orgId) {
      const logo = row.logo_url?.trim() || null;
      const { error: orgErr } = await (supabase as any)
        .from('organizations')
        .update({ logo_url: logo, updated_at: new Date().toISOString() })
        .eq('id', orgId);
      if (orgErr) {
        console.warn('[shop logo] organizations.logo_url no actualizado (¿propietario de la org?):', orgErr.message);
      }
    }
  };

  /** Aplica modo de panel al instante (DB + evento), sin depender del botón «Guardar» del final del formulario. */
  const applyPanelUiMode = async (mode: 'full' | 'simple') => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Sesión no válida');
      return;
    }
    let nextRow: ShopSettings | null = null;
    setShopSettings((prev) => {
      nextRow = { ...prev, panel_ui_mode: mode };
      return nextRow;
    });
    if (!nextRow) return;
    try {
      await persistShopSettingsSnapshot(nextRow, user.id);
      notifyPanelUiModeChanged();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar el modo del panel');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await persistShopSettingsSnapshot(shopSettings, user.id);

      // Sincronizar country y currency a organizations para que useOrgLocale los lea
      try {
        const orgId = await getActiveOrganizationId(supabase);
        if (orgId && shopSettings.currency) {
          const newCountry: OrgCountry = countryCodeFromCurrency(shopSettings.currency);
          await (supabase as any)
            .from('organizations')
            .update({ country: newCountry, currency: shopSettings.currency })
            .eq('id', orgId);
          setOrgCountry(newCountry);
        }
      } catch (_) { /* Las columnas pueden no existir si la migración no corrió — se ignora */ }

      // Sincronizar el nombre con organizations y profiles para que el menú superior lo muestre
      await syncOrgName(user.id, shopSettings.shop_name);
      broadcastNameChange(shopSettings.shop_name);
      notifyPanelUiModeChanged();
      notifyOrgLocaleRefresh();
      notifyShopLogoUpdated();
      toast.success('Cambios guardados');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePerfilAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sesión no válida');
        return;
      }
      const url = await uploadProfileAvatar(supabase, user.id, file);
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      setAccountAvatarUrl(url);
      toast.success('Foto de perfil actualizada');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo subir la imagen');
    } finally {
      setAvatarUploading(false);
    }
  };

  const processShopLogoFile = async (file: File) => {
    setShopLogoUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sesión no válida');
        return;
      }
      const url = await uploadShopLogo(supabase, user.id, file);
      setShopSettings((prev) => {
        const merged = { ...prev, logo_url: url };
        void (async () => {
          try {
            await persistShopSettingsSnapshot(merged, user.id);
            notifyShopLogoUpdated();
            toast.success('Logo actualizado');
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'No se pudo guardar el logo');
          } finally {
            setShopLogoUploading(false);
          }
        })();
        return merged;
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la imagen');
      setShopLogoUploading(false);
    }
  };

  const handleShopLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processShopLogoFile(file);
  };

  const handleRemoveShopLogo = async () => {
    setShopLogoUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sesión no válida');
        return;
      }
      const merged = { ...shopSettings, logo_url: '' };
      setShopSettings(merged);
      await persistShopSettingsSnapshot(merged, user.id);
      notifyShopLogoUpdated();
      toast.success('Logo eliminado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el logo');
    } finally {
      setShopLogoUploading(false);
    }
  };

  const handleSavePerfilTab = async () => {
    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: profErr } = await (supabase as any)
        .from('profiles')
        .update({ avatar_url: accountAvatarUrl || null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (profErr) throw profErr;

      const { error: shopErr } = await (supabase as any)
        .from('shop_settings')
        .upsert([{ ...shopSettings, user_id: user.id }], { onConflict: 'user_id' });
      if (shopErr) {
        toast.error(
          `Foto de perfil guardada. ${humanizeShopSettingsSchemaError(shopErr.message)}`
        );
        return;
      }
      await syncOrgName(user.id, shopSettings.shop_name);
      broadcastNameChange(shopSettings.shop_name);
      toast.success('Perfil y datos de la tienda guardados');
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSavingSettings(false);
    }
  };

  const openNewStatus = () => {
    setEditingStatus(null);
    setStatusForm({ name: '', color: '#3b82f6', category: 'open', is_active: true });
    setStatusDialog(true);
  };

  const openEditStatus = (s: CustomStatus) => {
    setEditingStatus(s);
    setStatusForm({ name: s.name, color: s.color, category: s.category, is_active: s.is_active });
    setStatusDialog(true);
  };

  const handleSaveStatus = async () => {
    if (!statusForm.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSavingStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (editingStatus) {
        const { error } = await (supabase as any)
          .from('custom_ticket_statuses')
          .update({ name: statusForm.name, color: statusForm.color, category: statusForm.category, is_active: statusForm.is_active })
          .eq('id', editingStatus.id);
        if (error) throw error;
        toast.success('Estado actualizado');
      } else {
        const { error } = await (supabase as any)
          .from('custom_ticket_statuses')
          .insert([{ user_id: user.id, name: statusForm.name, color: statusForm.color, category: statusForm.category, is_active: statusForm.is_active, sort_order: statuses.length }]);
        if (error) throw error;
        toast.success('Estado creado');
      }
      setStatusDialog(false);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    if (!confirm('¿Eliminar este estado?')) return;
    await (supabase as any).from('custom_ticket_statuses').delete().eq('id', id);
    toast.success('Estado eliminado');
    loadAll();
  };

  const handleToggleStatus = async (s: CustomStatus) => {
    await (supabase as any).from('custom_ticket_statuses').update({ is_active: !s.is_active }).eq('id', s.id);
    setStatuses(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
  };

  const openNewTeamMember = () => {
    setEditingUser(null);
    setEditingTech(null);
    setTechForm({
      name: '',
      email: '',
      phone: '',
      role: 'technician',
      color: '#0d9488',
      is_active: true,
      permissions: { ...DEFAULT_PERMISSIONS },
      panel_user_id: 'none',
      clock_pin: '',
    });
    setUserForm((prev) => ({
      ...prev,
      email: '',
      password: '',
      full_name: '',
      role: 'technician',
      is_active: true,
    }));
    setCreatePanelAccount(true);
    setTeamDialogMode('create');
    setTeamDialogOpen(true);
  };

  const openEditTech = (t: Technician) => {
    setEditingUser(null);
    setEditingTech(t);
    setTechForm({
      name: t.name,
      email: t.email,
      phone: t.phone || '',
      role: t.role,
      color: t.color,
      is_active: t.is_active,
      permissions: { ...DEFAULT_PERMISSIONS, ...t.permissions },
      panel_user_id: t.panel_user_id || 'none',
      clock_pin: t.clock_pin ?? '',
    });
    setTeamDialogMode('edit-tech');
    setTeamDialogOpen(true);
  };

  const handleSaveTech = async () => {
    if (!techForm.name || !techForm.email) { toast.error('Nombre y email obligatorios'); return; }
    setSavingTech(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      let panelUser: string | null =
        techForm.panel_user_id && techForm.panel_user_id !== 'none' ? techForm.panel_user_id : null;
      if (!panelUser && systemUsers.length > 0) {
        const em = techForm.email.trim().toLowerCase();
        const hit = systemUsers.find(
          (u: { email?: string }) => (u.email || '').trim().toLowerCase() === em
        );
        if (hit?.id) panelUser = hit.id;
      }
      const payload: Record<string, unknown> = {
        name: techForm.name,
        email: techForm.email,
        phone: techForm.phone || null,
        role: techForm.role,
        color: techForm.color,
        is_active: techForm.is_active,
        permissions: techForm.permissions,
        panel_user_id: panelUser,
        clock_pin: techForm.clock_pin.trim() === '' ? null : techForm.clock_pin.trim(),
      };
      if (orgId) payload.organization_id = orgId;
      if (editingTech) {
        const { error } = await (supabase as any).from('technicians').update(payload).eq('id', editingTech.id);
        if (error) throw error;
        toast.success('Técnico actualizado');
      } else {
        const { error } = await (supabase as any).from('technicians').insert([{ ...payload, shop_owner_id: user.id }]);
        if (error) throw error;
        toast.success('Técnico creado');
      }
      setTeamDialogOpen(false);
      loadAll();
    } catch (e: any) {
      toast.error(humanizeTechniciansSchemaError(e?.message || String(e)));
    } finally {
      setSavingTech(false);
    }
  };

  const handleUnifiedCreate = async () => {
    if (!techForm.name?.trim() || !techForm.email?.trim()) {
      toast.error('Nombre y email obligatorios');
      return;
    }
    setSavingTech(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let panelUserId: string | null = null;
      if (isAdmin && createPanelAccount) {
        if (!userForm.password || userForm.password.length < 6) {
          toast.error('La contraseña debe tener al menos 6 caracteres');
          return;
        }
        if (userEntitlements && !userEntitlements.canAddUser) {
          toast.error(
            `Plan ${userEntitlements.planLabel}: límite de usuarios alcanzado. Desactiva «Acceso al panel» para crear solo la ficha de empleado, o amplía el plan.`
          );
          return;
        }
        const orgRole = mapTechRoleToOrgRole(techForm.role);
        const res = await adminFetch('/api/org/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: techForm.email.trim(),
            password: userForm.password,
            full_name: techForm.name.trim(),
            role: orgRole,
            is_active: techForm.is_active,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || 'No se pudo crear el usuario del panel');
        panelUserId = body?.data?.id ?? null;
        if (!panelUserId) throw new Error('Respuesta inválida al crear usuario');
      }

      const orgId = await getActiveOrganizationId(supabase);
      let panelUser: string | null = panelUserId;
      if (!panelUser && systemUsers.length > 0) {
        const em = techForm.email.trim().toLowerCase();
        const hit = systemUsers.find(
          (u: { email?: string }) => (u.email || '').trim().toLowerCase() === em
        );
        if (hit?.id) panelUser = hit.id;
      }

      const payload: Record<string, unknown> = {
        name: techForm.name.trim(),
        email: techForm.email.trim(),
        phone: techForm.phone || null,
        role: techForm.role,
        color: techForm.color,
        is_active: techForm.is_active,
        permissions: techForm.permissions,
        panel_user_id: panelUser,
        clock_pin: techForm.clock_pin.trim() === '' ? null : techForm.clock_pin.trim(),
      };
      if (orgId) payload.organization_id = orgId;
      const { error } = await (supabase as any)
        .from('technicians')
        .insert([{ ...payload, shop_owner_id: user.id }]);
      if (error) throw error;
      toast.success(
        isAdmin && createPanelAccount
          ? 'Persona añadida: ficha de empleado y acceso al panel'
          : 'Ficha de empleado creada'
      );
      setTeamDialogOpen(false);
      loadAll();
      loadSystemUsers();
    } catch (e: any) {
      toast.error(humanizeTechniciansSchemaError(e?.message || String(e)));
    } finally {
      setSavingTech(false);
    }
  };

  const handleDeleteTech = async (id: string) => {
    if (!confirm('¿Eliminar este técnico?')) return;
    await (supabase as any).from('technicians').delete().eq('id', id);
    toast.success('Técnico eliminado');
    loadAll();
  };

  const applyRolePreset = (role: string) => {
    const preset =
      (ROLE_PRESETS as Record<string, Record<string, boolean>>)[role] ?? ROLE_PRESETS.technician;
    setTechForm((prev) => ({ ...prev, role, permissions: { ...preset } }));
  };

  const checkIfAdmin = async () => {
    try {
      const res = await adminFetch('/api/org/users');
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
  };

  const loadSystemUsers = async () => {
    try {
      const res = await adminFetch('/api/org/users');
      if (!res.ok) {
        setSystemUsers([]);
        return;
      }
      const payload = await res.json();
      const users = payload?.data?.users || [];
      setSystemUsers(users);
      const ent = payload?.data?.entitlements;
      setUserEntitlements(
        ent
          ? {
              planLabel: ent.planLabel,
              maxUsers: ent.maxUsers,
              unlimitedUsers: !!ent.unlimitedUsers,
              activeUsers: ent.activeUsers,
              canAddUser: !!ent.canAddUser,
              smsAutomation: !!ent.smsAutomation,
              integrations: !!ent.integrations,
            }
          : null
      );
    } catch {
      setSystemUsers([]);
      setUserEntitlements(null);
    }
  };

  const openEditUser = (user: any) => {
    setEditingTech(null);
    setEditingUser(user);
    setUserForm({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    });
    setTeamDialogMode('edit-user');
    setTeamDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.email || !userForm.full_name) { 
      toast.error('Email y nombre son obligatorios'); 
      return; 
    }
    if (!editingUser && !userForm.password) {
      toast.error('La contraseña es obligatoria para nuevos usuarios');
      return;
    }
    
    setSavingUser(true);
    try {
      if (editingUser) {
        const res = await adminFetch('/api/org/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            email: userForm.email,
            full_name: userForm.full_name,
            role: userForm.role,
            is_active: userForm.is_active,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || 'No se pudo actualizar el usuario');
        }
        toast.success('Usuario actualizado');
      } else {
        const res = await adminFetch('/api/org/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userForm.email,
            password: userForm.password,
            full_name: userForm.full_name,
            role: userForm.role,
            is_active: userForm.is_active,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || 'No se pudo crear el usuario');
        }
        toast.success('Usuario creado exitosamente');
      }
      setTeamDialogOpen(false);
      loadSystemUsers();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar usuario');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Eliminar permanentemente este usuario?')) return;
    try {
      const res = await adminFetch('/api/org/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'No se pudo eliminar el usuario');
      }
      toast.success('Usuario eliminado');
      loadSystemUsers();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar usuario');
    }
  };

  const handleSaveSimpleItem = async (
    table: string,
    items: SimpleItem[],
    editing: SimpleItem | null,
    form: { name: string; is_active: boolean },
    setItems: (v: SimpleItem[]) => void,
    setDialog: (v: boolean) => void,
    setEditing: (v: SimpleItem | null) => void
  ) => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editing) {
      const { data, error } = await (supabase as any).from(table).update({ name: form.name, is_active: form.is_active }).eq('id', editing.id).select().maybeSingle();
      if (error) { toast.error(error.message); return; }
      setItems(items.map(i => i.id === editing.id ? data : i));
      toast.success('Actualizado correctamente');
    } else {
      const { data, error } = await (supabase as any).from(table).insert([{ user_id: user.id, name: form.name, is_active: form.is_active, sort_order: items.length }]).select().maybeSingle();
      if (error) { toast.error(error.message); return; }
      setItems([...items, data]);
      toast.success('Creado correctamente');
    }
    setDialog(false);
    setEditing(null);
  };

  const handleDeleteSimpleItem = async (table: string, id: string, items: SimpleItem[], setItems: (v: SimpleItem[]) => void) => {
    if (!confirm('¿Eliminar este elemento?')) return;
    const { error } = await (supabase as any).from(table).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setItems(items.filter(i => i.id !== id));
    toast.success('Eliminado');
  };

  const handleToggleSimpleItem = async (table: string, item: SimpleItem, items: SimpleItem[], setItems: (v: SimpleItem[]) => void) => {
    const { error } = await (supabase as any).from(table).update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) { toast.error(error.message); return; }
    setItems(items.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
  };

  const handleSaveProductCategory = async () => {
    if (!productCategoryForm.name.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }
    setSavingProductCategory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (editingProductCategory) {
        const { error } = await (supabase as any)
          .from('product_categories')
          .update({
            name: productCategoryForm.name.trim(),
            description: productCategoryForm.description.trim() || null,
            is_active: productCategoryForm.is_active,
          })
          .eq('id', editingProductCategory.id);
        if (error) throw error;
        toast.success('Categoría actualizada');
        setProductCategories(productCategories.map(c => c.id === editingProductCategory.id ? { ...c, name: productCategoryForm.name.trim(), description: productCategoryForm.description.trim() || null, is_active: productCategoryForm.is_active } : c));
      } else {
        const { data, error } = await (supabase as any)
          .from('product_categories')
          .insert([{
            user_id: user.id,
            name: productCategoryForm.name.trim(),
            description: productCategoryForm.description.trim() || null,
            is_active: productCategoryForm.is_active,
            sort_order: productCategories.length,
          }])
          .select()
          .single();
        if (error) throw error;
        toast.success('Categoría creada');
        setProductCategories([...productCategories, data]);
      }
      setProductCategoryDialog(false);
      setEditingProductCategory(null);
      setProductCategoryForm({ name: '', description: '', is_active: true });
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar la categoría');
    } finally {
      setSavingProductCategory(false);
    }
  };

  const handleDeleteProductCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    const { error } = await (supabase as any).from('product_categories').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setProductCategories(productCategories.filter(c => c.id !== id));
    toast.success('Categoría eliminada');
  };

  const handleToggleProductCategory = async (cat: typeof productCategories[0]) => {
    const { error } = await (supabase as any).from('product_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    if (error) { toast.error(error.message); return; }
    setProductCategories(productCategories.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
  };

  const handleSaveRolePerms = async () => {
    setSavingRolePerms(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const upserts = Object.entries(rolePerms).map(([role, permissions]) => ({ user_id: user.id, role, permissions, updated_at: new Date().toISOString() }));
      const { error } = await (supabase as any).from('role_permissions').upsert(upserts, { onConflict: 'user_id,role' });
      if (error) throw error;
      toast.success('Permisos guardados correctamente');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingRolePerms(false);
    }
  };

  const toggleRolePerm = (role: string, perm: string) => {
    if (role === 'admin') return;
    setRolePerms(prev => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role]?.[perm] },
    }));
  };

  const shopSet = (k: keyof ShopSettings, v: any) =>
    setShopSettings(prev => ({ ...prev, [k]: v }));

  /** Moneda → país, huso horario y símbolo (una sola fuente de verdad al cambiar en el desplegable). */
  const applyShopCurrencyChange = (newCurrency: string) => {
    const code = String(newCurrency || '').toUpperCase();
    setOrgCountry(countryCodeFromCurrency(code));
    setShopSettings((prev) => ({
      ...prev,
      currency: newCurrency,
      currency_symbol: currencySymbolFromCode(code),
      timezone: resolveTimezoneForCurrency(code, prev.timezone),
      country: shopCountryNameFromCurrency(code),
    }));
  };

  /** Cambia país en el formulario, actualiza placeholders (AR/ES) y limpia datos viejos de plantilla al pasar a Argentina. */
  const handleShopCountryChange = (v: string) => {
    setOrgCountry(v === 'Argentina' ? 'AR' : 'AR');
    setShopSettings((prev) => {
      const next: ShopSettings = { ...prev, country: v };
      if (v !== 'Argentina') return next;
      let { city, postal_code: pc, state } = next;
      if (isStaleSpainCityValueForArgentina(city)) city = '';
      if (isStaleSpainPostalCodeForArgentina(pc)) pc = '';
      if (isStaleStatePlaceholderText(state, true)) state = '';
      return { ...next, city, postal_code: pc, state };
    });
  };

  const patchTicketRepairs = (patch: Partial<TicketRepairsSettings>) => {
    setShopSettings((prev) => ({
      ...prev,
      ticket_repairs_settings: { ...prev.ticket_repairs_settings, ...patch },
    }));
  };

  const patchCustomerNotify = (
    key: CustomerNotifyChannelKey,
    field: 'email' | 'whatsapp',
    checked: boolean
  ) => {
    setShopSettings((prev) => ({
      ...prev,
      customer_notify_channels: {
        ...prev.customer_notify_channels,
        [key]: { ...prev.customer_notify_channels[key], [field]: checked },
      },
    }));
  };

  const roleLabel = (r: string) =>
    mergedRoleOptions.find((o) => o.value === r)?.label ||
    formatOrgMemberRoleLabel(r) ||
    r ||
    'Técnico';

  const openNewCustomRole = () => {
    if (!activeOrgId) {
      toast.error('No hay organización activa. Vuelve a entrar al panel o revisa tu cuenta.');
      return;
    }
    setCustomRoleForm({ name: '', description: '', color: '#6b7280' });
    setCustomRoleDialog(true);
  };

  const handleSaveCustomRole = async () => {
    if (!activeOrgId) return;
    const name = customRoleForm.name.trim();
    if (!name) {
      toast.error('El nombre del rol es obligatorio');
      return;
    }
    setSavingCustomRole(true);
    try {
      const role_key = `cr_${crypto.randomUUID().replace(/-/g, '')}`;
      const sort_order = customRoles.length;
      const { data, error } = await (supabase as any)
        .from('organization_custom_roles')
        .insert([
          {
            organization_id: activeOrgId,
            role_key,
            name,
            description: customRoleForm.description.trim(),
            color: customRoleForm.color,
            sort_order,
          },
        ])
        .select()
        .maybeSingle();
      if (error) throw error;
      const row = data as OrgCustomRole;
      if (row) {
        setCustomRoles((prev) => [...prev, row]);
        setRolePerms((prev) => ({
          ...prev,
          [role_key]: { ...ROLE_PRESETS.technician },
        }));
      }
      setCustomRoleDialog(false);
      toast.success('Rol creado. Asigna permisos en «Permisos de roles» si lo necesitas.');
    } catch (e: any) {
      toast.error(e.message || 'No se pudo crear el rol');
    } finally {
      setSavingCustomRole(false);
    }
  };

  const handleDeleteCustomRole = async (cr: OrgCustomRole) => {
    const inTech = technicians.filter((t) => t.role === cr.role_key).length;
    const inUsers = systemUsers.filter((u) => u.role === cr.role_key).length;
    if (inTech > 0 || inUsers > 0) {
      toast.error(
        `No se puede eliminar: hay ${inTech + inUsers} usuario(s) o empleado(s) con este rol. Cámbialos antes.`
      );
      return;
    }
    if (!confirm(`¿Eliminar el rol «${cr.name}»?`)) return;
    try {
      const { error } = await (supabase as any).from('organization_custom_roles').delete().eq('id', cr.id);
      if (error) throw error;
      setCustomRoles((prev) => prev.filter((x) => x.id !== cr.id));
      setRolePerms((prev) => {
        const next = { ...prev };
        delete next[cr.role_key];
        return next;
      });
      toast.success('Rol eliminado');
    } catch (e: any) {
      toast.error(e.message || 'No se pudo eliminar');
    }
  };

  const openEditPredefinedRole = (roleKey: string) => {
    if (!activeOrgId) {
      toast.error('No hay organización activa.');
      return;
    }
    const base = ROLE_OPTIONS.find((r) => r.value === roleKey);
    if (!base) return;
    const o = roleLabelOverrides[roleKey];
    setEditingPredefinedRoleKey(roleKey);
    setPredefinedRoleForm({
      name: o?.name?.trim() || base.label,
      description: o?.description?.trim() || base.desc,
      color: o?.color?.trim() || '',
    });
    setPredefinedRoleDialog(true);
  };

  const handleSavePredefinedRoleOverride = async () => {
    if (!activeOrgId || !editingPredefinedRoleKey) return;
    const name = predefinedRoleForm.name.trim();
    if (!name) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSavingPredefinedRole(true);
    try {
      const payload = {
        organization_id: activeOrgId,
        role_key: editingPredefinedRoleKey,
        name,
        description: predefinedRoleForm.description.trim(),
        color: predefinedRoleForm.color.trim(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await (supabase as any)
        .from('organization_role_label_overrides')
        .upsert(payload, { onConflict: 'organization_id,role_key' })
        .select('id, role_key, name, description, color')
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const rk = String((data as { role_key?: string }).role_key || '');
        if (rk) {
          setRoleLabelOverrides((prev) => ({
            ...prev,
            [rk]: {
              id: String((data as { id?: string }).id || ''),
              name: String((data as { name?: string }).name || ''),
              description: String((data as { description?: string }).description || ''),
              color: String((data as { color?: string }).color || ''),
            },
          }));
        }
      }
      setPredefinedRoleDialog(false);
      setEditingPredefinedRoleKey(null);
      toast.success('Rol actualizado');
    } catch (e: any) {
      toast.error(e.message || 'No se pudo guardar');
    } finally {
      setSavingPredefinedRole(false);
    }
  };

  const handleResetPredefinedRoleLabels = async () => {
    if (!activeOrgId || !editingPredefinedRoleKey) return;
    const existing = roleLabelOverrides[editingPredefinedRoleKey];
    if (!existing?.id) {
      setPredefinedRoleDialog(false);
      setEditingPredefinedRoleKey(null);
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from('organization_role_label_overrides')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      setRoleLabelOverrides((prev) => {
        const next = { ...prev };
        delete next[editingPredefinedRoleKey];
        return next;
      });
      setPredefinedRoleDialog(false);
      setEditingPredefinedRoleKey(null);
      toast.success('Textos restaurados al valor predeterminado');
    } catch (e: any) {
      toast.error(e.message || 'No se pudo restaurar');
    }
  };

  const smsAutomationLocked = userEntitlements !== null && !userEntitlements.smsAutomation;
  const profesionalAddonsLocked = userEntitlements !== null && !userEntitlements.integrations;

  const tallerWaUrl = waMeUrlForPhone(shopSettings.whatsapp_phone);

  return (
    <>
      <div className="min-h-full bg-background text-foreground">
        {activeKey === 'config_general' && (
          <div className="max-w-4xl mx-auto px-8 py-6">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <span>Inicio</span><ChevronRight className="h-3 w-3" />
              <span>Ajustes</span><ChevronRight className="h-3 w-3" />
              <span>Tiendas</span><ChevronRight className="h-3 w-3" />
              <span className="text-gray-800 font-medium">{shopSettings.shop_name || 'Configuración'}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Ajustes generales</h1>

            <Section title="Información básica">
              <Grid2>
                <Field label="Nombre del negocio *">
                  <Input className="h-9" value={shopSettings.shop_name} onChange={e => shopSet('shop_name', e.target.value)} />
                </Field>
                <Field label="Nombre alternativo">
                  <Input className="h-9" value={shopSettings.alt_name} onChange={e => shopSet('alt_name', e.target.value)} />
                </Field>
                <Field label="Correo electrónico de la tienda *">
                  <Input className="h-9" type="email" value={shopSettings.email} onChange={e => shopSet('email', e.target.value)} />
                </Field>
                <Field label="Logo">
                  <input
                    ref={shopLogoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handleShopLogoFileChange}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => shopLogoInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        shopLogoInputRef.current?.click();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const f = e.dataTransfer.files?.[0];
                      if (f) void processShopLogoFile(f);
                    }}
                    className={cn(
                      'border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      shopLogoUploading ? 'opacity-60 pointer-events-none' : 'hover:border-primary/50 cursor-pointer text-gray-500'
                    )}
                  >
                    {shopSettings.logo_url?.trim() ? (
                      <div className="flex flex-col items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={shopSettings.logo_url}
                          alt="Logo del taller"
                          className="max-h-20 max-w-full object-contain rounded"
                        />
                        <span className="text-xs text-gray-400">Clic o arrastra otra imagen para reemplazar</span>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            void handleRemoveShopLogo();
                          }}
                          disabled={shopLogoUploading}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          Quitar logo
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">
                        {shopLogoUploading ? 'Subiendo…' : 'Ponga aquí la imagen o haga clic para subir'}
                      </span>
                    )}
                  </div>
                </Field>
              </Grid2>
            </Section>

            <Section title="Experiencia del panel">
              <p className="mb-4 max-w-2xl text-sm text-gray-600">
                El <strong>modo sencillo</strong> reduce el menú superior y muestra un inicio claro con
                «Nuevo ingreso» (ideal para tiendas pequeñas). El <strong>modo completo</strong> es el
                panel estándar: inventario, informes, gastos y todas las opciones. Al elegir una opción
                se guarda de inmediato y el menú / inicio se actualizan; el resto de ajustes de esta
                pantalla siguen requiriendo guardar abajo si los modificaste.
              </p>
              <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void applyPanelUiMode('simple')}
                  className={cn(
                    'rounded-lg border-2 p-4 text-left transition-colors',
                    shopSettings.panel_ui_mode === 'simple'
                      ? 'border-[#0d9488] bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <p className="font-semibold text-gray-900">Sencillo</p>
                  <p className="mt-1 text-xs text-gray-600">
                    Menos opciones en el menú e inicio simplificado.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void applyPanelUiMode('full')}
                  className={cn(
                    'rounded-lg border-2 p-4 text-left transition-colors',
                    shopSettings.panel_ui_mode === 'full'
                      ? 'border-[#0d9488] bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <p className="font-semibold text-gray-900">Completo</p>
                  <p className="mt-1 text-xs text-gray-600">
                    Todos los módulos (informes, inventario, gastos…).
                  </p>
                </button>
              </div>

              {/* Toggle Chat interno */}
              <div className="mt-6 flex items-center justify-between max-w-xl">
                <div>
                  <p className="font-semibold text-gray-900">Chat interno del equipo</p>
                  <p className="text-xs text-gray-600">
                    Mensajería entre miembros del taller. Por defecto desactivado.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shopSettings.chat_enabled}
                    onChange={(e) => shopSet('chat_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0d9488]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d9488]"></div>
                </label>
              </div>
            </Section>

            <Section title="Información de contacto">
              <Grid2>
                <Field label="Teléfono">
                  <Input className="h-9" value={shopSettings.phone} onChange={e => shopSet('phone', e.target.value)} placeholder={`Ej. ${loc.phonePlaceholder}`} />
                </Field>
                <Field label="Ciudad">
                  <Input
                    className="h-9"
                    value={shopSettings.city}
                    onChange={e => shopSet('city', e.target.value)}
                    placeholder={cityPlaceholder(orgCountry)}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Teléfono 2">
                  <Input className="h-9" value={shopSettings.phone2} onChange={e => shopSet('phone2', e.target.value)} />
                </Field>
                <Field label="Código Postal">
                  <Input
                    className="h-9"
                    value={shopSettings.postal_code}
                    onChange={e => shopSet('postal_code', e.target.value)}
                    placeholder={postalPlaceholder(orgCountry)}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Fax">
                  <Input className="h-9" value={shopSettings.fax} onChange={e => shopSet('fax', e.target.value)} />
                </Field>
                <Field label={orgCountry === 'AR' ? 'Provincia' : 'Estado / Provincia'}>
                  <Input
                    className="h-9"
                    value={shopSettings.state}
                    onChange={e => shopSet('state', e.target.value)}
                    placeholder={statePlaceholder(orgCountry)}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Sitio web">
                  <Input className="h-9" value={shopSettings.website} onChange={e => shopSet('website', e.target.value)} placeholder="https://www.tutaller.com.ar" />
                </Field>
                <Field label="País">
                  <Select value={shopSettings.country} onValueChange={handleShopCountryChange}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Argentina">Argentina</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dirección" full>
                  <Input className="h-9" value={shopSettings.address} onChange={e => shopSet('address', e.target.value)} placeholder="Calle, número, piso…" />
                </Field>
              </Grid2>
            </Section>

            <Section title="Más información">
              <Grid2>
                <Field label={orgCountry === 'AR' ? 'CUIT / CUIL' : 'NIF / CIF / VAT'}>
                  <Input className="h-9" value={shopSettings.registration_number} onChange={e => shopSet('registration_number', e.target.value)} placeholder={orgCountry === 'AR' ? '20-12345678-9' : 'B-XXXXXXXX'} />
                </Field>
                <Field label="Horario de Huso">
                  <Select value={shopSettings.timezone} onValueChange={v => shopSet('timezone', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Argentina/Buenos_Aires">GMT −03:00 — Argentina (Buenos Aires)</SelectItem>
                      <SelectItem value="America/Argentina/Cordoba">GMT −03:00 — Argentina (Córdoba)</SelectItem>
                      <SelectItem value="America/Argentina/Mendoza">GMT −03:00 — Argentina (Mendoza)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Formato de tiempo">
                  <Select value={shopSettings.time_format} onValueChange={v => shopSet('time_format', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="12">12 horas (AM/PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tiempo de inicio">
                  <Input className="h-9" type="time" value={shopSettings.start_time} onChange={e => shopSet('start_time', e.target.value)} />
                </Field>
                <Field label="Idioma">
                  <Select value={shopSettings.language} onValueChange={v => shopSet('language', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spanish">Español</SelectItem>
                      <SelectItem value="English">Inglés</SelectItem>
                      <SelectItem value="French">Francés</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tiempo de finalización">
                  <Input className="h-9" type="time" value={shopSettings.end_time} onChange={e => shopSet('end_time', e.target.value)} />
                </Field>
                <Field label="Moneda predeterminada">
                  <Select value={shopSettings.currency} onValueChange={(v) => applyShopCurrencyChange(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Peso Argentino ($) — ARS</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dirección Predeterminada">
                  <Textarea rows={3} value={shopSettings.address} onChange={e => shopSet('address', e.target.value)} className="resize-none" />
                </Field>
                <Field label="Formato de precio">
                  <Select value={shopSettings.price_format} onValueChange={v => shopSet('price_format', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Decimal">Decimal</SelectItem>
                      <SelectItem value="Integer">Entero</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Formato decimal">
                  <Select value={shopSettings.decimal_places} onValueChange={v => shopSet('decimal_places', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 decimales</SelectItem>
                      <SelectItem value="3">3 decimales</SelectItem>
                      <SelectItem value="0">Sin decimales</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid2>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <strong>Nota:</strong> Seleccione la cantidad de decimales para el redondeo. Este cambio solo afectará los impuestos y los montos totales en los módulos de órdenes de compra y GRN por ahora.
              </div>
            </Section>

            <Section title="Impuesto">
              <Grid2>
                <Field label="¿Cobras impuesto sobre las ventas?">
                  <Select defaultValue="Yes">
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Sí</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Categoría de Impuesto Determinado">
                  <Input className="h-9" defaultValue="IVA" />
                </Field>
                <Field label="Porcentaje de Impuesto">
                  <Input className="h-9" type="number" value={shopSettings.tax_rate} onChange={e => shopSet('tax_rate', parseFloat(e.target.value))} />
                </Field>
                <Field label="El impuesto está incluido en los precios">
                  <Select value={shopSettings.tax_included ? 'Yes' : 'No'} onValueChange={v => shopSet('tax_included', v === 'Yes')}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Sí</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid2>
            </Section>

            <Section title="método de contabilidad">
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="accounting" value="cash" checked={shopSettings.accounting_method === 'cash'} onChange={() => shopSet('accounting_method', 'cash')} className="accent-primary" />
                  <span className="text-sm font-medium text-gray-700">Base de efectivo</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="accounting" value="accrual" checked={shopSettings.accounting_method === 'accrual'} onChange={() => shopSet('accounting_method', 'accrual')} className="accent-primary" />
                  <span className="text-sm font-medium text-gray-700">Base de acumulación</span>
                </label>
              </div>
            </Section>

            <Section title="Email">
              <Grid2>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Correo electrónico de empresa</Label>
                  <div className="flex gap-2 mt-1">
                    <Input className="h-9" type="email" value={shopSettings.email} onChange={e => shopSet('email', e.target.value)} />
                    <button className="px-4 py-1.5 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 whitespace-nowrap">Verificado</button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Utilice una dirección de correo electrónico de la empresa para una mejor entrega de correo electrónico.</p>
                </div>
              </Grid2>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-700">¿Le gustaría recibir todos los correos electrónicos dentro del CRM?</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="recv_email" value="yes" defaultChecked className="accent-primary" /><span className="text-sm">Sí</span></label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="recv_email" value="no" className="accent-primary" /><span className="text-sm">No</span></label>
                </div>
              </div>
            </Section>

            <Section title="Reembolso">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700">¿Cobras una tarifa de reposición??</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="restocking" value="si" className="accent-primary" /><span className="text-sm">Sí</span></label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="restocking" value="no" defaultChecked className="accent-primary" /><span className="text-sm">No</span></label>
                </div>
              </div>
            </Section>

            <Section title="Depósito">
              <p className="text-xs text-gray-500 mb-3">Cobre una tarifa de diagnóstico o de banco a sus clientes al reservar un trabajo de reparación.</p>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700">¿Cobras depósito por las reparaciones?</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="deposit" value="yes" className="accent-primary" /><span className="text-sm">Sí</span></label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="deposit" value="no" defaultChecked className="accent-primary" /><span className="text-sm">No</span></label>
                </div>
              </div>
            </Section>

            <Section title="Pantalla de bloqueo">
              <Field label="Apaga la pantalla después">
                <Select value={shopSettings.screen_timeout} onValueChange={v => shopSet('screen_timeout', v)}>
                  <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Never">Nunca</SelectItem>
                    <SelectItem value="5min">5 minutos</SelectItem>
                    <SelectItem value="15min">15 minutos</SelectItem>
                    <SelectItem value="30min">30 minutos</SelectItem>
                    <SelectItem value="1hr">1 hora</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Section title="Facturación">
              <Grid2>
                <Field label="Prefijo de tickets">
                  <Input className="h-9" value={shopSettings.ticket_prefix} onChange={e => shopSet('ticket_prefix', e.target.value)} placeholder="0-" />
                </Field>
                <Field label="Prefijo de facturas">
                  <Input className="h-9" value={shopSettings.invoice_prefix} onChange={e => shopSet('invoice_prefix', e.target.value)} placeholder="F-" />
                </Field>
                <Field label="Garantía por defecto">
                  <Select value={shopSettings.default_warranty} onValueChange={v => shopSet('default_warranty', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sin garantía">Sin garantía</SelectItem>
                      <SelectItem value="3 meses">3 meses</SelectItem>
                      <SelectItem value="6 meses">6 meses</SelectItem>
                      <SelectItem value="1 año">1 año</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Texto pie de página factura" full>
                  <Input className="h-9" value={shopSettings.footer_text} onChange={e => shopSet('footer_text', e.target.value)} placeholder="Texto legal o de cierre (opcional)" />
                </Field>
              </Grid2>
            </Section>

            {/* ── Términos y condiciones por país ── */}
            <Section title="📋 Términos y condiciones / Garantía">
              {/* Toggle principal */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 mb-5">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Mostrar términos y condiciones en la factura</p>
                  <p className="text-xs text-gray-500 mt-0.5">Si está activado, el texto aparecerá al pie de cada factura impresa según el país.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shopSettings.invoice_show_terms}
                  onClick={() => shopSet('invoice_show_terms', !shopSettings.invoice_show_terms)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${shopSettings.invoice_show_terms ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${shopSettings.invoice_show_terms ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Textos editables — solo visibles si el toggle está activo */}
              {shopSettings.invoice_show_terms && (
                <div className="grid grid-cols-1 gap-5">
                  <p className="text-xs text-gray-500 -mt-2">
                    Edita el texto según las condiciones de tu taller. Si lo dejas vacío se usa un texto genérico por defecto.
                  </p>
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1.5">
                      Términos y condiciones (Argentina)
                    </label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 resize-y"
                      value={shopSettings.terms_text_ar}
                      onChange={e => shopSet('terms_text_ar', e.target.value)}
                      placeholder={`Ej: Garantía de 90 días en componentes reemplazados bajo uso normal. Excluye daños por humedad, golpes o terceros. Datos personales: confidenciales conforme a la Ley 25.326.`}
                    />
                  </div>
                </div>
              )}
            </Section>

            <div className="flex justify-end mt-4 pb-8">
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        )}

        {activeKey === 'estado_ticket' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Estado del ticket</h1>
                <p className="text-sm text-gray-500 mt-1">Crea, edita y elimina estados personalizados para tus tickets.</p>
              </div>
              <Button onClick={openNewStatus} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Plus className="h-4 w-4" />
                Nuevo estado
              </Button>
            </div>

            {['on_hold', 'open', 'closed'].map(cat => {
              const catStatuses = statuses.filter(s => s.category === cat);
              const catLabel = cat === 'on_hold' ? 'On hold' : cat === 'open' ? 'Open' : 'Closed';
              return (
                <div key={cat} className="mb-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{catLabel}</h3>
                  {catStatuses.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-400">
                      Sin estados en esta categoría
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                      {catStatuses.map(s => (
                        <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-sm font-medium text-gray-800">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(s)}
                              className={cn(
                                'text-xs px-2.5 py-1 rounded border',
                                s.is_active
                                  ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                                  : 'border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100'
                              )}
                            >
                              {s.is_active ? 'Activo' : 'Inactivo'}
                            </button>
                            <button onClick={() => openEditStatus(s)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDeleteStatus(s.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {statuses.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Circle className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="font-medium text-gray-600">No hay estados personalizados</p>
                <p className="text-sm text-gray-400 mt-1">Crea estados para personalizar el flujo de trabajo de tus tickets</p>
                <Button onClick={openNewStatus} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer estado
                </Button>
              </div>
            )}
          </div>
        )}

        {activeKey === 'equipo' && (
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900">Equipo y accesos</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Una sola pantalla para las <strong className="font-medium text-gray-700">fichas de empleado</strong> (taller,
                  tickets, reloj, permisos) y las <strong className="font-medium text-gray-700">cuentas que inician sesión</strong>{' '}
                  en el panel. Al dar de alta a alguien puedes crear ambas cosas a la vez.
                </p>
                {isAdmin && userEntitlements && (
                  <p className="mt-2 text-xs text-gray-500">
                    Plan <span className="font-semibold text-gray-700">{userEntitlements.planLabel}</span>
                    {' · '}
                    {userEntitlements.unlimitedUsers
                      ? `${userEntitlements.activeUsers} usuarios con acceso al panel (sin tope)`
                      : `${userEntitlements.activeUsers} / ${userEntitlements.maxUsers} usuarios con acceso al panel`}
                  </p>
                )}
              </div>
              <Button
                onClick={openNewTeamMember}
                className="shrink-0 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Agregar al equipo
              </Button>
            </div>

            {isAdmin && userEntitlements && !userEntitlements.canAddUser && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Has llegado al máximo de usuarios con acceso al panel en tu plan. Aún puedes crear{' '}
                <strong>fichas de empleado</strong> sin marcar «Acceso al panel» en el formulario.{' '}
                <a href="/dashboard/settings?tab=facturacion_cuenta" className="font-semibold underline">
                  Revisar facturación
                </a>
              </div>
            )}

            {!isAdmin && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Solo un administrador de la organización puede crear o editar <strong>cuentas de acceso al panel</strong>. Tú
                puedes gestionar las <strong>fichas de empleado</strong> del taller.
              </div>
            )}

            <div className="mb-10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Cuentas con acceso al panel
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Creado
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {systemUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                              {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{user.full_name || 'Sin nombre'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const ro = mergedRoleOptions.find((o) => o.value === user.role);
                            if (ro?.color) {
                              return (
                                <span
                                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                                  style={{
                                    backgroundColor: `${ro.color}22`,
                                    color: ro.color,
                                  }}
                                >
                                  {roleLabel(user.role)}
                                </span>
                              );
                            }
                            return (
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700'
                                    : user.role === 'technician'
                                      ? 'bg-blue-100 text-blue-700'
                                      : user.role === 'receptionist'
                                        ? 'bg-green-100 text-green-700'
                                        : user.role === 'manager'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-gray-100 text-gray-700'
                                )}
                              >
                                {roleLabel(user.role)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            )}
                          >
                            {user.is_active ? 'Activo' : 'Bloqueado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isAdmin && user.email !== 'sr.gonzalezcala89@gmail.com' && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditUser(user)}
                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user.id)}
                                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {systemUsers.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    <p>No hay cuentas de acceso al panel en esta organización.</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Fichas de empleado (taller)
              </h2>
              <p className="mb-3 text-xs text-gray-500">
                Asignación a tickets, reloj de fichaje, permisos detallados y enlace opcional a una cuenta del panel para
                notificaciones.
              </p>
              {technicians.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
                  <Users className="mx-auto mb-3 h-12 w-12 text-gray-200" />
                  <p className="font-medium text-gray-600">No hay fichas de empleado todavía</p>
                  <Button
                    onClick={openNewTeamMember}
                    className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar al equipo
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Empleado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Rol
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Permisos
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {technicians.map((tech) => {
                        const perms = tech.permissions || {};
                        const permCount = Object.values(perms).filter(Boolean).length;
                        const totalPerms = Object.keys(PERMISSION_LABELS).length;
                        return (
                          <tr key={tech.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm font-bold text-white shadow-sm"
                                  style={{ backgroundColor: tech.color }}
                                >
                                  {tech.name[0]?.toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-900">{tech.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{tech.email}</td>
                            <td className="px-4 py-3">
                              {(() => {
                                const ro = mergedRoleOptions.find((o) => o.value === tech.role);
                                if (ro?.color) {
                                  return (
                                    <span
                                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                                      style={{
                                        backgroundColor: `${ro.color}22`,
                                        color: ro.color,
                                      }}
                                    >
                                      {roleLabel(tech.role)}
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    className={cn(
                                      'rounded-full px-2 py-0.5 text-xs font-medium',
                                      tech.role === 'admin'
                                        ? 'bg-blue-100 text-blue-700'
                                        : tech.role === 'tech_3'
                                          ? 'bg-purple-100 text-purple-700'
                                          : tech.role === 'tech_2'
                                            ? 'bg-amber-100 text-amber-700'
                                            : tech.role === 'tech_1'
                                              ? 'bg-gray-100 text-gray-600'
                                              : tech.role === 'receptionist'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                    )}
                                  >
                                    {roleLabel(tech.role)}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 w-24 rounded-full bg-gray-100">
                                  <div
                                    className="h-1.5 rounded-full bg-primary"
                                    style={{ width: `${(permCount / totalPerms) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {permCount}/{totalPerms}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  tech.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                )}
                              >
                                {tech.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditTech(tech)}
                                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTech(tech.id)}
                                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeKey === 'roles' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Roles del sistema</h1>
                <p className="text-sm text-gray-500 mt-1 max-w-xl">
                  Roles predefinidos más los que definas para tu empresa. Personaliza permisos en «Permisos de roles».
                </p>
              </div>
              <Button
                type="button"
                onClick={openNewCustomRole}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Nuevo rol
              </Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              <p className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                Predefinidos
              </p>
              {mergedRoleOptions
                .filter((role) => !role.isCustom)
                .map((role) => (
                  <div
                    key={role.value}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {role.color ? (
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                      ) : (
                        <div
                          className={cn(
                            'w-2.5 h-2.5 rounded-full flex-shrink-0',
                            role.value === 'admin'
                              ? 'bg-blue-500'
                              : role.value === 'tech_3'
                                ? 'bg-purple-500'
                                : role.value === 'tech_2'
                                  ? 'bg-amber-500'
                                  : role.value === 'tech_1'
                                    ? 'bg-gray-400'
                                    : role.value === 'receptionist'
                                      ? 'bg-green-500'
                                      : 'bg-gray-400'
                          )}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{role.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{role.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-500">
                        {technicians.filter((t) => t.role === role.value).length +
                          systemUsers.filter((u) => u.role === role.value).length}{' '}
                        usuario
                        {technicians.filter((t) => t.role === role.value).length +
                          systemUsers.filter((u) => u.role === role.value).length !==
                        1
                          ? 's'
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveKey('permisos_roles')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver permisos
                      </button>
                      {activeOrgId ? (
                        <button
                          type="button"
                          onClick={() => openEditPredefinedRole(role.value)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"
                          title="Editar nombre y descripción"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              {customRoles.length > 0 && (
                <>
                  <p className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                    Roles de tu empresa
                  </p>
                  {customRoles.map((cr) => (
                    <div
                      key={cr.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cr.color }}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{cr.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {cr.description?.trim() || 'Rol definido por tu empresa'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-500">
                          {technicians.filter((t) => t.role === cr.role_key).length +
                            systemUsers.filter((u) => u.role === cr.role_key).length}{' '}
                          usuario
                          {technicians.filter((t) => t.role === cr.role_key).length +
                            systemUsers.filter((u) => u.role === cr.role_key).length !==
                          1
                            ? 's'
                            : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveKey('permisos_roles')}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver permisos
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomRole(cr)}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                          title="Eliminar rol"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {activeKey === 'permisos_roles' && (
          <div className="mx-auto w-full max-w-[min(100%,1400px)] px-4 py-6 sm:px-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-gray-900">Permisos de roles</h1>
              <Button onClick={handleSaveRolePerms} disabled={savingRolePerms} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                {savingRolePerms ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
                Guardar todos los permisos
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Activa o desactiva permisos por rol. El Administrador siempre tiene todos los permisos.</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[720px] bg-white text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 z-[1] min-w-[12rem] max-w-[16rem] bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                      Permiso
                    </th>
                    {mergedRoleOptions.map((r) => (
                      <th
                        key={r.value}
                        className="min-w-[10rem] max-w-[14rem] px-2 py-3 text-center align-bottom text-[11px] font-semibold uppercase leading-snug text-gray-500"
                        title={r.label}
                      >
                        <span className="inline-block hyphens-auto break-words normal-case tracking-tight text-gray-600">
                          {r.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(PERMISSION_LABELS).map(([permKey, permLabel]) => (
                    <tr key={permKey} className="group hover:bg-gray-50">
                      <td className="sticky left-0 z-[1] min-w-[12rem] max-w-[16rem] bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)] group-hover:bg-gray-50">
                        {permLabel}
                      </td>
                      {mergedRoleOptions.map((r) => {
                        const isAdmin = r.value === 'admin';
                        const val = isAdmin ? true : (rolePerms[r.value]?.[permKey] ?? false);
                        return (
                          <td key={r.value} className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              disabled={isAdmin}
                              onClick={() => toggleRolePerm(r.value, permKey)}
                              className={cn(
                                'w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors',
                                val ? 'bg-primary' : 'bg-gray-200 hover:bg-gray-300',
                                isAdmin && 'cursor-not-allowed opacity-70'
                              )}
                            >
                              {val && <Check className="h-3 w-3 text-white" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">Los cambios de permisos se aplican la próxima vez que el empleado inicia sesión. Haz clic en "Guardar todos los permisos" para confirmar los cambios.</p>
            </div>
          </div>
        )}

        {activeKey === 'seguridad' && (
          <div className="max-w-4xl mx-auto px-8 py-6">
            <SettingsNavBreadcrumb activeTab="seguridad" isArgentina={loc.isAR} />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Administrar los controles de seguridad</h1>
            <p className="text-sm text-gray-500 mb-4">
              Marca en qué situaciones quieres exigir el PIN del empleado. Los valores se guardan en tu cuenta; la aplicación
              estricta en cada pantalla del panel se irá completando en versiones sucesivas.
            </p>

            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Requiere la columna <code className="rounded bg-amber-100 px-1">security_controls</code> en{' '}
              <code className="rounded bg-amber-100 px-1">shop_settings</code>. Si al guardar ves un error de esquema, ejecuta
              la migración <code className="rounded bg-amber-100 px-1">202604032500_shop_settings_security_controls.sql</code>{' '}
              en Supabase (SQL Editor o <code className="rounded bg-amber-100 px-1">supabase db push</code>).
            </div>

            {/* Requiere PIN — política global */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-1">Requiere el PIN de acceso del empleado</h2>
              <p className="text-xs text-gray-500 mb-4">Política general para el taller (todos los roles salvo que definas lo contrario por rol abajo).</p>
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  {SECURITY_PIN_ITEMS.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 text-sm text-gray-700">{item.label}</td>
                      <td className="py-3 text-right w-14">
                        <Checkbox
                          id={`emp-pin-${item.id}`}
                          className="rounded"
                          checked={Boolean(securityControls.employeePinChecks[item.id])}
                          onCheckedChange={(v) => {
                            const checked = v === true;
                            setSecurityControls((prev) => ({
                              ...prev,
                              employeePinChecks: { ...prev.employeePinChecks, [item.id]: checked },
                            }));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mt-4">
                <Button
                  type="button"
                  onClick={() => void persistSecurityControls()}
                  disabled={savingSecurityControls}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  {savingSecurityControls ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Label className="text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">Seleccionar rol</Label>
              <Select value={securityRoleSelect} onValueChange={setSecurityRoleSelect}>
                <SelectTrigger className="h-9 w-72 max-w-full">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {mergedRoleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Por rol */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">Controles por rol</h2>
                <p className="text-xs text-gray-500 mt-1">
                  PIN requerido del empleado con rol <span className="font-medium text-gray-700">{mergedRoleOptions.find((o) => o.value === securityRoleSelect)?.label ?? securityRoleSelect}</span> en cada acción.
                </p>
              </div>
              <div className="p-4">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-100">
                    {SECURITY_PIN_ITEMS.map((item) => {
                      const row = {
                        ...emptySecurityPinChecks(),
                        ...securityControls.rolePinChecks[securityRoleSelect],
                      };
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 text-sm text-gray-700">{item.label}</td>
                          <td className="py-3 text-right w-14">
                            <Checkbox
                              id={`role-pin-${securityRoleSelect}-${item.id}`}
                              className="rounded"
                              checked={Boolean(row[item.id])}
                              onCheckedChange={(v) => {
                                const checked = v === true;
                                setSecurityControls((prev) => ({
                                  ...prev,
                                  rolePinChecks: {
                                    ...prev.rolePinChecks,
                                    [securityRoleSelect]: {
                                      ...emptySecurityPinChecks(),
                                      ...prev.rolePinChecks[securityRoleSelect],
                                      [item.id]: checked,
                                    },
                                  },
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-4 flex justify-end">
                <Button
                  type="button"
                  onClick={() => void persistSecurityControls()}
                  disabled={savingSecurityControls}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  {savingSecurityControls ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Guardar cambios
                </Button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Tras guardar, los ajustes quedan almacenados. Los empleados pueden necesitar volver a iniciar sesión para que
                otras partes del panel lean la nueva configuración cuando esté enlazada.
              </p>
            </div>
          </div>
        )}

        {activeKey === 'tipos_tareas' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">Tipos de tareas</h1>
              <Button onClick={() => { setEditingTaskType(null); setTaskTypeForm({ name: '', is_active: true }); setTaskTypeDialog(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Plus className="h-4 w-4" />Nuevo tipo
              </Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {taskTypes.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={cn('w-2 h-2 rounded-full', t.is_active ? 'bg-green-500' : 'bg-gray-300')} />
                    <span className="text-sm font-medium text-gray-800">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleSimpleItem('task_types', t, taskTypes, setTaskTypes)} className={cn('text-xs px-2 py-0.5 rounded-full mr-2', t.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                      {t.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => { setEditingTaskType(t); setTaskTypeForm({ name: t.name, is_active: t.is_active }); setTaskTypeDialog(true); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeleteSimpleItem('task_types', t.id, taskTypes, setTaskTypes)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeKey === 'metodos_pago' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">Métodos de pago</h1>
              <Button onClick={() => { setEditingPayMethod(null); setPayMethodForm({ name: '', is_active: true }); setPayMethodDialog(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Plus className="h-4 w-4" />Nuevo método
              </Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {paymentMethods.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={cn('w-2 h-2 rounded-full', m.is_active ? 'bg-green-500' : 'bg-gray-300')} />
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleSimpleItem('payment_methods', m, paymentMethods, setPaymentMethods)} className={cn('text-xs px-2 py-0.5 rounded-full mr-2', m.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                      {m.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => { setEditingPayMethod(m); setPayMethodForm({ name: m.name, is_active: m.is_active }); setPayMethodDialog(true); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeleteSimpleItem('payment_methods', m.id, paymentMethods, setPaymentMethods)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeKey === 'config_impuestos' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Configuración de impuestos</h1>
            <p className="text-sm text-gray-500 mb-6">Gestiona los impuestos aplicados a tus ventas y reparaciones.</p>
            <Section title="Impuesto general">
              <Grid2>
                <Field label="Porcentaje de IVA (%)">
                  <Input
                    className="h-9"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={shopSettings.tax_rate}
                    onChange={e => shopSet('tax_rate', parseFloat(e.target.value) || 0)}
                  />
                </Field>
                <Field label="¿El IVA está incluido en los precios?">
                  <Select
                    value={shopSettings.tax_included ? 'Yes' : 'No'}
                    onValueChange={v => shopSet('tax_included', v === 'Yes')}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Sí (precio ya incluye IVA)</SelectItem>
                      <SelectItem value="No">No (se suma al precio base)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={orgCountry === 'AR' ? 'CUIT / CUIL del taller' : 'NIF / CIF / VAT'} full>
                  <Input
                    className="h-9"
                    value={shopSettings.registration_number}
                    onChange={e => shopSet('registration_number', e.target.value)}
                    placeholder={orgCountry === 'AR' ? '20-12345678-9' : 'B-XXXXXXXX'}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {orgCountry === 'AR'
                      ? 'Fuente de verdad única. El mismo CUIT se usa para ARCA/AFIP al emitir comprobantes.'
                      : 'Número de identificación fiscal del negocio.'}
                  </p>
                </Field>
                {orgCountry === 'AR' && (
                  <Field label="Condición frente al IVA (AFIP/ARCA)" full>
                    <Select
                      value={shopSettings.iva_condition ?? ''}
                      onValueChange={v => shopSet('iva_condition', v || null)}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecciona condición…" /></SelectTrigger>
                      <SelectContent>
                        {IVA_CONDITIONS_AR.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      Condición del <strong>emisor</strong> (el taller). Determina el tipo de comprobante: Monotributo → Factura C;
                      Responsable Inscripto + cliente RI → Factura A; resto → Factura B.
                    </p>
                  </Field>
                )}
              </Grid2>
            </Section>
            {orgCountry === 'AR' && (
              <Section title="AFIP / ARCA — certificado y punto de venta">
                <p className="text-xs text-gray-500 -mt-1 mb-1 max-w-2xl leading-relaxed">
                  Para monotributo y otros regímenes: tres pasos en pantalla (certificado → punto de venta → opcional: pruebas o
                  producción).
                </p>
                <ArcaIntegrationSettings shopCuit={shopSettings.registration_number} />
              </Section>
            )}
            <Section title={orgCountry === 'AR' ? 'Alícuotas de IVA (referencia)' : 'Tipos de IVA (referencia)'}>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 mb-3">
                {(orgCountry === 'AR'
                  ? [
                    { name: 'Alícuota General', rate: '21%', active: true },
                    { name: 'Alícuota Reducida', rate: '10.5%', active: true },
                    { name: 'Alícuota Mínima', rate: '2.5%', active: false },
                    { name: 'Exento', rate: '0%', active: true },
                  ]
                  : [
                    { name: 'IVA General', rate: '21%', active: true },
                    { name: 'IVA Reducido', rate: '10%', active: true },
                    { name: 'IVA Superreducido', rate: '4%', active: false },
                    { name: 'Exento', rate: '0%', active: true },
                  ]
                ).map(t => (
                  <div key={t.name} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className={cn('w-2.5 h-2.5 rounded-full', t.active ? 'bg-green-500' : 'bg-gray-300')} />
                      <span className="text-sm font-medium text-gray-800">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-700">{t.rate}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {t.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Las alícuotas AFIP se aplican automáticamente según la condición IVA del taller y del cliente al emitir comprobantes.</p>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        )}

        {activeKey === 'margen_iva' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Margen de IVA</h1>
            <p className="text-sm text-gray-500 mb-6">Configura el régimen de margen para artículos de segunda mano.</p>
            <Section title="Configuración del margen">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <Receipt className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Régimen especial de bienes usados</p>
                    <p className="text-xs text-amber-700 mt-1">Este régimen aplica a la compraventa de artículos de segunda mano. El IVA solo se calcula sobre el margen de beneficio.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Activar margen de IVA</p>
                    <p className="text-xs text-gray-500">Permite aplicar el régimen de margen en ventas</p>
                  </div>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="iva_margin" defaultChecked className="accent-primary" /><span className="text-sm">Sí</span></label>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="iva_margin" className="accent-primary" /><span className="text-sm">No</span></label>
                  </div>
                </div>
              </div>
            </Section>
            <div className="flex justify-end mt-4">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar cambios</Button>
            </div>
          </div>
        )}

        {activeKey === 'bandeja_qz' && (
          <QzTraySettingsSection
            port={shopSettings.qz_tray_port}
            usingSecure={shopSettings.qz_tray_using_secure}
            certificatePem={shopSettings.qz_tray_certificate_pem}
            certificateLabel={shopSettings.qz_tray_certificate_label}
            directInvoicePrint={shopSettings.qz_tray_direct_invoice_print}
            onChange={(patch) => setShopSettings((prev) => ({ ...prev, ...patch }))}
          />
        )}

        {activeKey === 'nodo_impresion' && (
          <PrintNodeSettingsSection
            organizationId={activeOrgId}
            qzConnect={{
              port: shopSettings.qz_tray_port,
              usingSecure: shopSettings.qz_tray_using_secure,
              certificatePem: shopSettings.qz_tray_certificate_pem,
            }}
          />
        )}

        {activeKey === 'config_inventario' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Configuración de inventario</h1>
            <p className="text-sm text-gray-500 mb-6">Ajusta cómo se gestiona tu inventario y stock.</p>
            <Section title="Stock y alertas">
              <Grid2>
                <Field label="Alerta de stock mínimo">
                  <Input className="h-9" type="number" defaultValue="5" />
                </Field>
                <Field label="Unidad de medida predeterminada">
                  <Select defaultValue="unit">
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">Unidad</SelectItem>
                      <SelectItem value="kg">Kilogramos</SelectItem>
                      <SelectItem value="liter">Litros</SelectItem>
                      <SelectItem value="meter">Metros</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid2>
              <div className="space-y-3 mt-4">
                {[
                  { id: 'track_serial', label: 'Rastrear números de serie', desc: 'Requiere número de serie para cada artículo' },
                  { id: 'auto_reorder', label: 'Reorden automático', desc: 'Generar órdenes de compra automáticamente cuando el stock esté bajo' },
                  { id: 'negative_stock', label: 'Permitir stock negativo', desc: 'Permite vender artículos incluso sin stock disponible' },
                  { id: 'barcode_scan', label: 'Lector de código de barras', desc: 'Habilitar escáner de código de barras al buscar artículos' },
                ].map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Checkbox id={item.id} className="mt-0.5" />
                    <label htmlFor={item.id} className="cursor-pointer">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </label>
                  </div>
                ))}
              </div>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar cambios</Button>
            </div>
          </div>
        )}

        {activeKey === 'categorias_productos' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Categorías de productos</h1>
                <p className="text-sm text-gray-500 mt-1">Organiza tu inventario por categorías</p>
              </div>
              <Button
                onClick={() => {
                  setEditingProductCategory(null);
                  setProductCategoryForm({ name: '', description: '', is_active: true });
                  setProductCategoryDialog(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                <Plus className="h-4 w-4" />Nueva categoría
              </Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {productCategories.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No hay categorías. Crea la primera para organizar tu inventario.
                </div>
              ) : (
                productCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                      <span className={cn('text-sm font-medium', cat.is_active ? 'text-gray-800' : 'text-gray-400 line-through')}>
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleProductCategory(cat)}
                        className={cn('text-xs px-2 py-0.5 rounded-full mr-2', cat.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                      >
                        {cat.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProductCategory(cat);
                          setProductCategoryForm({ name: cat.name, description: cat.description || '', is_active: cat.is_active });
                          setProductCategoryDialog(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProductCategory(cat.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Dialog open={productCategoryDialog} onOpenChange={setProductCategoryDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingProductCategory ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Nombre <span className="text-red-500">*</span></Label>
                    <Input
                      className="mt-1 h-9"
                      value={productCategoryForm.name}
                      onChange={(e) => setProductCategoryForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ej: Smartphones"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Descripción</Label>
                    <Input
                      className="mt-1 h-9"
                      value={productCategoryForm.description}
                      onChange={(e) => setProductCategoryForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Descripción opcional"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cat_is_active"
                      checked={productCategoryForm.is_active}
                      onCheckedChange={(v) => setProductCategoryForm(p => ({ ...p, is_active: v === true }))}
                    />
                    <label htmlFor="cat_is_active" className="text-sm cursor-pointer">Activo</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setProductCategoryDialog(false)}>Cancelar</Button>
                  <Button
                    onClick={handleSaveProductCategory}
                    disabled={savingProductCategory || !productCategoryForm.name.trim()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                  >
                    {savingProductCategory && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingProductCategory ? 'Guardar cambios' : 'Crear categoría'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeKey === 'fabricantes' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Fabricantes</h1>
                <p className="text-sm text-gray-500 mt-1">Gestiona las marcas y fabricantes de tu inventario</p>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"><Plus className="h-4 w-4" />Nuevo fabricante</Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Sony', 'LG', 'Motorola', 'Nokia'].map(brand => (
                <div key={brand} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <span className="text-sm font-medium text-gray-800">{brand}</span>
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><Pencil className="h-3.5 w-3.5" /></button>
                    <button className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeKey === 'pos_config' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Configuración del Punto de Venta</h1>
            <p className="text-sm text-gray-500 mb-6">Personaliza el comportamiento del módulo de venta.</p>
            <Section title="General">
              <Grid2>
                <Field label="Moneda del POS">
                  <Select value={shopSettings.currency} onValueChange={(v) => applyShopCurrencyChange(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Peso Argentino ($) — ARS</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Impresora de tickets">
                  <Select defaultValue="none">
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin impresora</SelectItem>
                      <SelectItem value="thermal">Térmica 80mm</SelectItem>
                      <SelectItem value="a4">A4 Laser</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid2>
              <div className="space-y-3 mt-4">
                {[
                  { id: 'auto_print', label: 'Imprimir recibo automáticamente', desc: 'Imprimir recibo al completar cada venta' },
                  { id: 'require_customer', label: 'Requerir cliente en cada venta', desc: 'El cliente es obligatorio para completar la venta' },
                  { id: 'show_tax', label: 'Mostrar desglose de impuestos', desc: 'Muestra IVA desglosado en el ticket de venta' },
                  { id: 'allow_discount', label: 'Permitir descuentos manuales', desc: 'Los empleados pueden aplicar descuentos personalizados' },
                ].map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Checkbox id={item.id} className="mt-0.5" />
                    <label htmlFor={item.id} className="cursor-pointer">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </label>
                  </div>
                ))}
              </div>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar cambios</Button>
            </div>
          </div>
        )}

        {activeKey === 'facturas' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Facturas</h1>
            <p className="text-sm text-gray-500 mb-6">Configura el formato y comportamiento de las facturas.</p>
            <Section title="Numeración">
              <Grid2>
                <Field label="Prefijo de factura">
                  <Input className="h-9" defaultValue="F-" placeholder="F-" />
                </Field>
                <Field label="Número inicial">
                  <Input className="h-9" type="number" defaultValue="1" />
                </Field>
                <Field label="Vencimiento predeterminado">
                  <Select defaultValue="30">
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Al vencimiento</SelectItem>
                      <SelectItem value="15">15 días</SelectItem>
                      <SelectItem value="30">30 días</SelectItem>
                      <SelectItem value="60">60 días</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Moneda">
                  <Select value={shopSettings.currency} onValueChange={(v) => applyShopCurrencyChange(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Peso Argentino ($) — ARS</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Notas de pie de factura" full>
                  <Textarea rows={3} placeholder="Ej. Gracias por confiar en nosotros." className="resize-none" />
                </Field>
              </Grid2>
            </Section>
            <Section title="Opciones de envío">
              <div className="space-y-3">
                {[
                  { id: 'auto_email', label: 'Enviar factura por email automáticamente', desc: 'Al crear la factura se envía al cliente' },
                  { id: 'pdf_attach', label: 'Adjuntar PDF en el email', desc: 'Se incluye la factura en PDF en el correo' },
                ].map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Checkbox id={item.id} className="mt-0.5" />
                    <label htmlFor={item.id} className="cursor-pointer">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </label>
                  </div>
                ))}
              </div>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar cambios</Button>
            </div>
          </div>
        )}

        {activeKey === 'como_enteraron' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">¿Cómo se enteró de nosotros?</h1>
                <p className="text-sm text-gray-500 mt-1">Fuentes de adquisición de clientes</p>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"><Plus className="h-4 w-4" />Agregar fuente</Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {['Google', 'Redes sociales', 'Recomendación de un amigo', 'Instagram', 'Facebook', 'Cartel / Publicidad', 'Pasé por aquí', 'Cliente recurrente'].map(source => (
                <div key={source} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                    <span className="text-sm font-medium text-gray-800">{source}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><Pencil className="h-3.5 w-3.5" /></button>
                    <button className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeKey === 'portal_cliente' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Portal del cliente</h1>
            <p className="text-sm text-gray-500 mb-6">Configura el acceso y visibilidad del portal para tus clientes.</p>
            <Section title="Acceso al portal">
              <div className="space-y-3">
                {PORTAL_CLIENTE_ROWS.map((item) => (
                  <div key={item.key} className="flex items-start gap-3">
                    <Checkbox
                      id={`portal-${item.key}`}
                      className="mt-0.5"
                      checked={shopSettings[item.key]}
                      onCheckedChange={(v) => shopSet(item.key, Boolean(v))}
                    />
                    <label htmlFor={`portal-${item.key}`} className="cursor-pointer">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </label>
                  </div>
                ))}
              </div>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        )}

        {activeKey === 'gdpr' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">GDPR</h1>
            <p className="text-sm text-gray-500 mb-6">Gestiona el cumplimiento del Reglamento General de Protección de Datos.</p>
            <Section title="Política de privacidad">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Cumplimiento GDPR activo</p>
                    <p className="text-xs text-blue-700 mt-1">Tu sistema está configurado para cumplir con el RGPD. Asegúrate de que tu política de privacidad esté actualizada.</p>
                  </div>
                </div>
                <Field label="URL de política de privacidad">
                  <Input className="h-9" placeholder="https://tu-empresa.es/privacidad" />
                </Field>
                <Field label="Texto de consentimiento en formulario de cliente" full>
                  <Textarea rows={3} defaultValue="Acepto el tratamiento de mis datos personales según la política de privacidad." className="resize-none" />
                </Field>
              </div>
            </Section>
            <Section title="Retención de datos">
              <Grid2>
                <Field label="Conservar datos de clientes">
                  <Select defaultValue="forever">
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1year">1 año</SelectItem>
                      <SelectItem value="3years">3 años</SelectItem>
                      <SelectItem value="5years">5 años</SelectItem>
                      <SelectItem value="forever">Indefinidamente</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Periodo de anonimización">
                  <Select defaultValue="never">
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Nunca</SelectItem>
                      <SelectItem value="2years">2 años sin actividad</SelectItem>
                      <SelectItem value="5years">5 años sin actividad</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid2>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar cambios</Button>
            </div>
          </div>
        )}

        {activeKey === 'categorias_reparacion' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Categorías de reparación</h1>
                <p className="text-sm text-gray-500 mt-1">Define tipos de dispositivos para tus servicios</p>
              </div>
              <Button onClick={() => { setEditingRepairCat(null); setRepairCatForm({ name: '', is_active: true }); setRepairCatDialog(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Plus className="h-4 w-4" />Nueva categoría
              </Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {repairCats.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                    <span className={cn('text-sm font-medium', cat.is_active ? 'text-gray-800' : 'text-gray-400 line-through')}>{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleSimpleItem('repair_categories', cat, repairCats, setRepairCats)} className={cn('text-xs px-2 py-0.5 rounded-full mr-2', cat.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                      {cat.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => { setEditingRepairCat(cat); setRepairCatForm({ name: cat.name, is_active: cat.is_active }); setRepairCatDialog(true); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeleteSimpleItem('repair_categories', cat.id, repairCats, setRepairCats)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeKey === 'comisiones' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Comisiones</h1>
            <p className="text-sm text-gray-500 mb-6">Define las comisiones de cada técnico por tipo de servicio.</p>
            <Section title="Configuración de comisiones">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Activar sistema de comisiones</p>
                    <p className="text-xs text-gray-500">Calcular comisiones automáticamente en cada ticket</p>
                  </div>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="comisiones" className="accent-primary" /><span className="text-sm">Sí</span></label>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="comisiones" defaultChecked className="accent-primary" /><span className="text-sm">No</span></label>
                  </div>
                </div>
                <Grid2>
                  <Field label="Comisión por reparación (%)">
                    <Input className="h-9" type="number" defaultValue="10" />
                  </Field>
                  <Field label="Comisión por venta (%)">
                    <Input className="h-9" type="number" defaultValue="5" />
                  </Field>
                  <Field label="Método de cálculo">
                    <Select defaultValue="margin">
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Sobre el ingreso total</SelectItem>
                        <SelectItem value="margin">Sobre el margen de beneficio</SelectItem>
                        <SelectItem value="fixed">Importe fijo por ticket</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </Grid2>
              </div>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar cambios</Button>
            </div>
          </div>
        )}

        {activeKey === 'pre_post_condicion' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Pre/Post condición de reparación</h1>
                <p className="text-sm text-gray-500 mt-1">Configura los estados de condición del dispositivo</p>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"><Plus className="h-4 w-4" />Nueva condición</Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {['Excelente', 'Bueno', 'Aceptable', 'Con daños leves', 'Con daños graves', 'No funcional'].map(cond => (
                <div key={cond} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                    <span className="text-sm font-medium text-gray-800">{cond}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><Pencil className="h-3.5 w-3.5" /></button>
                    <button className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeKey === 'email_sms' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <SettingsNavBreadcrumb activeTab="email_sms" isArgentina={loc.isAR} />
            <h1 className="text-xl font-bold text-gray-900 mb-1">Correo y WhatsApp</h1>
            <p className="text-sm text-gray-500 mb-6">
              Tu número de WhatsApp queda guardado aquí: sin APIs, sin códigos ni claves. Úsalo para que los clientes
              te escriban o para enlaces en avisos (el envío automático masivo depende del plan y de la integración).
            </p>
            {smsAutomationLocked && (
              <PlanProfesionalCallout title="WhatsApp automático — plan completo">
                Puedes configurar correo (SMTP) en cualquier cuenta. Los avisos automáticos por WhatsApp (plantillas y
                disparadores masivos) van con el plan <strong>JC ONE FIX</strong>.
              </PlanProfesionalCallout>
            )}

            <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 mb-6 shadow-sm ring-1 ring-emerald-100/50">
              <div className="flex gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#075E54]"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Número de WhatsApp del taller</h2>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Escribe el número con el que atiendes en WhatsApp (el mismo que verían al escribirte). Puedes
                      pegarlo con espacios o guiones; lo guardamos listo para enlaces.
                    </p>
                  </div>
                  <Field label="Número (con prefijo de país)">
                    <Input
                      className="h-9 font-mono text-sm"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={orgCountry === 'AR' ? '5491123456789' : '34612345678'}
                      value={shopSettings.whatsapp_phone}
                      onChange={e => shopSet('whatsapp_phone', phoneDigitsForWaMe(e.target.value))}
                    />
                  </Field>
                  <p className="text-[11px] text-gray-500 -mt-1">
                    Sin signo +. Argentina: 54 y el número con código de área (ej. 11 para CABA/AMBA).
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        const d = phoneDigitsForWaMe(shopSettings.phone);
                        if (!d) {
                          toast.error('Indica primero el teléfono del taller en Ajustes generales');
                          return;
                        }
                        shopSet('whatsapp_phone', d);
                        toast.success('Copiado desde el teléfono del taller');
                      }}
                    >
                      Usar teléfono del taller
                    </Button>
                    {tallerWaUrl ? (
                      <>
                        <Button type="button" variant="outline" size="sm" className="text-xs h-8 gap-1" asChild>
                          <a href={tallerWaUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Probar chat
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 gap-1"
                          onClick={() => {
                            void navigator.clipboard.writeText(tallerWaUrl);
                            toast.success('Enlace copiado');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar wa.me
                        </Button>
                      </>
                    ) : null}
                  </div>
                  {tallerWaUrl ? (
                    <p className="text-[11px] text-gray-500 break-all rounded-md bg-gray-50 border border-gray-100 px-2 py-1.5">
                      <span className="font-medium text-gray-600">Tu enlace: </span>
                      {tallerWaUrl}
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-800/90 rounded-md border border-amber-100 bg-amber-50/80 px-2 py-1.5">
                      Cuando el número tenga al menos 8 dígitos con prefijo de país, aquí verás el enlace para compartirlo
                      en la web, redes o ticket impreso.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Section title="Configuración de correo (SMTP)">
              <Grid2>
                <Field label="Servidor SMTP">
                  <Input
                    className="h-9"
                    placeholder="smtp.gmail.com"
                    value={shopSettings.smtp_host}
                    onChange={(e) => shopSet('smtp_host', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Puerto">
                  <Input
                    className="h-9"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder="587"
                    value={Number.isFinite(shopSettings.smtp_port) ? shopSettings.smtp_port : 587}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      shopSet('smtp_port', Number.isFinite(n) && n > 0 ? n : 587);
                    }}
                  />
                </Field>
                <Field label="Usuario SMTP">
                  <Input
                    className="h-9"
                    placeholder="tu@email.com"
                    value={shopSettings.smtp_user}
                    onChange={(e) => shopSet('smtp_user', e.target.value)}
                    autoComplete="username"
                  />
                </Field>
                <Field label="Contraseña SMTP">
                  <Input
                    className="h-9"
                    type="password"
                    placeholder="••••••••"
                    value={shopSettings.smtp_password}
                    onChange={(e) => shopSet('smtp_password', e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              </Grid2>
            </Section>
            <Section title="Notificaciones automáticas">
              <div className="space-y-3">
                {CUSTOMER_NOTIFY_ROWS.map((n) => {
                  const pair = shopSettings.customer_notify_channels[n.key];
                  return (
                    <div
                      key={n.key}
                      className="flex items-start justify-between py-2 border-b border-gray-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{n.label}</p>
                        <p className="text-xs text-gray-500">{n.desc}</p>
                      </div>
                      <div className="flex gap-3 ml-4">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={pair.email}
                            onChange={(e) =>
                              patchCustomerNotify(n.key, 'email', e.target.checked)
                            }
                          />
                          <span className="text-xs text-gray-600">Email</span>
                        </label>
                        <label
                          className={`flex items-center gap-1 ${smsAutomationLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          title={smsAutomationLocked ? 'Disponible en JC ONE FIX' : undefined}
                        >
                          <input
                            type="checkbox"
                            disabled={smsAutomationLocked}
                            className="accent-primary"
                            checked={pair.whatsapp}
                            onChange={(e) =>
                              patchCustomerNotify(n.key, 'whatsapp', e.target.checked)
                            }
                          />
                          <span className="text-xs text-gray-600">WhatsApp</span>
                          {smsAutomationLocked && (
                            <span className="text-[10px] font-medium text-amber-700">Pro</span>
                          )}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        )}

        {activeKey === 'editor_plantillas' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Editor de plantillas</h1>
            <p className="text-sm text-gray-500 mb-4">Personaliza los correos y mensajes que se envían a tus clientes.</p>
            {smsAutomationLocked && (
              <p className="text-xs text-amber-800/90 mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                Las variantes de plantilla para <strong>WhatsApp</strong> son del plan completo JC ONE FIX; el correo sigue
                disponible en cuentas con restricciones históricas.
              </p>
            )}
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 mb-4">
              {[
                { name: 'Bienvenida al ticket', trigger: 'Ticket creado' },
                { name: 'Cambio de estado', trigger: 'Estado actualizado' },
                { name: 'Presupuesto listo', trigger: 'Presupuesto enviado' },
                { name: 'Reparación completada', trigger: 'Estado: Reparado' },
                { name: 'Recogida pendiente', trigger: 'Cliente no ha pasado' },
                { name: 'Factura emitida', trigger: 'Factura creada' },
              ].map(t => (
                <div key={t.name} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-500">Disparador: {t.trigger}</p>
                  </div>
                  <Button variant="outline" className="text-xs h-8">Editar</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeKey === 'lealtad' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Programa de lealtad</h1>
            <p className="text-sm text-gray-500 mb-6">Fideliza a tus clientes con puntos y recompensas.</p>
            {profesionalAddonsLocked && (
              <PlanProfesionalCallout title="Módulo — plan completo">
                Puntos, recompensas y campañas de fidelización van con el plan <strong>JC ONE FIX</strong>. Pide la
                actualización al administrador del sistema.
              </PlanProfesionalCallout>
            )}
            <div className={profesionalAddonsLocked ? 'pointer-events-none opacity-40 select-none' : ''}>
            <Section title="Configuración">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Activar programa de puntos</p>
                    <p className="text-xs text-gray-500">Los clientes ganan puntos en cada compra/reparación</p>
                  </div>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="loyalty" className="accent-primary" /><span className="text-sm">Sí</span></label>
                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="loyalty" defaultChecked className="accent-primary" /><span className="text-sm">No</span></label>
                  </div>
                </div>
                <Grid2>
                  <Field label="Puntos por euro gastado">
                    <Input className="h-9" type="number" defaultValue="1" />
                  </Field>
                  <Field label="Valor de cada punto (€)">
                    <Input className="h-9" type="number" step="0.01" defaultValue="0.01" />
                  </Field>
                  <Field label="Puntos mínimos para canjear">
                    <Input className="h-9" type="number" defaultValue="100" />
                  </Field>
                  <Field label="Caducidad de puntos">
                    <Select defaultValue="never">
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Nunca</SelectItem>
                        <SelectItem value="1year">1 año</SelectItem>
                        <SelectItem value="2years">2 años</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </Grid2>
              </div>
            </Section>
            <div className="flex justify-end mt-4 pb-8">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Guardar cambios</Button>
            </div>
            </div>
          </div>
        )}

        {activeKey === 'tarjetas_regalo' && (
          <div className="max-w-2xl mx-auto px-8 py-6">
            {profesionalAddonsLocked && (
              <PlanProfesionalCallout title="Tarjetas regalo — plan completo" className="mb-6">
                Vender y canjear tarjetas regalo con control en panel forma parte del plan{' '}
                <strong>JC ONE FIX</strong>.
              </PlanProfesionalCallout>
            )}
            <div className={profesionalAddonsLocked ? 'pointer-events-none opacity-40 select-none' : ''}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tarjetas de regalo</h1>
                <p className="text-sm text-gray-500 mt-1">Gestiona las tarjetas regalo de tu tienda</p>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"><Plus className="h-4 w-4" />Nueva tarjeta</Button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {[
                { code: 'GIFT-001', amount: '€50', status: 'Activa', used: '€0' },
                { code: 'GIFT-002', amount: '€25', status: 'Usada', used: '€25' },
                { code: 'GIFT-003', amount: '€100', status: 'Activa', used: '€30' },
              ].map(g => (
                <div key={g.code} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 font-mono">{g.code}</p>
                    <p className="text-xs text-gray-500">Valor: {g.amount} — Usado: {g.used}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', g.status === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {g.status}
                  </span>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {activeKey === 'perfil' && (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <SettingsNavBreadcrumb activeTab="perfil" isArgentina={loc.isAR} />
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi perfil</h1>

            <input
              ref={perfilAvatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              id="settings-perfil-avatar-input"
              onChange={handlePerfilAvatarChange}
            />

            <div className="bg-white rounded-lg border border-gray-200 mb-4">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">Datos de la cuenta</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-600">Foto de perfil</Label>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <Avatar className="h-16 w-16 border border-gray-200">
                      {accountAvatarUrl ? (
                        <AvatarImage src={accountAvatarUrl} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {accountName?.[0] || accountEmail?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-[200px]">
                      <button
                        type="button"
                        disabled={avatarUploading}
                        onClick={() => perfilAvatarInputRef.current?.click()}
                        className="w-full sm:w-auto rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                      >
                        <span className="text-primary font-medium">
                          {avatarUploading ? 'Subiendo…' : 'Elegir imagen o arrastrar aquí'}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">JPG, PNG, WebP o GIF · máximo 15 MB</div>
                      </button>
                    </div>
                  </div>
                </div>

                <Grid2>
                  <Field label="Nombre *">
                    <Input className="h-9" value={accountName} readOnly title="Viene del registro; el nombre visible en el panel lo editas en Mi perfil (/dashboard/profile) si aplica." />
                  </Field>
                  <Field label="Correo electrónico *">
                    <Input className="h-9" type="email" value={accountEmail} readOnly />
                  </Field>
                  <Field label="PIN de acceso">
                    <div className="relative">
                      <Input className="h-9" type="password" placeholder="••••••" autoComplete="new-password" readOnly title="Próximamente" />
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        <span className="text-xs" aria-hidden>👁</span>
                      </button>
                    </div>
                  </Field>
                  <Field label="Idioma de la interfaz">
                    <Select defaultValue="Spanish">
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spanish">Español</SelectItem>
                        <SelectItem value="English">Inglés</SelectItem>
                        <SelectItem value="French">Francés</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Contraseña" full>
                    <div className="flex gap-2">
                      <Input className="h-9 flex-1" type="password" placeholder="••••••" autoComplete="new-password" readOnly title="Usa «Olvidé mi contraseña» en el inicio de sesión para cambiarla" />
                      <Button type="button" variant="outline" className="h-9 border-0 bg-primary text-primary-foreground hover:bg-primary/90" disabled title="Cambio de contraseña desde la pantalla de login">
                        Cambiar
                      </Button>
                    </div>
                  </Field>
                </Grid2>
              </div>
            </div>

            {loc.isAR ? <SubscriptionSettingsSection /> : null}

            <div className="bg-white rounded-lg border border-gray-200 mb-4">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">Datos de la tienda</h2>
              </div>
              <div className="p-4 space-y-4">
                <Grid2>
                  <Field label="Teléfono fijo">
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">{loc.phoneFlag} {loc.phonePrefix}</span>
                      <Input className="h-9 rounded-l-none" value={shopSettings.phone} onChange={e => shopSet('phone', e.target.value)} placeholder={loc.phonePlaceholder} />
                    </div>
                  </Field>
                  <Field label="Móvil">
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">{loc.phoneFlag} {loc.phonePrefix}</span>
                      <Input className="h-9 rounded-l-none" value={shopSettings.phone2} onChange={e => shopSet('phone2', e.target.value)} placeholder={loc.phonePlaceholder} />
                    </div>
                  </Field>
                  <Field label="Dirección" full>
                    <Input className="h-9" value={shopSettings.address} onChange={e => shopSet('address', e.target.value)} placeholder="Dirección del taller" />
                  </Field>
                  <Field label="Ciudad">
                    <Input
                      className="h-9"
                      value={shopSettings.city}
                      onChange={e => shopSet('city', e.target.value)}
                      placeholder={cityPlaceholder(orgCountry)}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Código postal">
                    <Input
                      className="h-9"
                      value={shopSettings.postal_code}
                      onChange={e => shopSet('postal_code', e.target.value)}
                      placeholder={postalPlaceholder(orgCountry)}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label={orgCountry === 'AR' ? 'Provincia' : 'Provincia / estado'}>
                    <Input
                      className="h-9"
                      value={shopSettings.state}
                      onChange={e => shopSet('state', e.target.value)}
                      placeholder={statePlaceholder(orgCountry)}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="País">
                    <Select value={shopSettings.country} onValueChange={handleShopCountryChange}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="País" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Argentina">Argentina</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </Grid2>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSavePerfilTab}
                disabled={savingSettings}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        )}

        {activeKey === 'sesiones' && <ActiveSessionsSection />}

        {activeKey === 'personalizacion_visual' && (
          <div className="px-8 py-6">
            <SettingsNavBreadcrumb activeTab="personalizacion_visual" isArgentina={loc.isAR} className="mb-4" />
            <VisualPersonalizationSection />
          </div>
        )}

        {activeKey === 'importar_excel' && <SmartImportSettingsSection />}

        {activeKey === 'tickets_repairs' && (
          <TicketsRepairsSettingsSection
            settings={shopSettings.ticket_repairs_settings}
            patch={patchTicketRepairs}
            statuses={statuses.map(({ id, name, is_active }) => ({ id, name, is_active }))}
            onJumpToTicketStatuses={() => setActiveKey('estado_ticket')}
            onSave={handleSaveSettings}
            saving={savingSettings}
          />
        )}

        {!['config_general', 'perfil', 'sesiones', 'personalizacion_visual', 'facturacion_cuenta', 'estado_ticket', 'equipo', 'roles', 'permisos_roles', 'seguridad', 'tipos_tareas', 'metodos_pago', 'config_impuestos', 'margen_iva', 'bandeja_qz', 'nodo_impresion', 'config_inventario', 'categorias_productos', 'fabricantes', 'pos_config', 'facturas', 'como_enteraron', 'portal_cliente', 'gdpr', 'importar_excel', 'categorias_reparacion', 'comisiones', 'pre_post_condicion', 'email_sms', 'editor_plantillas', 'lealtad', 'tarjetas_regalo', 'tickets_repairs'].includes(activeKey) && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-600">Sección en desarrollo</p>
            <p className="text-sm text-gray-400 mt-1">Esta configuración estará disponible próximamente</p>
          </div>
        )}
      </div>

      <Dialog open={customRoleDialog} onOpenChange={setCustomRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo rol de empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-gray-600">Nombre del rol *</Label>
              <Input
                className="mt-1 h-9"
                placeholder="Ej. Jefe de taller"
                value={customRoleForm.name}
                onChange={(e) => setCustomRoleForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Descripción</Label>
              <Textarea
                className="mt-1 min-h-[72px] text-sm"
                placeholder="Qué hace este puesto en tu taller…"
                value={customRoleForm.description}
                onChange={(e) => setCustomRoleForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-2 block">Color en listas</Label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setCustomRoleForm((f) => ({ ...f, color: c.hex }))}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform border-2"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: customRoleForm.color === c.hex ? 'hsl(var(--primary))' : 'transparent',
                    }}
                  >
                    {customRoleForm.color === c.hex && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                onClick={handleSaveCustomRole}
                disabled={savingCustomRole}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {savingCustomRole && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear rol
              </Button>
              <Button type="button" variant="outline" onClick={() => setCustomRoleDialog(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={predefinedRoleDialog}
        onOpenChange={(open) => {
          setPredefinedRoleDialog(open);
          if (!open) setEditingPredefinedRoleKey(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar rol predefinido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editingPredefinedRoleKey ? (
              <p className="text-[11px] text-gray-500">
                Clave interna <code className="rounded bg-gray-100 px-1">{editingPredefinedRoleKey}</code> no
                cambia. Los permisos se siguen gestionando en «Permisos de roles».
              </p>
            ) : null}
            <div>
              <Label className="text-xs font-medium text-gray-600">Nombre mostrado *</Label>
              <Input
                className="mt-1 h-9"
                value={predefinedRoleForm.name}
                onChange={(e) =>
                  setPredefinedRoleForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Descripción</Label>
              <Textarea
                className="mt-1 min-h-[72px] text-sm"
                value={predefinedRoleForm.description}
                onChange={(e) =>
                  setPredefinedRoleForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                Color en listas (opcional)
              </Label>
              <p className="text-[11px] text-gray-500 mb-2">
                «Predeterminado» usa los colores clásicos del panel.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPredefinedRoleForm((f) => ({ ...f, color: '' }))}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-md border transition-colors',
                    !predefinedRoleForm.color
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  Predeterminado
                </button>
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setPredefinedRoleForm((f) => ({ ...f, color: c.hex }))}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform border-2"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: predefinedRoleForm.color === c.hex ? 'hsl(var(--primary))' : 'transparent',
                    }}
                  >
                    {predefinedRoleForm.color === c.hex && (
                      <Check className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center pt-1">
              <Button
                type="button"
                onClick={handleSavePredefinedRoleOverride}
                disabled={savingPredefinedRole}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {savingPredefinedRole && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
              {editingPredefinedRoleKey && roleLabelOverrides[editingPredefinedRoleKey]?.id ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetPredefinedRoleLabels}
                  className="text-gray-700"
                >
                  Restaurar textos predeterminados
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPredefinedRoleDialog(false);
                  setEditingPredefinedRoleKey(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={teamDialogOpen}
        onOpenChange={(open) => {
          setTeamDialogOpen(open);
          if (!open) {
            setEditingTech(null);
            setEditingUser(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {teamDialogMode === 'create'
                ? 'Agregar al equipo'
                : teamDialogMode === 'edit-tech'
                  ? 'Editar ficha de empleado'
                  : 'Editar usuario del panel'}
            </DialogTitle>
          </DialogHeader>

          {teamDialogMode === 'edit-user' && (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-medium text-gray-600">Nombre completo *</Label>
                <Input
                  className="mt-1 h-9"
                  placeholder="Juan García"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Email *</Label>
                <Input
                  className="mt-1 h-9"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-600">Rol</Label>
                <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Encargado</SelectItem>
                    <SelectItem value="technician">Técnico</SelectItem>
                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    {mergedRoleOptions
                      .filter((r) => !['admin', 'receptionist', 'technician', 'manager'].includes(r.value))
                      .map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                          {r.isCustom ? ' (empresa)' : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="user_active"
                  checked={userForm.is_active}
                  onCheckedChange={(v) => setUserForm({ ...userForm, is_active: !!v })}
                  className="no-ui-hover-grow"
                />
                <label htmlFor="user_active" className="cursor-pointer text-sm text-gray-700">
                  Usuario activo
                </label>
              </div>
              <p className="text-[11px] text-gray-500">
                Para crear ficha de empleado con permisos de taller, usa <strong>Agregar al equipo</strong> en la vista
                unificada.
              </p>
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={() => void handleSaveUser()}
                  disabled={savingUser}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {savingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
                <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {(teamDialogMode === 'create' || teamDialogMode === 'edit-tech') && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Nombre *</Label>
                  <Input
                    className="mt-1 h-9"
                    placeholder="Juan García"
                    value={techForm.name}
                    onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Email *</Label>
                  <Input
                    className="mt-1 h-9"
                    type="email"
                    placeholder="juan@taller.es"
                    value={techForm.email}
                    onChange={(e) => setTechForm({ ...techForm, email: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Teléfono</Label>
                  <Input
                    className="mt-1 h-9"
                    value={techForm.phone}
                    onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">PIN de acceso del empleado (fichaje)</Label>
                  <Input
                    className="mt-1 h-9"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Opcional — vacío = sin PIN en el reloj"
                    value={techForm.clock_pin}
                    onChange={(e) => setTechForm({ ...techForm, clock_pin: e.target.value })}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Se usa en <strong>Reloj de entrada / salida</strong>. Déjalo vacío si no quieres pedir PIN a este
                    empleado.
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-gray-600">Rol</Label>
                  <Select value={techForm.role} onValueChange={applyRolePreset}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mergedRoleOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div>
                            <span className="font-medium">{r.label}</span>
                            <span className="ml-1 text-xs text-gray-500">— {r.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {teamDialogMode === 'create' && isAdmin && (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="create_panel_account"
                      checked={createPanelAccount}
                      onCheckedChange={(v) => setCreatePanelAccount(!!v)}
                      className="no-ui-hover-grow mt-0.5"
                    />
                    <div>
                      <label htmlFor="create_panel_account" className="cursor-pointer text-sm font-medium text-gray-800">
                        Crear acceso al panel
                      </label>
                      <p className="text-[11px] text-gray-500">
                        La persona podrá iniciar sesión con este email y la contraseña que indiques. También se crea la ficha
                        de empleado enlazada automáticamente.
                      </p>
                    </div>
                  </div>
                  {createPanelAccount && (
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Contraseña inicial *</Label>
                      <Input
                        className="mt-1 h-9"
                        type="password"
                        placeholder="••••••••"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres</p>
                    </div>
                  )}
                </div>
              )}

              {teamDialogMode === 'edit-tech' && systemUsers.length > 0 && (
                <div>
                  <Label className="text-xs font-medium text-gray-600">Usuario del panel (notificaciones)</Label>
                  <Select
                    value={techForm.panel_user_id}
                    onValueChange={(v) => setTechForm({ ...techForm, panel_user_id: v })}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Sin enlazar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin enlazar (sin avisos en la campana)</SelectItem>
                      {systemUsers
                        .filter((u: { is_active?: boolean }) => u.is_active)
                        .map((u: { id: string; email: string; full_name: string }) => (
                          <SelectItem key={u.id} value={u.id}>
                            {(u.full_name || u.email || u.id).trim()}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Si enlazas un usuario de la organización, recibirá un aviso discreto en la campana al asignarle un
                    ticket (alta de equipo).
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-xs font-medium text-blue-700">
                  {mergedRoleOptions.find((r) => r.value === techForm.role)?.label}
                </p>
                <p className="mt-0.5 text-xs text-blue-600">
                  {mergedRoleOptions.find((r) => r.value === techForm.role)?.desc} — Los permisos se han aplicado
                  automáticamente. Puedes ajustarlos manualmente.
                </p>
              </div>
              <div>
                <Label className="mb-2 block text-xs font-medium text-gray-600">Color de avatar</Label>
                <div className="flex flex-wrap gap-2">
                  {TECH_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTechForm({ ...techForm, color: c })}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {techForm.color === c && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-medium text-gray-600">Permisos individuales</Label>
                  <button
                    type="button"
                    onClick={() => applyRolePreset(techForm.role)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Resetear al rol
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 rounded-lg bg-gray-50 p-3">
                  {Object.entries(PERMISSION_LABELS).map(([key, lbl]) => (
                    <div key={key} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`p-${key}`}
                        checked={techForm.permissions[key] ?? false}
                        onCheckedChange={(v) =>
                          setTechForm({
                            ...techForm,
                            permissions: { ...techForm.permissions, [key]: !!v },
                          })
                        }
                        className="no-ui-hover-grow"
                      />
                      <label htmlFor={`p-${key}`} className="cursor-pointer text-sm text-gray-700">
                        {lbl}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tech_active"
                  checked={techForm.is_active}
                  onCheckedChange={(v) => setTechForm({ ...techForm, is_active: !!v })}
                  className="no-ui-hover-grow"
                />
                <label htmlFor="tech_active" className="cursor-pointer text-sm text-gray-700">
                  Activo (ficha y, si aplica, acceso al panel al crear)
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={() => {
                    if (teamDialogMode === 'create') void handleUnifiedCreate();
                    else void handleSaveTech();
                  }}
                  disabled={savingTech}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {savingTech && <Loader2 className="h-4 w-4 animate-spin" />}
                  {teamDialogMode === 'create'
                    ? createPanelAccount && isAdmin
                      ? 'Crear ficha y acceso'
                      : 'Crear ficha de empleado'
                    : 'Guardar cambios'}
                </Button>
                <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'Editar estado' : 'Nuevo estado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-gray-600">Nombre del estado *</Label>
              <Input className="mt-1 h-9" placeholder="EN PROCESO, REPARADO..." value={statusForm.name} onChange={e => setStatusForm({ ...statusForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Categoría</Label>
              <Select value={statusForm.category} onValueChange={v => setStatusForm({ ...statusForm, category: v })}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_hold">On hold (En espera)</SelectItem>
                  <SelectItem value="open">Open (Abierto)</SelectItem>
                  <SelectItem value="closed">Closed (Cerrado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-2 block">Color del punto</Label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_COLORS.map(c => (
                  <button key={c.hex} type="button" title={c.label} onClick={() => setStatusForm({ ...statusForm, color: c.hex })}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform border-2"
                    style={{ backgroundColor: c.hex, borderColor: statusForm.color === c.hex ? 'hsl(var(--primary))' : 'transparent' }}>
                    {statusForm.color === c.hex && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: statusForm.color }} />
                <span className="text-xs text-gray-500">Previsualización: <strong>{statusForm.name || 'Estado'}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="status_active" checked={statusForm.is_active} onCheckedChange={v => setStatusForm({ ...statusForm, is_active: !!v })} />
              <label htmlFor="status_active" className="text-sm text-gray-700 cursor-pointer">Estado activo</label>
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={handleSaveStatus} disabled={savingStatus} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                {savingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingStatus ? 'Guardar cambios' : 'Crear estado'}
              </Button>
              <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={taskTypeDialog} onOpenChange={setTaskTypeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingTaskType ? 'Editar tipo' : 'Nuevo tipo de tarea'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-gray-600">Nombre *</Label>
              <Input className="mt-1 h-9" placeholder="TIENDA" value={taskTypeForm.name} onChange={e => setTaskTypeForm({ ...taskTypeForm, name: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="tt_active" checked={taskTypeForm.is_active} onCheckedChange={v => setTaskTypeForm({ ...taskTypeForm, is_active: !!v })} />
              <label htmlFor="tt_active" className="text-sm text-gray-700 cursor-pointer">Activo</label>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleSaveSimpleItem('task_types', taskTypes, editingTaskType, taskTypeForm, setTaskTypes, setTaskTypeDialog, setEditingTaskType)} className="bg-primary text-primary-foreground hover:bg-primary/90">{editingTaskType ? 'Guardar' : 'Crear'}</Button>
              <Button variant="outline" onClick={() => setTaskTypeDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payMethodDialog} onOpenChange={setPayMethodDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingPayMethod ? 'Editar método' : 'Nuevo método de pago'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-gray-600">Nombre *</Label>
              <Input className="mt-1 h-9" placeholder="Transferencia bancaria" value={payMethodForm.name} onChange={e => setPayMethodForm({ ...payMethodForm, name: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="pm_active" checked={payMethodForm.is_active} onCheckedChange={v => setPayMethodForm({ ...payMethodForm, is_active: !!v })} />
              <label htmlFor="pm_active" className="text-sm text-gray-700 cursor-pointer">Activo</label>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleSaveSimpleItem('payment_methods', paymentMethods, editingPayMethod, payMethodForm, setPaymentMethods, setPayMethodDialog, setEditingPayMethod)} className="bg-primary text-primary-foreground hover:bg-primary/90">{editingPayMethod ? 'Guardar' : 'Crear'}</Button>
              <Button variant="outline" onClick={() => setPayMethodDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={repairCatDialog} onOpenChange={setRepairCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingRepairCat ? 'Editar categoría' : 'Nueva categoría de reparación'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-gray-600">Nombre *</Label>
              <Input className="mt-1 h-9" placeholder="Smartphone" value={repairCatForm.name} onChange={e => setRepairCatForm({ ...repairCatForm, name: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="rc_active" checked={repairCatForm.is_active} onCheckedChange={v => setRepairCatForm({ ...repairCatForm, is_active: !!v })} />
              <label htmlFor="rc_active" className="text-sm text-gray-700 cursor-pointer">Activo</label>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleSaveSimpleItem('repair_categories', repairCats, editingRepairCat, repairCatForm, setRepairCats, setRepairCatDialog, setEditingRepairCat)} className="bg-primary text-primary-foreground hover:bg-primary/90">{editingRepairCat ? 'Guardar' : 'Crear'}</Button>
              <Button variant="outline" onClick={() => setRepairCatDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">{title}</h2>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
