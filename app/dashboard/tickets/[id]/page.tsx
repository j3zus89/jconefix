'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronDown, ChevronRight, ChevronUp, Pencil, Printer, FileCheck,
  FilePlus, Clock, Calendar, User, Phone, Shield, Receipt, Lock, Stethoscope,
  Info, Package, Image as ImageIcon, FileText, Plus, Settings,
  TriangleAlert as AlertTriangle, Loader as Loader2, Home,
  Flag, Search, Copy, Trash2, Send, Mail, Check,
  Eye, X, DollarSign, CreditCard, Banknote, Camera, Sparkles, History, Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TicketLabelPrintSheet } from '@/components/ticket/TicketLabelPrintSheet';
import { Switch } from '@/components/ui/switch';
import { displayOrgOrShopName } from '@/lib/display-name';
import { repairCaseTerms } from '@/lib/locale';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  formatAssignedToLabel,
  isUuid,
  loadTechnicianIdToNameMap,
  notifyTicketAssignedToPanelUser,
} from '@/lib/panel-notifications';
import { formatOrgMemberRoleLabel, loadOrgUserRoleLabelMap } from '@/lib/org-role-labels';
import {
  activityAuthorAvatarInitial,
  beautifyActivityCommentMarkdownContent,
  formatActivityAuthorLabel,
  legacyStoredAuthorPersonPrefix,
  loadOrgMemberDisplayNameByUserId,
  loadProfileAvatarUrlByUserIds,
} from '@/lib/activity-author-display';
import {
  buildTicketEmailTemplates,
  buildTicketEmailContext,
  type EmailTemplateDef,
} from '@/lib/ticket-email-templates';
import { WhatsAppQuickSendModal } from '@/components/whatsapp/WhatsAppQuickSendModal';
import { WhatsAppLogo } from '@/components/whatsapp/WhatsAppLogo';
import { whatsappDeviceSummaryLine } from '@/lib/whatsapp-quick-templates';
import { WhatsAppBudgetButton } from '@/components/ticket/WhatsAppBudgetButton';
import { uploadTicketImage } from '@/lib/upload-ticket-image';
import { buildSignedUrlMapForEntries } from '@/lib/supabase-storage-signed';
import { Button } from '@/components/ui/button';
import { TicketIntakeWebcam } from '@/components/dashboard/TicketIntakeWebcam';
import { DeviceUnlockInputs } from '@/components/dashboard/DeviceUnlockInputs';
import {
  composeAccessCredentials,
  parseStoredAccessCredentials,
} from '@/lib/ticket-access-credentials';

/** QR de seguimiento para imprimir en la hoja de taller. Carga qrcode de forma lazy. */
function PrintQrCode({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    void import('qrcode').then((QR) =>
      QR.toDataURL(url, { width: 128, margin: 1 }).then(setSrc)
    );
  }, [url]);
  if (!src) return null;
  return (
    <div className="flex flex-col items-center gap-1 my-3 py-2 border-t border-dashed border-gray-300">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="QR seguimiento" width={80} height={80} />
      <p className="text-[9px] text-gray-500 text-center">Escanea para ver el estado de tu reparación</p>
    </div>
  );
}

/** Devuelve el SVG del icono correspondiente a cada categoría de dispositivo */
function getCategoryIconSVG(category: string | null, deviceType?: string | null): React.ReactNode {
  const strokeWidth = 1.5;
  const strokeColor = "currentColor";

  // Normalizar la categoría - manejar guiones y espacios
  let cat = (category || '').toUpperCase().trim();

  // Si la categoría está vacía o es OTROS, intentar inferir por el nombre del dispositivo
  if (!cat || cat === 'OTROS' || cat === 'NULL') {
    const deviceName = (deviceType || '').toLowerCase();
    if (/tv|televisor|smartv|samsung|lg|noblex|tcl|philips/.test(deviceName)) cat = 'SMART_TV';
    else if (/iphone|galaxy|xiaomi|motorola|huawei/.test(deviceName)) cat = 'SMARTPHONES';
    else if (/ipad|tablet/.test(deviceName)) cat = 'TABLETS';
    else if (/laptop|notebook|macbook/.test(deviceName)) cat = 'LAPTOPS';
    else if (/playstation|xbox|nintendo/.test(deviceName)) cat = 'CONSOLAS';
    else if (/watch/.test(deviceName)) cat = 'SMARTWATCH';
    else if (/airpods|auricular/.test(deviceName)) cat = 'AURICULARES';
    else cat = 'OTROS';
  }

  switch (cat) {
    case 'SMARTPHONES':
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      );
    case 'TABLETS':
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M10.5 19.5h3m-9.75-3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h18.75c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375zM19.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5z" />
        </svg>
      );
    case 'LAPTOPS':
    case 'LAPTOPS_Y_PC':
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
        </svg>
      );
    case 'CONSOLAS':
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
        </svg>
      );
    case 'SMARTWATCH':
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'AURICULARES':
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75zm3.75 0v15m3.75-15l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H15.49c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0113.5 12c0-.83.112-1.633.322-2.396C13.556 8.756 14.38 8.25 15.26 8.25H17.25z" />
        </svg>
      );
    case 'SMART_TV':
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'AUDIO_VIDEO':
    case 'EQUIPOS DE AUDIO Y VÍDEO':
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-repairdesk-500" fill="none" viewBox="0 0 24 24" stroke={strokeColor}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      );
  }
}

import {
  getTicketPrintCurrencySymbol,
  getTicketWarrantyFootnote,
} from '@/lib/ticket-warranty-copy';
import {
  addWarrantyPeriodToStart,
  computeWarrantyBadge,
  formatTicketWarrantySummaryForPrint,
  formatWarrantyDateEs,
  localDateString,
  warrantyMonthsBetween,
} from '@/lib/warranty-period';
import { adminFetch } from '@/lib/auth/adminFetch';
import { buildTicketLabelPrintData } from '@/lib/ticket-label-print-data';
import { parseTicketRepairsSettings } from '@/lib/ticket-repairs-settings';
import { deliverInvoiceDocument, shopRowToQzConnect } from '@/lib/invoice-print-deliver';
import { buildInvoicePrintFullHtmlDocument, type InvoicePrintPayload } from '@/lib/invoice-print-html';
import { fetchRepairTicketPaymentLedgerForPrint } from '@/lib/invoice-payment-ledger';
import { syncInvoiceTotalsFromTicket } from '@/lib/sync-invoice-from-ticket';
import {
  validateBillingIdentity,
  validateArgentinaIvaCondition,
  validateDraftLines,
  validateInvoiceAmounts,
  validateTicketPartsStock,
} from '@/lib/invoice-validation';
import { openCashDrawer, shopSettingsToQzConnect } from '@/lib/cash-drawer';
import { PaymentModal, type PaymentResult } from '@/components/ticket/PaymentModal';
import { TicketWarrantyEditor } from '@/components/ticket/TicketWarrantyEditor';
import { useMyPermissions } from '@/lib/use-my-permissions';
import { humanizeRepairTicketsSchemaError } from '@/lib/supabase-setup-hints';
import {
  RETURN_SCENARIOS,
  RETURN_SETTLEMENTS,
  labelReturnScenario,
  labelReturnSettlement,
} from '@/lib/return-constancia-labels';
import {
  syncCustomerReturnConstancia,
  deleteCustomerReturnConstancia,
  fetchReturnConstanciaIdByTicket,
} from '@/lib/sync-customer-return-constancia';
import {
  isDelayTrackedStatus,
  WAIT_REASON_OPTIONS,
  waitReasonLabel,
} from '@/lib/ticket-delay-followup';
import { formatEquipoBrandInchesModelLine } from '@/lib/device-screen-display';
type Ticket = {
  id: string;
  /** Usuario del panel que creó el ticket (repair_tickets.user_id). */
  user_id: string;
  ticket_number: string;
  customer_id: string;
  device_type: string;
  device_model: string | null;
  device_brand: string | null;
  device_category: string | null;
  device_screen_inches?: string | null;
  serial_number: string | null;
  imei: string | null;
  issue_description: string;
  status: string;
  priority: string;
  estimated_cost: number | null;
  final_cost: number | null;
  /** Seña en ingreso; se suma al “pagado” junto con los cobros en caja (no duplicar si ya está como pago). */
  deposit_amount?: number | null;
  notes: string | null;
  task_type: string | null;
  assigned_to: string | null;
  due_date: string | null;
  /** Tiempo de reparación HH:MM:SS (columna opcional hasta migración). */
  repair_time?: string | null;
  is_urgent: boolean;
  is_draft: boolean;
  diagnostic_notes: string | null;
  pin_pattern: string | null;
  warranty_info: string | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  /** Base imponible: si true, al total se suma IVA 21% (Facturación + impreso). */
  apply_iva?: boolean | null;
  created_at: string;
  updated_at: string;
  organization_id?: string | null;
  /** Caso padre (orden/ticket) cuando este ingreso es reingreso / garantía vinculado. */
  related_ticket_id?: string | null;
  /** Qué debe devolverse al cliente (equipo, dinero, etc.). */
  return_to_customer_note?: string | null;
  return_to_customer_amount?: number | null;
  return_to_customer_recorded_at?: string | null;
  return_to_customer_completed_at?: string | null;
  return_scenario?: string | null;
  return_settlement_method?: string | null;
  return_related_invoice_id?: string | null;
  follow_up_wait_reason?: string | null;
  follow_up_snoozed_until?: string | null;
  follow_up_started_at?: string | null;
  follow_up_notify_count?: number | null;
  follow_up_last_notified_at?: string | null;
  customers: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    id_number: string | null;
    organization: string | null;
    customer_group: string | null;
    how_did_you_find_us?: string | null;
  } | null;
};

const FALLBACK_TASK_TYPES = ['TIENDA', 'ONLINE', 'DOMICILIO', 'GARANTIA', 'EMPRESA'] as const;

function fromIsoToDatetimeLocalVal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseRepairTimeForInput(s: string | null | undefined): string {
  if (!s || !String(s).trim()) return '00:00:00';
  const t = String(s).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return '00:00:00';
}

type Comment = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  is_private: boolean;
  comment_type: string;
  created_at: string;
  updated_at?: string | null;
  immutable_comment?: boolean | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  ticket_id?: string | null;
  items?: { description: string; quantity: number; unit_price: number; total_price: number }[];
};

type Payment = {
  id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  reference_number?: string;
  status?: string | null;
  ticket_id?: string | null;
  invoice_id?: string | null;
};

type TicketPart = {
  id: string;
  part_name: string;
  part_number?: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  product_id?: string | null;
  products?: {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    unit_cost: number | null;
    /** Ubicación física en el almacén (para Picking List). */
    storage_location?: string | null;
  } | null;
};

type ProductPickRow = {
  id: string;
  name: string;
  sku: string | null;
  upc: string | null;
  quantity: number;
  unit_cost: number | null;
  price: number | null;
  supplier: string | null;
};

type TicketImage = {
  id: string;
  image_type: 'pre_repair' | 'post_repair' | 'attachment' | 'microscopio';
  image_url: string;
  thumbnail_url?: string;
  description?: string;
  file_name?: string | null;
  created_at: string;
};

function isPreRepairImage(t: string): boolean {
  return t === 'pre_repair';
}
function isMicroscopioImage(t: string): boolean {
  return t === 'microscopio';
}

type TicketCondition = {
  id: string;
  condition_type: 'pre' | 'post';
  powers_on?: string;
  charging?: string;
  restarts?: string;
  software?: string;
  wet_damage?: string;
  tampered?: string;
  screen_new?: string;
  screen_used?: string;
  screen_broken?: string;
  chassis_new?: string;
  chassis_used?: string;
  chassis_broken?: string;
  battery_good?: string;
  battery_fair?: string;
  battery_bad?: string;
  touchscreen?: string;
  power_button?: string;
  volume_button?: string;
  face_id?: string;
  touch_id?: string;
  wifi?: string;
  bluetooth?: string;
  notes?: string;
  checked_by?: string;
};

type TicketAccessories = {
  id: string;
  has_sim: boolean;
  has_case: boolean;
  has_pencil: boolean;
  has_usb_cable: boolean;
  has_charger: boolean;
  has_memory_card: boolean;
  has_power_bank: boolean;
  has_replacement: boolean;
  has_headphones: boolean;
  has_original_box: boolean;
  notes?: string;
};

const STATUS_GROUPS = [
  {
    label: 'En espera',
    items: [
      { value: 'waiting_parts', label: 'Waiting for Parts', dot: '#3b82f6' },
      { value: 'entrada', label: 'ENTRADA', dot: '#ef4444' },
      { value: 'envios', label: 'ENVIOS', dot: '#3b82f6' },
      { value: 'pendiente_pedido', label: 'PENDIENTE DE PEDIDO', dot: '#f97316' },
      { value: 'presupuesto', label: 'PRESUPUESTO', dot: '#eab308' },
    ],
  },
  {
    label: 'Abierto',
    items: [
      { value: 'en_proceso', label: 'EN PROCESO', dot: '#ef4444' },
      { value: 'pendiente_pieza', label: 'PENDIENTE DE PIEZA', dot: '#f97316' },
      { value: 'no_reparado_open', label: 'NO REPARADO', dot: '#22c55e' },
      { value: 'en_estudio', label: 'EN ESTUDIO', dot: '#22c55e' },
      { value: 'pendiente_cliente', label: 'PENDIENTE CLIENTE', dot: '#f97316' },
      { value: 'traslado', label: 'TRASLADO', dot: '#f9a8d4' },
      { value: 'externa', label: 'EXTERNA', dot: '#22c55e' },
      { value: 'diagnostico', label: 'DIAGNOSTICO', dot: '#3b82f6' },
      { value: 'prioridad', label: 'PRIORIDAD', dot: '#3b82f6' },
    ],
  },
  {
    label: 'Cerrado',
    items: [
      { value: 'reparado', label: 'REPARADO', dot: '#22c55e' },
      { value: 'repaired_collected', label: 'Reparado y Recogido', dot: '#22c55e' },
      { value: 'no_reparado', label: 'NO REPARADO', dot: '#ef4444' },
      { value: 'cancelled', label: 'Cancelado', dot: '#6b7280' },
    ],
  },
];

const ALL_STATUSES = STATUS_GROUPS.flatMap((g) => g.items);
const PENDING_STATUS = { value: 'pending', label: 'Pendiente', dot: '#eab308' };
function getStatusByValue(val: string) {
  return ALL_STATUSES.find((s) => s.value === val) || PENDING_STATUS;
}

function StatusDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

type TicketToolboxKey = 'problem' | 'parts' | 'supply' | 'images' | 'conditions';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [activeTab, setActiveTab] = useState('tareas');
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');
  const statusRef = useRef<HTMLDivElement>(null);

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [depositDraft, setDepositDraft] = useState('');
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [savingApplyIva, setSavingApplyIva] = useState(false);

  const [polishingComment, setPolishingComment] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateDef | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailCC, setEmailCC] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailPreview, setEmailPreview] = useState(false);
  const [templateDropdown, setTemplateDropdown] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [additionalNote, setAdditionalNote] = useState('');
  const templateRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const myPerms = useMyPermissions();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoicePdfBusy, setInvoicePdfBusy] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [verifying, setVerifying] = useState(false);
  const [invoiceVerified, setInvoiceVerified] = useState(false);
  const [invoiceVerifyErrors, setInvoiceVerifyErrors] = useState<string[]>([]);
  const [waModal, setWaModal] = useState<{ open: boolean; defaultMessage: string }>({
    open: false,
    defaultMessage: '',
  });

  // Estados para secciones funcionales
  const [parts, setParts] = useState<TicketPart[]>([]);
  const [images, setImages] = useState<TicketImage[]>([]);
  const [ticketImageDisplayById, setTicketImageDisplayById] = useState<Record<string, string>>({});
  const [preConditions, setPreConditions] = useState<TicketCondition | null>(null);
  const [postConditions, setPostConditions] = useState<TicketCondition | null>(null);
  const [accessories, setAccessories] = useState<TicketAccessories | null>(null);
  
  // Estados para formularios
  const [showRepuestoModal, setShowRepuestoModal] = useState(false);
  const [repuestoSearch, setRepuestoSearch] = useState('');
  const [repuestoResults, setRepuestoResults] = useState<ProductPickRow[]>([]);
  const [repuestoSearchLoading, setRepuestoSearchLoading] = useState(false);
  const [selectedRepuesto, setSelectedRepuesto] = useState<ProductPickRow | null>(null);
  const [repuestoQty, setRepuestoQty] = useState(1);
  const [activeConditionTab, setActiveConditionTab] = useState<'pre' | 'post'>('pre');
  const [activeImageTab, setActiveImageTab] = useState<'pre' | 'post' | 'micro'>('pre');
  const [microscopeWebcamFiles, setMicroscopeWebcamFiles] = useState<File[]>([]);
  const [uploadingMicroscope, setUploadingMicroscope] = useState(false);
  const [imageLightbox, setImageLightbox] = useState<{ url: string; alt: string } | null>(null);
  /** Acordeón compacto: una sola sección expandida bajo la fila de recuadros. */
  const [openToolbox, setOpenToolbox] = useState<TicketToolboxKey | null>(null);

  const toolboxSupplyCheckedCount = useMemo(() => {
    if (!accessories) return 0;
    const keys = [
      'has_sim',
      'has_case',
      'has_pencil',
      'has_usb_cable',
      'has_charger',
      'has_memory_card',
      'has_power_bank',
      'has_replacement',
      'has_headphones',
      'has_original_box',
    ] as const;
    return keys.filter((k) => Boolean(accessories[k])).length;
  }, [accessories]);

  const [savingConditions, setSavingConditions] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showLabelPrint, setShowLabelPrint] = useState(false);
  const [showSystemMessages, setShowSystemMessages] = useState(true);
  const [showCustomerOrders, setShowCustomerOrders] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingCustomerOrders, setLoadingCustomerOrders] = useState(false);

  const [deviceLockModalOpen, setDeviceLockModalOpen] = useState(false);
  const [deviceLockPin, setDeviceLockPin] = useState('');
  const [deviceLockPattern, setDeviceLockPattern] = useState('');
  const [deviceLockFormKey, setDeviceLockFormKey] = useState(0);
  const [savingDeviceLock, setSavingDeviceLock] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  type DeviceHistoryTicket = {
    id: string;
    ticket_number: string;
    status: string;
    issue_description: string;
    created_at: string;
    device_type: string;
    imei: string | null;
    serial_number: string | null;
    customers: { id: string; name: string } | null;
  };
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistoryTicket[]>([]);
  const [deviceHistoryLoaded, setDeviceHistoryLoaded] = useState(false);
  const [shopSettings, setShopSettings] = useState<any>(null);
  /** País de la organización del ticket (fuente de verdad para garantía e impreso). */
  const [ticketOrgCountry, setTicketOrgCountry] = useState<string | null>(null);
  /** Nombre comercial de la organización del ticket (para «Ubicación» en resumen). */
  const [ticketOrgName, setTicketOrgName] = useState<string | null>(null);
  /** Nombre del usuario que creó el ticket (perfil). */
  const [creatorDisplayName, setCreatorDisplayName] = useState<string | null>(null);
  const effectiveOrgCountry = ticketOrgCountry ?? shopSettings?.country ?? null;
  /** Misma regla que el resto del panel: solo ARS implica Argentina (no `organizations.country` suelto). */
  const isArgentinaUi =
    String(shopSettings?.currency || '').toUpperCase() === 'ARS' ||
    (shopSettings == null && String(effectiveOrgCountry || '').toUpperCase() === 'AR');
  const rc = useMemo(() => repairCaseTerms(isArgentinaUi), [isArgentinaUi]);
  const currSym = getTicketPrintCurrencySymbol(
    effectiveOrgCountry,
    shopSettings?.currency_symbol,
    shopSettings?.currency
  );
  const warrantyFootnote = getTicketWarrantyFootnote(
    effectiveOrgCountry,
    shopSettings?.currency
  );
  const [techIdToName, setTechIdToName] = useState<Map<string, string>>(new Map());
  const [techIdToColor, setTechIdToColor] = useState<Map<string, string>>(new Map());
  const [commentUserRoleById, setCommentUserRoleById] = useState<Map<string, string>>(new Map());
  const [commentUserDisplayNameById, setCommentUserDisplayNameById] = useState<Map<string, string>>(
    new Map()
  );
  const [commentUserAvatarUrlById, setCommentUserAvatarUrlById] = useState<Map<string, string>>(new Map());
  const [commentAvatarBrokenUserIds, setCommentAvatarBrokenUserIds] = useState<Set<string>>(new Set());
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [assigneeAvatarUrl, setAssigneeAvatarUrl] = useState<string | null>(null);
  const [assigneeAvatarBroken, setAssigneeAvatarBroken] = useState(false);
  const [assigneePanelUserId, setAssigneePanelUserId] = useState<string | null>(null);
  const [assigneeTechnicianRoleLabel, setAssigneeTechnicianRoleLabel] = useState<string | null>(null);
  /** Empleados con `is_active` para reasignar desde la ficha del ticket. */
  const [activeTechnicians, setActiveTechnicians] = useState<{ id: string; name: string }[]>([]);
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [savingAssignee, setSavingAssignee] = useState(false);

  type RelatedTraceRow = {
    id: string;
    ticket_number: string;
    status: string;
    created_at: string;
  };
  const [relatedParentTicket, setRelatedParentTicket] = useState<RelatedTraceRow | null>(null);
  const [relatedChildTickets, setRelatedChildTickets] = useState<RelatedTraceRow[]>([]);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnModalPreserveComplete, setReturnModalPreserveComplete] = useState(false);
  const [returnModalShowForm, setReturnModalShowForm] = useState(false);
  const [returnDraftNote, setReturnDraftNote] = useState('');
  const [returnDraftAmount, setReturnDraftAmount] = useState('');
  const [returnScenario, setReturnScenario] = useState<string>('other');
  const [returnSettlement, setReturnSettlement] = useState<string>('pending');
  const [returnRelatedInvoiceId, setReturnRelatedInvoiceId] = useState<string>('');
  const [ticketInvoicesForReturn, setTicketInvoicesForReturn] = useState<
    { id: string; invoice_number: string; total_amount: number | null }[]
  >([]);
  const [returnConstanciaId, setReturnConstanciaId] = useState<string | null>(null);
  const [savingReturn, setSavingReturn] = useState(false);

  const [taskTypeNames, setTaskTypeNames] = useState<string[]>([]);
  const [savingTicketMeta, setSavingTicketMeta] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [repairTimeDraft, setRepairTimeDraft] = useState('00:00:00');
  const savingMetaRef = useRef(false);

  const loadComments = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false });
    setComments(data || []);
  }, [id, supabase]);

  useEffect(() => {
    loadTicket();
    loadComments();
    loadInvoices();
    loadParts();
    loadImages();
    loadConditions();
    loadAccessories();
    loadShopSettings();
  }, [id, loadComments]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rows } = await (supabase as any)
        .from('task_types')
        .select('name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order');
      if (cancelled) return;
      const names = (rows || []).map((r: { name: string }) => r.name).filter(Boolean);
      setTaskTypeNames(names.length > 0 ? names : [...FALLBACK_TASK_TYPES]);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!ticket) return;
    setDueDateDraft(fromIsoToDatetimeLocalVal(ticket.due_date));
    setRepairTimeDraft(parseRepairTimeForInput(ticket.repair_time));
  }, [ticket?.id, ticket?.due_date, ticket?.repair_time]);

  const returnInvoiceSelectRows = useMemo(() => {
    const list = ticketInvoicesForReturn.slice();
    const rid = ticket?.return_related_invoice_id?.trim();
    if (rid && !list.some((i) => i.id === rid)) {
      list.unshift({
        id: rid,
        invoice_number: 'Factura vinculada (histórico)',
        total_amount: null,
      });
    }
    return list;
  }, [ticketInvoicesForReturn, ticket?.return_related_invoice_id]);

  const taskTypeOptions = useMemo(() => {
    const base = taskTypeNames.length > 0 ? taskTypeNames : [...FALLBACK_TASK_TYPES];
    const cur = ticket?.task_type?.trim();
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [taskTypeNames, ticket?.task_type]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusDropdown(false);
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) setTemplateDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!ticket?.organization_id) {
      setCommentUserRoleById(new Map());
      setCommentUserDisplayNameById(new Map());
      return;
    }
    let cancelled = false;
    void Promise.all([
      loadOrgUserRoleLabelMap(supabase, ticket.organization_id),
      loadOrgMemberDisplayNameByUserId(supabase, ticket.organization_id),
    ]).then(([roles, names]) => {
      if (!cancelled) {
        setCommentUserRoleById(roles);
        setCommentUserDisplayNameById(names);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ticket?.organization_id, supabase]);

  useEffect(() => {
    const ids = Array.from(new Set(comments.map((c) => c.user_id).filter(Boolean))) as string[];
    if (ids.length === 0) {
      setCommentUserAvatarUrlById(new Map());
      return;
    }
    let cancelled = false;
    void loadProfileAvatarUrlByUserIds(supabase, ids).then((m) => {
      if (!cancelled) {
        setCommentUserAvatarUrlById(m);
        setCommentAvatarBrokenUserIds(new Set());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [comments, supabase]);

  useEffect(() => {
    setAssigneeAvatarUrl(null);
    setAssigneeAvatarBroken(false);
    setAssigneePanelUserId(null);
    setAssigneeTechnicianRoleLabel(null);
    if (!ticket?.assigned_to || !isUuid(ticket.assigned_to)) return;
    let cancelled = false;
    void (async () => {
      const { data: techRow } = await (supabase as any)
        .from('technicians')
        .select('panel_user_id, role')
        .eq('id', ticket.assigned_to)
        .maybeSingle();

      let uid: string | null = null;
      const orgId =
        (ticket.organization_id && String(ticket.organization_id).trim()) ||
        (await getActiveOrganizationId(supabase));
      if (orgId) {
        const { data: rpcUid, error: rpcErr } = await (supabase as any).rpc(
          'get_panel_user_for_technician_assignment',
          {
            p_technician_id: ticket.assigned_to,
            p_organization_id: orgId,
          }
        );
        if (!rpcErr && rpcUid) uid = String(rpcUid);
      }
      if (!uid) {
        const linked = (techRow?.panel_user_id as string | undefined)?.trim();
        if (linked) uid = linked;
        else if (!techRow) uid = ticket.assigned_to;
      }

      if (!cancelled) {
        setAssigneePanelUserId(uid);
        let techRoleLabel = formatOrgMemberRoleLabel(techRow?.role as string | undefined);
        if (orgId && techRow?.role) {
          const { data: ov } = await (supabase as any)
            .from('organization_role_label_overrides')
            .select('name')
            .eq('organization_id', orgId)
            .eq('role_key', techRow.role)
            .maybeSingle();
          const on = (ov as { name?: string } | null)?.name?.trim();
          if (on) techRoleLabel = on;
        }
        setAssigneeTechnicianRoleLabel(techRoleLabel || null);
      }
      if (cancelled) return;

      if (orgId) {
        const { data: rpcAvatar, error: avatarRpcErr } = await (supabase as any).rpc(
          'get_technician_assignee_avatar_url',
          {
            p_technician_id: ticket.assigned_to,
            p_organization_id: orgId,
          }
        );
        const fromRpc = (rpcAvatar as string | undefined)?.trim();
        if (!avatarRpcErr && fromRpc) {
          if (!cancelled) setAssigneeAvatarUrl(fromRpc);
          return;
        }
      }
      if (!uid || cancelled) return;
      const { data: prof } = await (supabase as any)
        .from('profiles')
        .select('avatar_url')
        .eq('id', uid)
        .maybeSingle();
      const url = (prof?.avatar_url as string | undefined)?.trim();
      if (!cancelled && url) setAssigneeAvatarUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [ticket?.assigned_to, ticket?.id, ticket?.organization_id, supabase]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionUserId(user?.id ?? null);
    });
  }, [supabase]);

  /** Técnicos dados de alta (`is_active`) para el selector de reasignación. */
  useEffect(() => {
    if (!ticket?.id) {
      setActiveTechnicians([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const orgId = ticket.organization_id ?? (await getActiveOrganizationId(supabase));
      if (!orgId || cancelled) return;
      const { data: tData } = await (supabase as any)
        .from('technicians')
        .select('id, name')
        .or(`organization_id.eq.${orgId},shop_owner_id.eq.${user.id}`)
        .eq('is_active', true)
        .order('name');
      if (cancelled) return;
      setActiveTechnicians(
        (tData || []).map((t: { id: string; name?: string | null }) => ({
          id: t.id,
          name: String(t.name ?? '').trim() || 'Técnico',
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [ticket?.id, ticket?.organization_id, supabase]);

  useEffect(() => {
    if (activeTab !== 'tareas' || !ticket?.id) return;
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count, error: cErr } = await (supabase as any)
        .from('ticket_comments')
        .select('id', { count: 'exact', head: true })
        .eq('ticket_id', ticket.id)
        .eq('user_id', user.id)
        .eq('comment_type', 'acceso')
        .gte('created_at', start.toISOString());
      if (cancelled || cErr || (count ?? 0) > 0) return;
      const author_name = formatActivityAuthorLabel({
        userId: user.id,
        emailFallback: user.email?.split('@')[0] || 'Usuario',
        roleByUserId: commentUserRoleById,
        displayNameByUserId: commentUserDisplayNameById,
      });
      const { error: insErr } = await (supabase as any).from('ticket_comments').insert([{
        ticket_id: ticket.id,
        user_id: user.id,
        author_name,
        content: 'Abrió la pestaña «Tareas» de esta orden (acuse de lectura).',
        is_private: false,
        comment_type: 'acceso',
      }]);
      if (cancelled) return;
      if (insErr) {
        const code = (insErr as { code?: string }).code;
        if (code !== '23505') console.warn('[acceso tareas]', insErr);
        return;
      }
      loadComments();
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    ticket?.id,
    supabase,
    commentUserRoleById,
    commentUserDisplayNameById,
    loadComments,
  ]);

  const loadTicket = async () => {
    try {
      setRelatedParentTicket(null);
      setRelatedChildTickets([]);
      setTicketOrgName(null);
      setCreatorDisplayName(null);
      /**
       * No filtrar aquí por `repairTicketsOrgScopeOr(activeOrg)`:
       * `getActiveOrganizationId` solo devuelve UNA membresía (p. ej. la primera por UUID).
       * Los avisos (`panel_notifications`) pueden referir a un ticket de OTRA organización
       * a la que también perteneces; el filtro extra devolvía 0 filas aunque RLS sí permita leer.
       * La política RLS de `repair_tickets` ya restringe: creador o miembro del `organization_id` del ticket.
       */
      const { data, error } = await (supabase as any)
        .from('repair_tickets')
        .select(
          '*, customer_fiscal_id_ar, customer_iva_condition_ar, customers(id, name, email, phone, address, city, postal_code, id_number, tax_class, organization, customer_group, how_did_you_find_us)'
        )
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[loadTicket]', error);
        toast.error(error.message || 'No se pudo cargar el ticket.');
        setTicket(null);
        setTicketOrgCountry(null);
        router.replace('/dashboard/tickets');
        return;
      }

      setTicket(data);
      if (!data) {
        setTicketOrgCountry(null);
        toast.error('Este ticket no existe o no pertenece a tu taller.');
        router.replace('/dashboard/tickets');
      } else {
        const relId = (data as { related_ticket_id?: string | null }).related_ticket_id;
        if (relId) {
          const { data: parentRow } = await (supabase as any)
            .from('repair_tickets')
            .select('id, ticket_number, status, created_at')
            .eq('id', relId)
            .maybeSingle();
          if (parentRow?.id) setRelatedParentTicket(parentRow as RelatedTraceRow);
        }
        const { data: childRows } = await (supabase as any)
          .from('repair_tickets')
          .select('id, ticket_number, status, created_at')
          .eq('related_ticket_id', id)
          .order('created_at', { ascending: false })
          .limit(24);
        setRelatedChildTickets((childRows || []) as RelatedTraceRow[]);

        const { data: invForReturn } = await (supabase as any)
          .from('invoices')
          .select('id, invoice_number, total_amount')
          .eq('ticket_id', id)
          .order('created_at', { ascending: false });
        setTicketInvoicesForReturn(invForReturn || []);
        try {
          const cid = await fetchReturnConstanciaIdByTicket(supabase, id);
          setReturnConstanciaId(cid);
        } catch {
          setReturnConstanciaId(null);
        }

        void loadDeviceHistory(data);
        if (data.organization_id) {
          const { data: orgRow } = await (supabase as any)
            .from('organizations')
            .select('country, name')
            .eq('id', data.organization_id)
            .maybeSingle();
          setTicketOrgCountry(orgRow?.country ?? null);
          const on = (orgRow?.name as string | undefined)?.trim();
          setTicketOrgName(on ? displayOrgOrShopName(on) : null);
        } else {
          setTicketOrgCountry(null);
          setTicketOrgName(null);
        }
        const creatorId = (data as { user_id?: string }).user_id;
        if (creatorId) {
          const { data: prof } = await (supabase as any)
            .from('profiles')
            .select('full_name, first_name, last_name')
            .eq('id', creatorId)
            .maybeSingle();
          const full = (prof?.full_name as string | undefined)?.trim();
          const parts = [prof?.first_name, prof?.last_name]
            .filter((x: unknown) => typeof x === 'string' && (x as string).trim())
            .map((x: string) => x.trim())
            .join(' ');
          setCreatorDisplayName(full || parts || null);
        }
        if (data?.customers?.email) setEmailTo(data.customers.email);
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          const orgForTechs =
            data.organization_id ?? (await getActiveOrganizationId(supabase));
          const techMap = await loadTechnicianIdToNameMap(supabase, {
            organizationId: orgForTechs,
            currentUserId: u.id,
            ensureIds: [data.assigned_to],
          });
          setTechIdToName(techMap);
          const colorIds = Array.from(
            new Set(
              [
                ...Array.from(techMap.keys()),
                ...(data.assigned_to && isUuid(data.assigned_to) ? [data.assigned_to] : []),
              ].filter(Boolean) as string[]
            )
          );
          if (colorIds.length > 0) {
            const { data: colorRows } = await (supabase as any)
              .from('technicians')
              .select('id, color')
              .in('id', colorIds);
            const cm = new Map<string, string>();
            for (const r of colorRows || []) {
              if (r?.id && r?.color) cm.set(r.id, r.color as string);
            }
            setTechIdToColor(cm);
          } else {
            setTechIdToColor(new Map());
          }
        }
      }
    } catch {
      toast.error('Error al cargar ticket');
      setTicketOrgCountry(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReassignTechnician = async (newAssignedTo: string | null) => {
    if (!ticket || savingAssignee) return;
    const prev = ticket.assigned_to ?? null;
    if (newAssignedTo === prev) {
      setAssignPopoverOpen(false);
      setAssignSearch('');
      return;
    }
    setSavingAssignee(true);
    try {
      const orgId = ticket.organization_id ?? (await getActiveOrganizationId(supabase));
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }
      const { error } = await (supabase as any)
        .from('repair_tickets')
        .update({ assigned_to: newAssignedTo })
        .eq('id', ticket.id);
      if (error) throw error;

      setTicket({ ...ticket, assigned_to: newAssignedTo });
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (u) {
        const techMap = await loadTechnicianIdToNameMap(supabase, {
          organizationId: orgId,
          currentUserId: u.id,
          ensureIds: [newAssignedTo].filter((x): x is string => !!x),
        });
        setTechIdToName(techMap);
        const colorIds = Array.from(
          new Set(
            [
              ...Array.from(techMap.keys()),
              ...(newAssignedTo && isUuid(newAssignedTo) ? [newAssignedTo] : []),
            ].filter(Boolean) as string[]
          )
        );
        if (colorIds.length > 0) {
          const { data: colorRows } = await (supabase as any)
            .from('technicians')
            .select('id, color')
            .in('id', colorIds);
          const cm = new Map<string, string>();
          for (const r of colorRows || []) {
            if (r?.id && r?.color) cm.set(r.id, r.color as string);
          }
          setTechIdToColor(cm);
        }
      }

      setAssignPopoverOpen(false);
      setAssignSearch('');
      toast.success(newAssignedTo ? 'Asignación actualizada' : 'Ticket sin asignar');

      if (newAssignedTo && isUuid(newAssignedTo)) {
        try {
          const deviceSummary = [
            ticket.device_brand,
            ticket.device_category === 'SMART_TV' && ticket.device_screen_inches?.trim()
              ? ticket.device_screen_inches.trim()
              : null,
            ticket.device_model,
            ticket.device_type,
          ]
            .filter(Boolean)
            .join(' ')
            .trim();
          const { assigneeNotified } = await notifyTicketAssignedToPanelUser(supabase, {
            organizationId: orgId,
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            deviceSummary,
            technicianId: newAssignedTo,
          });
          if (!assigneeNotified) {
            toast.message(
              'Ticket guardado. El aviso en la campana solo lo ve quien tiene «Usuario del panel» enlazado en ese empleado.',
              { duration: 5500, id: 'notify-assign-hint-detail' }
            );
          }
        } catch {
          /* no bloquear */
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar la asignación');
    } finally {
      setSavingAssignee(false);
    }
  };

  const patchTicketMeta = async (
    updates: Partial<{ due_date: string | null; task_type: string; repair_time: string }>
  ): Promise<boolean> => {
    if (!ticket || savingMetaRef.current) return false;
    savingMetaRef.current = true;
    setSavingTicketMeta(true);
    try {
      const { error } = await (supabase as any).from('repair_tickets').update(updates).eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, ...updates });
      toast.success('Guardado');
      return true;
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Error al guardar';
      toast.error(msg);
      return false;
    } finally {
      savingMetaRef.current = false;
      setSavingTicketMeta(false);
    }
  };

  const patchFollowUp = async (patch: {
    follow_up_wait_reason?: string | null;
    follow_up_snoozed_until?: string | null;
  }) => {
    if (!ticket || savingFollowUp) return;
    if (!myPerms.can_edit_tickets || myPerms.loading) {
      toast.error('No tienes permiso para editar este ticket.');
      return;
    }
    setSavingFollowUp(true);
    try {
      const { error } = await (supabase as any).from('repair_tickets').update(patch).eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, ...patch });
      toast.success('Seguimiento actualizado');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const commitDueDate = async () => {
    if (!ticket) return;
    const prevLocal = fromIsoToDatetimeLocalVal(ticket.due_date);
    if (dueDateDraft === prevLocal) return;
    if (!dueDateDraft.trim()) {
      if (!ticket.due_date) return;
      const ok = await patchTicketMeta({ due_date: null });
      if (!ok) setDueDateDraft(prevLocal);
      return;
    }
    const parsed = new Date(dueDateDraft);
    if (Number.isNaN(parsed.getTime())) {
      toast.error('Fecha no válida');
      setDueDateDraft(prevLocal);
      return;
    }
    const ok = await patchTicketMeta({ due_date: parsed.toISOString() });
    if (!ok) setDueDateDraft(prevLocal);
  };

  const commitRepairTime = async () => {
    if (!ticket) return;
    const normalized = parseRepairTimeForInput(repairTimeDraft);
    const prev = parseRepairTimeForInput(ticket.repair_time);
    if (normalized === prev) return;
    const ok = await patchTicketMeta({ repair_time: normalized });
    if (!ok) setRepairTimeDraft(prev);
  };

  const loadInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: invoicesData } = await (supabase as any)
        .from('invoices')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: false });
      
      setInvoices(invoicesData || []);

      if (!invoicesData?.length) {
        setPayments([]);
        return;
      }

      const invoiceIds = invoicesData.map((inv: Invoice) => inv.id);
      const [{ data: payByInvoice }, { data: payByTicket }] = await Promise.all([
        (supabase as any)
          .from('payments')
          .select('*')
          .in('invoice_id', invoiceIds)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('payments')
          .select('*')
          .eq('ticket_id', id)
          .order('created_at', { ascending: false }),
      ]);
      const merged = new Map<string, Payment>();
      for (const p of [...(payByInvoice || []), ...(payByTicket || [])] as Payment[]) {
        if (p?.id) merged.set(p.id, p);
      }
      setPayments(
        Array.from(merged.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const { data } = await (supabase as any)
        .from('payments')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: false });
      if (data) setPayments(data);
    } catch { /* ignore */ }
  };

  const loadParts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await (supabase as any)
        .from('ticket_parts')
        .select(
          '*, products ( id, name, sku, quantity, unit_cost, storage_location )'
        )
        .eq('ticket_id', id)
        .order('created_at', { ascending: false });
      if (error) console.error('[loadParts]', error);
      setParts(data || []);
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  const loadImages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('ticket_images')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: false });
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!images.length) {
        setTicketImageDisplayById({});
        return;
      }
      const entries = images.map((img) => ({
        key: img.id,
        stored: img.thumbnail_url || img.image_url,
      }));
      const map = await buildSignedUrlMapForEntries(supabase, 'ticket-images', entries);
      if (!cancelled) setTicketImageDisplayById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [images, supabase]);

  useEffect(() => {
    if (openToolbox !== 'images') setMicroscopeWebcamFiles([]);
  }, [openToolbox]);

  const loadConditions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('ticket_conditions')
        .select('*')
        .eq('ticket_id', id)
        .eq('shop_owner_id', user.id);
      if (data) {
        setPreConditions(data.find((c: TicketCondition) => c.condition_type === 'pre') || null);
        setPostConditions(data.find((c: TicketCondition) => c.condition_type === 'post') || null);
      }
    } catch (error) {
      console.error('Error loading conditions:', error);
    }
  };

  const loadAccessories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('ticket_accessories')
        .select('*')
        .eq('ticket_id', id)
        .eq('shop_owner_id', user.id)
        .maybeSingle();
      setAccessories(data || {
        has_sim: false, has_case: false, has_pencil: false, has_usb_cable: false,
        has_charger: false, has_memory_card: false, has_power_bank: false,
        has_replacement: false, has_headphones: false, has_original_box: false
      });
    } catch (error) {
      console.error('Error loading accessories:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    const oldStatus = getStatusByValue(ticket.status);
    const newStatusObj = getStatusByValue(newStatus);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión');
        return;
      }

      const { error: statusUpdErr } = await (supabase as any)
        .from('repair_tickets')
        .update({ status: newStatus })
        .eq('id', ticket.id);
      if (statusUpdErr) throw statusUpdErr;
      const { data: fuRow } = await (supabase as any)
        .from('repair_tickets')
        .select(
          'follow_up_started_at, follow_up_snoozed_until, follow_up_notify_count, follow_up_last_notified_at, follow_up_wait_reason'
        )
        .eq('id', ticket.id)
        .maybeSingle();
      setTicket({
        ...ticket,
        status: newStatus,
        follow_up_started_at: fuRow?.follow_up_started_at ?? null,
        follow_up_snoozed_until: fuRow?.follow_up_snoozed_until ?? null,
        follow_up_notify_count: fuRow?.follow_up_notify_count ?? 0,
        follow_up_last_notified_at: fuRow?.follow_up_last_notified_at ?? null,
        follow_up_wait_reason: fuRow?.follow_up_wait_reason ?? null,
      });
      setStatusDropdown(false);

      const authorTag = formatActivityAuthorLabel({
        userId: user.id,
        emailFallback: user.email?.split('@')[0] || 'Técnico',
        roleByUserId: commentUserRoleById,
        displayNameByUserId: commentUserDisplayNameById,
      });
      const changeMessage = `**${authorTag}** cambió el estado de **${oldStatus.label}** → **${newStatusObj.label}**`;

      const { error: commentErr } = await (supabase as any).from('ticket_comments').insert([
        {
          ticket_id: ticket.id,
          user_id: user.id,
          author_name: authorTag,
          content: changeMessage,
          is_private: false,
          comment_type: 'estado',
        },
      ]);
      if (commentErr) throw commentErr;

      loadComments();

      toast.success(`Estado cambiado a: ${newStatusObj.label}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(
        humanizeRepairTicketsSchemaError(msg) || 'Error al cambiar estado: ' + msg
      );
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !ticket) return;
    setSavingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const authorTag = formatActivityAuthorLabel({
        userId: user.id,
        emailFallback: user.email?.split('@')[0] || 'Técnico',
        roleByUserId: commentUserRoleById,
        displayNameByUserId: commentUserDisplayNameById,
      });
      const { error } = await (supabase as any).from('ticket_comments').insert([{
        ticket_id: ticket.id,
        user_id: user.id,
        author_name: authorTag,
        content: commentText,
        is_private: activeTab === 'privados',
        comment_type: activeTab,
      }]);
      if (error) throw error;
      setCommentText('');
      loadComments();
      toast.success('Comentario guardado');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingComment(false);
    }
  };

  const handleSaveCommentEdit = async () => {
    if (!editingCommentId) return;
    const text = editingCommentText.trim();
    if (!text) {
      toast.error('El comentario no puede quedar vacío');
      return;
    }
    setSavingCommentEdit(true);
    try {
      const { error } = await (supabase as any)
        .from('ticket_comments')
        .update({ content: text })
        .eq('id', editingCommentId);
      if (error) throw error;
      setEditingCommentId(null);
      setEditingCommentText('');
      loadComments();
      toast.success('Comentario actualizado');
    } catch (e: any) {
      toast.error(e.message || 'No se pudo guardar');
    } finally {
      setSavingCommentEdit(false);
    }
  };

  const handleSavePrice = async () => {
    if (!ticket) return;
    setSavingPrice(true);
    const val = parseFloat(priceValue);
    if (isNaN(val)) { toast.error('Precio inválido'); setSavingPrice(false); return; }
    await (supabase as any).from('repair_tickets').update({ estimated_cost: val, final_cost: val }).eq('id', ticket.id);
    setTicket({ ...ticket, estimated_cost: val, final_cost: val });
    setEditingPrice(false);
    setSavingPrice(false);
    toast.success('Precio actualizado');
  };

  useEffect(() => {
    if (!ticket) return;
    const d = ticket.deposit_amount;
    if (d != null && Number.isFinite(Number(d)) && Number(d) > 0) setDepositDraft(Number(d).toFixed(2));
    else setDepositDraft('');
  }, [ticket?.id, ticket?.deposit_amount]);

  const handleSaveDeposit = async () => {
    if (!ticket) return;
    const raw = depositDraft.trim().replace(',', '.');
    setSavingDeposit(true);
    try {
      if (raw === '') {
        const { error } = await (supabase as any)
          .from('repair_tickets')
          .update({ deposit_amount: null })
          .eq('id', ticket.id);
        if (error) throw error;
        setTicket({ ...ticket, deposit_amount: null });
        toast.success('Seña quitada');
        return;
      }
      const v = parseFloat(raw);
      if (Number.isNaN(v) || v < 0) {
        toast.error('Importe de seña inválido');
        return;
      }
      const { error } = await (supabase as any)
        .from('repair_tickets')
        .update({ deposit_amount: v })
        .eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, deposit_amount: v });
      setDepositDraft(v.toFixed(2));
      toast.success('Seña guardada');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar la seña');
    } finally {
      setSavingDeposit(false);
    }
  };

  const handleApplyIvaChange = async (checked: boolean) => {
    if (!ticket) return;
    setSavingApplyIva(true);
    try {
      const { error } = await (supabase as any)
        .from('repair_tickets')
        .update({ apply_iva: checked })
        .eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, apply_iva: checked });
      toast.success(checked ? 'IVA 21% aplicado al total' : 'Total sin IVA (importe tal cual)');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo actualizar el IVA');
    } finally {
      setSavingApplyIva(false);
    }
  };

  /** Tras emitir/cobrar factura: rellena fechas de garantía con el plazo por defecto del taller (ajustes entradas/reparaciones). */
  const syncRepairTicketWarrantyAfterInvoice = useCallback(
    async (t: Ticket) => {
      const winfoSkip = (t.warranty_info || '').trim();
      if (winfoSkip === 'Sin garantía') return;

      const ws = t.warranty_start_date ? String(t.warranty_start_date).slice(0, 10) : '';
      const we = t.warranty_end_date ? String(t.warranty_end_date).slice(0, 10) : '';
      if (ws && we) return;

      const tr = parseTicketRepairsSettings(shopSettings?.ticket_repairs_settings);
      const amount = tr.default_warranty_amount;
      const unit = tr.default_warranty_unit;
      if (!Number.isFinite(amount) || amount < 1) return;

      const startIso = ws || localDateString();
      const endIso = we || addWarrantyPeriodToStart(startIso, amount, unit) || '';
      if (!endIso) return;

      const patch: {
        warranty_start_date: string;
        warranty_end_date: string;
        warranty_info?: string;
      } = {
        warranty_start_date: startIso,
        warranty_end_date: endIso,
      };
      const winfo = (t.warranty_info || '').trim();
      if (!winfo || winfo === 'Sin garantía') {
        patch.warranty_info = 'En garantía';
      }

      try {
        const { error } = await (supabase as any)
          .from('repair_tickets')
          .update(patch)
          .eq('id', t.id);
        if (error) throw error;
        setTicket((prev) => (prev && prev.id === t.id ? { ...prev, ...patch } : prev));
      } catch (e) {
        console.warn('[warranty] sync tras factura:', e);
      }
    },
    [shopSettings?.ticket_repairs_settings, supabase]
  );

  const polishWithAI = async (
    text: string,
    setText: (t: string) => void,
    setBusy: (b: boolean) => void,
  ) => {
    const t = text.trim();
    if (!t) { toast.error('Escribe algo primero'); return; }
    setBusy(true);
    try {
      /** Servidor: GROQ_POLISH_API_KEY (Groq; no la clave del taller en /api/org/gemini). */
      const res = await adminFetch('/api/improve-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: string }).error || 'Error al contactar la IA');
      const out = (j as { text?: string }).text;
      if (!out?.trim()) throw new Error('Respuesta vacía');
      setText(out);
      toast.success('Texto pulido con IA ✨');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo pulir el texto');
    } finally {
      setBusy(false);
    }
  };

  const handlePolishComment = () =>
    polishWithAI(commentText, setCommentText, setPolishingComment);

  const applyTemplate = (tmpl: EmailTemplateDef) => {
    setSelectedTemplate(tmpl);
    const ticketNumber = ticket?.ticket_number || '';
    setEmailSubject(tmpl.subject.replace('{{ticket}}', ticketNumber));
    setTemplateDropdown(false);
  };

  useEffect(() => {
    if (!selectedTemplate || !ticket) return;
    const shop = shopSettings ?? {
      shop_name: 'Mi Taller',
      address: '',
      phone: '',
      email: '',
      registration_number: '',
      currency_symbol: '$',
      country: '',
    };
    const ctx = buildTicketEmailContext(ticket, payments, additionalNote);
    setEmailBody(selectedTemplate.html(ctx, shop));
  }, [selectedTemplate, ticket, shopSettings, payments, additionalNote]);

  const handleSendEmail = async () => {
    if (!emailTo.trim()) { toast.error('Introduce el email del destinatario'); return; }
    setSendingEmail(true);
    await new Promise(r => setTimeout(r, 1000));
    const { data: { user } } = await supabase.auth.getUser();
    if (user && ticket) {
      const authorTag = formatActivityAuthorLabel({
        userId: user.id,
        emailFallback: user.email?.split('@')[0] || 'Técnico',
        roleByUserId: commentUserRoleById,
        displayNameByUserId: commentUserDisplayNameById,
      });
      await (supabase as any).from('ticket_comments').insert([{
        ticket_id: ticket.id,
        user_id: user.id,
        author_name: authorTag,
        content: `Email enviado a ${emailTo}: "${emailSubject}"${additionalNote ? '\n\nNota adicional: ' + additionalNote : ''}`,
        is_private: false,
        comment_type: 'email_sms',
      }]);
      loadComments();
    }
    setSendingEmail(false);
    toast.success('Email enviado correctamente');
    setEmailPreview(false);
  };

  const openWhatsAppModal = (overrideMessage?: string) => {
    if (!ticket) return;
    const phone = ticket.customers?.phone?.trim();
    if (!phone) {
      toast.error('El cliente no tiene teléfono en la ficha o el número no es válido para WhatsApp');
      return;
    }
    const equipo = whatsappDeviceSummaryLine({
      deviceCategory: ticket.device_category,
      deviceType: ticket.device_type,
      deviceBrand: ticket.device_brand,
      deviceModel: ticket.device_model,
    });
    const fallback = equipo
      ? rc.teEscriboConEquipo(ticket.ticket_number, equipo)
      : rc.teEscriboSolo(ticket.ticket_number);
    setWaModal({
      open: true,
      defaultMessage: (overrideMessage?.trim() || fallback).trim(),
    });
  };

  const runTicketInvoiceVerification = useCallback(
    async (opts?: { quietSuccess?: boolean; arInternalInvoice?: boolean }): Promise<boolean> => {
      if (!ticket) return false;
      setVerifying(true);
      setInvoiceVerifyErrors([]);
      try {
        const errs: string[] = [];
        const cust = ticket.customers;
        const taxId =
          (ticket as { customer_fiscal_id_ar?: string | null }).customer_fiscal_id_ar?.trim() ||
          cust?.id_number?.trim() ||
          '';
        const ivaCond =
          (ticket as { customer_iva_condition_ar?: string | null }).customer_iva_condition_ar?.trim() ||
          (cust as { tax_class?: string | null } | null)?.tax_class?.trim() ||
          '';
        const addr = [cust?.address, cust?.city, cust?.postal_code]
          .map((x) => (x ? String(x).trim() : ''))
          .filter(Boolean)
          .join(', ');
        errs.push(...validateBillingIdentity(taxId, addr));
        if (isArgentinaUi && !opts?.arInternalInvoice) {
          errs.push(...validateArgentinaIvaCondition(ivaCond));
        }

        const total = Number(ticket.final_cost ?? ticket.estimated_cost ?? 0);
        if (!Number.isFinite(total) || total <= 0) {
          errs.push(rc.importeMayorCero);
        }

        const draftLines = [
          {
            description: `${ticket.device_type} — ${(ticket.issue_description || 'Reparación').slice(0, 120)}`,
            quantity: 1,
            unitPrice: total,
          },
        ];
        const { errors: lineErrs } = validateDraftLines(draftLines);
        errs.push(...lineErrs);

        errs.push(...validateTicketPartsStock(parts));

        if (errs.length) {
          setInvoiceVerifyErrors(errs);
          setInvoiceVerified(false);
          toast.error('La verificación de factura encontró incidencias');
          return false;
        }
        setInvoiceVerifyErrors([]);
        setInvoiceVerified(true);
        if (!opts?.quietSuccess) {
          toast.success('Verificación correcta: listo para crear la factura');
        }
        return true;
      } finally {
        setVerifying(false);
      }
    },
    [ticket, parts, rc, isArgentinaUi]
  );

  useEffect(() => {
    setInvoiceVerified(false);
    setInvoiceVerifyErrors([]);
  }, [
    ticket?.id,
    ticket?.final_cost,
    ticket?.estimated_cost,
    ticket?.customers?.id_number,
    (ticket as { customer_fiscal_id_ar?: string | null } | null)?.customer_fiscal_id_ar,
    (ticket as { customer_iva_condition_ar?: string | null } | null)?.customer_iva_condition_ar,
    (ticket?.customers as { tax_class?: string | null } | null)?.tax_class,
    ticket?.customers?.address,
    parts,
    isArgentinaUi,
  ]);

  const handleCreateInvoice = async () => {
    if (!ticket) return;

    if (!(await runTicketInvoiceVerification({ quietSuccess: true }))) {
      return;
    }

    setCreatingInvoice(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión');
        return;
      }

      // Usa la misma lógica que el bloque de impresión: IVA solo si apply_iva === true
      const baseTotal = ticket.final_cost || ticket.estimated_cost || 0;
      const TAX_RATE = 0.21;
      const applyIva = ticket.apply_iva === true;
      const taxAmount = applyIva ? baseTotal * TAX_RATE : 0;
      const subtotal = applyIva ? baseTotal : baseTotal;   // base sin IVA = mismo en ambos casos
      const totalAmount = applyIva ? baseTotal * (1 + TAX_RATE) : baseTotal;

      const cust = ticket.customers;
      const fiscalIdAr =
        (ticket as { customer_fiscal_id_ar?: string | null }).customer_fiscal_id_ar?.trim() ||
        cust?.id_number?.trim() ||
        '';
      const ivaCondAr =
        (ticket as { customer_iva_condition_ar?: string | null }).customer_iva_condition_ar?.trim() ||
        (cust as { tax_class?: string | null } | null)?.tax_class?.trim() ||
        null;
      const billingAddr = [cust?.address, cust?.city, cust?.postal_code]
        .map((x) => (x ? String(x).trim() : ''))
        .filter(Boolean)
        .join(', ');

      const { data: invoice, error: invoiceError } = await (supabase as any)
        .from('invoices')
        .insert({
          shop_owner_id: user.id,
          organization_id: ticket.organization_id ?? null,
          ticket_id: ticket.id,
          customer_id: ticket.customer_id,
          customer_name: ticket.customers?.name || 'Cliente',
          customer_email: ticket.customers?.email,
          customer_phone: ticket.customers?.phone,
          customer_tax_id: fiscalIdAr || null,
          customer_billing_address: billingAddr || null,
          customer_iva_condition_ar: isArgentinaUi ? ivaCondAr : null,
          billing_jurisdiction: 'AR',
          subtotal: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'draft',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      await (supabase as any).from('invoice_items').insert({
        invoice_id: invoice.id,
        description: `${ticket.device_type} - ${ticket.issue_description?.substring(0, 100)}`,
        quantity: 1,
        unit_price: subtotal,
        total_price: totalAmount,
      });

      toast.success(`Factura ${invoice.invoice_number} creada correctamente`);
      void loadInvoices();

      const shop = shopSettings;
      const ledgerDraft = await fetchRepairTicketPaymentLedgerForPrint(supabase, ticket.id);
      const payload: InvoicePrintPayload = {
        invoice: {
          invoice_number: String(invoice.invoice_number),
          created_at: invoice.created_at,
          customer_name: String(invoice.customer_name || ''),
          customer_email: invoice.customer_email,
          customer_phone: invoice.customer_phone,
          subtotal: Number(invoice.subtotal ?? subtotal),
          discount_amount: Number(invoice.discount_amount ?? 0),
          tax_amount: Number(invoice.tax_amount ?? taxAmount),
          total_amount: Number(invoice.total_amount ?? totalAmount),
          notes: invoice.notes,
          due_date: invoice.due_date,
          payment_method: invoice.payment_method,
          ticket_warranty_summary: formatTicketWarrantySummaryForPrint({
            warranty_start_date: ticket.warranty_start_date,
            warranty_end_date: ticket.warranty_end_date,
            warranty_info: ticket.warranty_info,
          }),
          payment_ledger: ledgerDraft.length ? ledgerDraft : undefined,
        },
        lines: [
          {
            description: `${ticket.device_type} - ${(ticket.issue_description || 'Reparación').substring(0, 100)}`,
            quantity: 1,
            unit_price: baseTotal,
            total_price: totalAmount,
          },
        ],
        shop: {
          shop_name: shop?.shop_name?.trim() || 'Mi Taller',
          address: shop?.address,
          phone: shop?.phone,
          email: shop?.email,
          registration_number: shop?.registration_number,
          currency_symbol: shop?.currency_symbol,
          logo_url: shop?.logo_url || null,
          footer_text: shop?.footer_text || null,
          terms_text_es: (shop as any)?.terms_text_es || null,
          terms_text_ar: (shop as any)?.terms_text_ar || null,
          invoice_show_terms: Boolean((shop as any)?.invoice_show_terms),
        },
      };
      const htmlDoc = buildInvoicePrintFullHtmlDocument(payload);
      const preferQz = Boolean(shop?.qz_tray_direct_invoice_print);
      const qzConnect = shopRowToQzConnect(shop);

      setInvoicePdfBusy(true);
      try {
        await deliverInvoiceDocument({
          invoiceId: invoice.id,
          htmlDocumentForQz: htmlDoc,
          preferQz,
          qzConnect,
        });
      } finally {
        setInvoicePdfBusy(false);
      }
    } catch (error: any) {
      toast.error('Error al crear factura: ' + (error.message || 'Error desconocido'));
    } finally {
      setCreatingInvoice(false);
    }
  };

  /**
   * Flujo completo de cobro:
   * 1. Argentina con credenciales ARCA: crea factura → CAE en AFIP → ticket pagado → pago (con invoice_id).
   * 2. Otros: ticket pagado → pago → factura (flujo histórico).
   * 3. Abre cajón si corresponde e imprime la factura (con QR AFIP si hay CAE).
   */
  const handleProcessPayment = async (result: PaymentResult) => {
    if (!ticket) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Debes iniciar sesión'); return; }

    const allowAfipOptional = Boolean(shopSettings?.ar_allow_invoice_without_afip);
    const useInternalArInvoice = isArgentinaUi && allowAfipOptional && result.invoiceWithoutAfip === true;

    const amountTotal = result.amount;
    const methodLabel: Record<string, string> = {
      cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', combined: 'Pago combinado',
    };

    const existingInvoicePre = invoices.find((inv) => inv.ticket_id === ticket.id);
    if (!existingInvoicePre) {
      const ok = await runTicketInvoiceVerification({
        quietSuccess: true,
        arInternalInvoice: useInternalArInvoice,
      });
      if (!ok) return;
    }

    const baseTotal = ticket.final_cost || ticket.estimated_cost || 0;
    const applyIva = ticket.apply_iva === true;
    const TAX_RATE = 0.21;
    const taxAmount = applyIva ? baseTotal * TAX_RATE : 0;
    const totalAmount = applyIva ? baseTotal * (1 + TAX_RATE) : baseTotal;
    const cust = ticket.customers;
    const fiscalIdAr =
      (ticket as { customer_fiscal_id_ar?: string | null }).customer_fiscal_id_ar?.trim() ||
      cust?.id_number?.trim() ||
      '';
    const ivaCondAr =
      (ticket as { customer_iva_condition_ar?: string | null }).customer_iva_condition_ar?.trim() ||
      (cust as { tax_class?: string | null } | null)?.tax_class?.trim() ||
      null;
    const billingAddr = [cust?.address, cust?.city, cust?.postal_code].filter(Boolean).join(', ');

    const sumCompletedTicketPayments = (rows: Payment[]) =>
      rows.reduce((acc, p) => {
        const st = String((p as { status?: string }).status ?? 'completed').toLowerCase();
        if (st !== 'completed') return acc;
        return acc + Number(p.amount || 0);
      }, 0);

    const depositAmt = Number((ticket as { deposit_amount?: number | null }).deposit_amount || 0);
    const sumPayBefore = sumCompletedTicketPayments(payments);
    let creditedBefore = Math.min(totalAmount, sumPayBefore + depositAmt);
    const invoiceForPaidFallback = invoices.find((inv) => inv.ticket_id === ticket.id);
    if (creditedBefore < 0.01 && invoiceForPaidFallback) {
      const pa = Number((invoiceForPaidFallback as { paid_amount?: number }).paid_amount || 0);
      if (pa > 0.01) creditedBefore = Math.min(totalAmount, pa);
    }
    const outstandingBefore = Math.max(0, Math.round((totalAmount - creditedBefore) * 100) / 100);
    if (!Number.isFinite(amountTotal) || amountTotal <= 0) {
      toast.error('Importe a cobrar inválido.');
      return;
    }
    if (amountTotal > outstandingBefore + 0.02) {
      toast.error(`Solo quedan ${outstandingBefore.toFixed(2)} por cobrar en esta orden.`);
      return;
    }
    const newPaidTotal = Math.min(totalAmount, creditedBefore + amountTotal);
    const isFullyPaidNow = newPaidTotal >= totalAmount - 0.02;
    const invPaymentStatus: 'paid' | 'partial' = isFullyPaidNow ? 'paid' : 'partial';

    const rollbackArInvoice = async (invId: string) => {
      await (supabase as any).from('invoice_items').delete().eq('invoice_id', invId);
      await (supabase as any).from('invoices').delete().eq('id', invId);
    };

    const callArcaAuthorize = async (
      invId: string
    ): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> => {
      const { data: { session } } = await supabase.auth.getSession();
      const t = session?.access_token;
      if (!t) return { ok: false, error: 'Sesión expirada. Volvé a iniciar sesión e intentá de nuevo.' };
      let res: Response;
      try {
        res = await fetch('/api/dashboard/invoices/arca-authorize', {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: invId }),
        });
      } catch {
        return {
          ok: false,
          error:
            'No se pudo contactar al servidor para autorizar el comprobante en ARCA. Revisá tu conexión e intentá de nuevo.',
        };
      }
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        skipped?: boolean;
        ar_cae?: string | null;
      };
      if (!res.ok) {
        return {
          ok: false,
          error: String(
            j.error ||
              (res.status >= 500
                ? 'El servidor no pudo completar la autorización en ARCA. Intentá de nuevo en unos minutos.'
                : 'No se pudo autorizar el comprobante en ARCA.')
          ),
        };
      }
      return { ok: true, data: j as Record<string, unknown> };
    };

    try {
      let invoiceId: string | null = null;
      const existingInvoice = invoices.find((inv: any) => inv.ticket_id === ticket.id);

      if (isArgentinaUi) {
        if (!existingInvoice) {
          const { data: newInv, error: invErr } = await (supabase as any).from('invoices').insert({
            shop_owner_id: user.id,
            organization_id: ticket.organization_id ?? null,
            ticket_id: ticket.id,
            customer_id: ticket.customer_id,
            customer_name: cust?.name || 'Cliente',
            customer_email: cust?.email,
            customer_phone: cust?.phone,
            customer_tax_id: fiscalIdAr || null,
            customer_billing_address: billingAddr || null,
            customer_iva_condition_ar: ivaCondAr,
            ar_internal_only: useInternalArInvoice,
            billing_jurisdiction: 'AR',
            subtotal: baseTotal,
            discount_amount: 0,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'issued',
            payment_status: invPaymentStatus,
            paid_amount: newPaidTotal,
            paid_at: isFullyPaidNow ? new Date().toISOString() : null,
            payment_method: result.method,
          }).select().single();
          if (invErr || !newInv?.id) throw invErr || new Error('No se pudo crear la factura');
          invoiceId = newInv.id as string;
          const { error: itemErr } = await (supabase as any).from('invoice_items').insert({
            invoice_id: invoiceId,
            description: `${ticket.device_type ?? ''} — ${(ticket.issue_description || 'Reparación').substring(0, 120)}`,
            quantity: 1,
            unit_price: baseTotal,
            total_price: totalAmount,
          });
          if (itemErr) {
            await rollbackArInvoice(invoiceId);
            throw itemErr;
          }
          if (!useInternalArInvoice) {
            const ar = await callArcaAuthorize(invoiceId);
            if (!ar.ok) {
              await rollbackArInvoice(invoiceId);
              throw new Error(ar.error);
            }
            if (!ar.data.skipped && !String(ar.data.ar_cae || '').trim()) {
              await rollbackArInvoice(invoiceId);
              throw new Error(
                'ARCA/AFIP no devolvió el CAE. Revisá en Ajustes el certificado, el CUIT del taller, el punto de venta y que el cliente tenga datos fiscales correctos.'
              );
            }
          }
        } else {
          invoiceId = existingInvoice.id;
          const hadCae = String((existingInvoice as { ar_cae?: string | null }).ar_cae || '').trim();
          if (!hadCae) {
            if (useInternalArInvoice) {
              const { error: upIntErr } = await (supabase as any)
                .from('invoices')
                .update({ ar_internal_only: true })
                .eq('id', invoiceId);
              if (upIntErr) throw upIntErr;
            } else {
              const ar = await callArcaAuthorize(invoiceId);
              if (!ar.ok) throw new Error(ar.error);
              if (!ar.data.skipped && !String(ar.data.ar_cae || '').trim()) {
                throw new Error(
                  'ARCA/AFIP no devolvió el CAE. Revisá en Ajustes el certificado, el CUIT del taller y el punto de venta.'
                );
              }
            }
          }
          const { error: upInvErr } = await (supabase as any)
            .from('invoices')
            .update({
              payment_method: result.method,
              payment_status: invPaymentStatus,
              status: 'issued',
              paid_amount: newPaidTotal,
              paid_at: isFullyPaidNow ? new Date().toISOString() : (existingInvoice as { paid_at?: string | null }).paid_at ?? null,
            })
            .eq('id', invoiceId);
          if (upInvErr) throw upInvErr;
        }

        const { error: ticketErr } = await (supabase as any)
          .from('repair_tickets')
          .update({
            payment_status: invPaymentStatus,
            payment_method: result.method,
            status: ticket.status === 'repaired' && isFullyPaidNow ? 'delivered' : ticket.status,
          })
          .eq('id', ticket.id);
        if (ticketErr) throw ticketErr;

        const { error: payInsErr } = await (supabase as any).from('payments').insert({
          ticket_id: ticket.id,
          shop_owner_id: user.id,
          organization_id: ticket.organization_id ?? null,
          invoice_id: invoiceId,
          amount: amountTotal,
          payment_method: result.method,
          cash_received: result.cashReceived ?? null,
          change_given: result.change ?? null,
          status: 'completed',
        });
        if (payInsErr) throw payInsErr;
      } else {
        const { error: ticketErr } = await (supabase as any)
          .from('repair_tickets')
          .update({
            payment_status: invPaymentStatus,
            payment_method: result.method,
            status: ticket.status === 'repaired' && isFullyPaidNow ? 'delivered' : ticket.status,
          })
          .eq('id', ticket.id);
        if (ticketErr) throw ticketErr;

        const { data: payInserted, error: payInsErr } = await (supabase as any)
          .from('payments')
          .insert({
            ticket_id: ticket.id,
            shop_owner_id: user.id,
            organization_id: ticket.organization_id ?? null,
            amount: amountTotal,
            payment_method: result.method,
            cash_received: result.cashReceived ?? null,
            change_given: result.change ?? null,
            status: 'completed',
          })
          .select('id')
          .single();
        if (payInsErr) throw payInsErr;
        const paymentRowId = payInserted?.id as string | undefined;

        if (existingInvoice) {
          invoiceId = existingInvoice.id;
          await (supabase as any)
            .from('invoices')
            .update({
              payment_method: result.method,
              payment_status: invPaymentStatus,
              status: 'issued',
              paid_amount: newPaidTotal,
              paid_at: isFullyPaidNow ? new Date().toISOString() : (existingInvoice as { paid_at?: string | null }).paid_at ?? null,
            })
            .eq('id', invoiceId);
        } else {
          const { data: newInv, error: invErr } = await (supabase as any).from('invoices').insert({
            shop_owner_id: user.id,
            organization_id: ticket.organization_id ?? null,
            ticket_id: ticket.id,
            customer_id: ticket.customer_id,
            customer_name: cust?.name || 'Cliente',
            customer_email: cust?.email,
            customer_phone: cust?.phone,
            customer_tax_id: fiscalIdAr || null,
            customer_billing_address: billingAddr || null,
            customer_iva_condition_ar: null,
            ar_internal_only: false,
            billing_jurisdiction: 'AR',
            subtotal: baseTotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'issued',
            payment_status: invPaymentStatus,
            paid_amount: newPaidTotal,
            paid_at: isFullyPaidNow ? new Date().toISOString() : null,
            payment_method: result.method,
          }).select().single();
          if (invErr) console.warn('[payment] factura no creada:', invErr.message);
          else {
            invoiceId = newInv?.id ?? null;
            if (invoiceId) {
              await (supabase as any).from('invoice_items').insert({
                invoice_id: invoiceId,
                description: `${ticket.device_type ?? ''} — ${(ticket.issue_description || 'Reparación').substring(0, 120)}`,
                quantity: 1,
                unit_price: baseTotal,
                total_price: totalAmount,
              });
            }
          }
        }

        if (invoiceId && paymentRowId) {
          const { error: linkErr } = await (supabase as any)
            .from('payments')
            .update({ invoice_id: invoiceId })
            .eq('id', paymentRowId);
          if (linkErr) console.warn('[payment] no se pudo enlazar factura al cobro:', linkErr.message);
        }
      }

      if (invoiceId) {
        await syncRepairTicketWarrantyAfterInvoice(ticket);
      }

      let warrantyForPrint = {
        warranty_start_date: ticket.warranty_start_date,
        warranty_end_date: ticket.warranty_end_date,
        warranty_info: ticket.warranty_info,
      };
      if (invoiceId && ticket.id) {
        const { data: wRow } = await (supabase as any)
          .from('repair_tickets')
          .select('warranty_start_date, warranty_end_date, warranty_info')
          .eq('id', ticket.id)
          .maybeSingle();
        if (wRow) warrantyForPrint = wRow;
      }

      toast.success(
        result.method === 'cash' && result.change != null && result.change > 0
          ? `✅ Cobrado. Cambio: ${shopSettings?.currency_symbol ?? '$'}${result.change.toFixed(2)}`
          : `✅ Cobrado correctamente (${methodLabel[result.method] ?? result.method})`
      );
      setShowPaymentModal(false);
      if (invoiceId) {
        await syncInvoiceTotalsFromTicket(supabase, invoiceId, ticket.id);
      }
      await Promise.all([loadTicket(), loadInvoices(), loadPayments()]);

      if (result.method === 'cash' && myPerms.can_open_drawer && shopSettings?.qz_tray_direct_invoice_print) {
        const qzConn = shopSettingsToQzConnect(shopSettings);
        openCashDrawer(qzConn).then((r) => {
          if (!r.ok) console.warn('[drawer]', r.message);
        });
      }

      if (invoiceId && shopSettings) {
        const { data: invPrint } = await (supabase as any)
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .maybeSingle();
        const ledgerPrint = await fetchRepairTicketPaymentLedgerForPrint(supabase, ticket.id);
        const lineDesc = `${ticket.device_type ?? ''} — ${(ticket.issue_description || 'Reparación').substring(0, 120)}`;
        const lineBase = Number(invPrint?.subtotal ?? baseTotal);
        const lineTot = Number(invPrint?.total_amount ?? totalAmount);
        const payload: InvoicePrintPayload = {
          invoice: {
            invoice_number: String(invPrint?.invoice_number ?? invoiceId),
            created_at: String(invPrint?.created_at ?? new Date().toISOString()),
            customer_name: String(invPrint?.customer_name ?? ticket.customers?.name ?? 'Cliente'),
            customer_email: invPrint?.customer_email ?? ticket.customers?.email,
            customer_phone: invPrint?.customer_phone ?? ticket.customers?.phone,
            customer_tax_id: (invPrint?.customer_tax_id ?? fiscalIdAr) || null,
            customer_iva_condition_ar: invPrint?.customer_iva_condition_ar ?? (isArgentinaUi ? ivaCondAr : null),
            customer_billing_address: (invPrint?.customer_billing_address ?? billingAddr) || null,
            subtotal: Number(invPrint?.subtotal ?? baseTotal),
            discount_amount: Number(invPrint?.discount_amount ?? 0),
            tax_amount: Number(invPrint?.tax_amount ?? taxAmount),
            total_amount: Number(invPrint?.total_amount ?? totalAmount),
            paid_amount: Number(invPrint?.paid_amount ?? newPaidTotal),
            payment_method: result.method,
            billing_jurisdiction: 'AR',
            ar_cae: invPrint?.ar_cae ?? null,
            ar_cae_expires_at: invPrint?.ar_cae_expires_at ?? null,
            ar_cbte_tipo: invPrint?.ar_cbte_tipo != null ? Number(invPrint.ar_cbte_tipo) : null,
            ar_punto_venta: invPrint?.ar_punto_venta != null ? Number(invPrint.ar_punto_venta) : null,
            ar_numero_cbte: invPrint?.ar_numero_cbte != null ? Number(invPrint.ar_numero_cbte) : null,
            ar_cuit_emisor: invPrint?.ar_cuit_emisor ?? null,
            ar_internal_only: Boolean(invPrint?.ar_internal_only),
            ticket_warranty_summary: formatTicketWarrantySummaryForPrint(warrantyForPrint),
            payment_ledger: ledgerPrint.length ? ledgerPrint : undefined,
          },
          lines: [
            {
              description: lineDesc,
              quantity: 1,
              unit_price: lineBase,
              total_price: lineTot,
            },
          ],
          shop: {
            shop_name: shopSettings.shop_name?.trim() || 'Mi Taller',
            address: shopSettings.address,
            phone: shopSettings.phone,
            email: shopSettings.email,
            registration_number: shopSettings.registration_number,
            currency_symbol: shopSettings.currency_symbol,
            iva_condition: (shopSettings as any).iva_condition ?? null,
            logo_url: (shopSettings as any).logo_url || null,
            footer_text: (shopSettings as any).footer_text || null,
            terms_text_es: (shopSettings as any).terms_text_es || null,
            terms_text_ar: (shopSettings as any).terms_text_ar || null,
            invoice_show_terms: Boolean((shopSettings as any).invoice_show_terms),
          },
        };
        const htmlDoc = buildInvoicePrintFullHtmlDocument(payload);
        const qzConnect = shopRowToQzConnect(shopSettings);
        await deliverInvoiceDocument({
          invoiceId,
          htmlDocumentForQz: htmlDoc,
          preferQz: Boolean(shopSettings.qz_tray_direct_invoice_print),
          qzConnect,
        });
      }
    } catch (e: any) {
      const msg = e?.message || 'No se pudo completar el cobro.';
      toast.error(isArgentinaUi ? `Cobro anulado — ${msg}` : `Error al procesar el cobro: ${msg}`);
    }
  };

  // Funciones para guardar secciones
  const searchRepuestos = async (query: string) => {
    setRepuestoSearchLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRepuestoResults([]);
        return;
      }
      let req = (supabase as any)
        .from('products')
        .select('id, name, sku, upc, quantity, unit_cost, price, supplier')
        .order('name', { ascending: true })
        .limit(40);
      const q = query.trim();
      if (q) {
        req = req.or(`name.ilike.%${q}%,sku.ilike.%${q}%,upc.ilike.%${q}%`);
      }
      const { data, error } = await req;
      if (error) throw error;
      setRepuestoResults(data || []);
    } catch (e: any) {
      console.error('[searchRepuestos]', e);
      toast.error(e?.message || 'No se pudo cargar el inventario');
      setRepuestoResults([]);
    } finally {
      setRepuestoSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!showRepuestoModal) return;
    const t = window.setTimeout(() => {
      void searchRepuestos(repuestoSearch);
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search when query/modal changes
  }, [repuestoSearch, showRepuestoModal]);

  const resetRepuestoModal = () => {
    setShowRepuestoModal(false);
    setRepuestoSearch('');
    setRepuestoResults([]);
    setSelectedRepuesto(null);
    setRepuestoQty(1);
  };

  const handleAddPartFromInventario = async () => {
    if (!ticket || !selectedRepuesto) {
      toast.error('Selecciona un repuesto del inventario');
      return;
    }
    const qty = Math.max(1, repuestoQty);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: stockRow, error: stockErr } = await (supabase as any)
        .from('products')
        .select('id, quantity')
        .eq('id', selectedRepuesto.id)
        .maybeSingle();
      if (stockErr) throw stockErr;
      const stockNow = Number(stockRow?.quantity ?? 0);
      if (stockNow < qty) {
        toast.error('Stock insuficiente en inventario (disponible: ' + stockNow + ')');
        return;
      }

      const uc = Number(selectedRepuesto.unit_cost) || 0;
      const totalCost = qty * uc;
      const row: Record<string, unknown> = {
        ticket_id: ticket.id,
        shop_owner_id: user.id,
        part_name: selectedRepuesto.name,
        part_number: selectedRepuesto.sku || selectedRepuesto.upc || '',
        quantity: qty,
        unit_cost: uc,
        total_cost: totalCost,
        supplier: selectedRepuesto.supplier || '',
        product_id: selectedRepuesto.id,
      };

      const { data: decRows, error: decErr } = await (supabase as any)
        .from('products')
        .update({
          quantity: stockNow - qty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRepuesto.id)
        .gte('quantity', qty)
        .select('id');
      if (decErr) throw decErr;
      if (!decRows?.length) {
        toast.error('No se pudo descontar stock (otro usuario pudo actualizar el inventario). Reintenta.');
        return;
      }

      const { error: insErr } = await (supabase as any).from('ticket_parts').insert(row);
      if (insErr) {
        await (supabase as any)
          .from('products')
          .update({ quantity: stockNow, updated_at: new Date().toISOString() })
          .eq('id', selectedRepuesto.id);
        throw insErr;
      }

      const authorTag = formatActivityAuthorLabel({
        userId: user.id,
        emailFallback: user.email?.split('@')[0] || 'Usuario',
        roleByUserId: commentUserRoleById,
        displayNameByUserId: commentUserDisplayNameById,
      });
      const skuBit = selectedRepuesto.sku || selectedRepuesto.upc;
      const piezaMsg = `**${authorTag}** adjuntó repuesto del inventario: **${selectedRepuesto.name}** (×${qty})${skuBit ? ` · ref. ${skuBit}` : ''}.`;
      await (supabase as any).from('ticket_comments').insert([{
        ticket_id: ticket.id,
        user_id: user.id,
        author_name: authorTag,
        content: piezaMsg,
        is_private: false,
        comment_type: 'pieza',
      }]);
      loadComments();

      toast.success('Repuesto añadido y stock actualizado');
      resetRepuestoModal();
      loadParts();
    } catch (error: any) {
      const msg = String(error?.message || error || '');
      toast.error(
        msg.includes('product_id') || (msg.includes('column') && msg.includes('product'))
          ? 'En Supabase ejecuta el SQL de supabase/migrations/202604023800_ticket_parts_product_id.sql (columna product_id y políticas RLS).'
          : 'Error: ' + (msg || 'desconocido')
      );
    }
  };

  const handleDeletePart = async (partId: string) => {
    const part = parts.find((p) => p.id === partId);
    try {
      await (supabase as any).from('ticket_parts').delete().eq('id', partId);
      if (part?.product_id && part.quantity > 0) {
        const { data: prod } = await (supabase as any)
          .from('products')
          .select('quantity')
          .eq('id', part.product_id)
          .maybeSingle();
        const cur = Number(prod?.quantity ?? 0);
        await (supabase as any)
          .from('products')
          .update({
            quantity: cur + part.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', part.product_id);
      }
      toast.success('Pieza eliminada');
      loadParts();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleSaveConditions = async (type: 'pre' | 'post', conditions: Partial<TicketCondition>) => {
    if (!ticket) return;
    setSavingConditions(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const existing = type === 'pre' ? preConditions : postConditions;
      if (existing) {
        await (supabase as any).from('ticket_conditions').update(conditions).eq('id', existing.id);
      } else {
        await (supabase as any).from('ticket_conditions').insert({
          ticket_id: ticket.id,
          shop_owner_id: user.id,
          condition_type: type,
          ...conditions,
        });
      }
      toast.success('Condiciones guardadas');
      loadConditions();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setSavingConditions(false);
    }
  };

  const handleSaveAccessories = async (updatedAccessories: Partial<TicketAccessories>) => {
    if (!ticket || !accessories) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (accessories.id) {
        await (supabase as any).from('ticket_accessories').update(updatedAccessories).eq('id', accessories.id);
      } else {
        await (supabase as any).from('ticket_accessories').insert({
          ticket_id: ticket.id,
          shop_owner_id: user.id,
          ...updatedAccessories,
        });
      }
      toast.success('Accesorios actualizados');
      loadAccessories();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pre' | 'post' | 'micro') => {
    if (!ticket || !e.target.files || e.target.files.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const microOnTicket = images.filter((i) => i.image_type === 'microscopio').length;
      const rawFiles = Array.from(e.target.files);
      const files =
        type === 'micro' ? rawFiles.slice(0, Math.max(0, 3 - microOnTicket)) : rawFiles;

      if (type === 'micro' && files.length === 0) {
        toast.error('Ya hay 3 fotos de microscopio en este ticket.');
        e.target.value = '';
        return;
      }
      if (type === 'micro' && rawFiles.length > files.length) {
        toast.message('Máximo 3 fotos de microscopio en total: se omitieron archivos de más.');
      }

      let uploaded = 0;
      let nextMicroIndex = microOnTicket;

      for (const file of files) {
        try {
          const prefix = type === 'pre' ? 'pre' : type === 'post' ? 'post' : 'microscopio';
          const storagePath = await uploadTicketImage(
            supabase as any,
            ticket.id,
            user.id,
            file,
            prefix,
          );

          const image_type =
            type === 'pre' ? 'pre_repair' : type === 'post' ? 'post_repair' : 'microscopio';
          const description =
            type === 'pre'
              ? 'Foto previa'
              : type === 'post'
                ? 'Foto posterior'
                : `Microscopio (evidencia ${nextMicroIndex + 1} de 3)`;
          if (type === 'micro') nextMicroIndex += 1;

          await (supabase as any).from('ticket_images').insert({
            ticket_id: ticket.id,
            shop_owner_id: user.id,
            image_type,
            image_url: storagePath,
            thumbnail_url: storagePath,
            file_name: file.name,
            file_size: file.size,
            description,
          });
          uploaded++;
        } catch (fileErr: any) {
          toast.error(`Error con ${file.name}: ${fileErr.message}`);
        }
      }

      e.target.value = '';
      if (uploaded > 0) {
        toast.success(`${uploaded} imagen(es) subida(s) correctamente`);
        loadImages();
      }
    } catch (error: any) {
      toast.error('Error subiendo imágenes: ' + error.message);
    }
  };

  const flushMicroscopeWebcam = async () => {
    if (!ticket || microscopeWebcamFiles.length === 0) return;
    setUploadingMicroscope(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let microOnTicket = images.filter((i) => i.image_type === 'microscopio').length;
      let uploaded = 0;
      for (const file of microscopeWebcamFiles) {
        if (microOnTicket >= 3) {
          toast.error('Ya hay 3 fotos de microscopio en este ticket.');
          break;
        }
        const storagePath = await uploadTicketImage(
          supabase as any,
          ticket.id,
          user.id,
          file,
          'microscopio',
        );
        await (supabase as any).from('ticket_images').insert({
          ticket_id: ticket.id,
          shop_owner_id: user.id,
          image_type: 'microscopio',
          image_url: storagePath,
          thumbnail_url: storagePath,
          file_name: file.name,
          file_size: file.size,
          description: `Microscopio (evidencia ${microOnTicket + 1} de 3)`,
        });
        microOnTicket += 1;
        uploaded += 1;
      }
      setMicroscopeWebcamFiles([]);
      if (uploaded > 0) {
        toast.success(
          uploaded === 1 ? 'Foto de microscopio guardada' : `${uploaded} fotos de microscopio guardadas`,
        );
        loadImages();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error al subir las capturas');
    } finally {
      setUploadingMicroscope(false);
    }
  };

  const handleUploadAttachments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ticket || !e.target.files?.length) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const files = Array.from(e.target.files);
      let uploaded = 0;
      for (const file of files) {
        try {
          const storagePath = await uploadTicketImage(
            supabase as any,
            ticket.id,
            user.id,
            file,
            'attach',
          );
          await (supabase as any).from('ticket_images').insert({
            ticket_id: ticket.id,
            shop_owner_id: user.id,
            image_type: 'attachment',
            image_url: storagePath,
            thumbnail_url: storagePath,
            file_name: file.name,
            file_size: file.size,
            description: `Adjunto: ${file.name}`,
          });
          uploaded++;
        } catch (fileErr: any) {
          toast.error(`Error con ${file.name}: ${fileErr.message}`);
        }
      }
      e.target.value = '';
      if (uploaded > 0) {
        toast.success(uploaded === 1 ? 'Archivo adjuntado' : `${uploaded} archivos adjuntados`);
        loadImages();
      }
    } catch (error: any) {
      toast.error('Error subiendo archivos: ' + error.message);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await (supabase as any).from('ticket_images').delete().eq('id', imageId);
      toast.success('Eliminado');
      loadImages();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const loadDeviceHistory = async (t: Ticket) => {
    const imei = t.imei?.trim() ?? '';
    const serial = t.serial_number?.trim() ?? '';
    if (!imei && !serial) { setDeviceHistoryLoaded(true); return; }
    try {
      const params = new URLSearchParams();
      if (imei) params.set('imei', imei);
      if (serial && serial !== imei) params.set('serial', serial);
      params.set('exclude', t.id);
      const res = await fetch(`/api/dashboard/device-history?${params.toString()}`);
      if (!res.ok) { setDeviceHistoryLoaded(true); return; }
      const json = await res.json() as { tickets: DeviceHistoryTicket[] };
      setDeviceHistory(json.tickets ?? []);
    } catch { /* silencioso */ }
    finally { setDeviceHistoryLoaded(true); }
  };

  const openDeviceLockModal = () => {
    if (!ticket) return;
    const { pin, pattern } = parseStoredAccessCredentials(ticket.pin_pattern);
    setDeviceLockPin(pin);
    setDeviceLockPattern(pattern);
    setDeviceLockFormKey((k) => k + 1);
    setDeviceLockModalOpen(true);
  };

  const handleSaveDeviceLock = async () => {
    if (!ticket) return;
    setSavingDeviceLock(true);
    const composed = composeAccessCredentials(deviceLockPin, deviceLockPattern);
    try {
      const { error } = await (supabase as any)
        .from('repair_tickets')
        .update({ pin_pattern: composed })
        .eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, pin_pattern: composed });
      toast.success('Bloqueo del dispositivo guardado');
      setDeviceLockModalOpen(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo guardar';
      toast.error(msg);
    } finally {
      setSavingDeviceLock(false);
    }
  };

  const loadCustomerOrders = async () => {
    if (!ticket?.customer_id) {
      toast.error('No hay cliente asignado');
      return;
    }
    
    setLoadingCustomerOrders(true);
    setShowCustomerOrders(true);
    
    try {
      const orgId = ticket.organization_id ?? (await getActiveOrganizationId(supabase));
      if (!orgId) {
        toast.error('No se pudo determinar la organización del ticket.');
        return;
      }

      const { data } = await (supabase as any)
        .from('repair_tickets')
        .select('*, customers(name)')
        .eq('customer_id', ticket.customer_id)
        .eq('organization_id', orgId)
        .neq('id', ticket.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setCustomerOrders(data || []);
    } catch (error: any) {
      toast.error('Error al cargar órdenes: ' + error.message);
    } finally {
      setLoadingCustomerOrders(false);
    }
  };

  const loadShopSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: memberData } = await (supabase as any)
        .from('organization_members')
        .select('organization_id, organizations!inner(name, country)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      let settingsUserId = user.id;
      const memberOrgId = memberData?.organization_id as string | undefined;
      if (memberOrgId) {
        const { data: orgRow } = await (supabase as any)
          .from('organizations')
          .select('owner_id')
          .eq('id', memberOrgId)
          .maybeSingle();
        if (orgRow?.owner_id) settingsUserId = orgRow.owner_id as string;
      }

      let { data: settings } = await (supabase as any)
        .from('shop_settings')
        .select('*')
        .eq('user_id', settingsUserId)
        .maybeSingle();

      if (!settings && settingsUserId !== user.id) {
        const fb = await (supabase as any)
          .from('shop_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        settings = fb.data;
      }
      
      const org = memberData?.organizations as any;
      // organizations.name es la fuente de verdad principal; shop_settings es fallback
      const orgName = org?.name?.trim() || '';
      const bestName = orgName || settings?.shop_name || 'Mi Taller';
      setShopSettings({
        shop_name: displayOrgOrShopName(bestName),
        address: settings?.address || '',
        phone: settings?.phone || '',
        email: settings?.email || user.email,
        registration_number: settings?.registration_number || '',
        iva_condition: settings?.iva_condition ?? null,
        currency: settings?.currency || 'ARS',
        currency_symbol: settings?.currency_symbol || '$',
        country: org?.country || '',
        ticket_repairs_settings: (settings as { ticket_repairs_settings?: unknown } | null)
          ?.ticket_repairs_settings,
        qz_tray_port: (settings as { qz_tray_port?: number }).qz_tray_port ?? 8182,
        qz_tray_using_secure: Boolean((settings as { qz_tray_using_secure?: boolean }).qz_tray_using_secure),
        qz_tray_certificate_pem: (settings as { qz_tray_certificate_pem?: string | null }).qz_tray_certificate_pem ?? null,
        qz_tray_direct_invoice_print: Boolean(
          (settings as { qz_tray_direct_invoice_print?: boolean }).qz_tray_direct_invoice_print
        ),
        ar_allow_invoice_without_afip: Boolean(
          (settings as { ar_allow_invoice_without_afip?: boolean }).ar_allow_invoice_without_afip
        ),
      });
    } catch (error) {
      console.error('Error loading shop settings:', error);
      setShopSettings({
        shop_name: 'Mi Taller',
        address: '',
        phone: '',
        email: '',
        registration_number: '',
        currency_symbol: '$',
        country: '',
      });
    }
  };

  const labelTemplateId = useMemo(
    () => parseTicketRepairsSettings(shopSettings?.ticket_repairs_settings).label_template,
    [shopSettings?.ticket_repairs_settings]
  );

  const labelPrintData = useMemo(() => {
    if (!ticket) return null;
    return buildTicketLabelPrintData({
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        device_type: ticket.device_type,
        device_brand: ticket.device_brand,
        device_model: ticket.device_model,
        issue_description: ticket.issue_description,
        due_date: ticket.due_date,
        priority: ticket.priority,
        is_urgent: ticket.is_urgent,
        customers: ticket.customers,
      },
      shopName: shopSettings?.shop_name || 'Mi Taller',
      shopPhone: shopSettings?.phone,
      shopEmail: shopSettings?.email,
      siteOrigin: typeof window !== 'undefined' ? window.location.origin : getSiteCanonicalUrl(),
    });
  }, [ticket, shopSettings]);

  const formatShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatEntrySummaryDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Ticket no encontrado</p>
        <Link href="/dashboard/tickets" className="text-repairdesk-600 hover:underline text-sm">Volver a tickets</Link>
      </div>
    );
  }

  const currentStatus = getStatusByValue(ticket.status);
  const total = ticket.final_cost || ticket.estimated_cost || 0;
  /** Ticket impreso / Facturación: importe = base; IVA 21 % solo con apply_iva === true (columna por defecto false en BD). */
  const PRINT_TAX_RATE = 0.21;
  const applyIvaEffective = ticket.apply_iva === true;
  const billingIvaAmount = applyIvaEffective ? total * PRINT_TAX_RATE : 0;
  const billingGrandTotal = applyIvaEffective ? total * (1 + PRINT_TAX_RATE) : total;
  const printIvaAmount = billingIvaAmount;
  const printTotalWithTax = billingGrandTotal;

  /** Cobrado real: suma de pagos y/o factura.paid_amount; respaldo ticket pagado. */
  const billingPaidAmount = (() => {
    const depositAmt = Number(ticket.deposit_amount || 0);
    const sumPayments = payments.reduce((acc, p) => {
      const st = String(p.status ?? 'completed').toLowerCase();
      if (st !== 'completed') return acc;
      return acc + Number(p.amount || 0);
    }, 0);
    const inv = invoices.find((i) => i.ticket_id === ticket.id);
    const invPaidAmt = Number((inv as { paid_amount?: number } | undefined)?.paid_amount || 0);
    let paid = Math.min(billingGrandTotal, sumPayments + depositAmt);
    if (invPaidAmt > 0.01) {
      paid = Math.min(billingGrandTotal, Math.max(paid, invPaidAmt));
    }
    if (paid <= 0.01) {
      const invSt = String(inv?.payment_status || '').toLowerCase();
      if (inv && invSt === 'paid') {
        paid = Math.min(
          billingGrandTotal,
          Number(inv.total_amount || 0) > 0 ? Number(inv.total_amount) : billingGrandTotal
        );
      } else if (String(ticket.payment_status || '').toLowerCase() === 'paid') {
        paid = billingGrandTotal;
      }
    }
    return paid;
  })();
  const billingPendingAmount = Math.max(0, billingGrandTotal - billingPaidAmount);
  const collectionDueAmount = Math.max(0, billingPendingAmount);
  const canCollectMore = collectionDueAmount >= 0.01;

  const filteredStatuses = statusSearch ? ALL_STATUSES.filter((s) => s.label.toLowerCase().includes(statusSearch.toLowerCase())) : null;

  const returnPending =
    Boolean(ticket.return_to_customer_note?.trim()) && !ticket.return_to_customer_completed_at;
  const returnCompleted = Boolean(ticket.return_to_customer_completed_at);

  const openReturnModal = () => {
    const done = Boolean(ticket.return_to_customer_completed_at);
    const hasNote = Boolean(ticket.return_to_customer_note?.trim());
    setReturnModalPreserveComplete(done);
    setReturnModalShowForm(!hasNote && !done);
    if (hasNote || done) {
      setReturnDraftNote(ticket.return_to_customer_note?.trim() ?? '');
      setReturnDraftAmount(
        ticket.return_to_customer_amount != null
          ? String(ticket.return_to_customer_amount)
          : ''
      );
      setReturnScenario(ticket.return_scenario?.trim() || 'other');
      setReturnSettlement(ticket.return_settlement_method?.trim() || 'pending');
      setReturnRelatedInvoiceId(ticket.return_related_invoice_id?.trim() || '');
    } else {
      setReturnDraftNote('');
      const fc = ticket.final_cost;
      setReturnDraftAmount(
        fc != null && !Number.isNaN(Number(fc)) ? Number(fc).toFixed(2) : ''
      );
      setReturnScenario('other');
      setReturnSettlement('pending');
      setReturnRelatedInvoiceId('');
    }
    setReturnModalOpen(true);
  };

  const saveReturnDraft = async () => {
    const note = returnDraftNote.trim();
    if (!note) {
      toast.error('Escribe qué hay que devolver al cliente (equipo, dinero, accesorios…).');
      return;
    }
    let amount: number | null = null;
    const rawAmt = returnDraftAmount.trim().replace(',', '.');
    if (rawAmt) {
      const n = parseFloat(rawAmt);
      if (Number.isNaN(n)) {
        toast.error('El importe no es válido.');
        return;
      }
      amount = n;
    }
    const rid = returnRelatedInvoiceId.trim();
    let relatedInvoiceId: string | null = null;
    if (rid) {
      const inList = ticketInvoicesForReturn.some((i) => i.id === rid);
      const sameAsTicket = rid === (ticket.return_related_invoice_id ?? '');
      if (inList || sameAsTicket) relatedInvoiceId = rid;
      else {
        toast.error(rc.eligeFactura);
        return;
      }
    }
    setSavingReturn(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión.');
        return;
      }
      const update: Record<string, unknown> = {
        return_to_customer_note: note,
        return_to_customer_amount: amount,
        return_scenario: returnScenario,
        return_settlement_method: returnSettlement,
        return_related_invoice_id: relatedInvoiceId,
      };
      if (!returnModalPreserveComplete) {
        if (!ticket.return_to_customer_recorded_at) {
          update.return_to_customer_recorded_at = new Date().toISOString();
        }
        update.return_to_customer_completed_at = null;
      }
      const { error } = await (supabase as any)
        .from('repair_tickets')
        .update(update)
        .eq('id', ticket.id);
      if (error) throw error;
      const recordedAt = returnModalPreserveComplete
        ? ticket.return_to_customer_recorded_at ?? null
        : ticket.return_to_customer_recorded_at ??
          (update.return_to_customer_recorded_at as string | undefined) ??
          null;
      const completedAt = returnModalPreserveComplete
        ? ticket.return_to_customer_completed_at ?? null
        : null;
      const syncDelivered = Boolean(returnModalPreserveComplete && completedAt);
      const { error: syncErr, constanciaId } = await syncCustomerReturnConstancia(supabase, {
        repair_ticket_id: ticket.id,
        organization_id: ticket.organization_id ?? null,
        shop_owner_id: ticket.user_id,
        customer_id: ticket.customer_id ?? null,
        related_invoice_id: relatedInvoiceId,
        scenario: returnScenario,
        settlement_method: returnSettlement,
        summary_line: note,
        detail: null,
        amount_money: amount,
        status: syncDelivered ? 'delivered' : 'registered',
        delivered_at: syncDelivered ? completedAt : null,
        created_by_user_id: user.id,
      });
      if (syncErr) {
        toast.error(
          humanizeRepairTicketsSchemaError(syncErr.message) || rc.guardadoConstanciaError
        );
      } else if (constanciaId) {
        setReturnConstanciaId(constanciaId);
      }
      setTicket({
        ...ticket,
        return_to_customer_note: note,
        return_to_customer_amount: amount,
        return_to_customer_recorded_at: recordedAt,
        return_to_customer_completed_at: returnModalPreserveComplete
          ? ticket.return_to_customer_completed_at ?? null
          : null,
        return_scenario: returnScenario,
        return_settlement_method: returnSettlement,
        return_related_invoice_id: relatedInvoiceId,
      } as Ticket);
      toast.success(returnModalPreserveComplete ? 'Texto de devolución actualizado' : 'Devolución registrada');
      setReturnModalOpen(false);
      setReturnModalShowForm(false);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'No se pudo guardar';
      toast.error(humanizeRepairTicketsSchemaError(raw));
    } finally {
      setSavingReturn(false);
    }
  };

  const markReturnCompleted = async () => {
    setSavingReturn(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión.');
        return;
      }
      const ts = new Date().toISOString();
      const { error } = await (supabase as any)
        .from('repair_tickets')
        .update({ return_to_customer_completed_at: ts })
        .eq('id', ticket.id);
      if (error) throw error;
      const note = ticket.return_to_customer_note?.trim() || 'Devolución';
      const { error: syncErr, constanciaId } = await syncCustomerReturnConstancia(supabase, {
        repair_ticket_id: ticket.id,
        organization_id: ticket.organization_id ?? null,
        shop_owner_id: ticket.user_id,
        customer_id: ticket.customer_id ?? null,
        related_invoice_id: ticket.return_related_invoice_id ?? null,
        scenario: ticket.return_scenario?.trim() || 'other',
        settlement_method: ticket.return_settlement_method?.trim() || null,
        summary_line: note,
        detail: null,
        amount_money: ticket.return_to_customer_amount ?? null,
        status: 'delivered',
        delivered_at: ts,
        created_by_user_id: user.id,
      });
      if (syncErr) {
        toast.message(
          humanizeRepairTicketsSchemaError(syncErr.message) ||
            'Marcado como devuelto; constancia no actualizada (revisa migraciones).',
          { duration: 4500 }
        );
      } else if (constanciaId) {
        setReturnConstanciaId(constanciaId);
      }
      setTicket({ ...ticket, return_to_customer_completed_at: ts });
      toast.success('Marcado como devuelto al cliente');
      setReturnModalOpen(false);
      setReturnModalShowForm(false);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'No se pudo actualizar';
      toast.error(humanizeRepairTicketsSchemaError(raw));
    } finally {
      setSavingReturn(false);
    }
  };

  const clearReturnRegistration = async () => {
    if (
      !window.confirm(rc.anularDevolucion)
    )
      return;
    setSavingReturn(true);
    try {
      const { error } = await (supabase as any)
        .from('repair_tickets')
        .update({
          return_to_customer_note: null,
          return_to_customer_amount: null,
          return_to_customer_recorded_at: null,
          return_to_customer_completed_at: null,
          return_scenario: null,
          return_settlement_method: null,
          return_related_invoice_id: null,
        })
        .eq('id', ticket.id);
      if (error) throw error;
      const { error: delErr } = await deleteCustomerReturnConstancia(supabase, ticket.id);
      if (delErr) {
        console.warn('[clearReturn]', delErr);
      }
      setReturnConstanciaId(null);
      setTicket({
        ...ticket,
        return_to_customer_note: null,
        return_to_customer_amount: null,
        return_to_customer_recorded_at: null,
        return_to_customer_completed_at: null,
        return_scenario: null,
        return_settlement_method: null,
        return_related_invoice_id: null,
      });
      toast.message('Registro de devolución eliminado');
      setReturnModalOpen(false);
      setReturnModalShowForm(false);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'No se pudo anular';
      toast.error(humanizeRepairTicketsSchemaError(raw));
    } finally {
      setSavingReturn(false);
    }
  };

  const COMMENT_TABS = [
    { key: 'tareas', label: 'Tareas' },
    { key: 'privados', label: 'Comentarios privados' },
    { key: 'diagnostico', label: 'Notas de diagnóstico' },
    { key: 'email_sms', label: 'Correo y WhatsApp' },
    { key: 'archivos', label: 'Archivos adjuntos' },
    { key: 'informes', label: 'Informes técnicos' },
    { key: 'sistema', label: 'Mensajes del sistema' },
  ];

  const tabComments = comments.filter(c => {
    if (!showSystemMessages && c.comment_type === 'sistema') return false;
    if (activeTab === 'tareas') {
      const tareasExtras = ['tareas', 'hacer', 'estado', 'acceso', 'pieza', 'nota_ticket'];
      return (
        tareasExtras.includes(c.comment_type) ||
        (!c.is_private && c.comment_type !== 'email_sms' && c.comment_type !== 'sistema')
      );
    }
    if (activeTab === 'privados') return c.is_private;
    if (activeTab === 'diagnostico') return c.comment_type === 'diagnostico';
    if (activeTab === 'email_sms') return c.comment_type === 'email_sms';
    if (activeTab === 'sistema') return c.comment_type === 'sistema';
    return c.comment_type === activeTab;
  });

  return (
    <div className="relative flex min-h-full flex-col bg-background text-foreground">
      {invoicePdfBusy ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/25"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-[#0d9488]" />
            <p className="text-sm font-medium text-gray-800">Generando documento…</p>
          </div>
        </div>
      ) : null}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700" title="Inicio" aria-label="Ir al panel">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/dashboard/tickets" className="text-[#0d9488] hover:underline">Entradas</Link>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowPrintView(true)}>
                Hoja de taller…
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => labelPrintData && setShowLabelPrint(true)}
                disabled={!labelPrintData}
              >
                {rc.labelPrint}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => void runTicketInvoiceVerification()}
            disabled={verifying || creatingInvoice}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded font-medium disabled:opacity-50',
              invoiceVerified
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            {verifying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : invoiceVerified ? (
              <span aria-hidden>✅</span>
            ) : (
              <FileCheck className="h-3.5 w-3.5" />
            )}
            {verifying ? 'Verificando…' : invoiceVerified ? 'Verificado' : 'Verificar'}
            {!verifying && !invoiceVerified ? <ChevronRight className="h-3 w-3" /> : null}
          </button>
          <button
            onClick={handleCreateInvoice}
            disabled={creatingInvoice || verifying}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#0d9488] hover:bg-[#1d4ed8] text-white rounded font-medium disabled:opacity-50"
          >
            {creatingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus className="h-3.5 w-3.5" />}
            Crear factura
          </button>
          {/* ── Presupuesto IA → WhatsApp ── */}
          <WhatsAppBudgetButton
            ticket={{
              ticket_number: ticket.ticket_number,
              customer_name: ticket.customers?.name ?? 'Cliente',
              customer_phone: ticket.customers?.phone ?? null,
              device_brand: ticket.device_brand,
              device_model: ticket.device_model,
              device_type: ticket.device_type,
              issue_description: ticket.issue_description,
              parts: parts.map((p) => ({
                part_name: p.part_name,
                quantity: p.quantity,
                unit_cost: p.unit_cost,
                total_cost: p.total_cost,
              })),
              estimated_cost: ticket.estimated_cost,
              final_cost: ticket.final_cost,
              country: effectiveOrgCountry,
              currency_symbol: currSym,
            }}
          />
            </div>
            {invoiceVerifyErrors.length > 0 ? (
              <ul className="max-w-xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 list-disc list-inside space-y-0.5 text-left">
                {invoiceVerifyErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
        <h1 className="text-lg font-bold text-gray-900">
          {rc.nounCap} {ticket.ticket_number}
        </h1>
        <button
          onClick={() => router.push(`/dashboard/tickets/new?edit=${ticket.id}`)}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {ticket.is_urgent && (
          <span className="text-sm text-orange-600 flex items-center gap-1 border border-orange-200 bg-orange-50 rounded px-2 py-0.5">
            <AlertTriangle className="h-3.5 w-3.5" />Trabajo urgente
          </span>
        )}
        <button
          className="ml-1 text-sm text-orange-600 flex items-center gap-1 border border-orange-200 rounded px-2 py-0.5 hover:bg-orange-50"
          onClick={async () => {
            if (!ticket) return;
            await (supabase as any).from('repair_tickets').update({ is_urgent: !ticket.is_urgent }).eq('id', ticket.id);
            setTicket({ ...ticket, is_urgent: !ticket.is_urgent });
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {ticket.is_urgent ? 'Quitar urgente' : 'Marcar como urgente'}
        </button>
      </div>

      <Dialog
        open={returnModalOpen}
        onOpenChange={(open) => {
          setReturnModalOpen(open);
          if (!open) setReturnModalShowForm(false);
        }}
      >
        <DialogContent className="sm:max-w-xl" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              {returnModalShowForm
                ? returnModalPreserveComplete
                  ? 'Corregir texto de devolución'
                  : returnPending
                    ? 'Editar devolución'
                    : 'Registrar devolución'
                : returnPending
                  ? 'Devolución pendiente'
                  : returnCompleted
                    ? 'Devolución completada'
                    : 'Devolución al cliente'}
            </DialogTitle>
            <DialogDescription>
              {returnModalShowForm
                ? returnModalPreserveComplete
                  ? 'Solo se actualiza el texto; la fecha de completada no cambia.'
                  : 'Tipo de actuación, forma de liquidación y descripción: sirve para cualquier taller (no solo dinero en efectivo).'
                : returnPending
                  ? rc.registroResumenPendiente
                  : returnCompleted
                    ? 'Constancia de lo devuelto al cliente.'
                    : 'Describe qué debe llevarse el cliente.'}
            </DialogDescription>
          </DialogHeader>

          {!returnModalShowForm && returnPending ? (
            <div className="space-y-3 px-1 py-2">
              <div className="rounded-md border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 text-sm text-gray-900 whitespace-pre-wrap">
                {ticket.return_to_customer_note}
              </div>
              {ticket.return_to_customer_amount != null ? (
                <p className="text-xs font-semibold text-amber-900">
                  Importe referencia: {currSym}
                  {Number(ticket.return_to_customer_amount).toFixed(2)}
                </p>
              ) : null}
              {ticket.return_to_customer_recorded_at ? (
                <p className="text-[11px] text-gray-500">
                  Registrado el {formatEntrySummaryDateTime(ticket.return_to_customer_recorded_at)}
                </p>
              ) : null}
              <div className="space-y-1 rounded-md border border-amber-100 bg-white/80 px-3 py-2 text-[11px] text-gray-700">
                <p>
                  <span className="font-semibold text-gray-800">Tipo: </span>
                  {labelReturnScenario(ticket.return_scenario)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Liquidación: </span>
                  {labelReturnSettlement(ticket.return_settlement_method)}
                </p>
                {ticket.return_related_invoice_id ? (
                  <p>
                    <span className="font-semibold text-gray-800">Factura vinculada: </span>
                    {ticketInvoicesForReturn.find((i) => i.id === ticket.return_related_invoice_id)
                      ?.invoice_number ?? '—'}
                  </p>
                ) : null}
              </div>
              {returnConstanciaId ? (
                <Link
                  href={`/dashboard/devoluciones/print/${returnConstanciaId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d9488] hover:underline"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir constancia (documento interno)
                </Link>
              ) : (
                <p className="text-[11px] text-gray-500">
                  Tras guardar la devolución queda constancia en Finanzas → Devoluciones al cliente.
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingReturn}
                  onClick={() => void markReturnCompleted()}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Ya se lo devolví
                </button>
                <button
                  type="button"
                  disabled={savingReturn}
                  onClick={() => {
                    setReturnModalPreserveComplete(false);
                    setReturnModalShowForm(true);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Editar texto
                </button>
                <button
                  type="button"
                  disabled={savingReturn}
                  onClick={() => void clearReturnRegistration()}
                  className="rounded-md px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
                >
                  Anular
                </button>
              </div>
            </div>
          ) : !returnModalShowForm && returnCompleted ? (
            <div className="space-y-3 px-1 py-2">
              <div className="rounded-md border border-emerald-200/80 bg-emerald-50/40 px-3 py-2.5 text-sm text-gray-800 whitespace-pre-wrap">
                {ticket.return_to_customer_note}
              </div>
              {ticket.return_to_customer_amount != null ? (
                <p className="text-xs font-semibold text-emerald-900">
                  Importe: {currSym}
                  {Number(ticket.return_to_customer_amount).toFixed(2)}
                </p>
              ) : null}
              <p className="text-[11px] text-emerald-800/90">
                Completada el{' '}
                {ticket.return_to_customer_completed_at
                  ? formatEntrySummaryDateTime(ticket.return_to_customer_completed_at)
                  : ''}
              </p>
              <div className="space-y-1 rounded-md border border-emerald-100 bg-white/80 px-3 py-2 text-[11px] text-gray-700">
                <p>
                  <span className="font-semibold text-gray-800">Tipo: </span>
                  {labelReturnScenario(ticket.return_scenario)}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Liquidación: </span>
                  {labelReturnSettlement(ticket.return_settlement_method)}
                </p>
                {ticket.return_related_invoice_id ? (
                  <p>
                    <span className="font-semibold text-gray-800">Factura vinculada: </span>
                    {ticketInvoicesForReturn.find((i) => i.id === ticket.return_related_invoice_id)
                      ?.invoice_number ?? '—'}
                  </p>
                ) : null}
              </div>
              {returnConstanciaId ? (
                <Link
                  href={`/dashboard/devoluciones/print/${returnConstanciaId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d9488] hover:underline"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir constancia (documento interno)
                </Link>
              ) : null}
              <button
                type="button"
                disabled={savingReturn}
                onClick={() => {
                  setReturnModalPreserveComplete(true);
                  setReturnModalShowForm(true);
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Corregir descripción
              </button>
            </div>
          ) : (
            <div className="space-y-3 px-1 py-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-600">Tipo de actuación</label>
                  <Select value={returnScenario} onValueChange={setReturnScenario}>
                    <SelectTrigger className="mt-1 h-9 bg-white">
                      <SelectValue placeholder="Elige" />
                    </SelectTrigger>
                    <SelectContent>
                      {RETURN_SCENARIOS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Forma de liquidación</label>
                  <Select value={returnSettlement} onValueChange={setReturnSettlement}>
                    <SelectTrigger className="mt-1 h-9 bg-white">
                      <SelectValue placeholder="Elige" />
                    </SelectTrigger>
                    <SelectContent>
                      {RETURN_SETTLEMENTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  {rc.facturaOpcionalLabel}
                </label>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  {rc.vinculaCobroHelp}
                </p>
                <Select
                  value={returnRelatedInvoiceId || '__none__'}
                  onValueChange={(v) => setReturnRelatedInvoiceId(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="mt-1 h-9 bg-white">
                    <SelectValue placeholder="Sin vincular" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin vincular</SelectItem>
                    {returnInvoiceSelectRows.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number}
                        {inv.total_amount != null && !Number.isNaN(Number(inv.total_amount))
                          ? ` · ${currSym}${Number(inv.total_amount).toFixed(2)}`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Descripción (obligatorio)</label>
                <Textarea
                  className="mt-1 min-h-[100px] bg-white"
                  placeholder={`Ej.: ${ticket.device_type} · pieza sustituida en garantía · entrega de equipo sin reparar`}
                  value={returnDraftNote}
                  onChange={(e) => setReturnDraftNote(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Importe en dinero ({currSym}, opcional)
                </label>
                <Input
                  className="mt-1 h-9 bg-white"
                  type="text"
                  inputMode="decimal"
                  placeholder="Vacío si no hay importe monetario"
                  value={returnDraftAmount}
                  onChange={(e) => setReturnDraftAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          {returnModalShowForm || (!returnPending && !returnCompleted) ? (
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => {
                  if (returnPending || returnCompleted) {
                    setReturnModalShowForm(false);
                    setReturnModalPreserveComplete(returnCompleted);
                  } else {
                    setReturnModalOpen(false);
                  }
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                {returnPending || returnCompleted ? 'Volver' : 'Cancelar'}
              </button>
              <button
                type="button"
                disabled={savingReturn}
                onClick={() => void saveReturnDraft()}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {savingReturn ? 'Guardando…' : 'Guardar'}
              </button>
            </DialogFooter>
          ) : (
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cerrar
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <details className="group border-b border-gray-200 bg-slate-50/80">
        <summary className="cursor-pointer list-none px-6 py-2.5 text-xs font-semibold text-gray-600 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
            {rc.opcionAvanzadaGarantia}
          </span>
        </summary>
        <div className="border-b border-teal-100/80 bg-gradient-to-r from-teal-50/95 via-white to-slate-50/70 px-6 py-3">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Shield className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                Reingreso y garantía
              </div>
              {relatedParentTicket ? (
                <p className="text-xs leading-relaxed text-gray-700">
                  {isArgentinaUi ? (
                    <>
                      Esta orden está <span className="font-semibold text-teal-900">vinculada</span> a la anterior{' '}
                    </>
                  ) : (
                    <>
                      Este ticket está <span className="font-semibold text-teal-900">vinculado</span> al anterior{' '}
                    </>
                  )}
                  <Link
                    href={`/dashboard/tickets/${relatedParentTicket.id}`}
                    className="font-semibold text-teal-700 underline-offset-2 hover:underline"
                  >
                    #{relatedParentTicket.ticket_number}
                  </Link>
                  <span className="text-gray-500">
                    {' '}
                    · {relatedParentTicket.status} ·{' '}
                    {new Date(relatedParentTicket.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-gray-600">
                  Si el equipo vuelve a fallar o entra por garantía, puedes abrir un nuevo ingreso vinculado a{' '}
                  {rc.vincularNuevoIngreso}.
                </p>
              )}
              {relatedChildTickets.length > 0 ? (
                <div className="rounded-lg border border-teal-200/70 bg-white/80 px-3 py-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-900/80">
                    Reingresos posteriores ({relatedChildTickets.length})
                  </p>
                  <ul className="flex flex-col gap-1">
                    {relatedChildTickets.map((c) => (
                      <li key={c.id} className="text-xs text-gray-800">
                        <Link
                          href={`/dashboard/tickets/${c.id}`}
                          className="font-semibold text-teal-700 underline-offset-2 hover:underline"
                        >
                          #{c.ticket_number}
                        </Link>
                        <span className="text-gray-500">
                          {' '}
                          · {c.status} ·{' '}
                          {new Date(c.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Link
                href={`/dashboard/recepcion?relatedTicket=${ticket.id}`}
                className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-3 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                Registrar reingreso (recepción)
              </Link>
              <Link
                href={`/dashboard/tickets/new?relatedTicket=${ticket.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-teal-300 bg-white px-3 py-2 text-center text-xs font-semibold text-teal-900 shadow-sm transition hover:bg-teal-50"
              >
                Nuevo ticket con vínculo
              </Link>
            </div>
          </div>
        </div>
      </details>

      <div className="flex w-full flex-col lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 px-6 py-4">
          <div className="bg-white border border-gray-200 rounded-md mb-4">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#0d9488] text-sm">{ticket.device_type}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full', ticket.serial_number || ticket.imei ? 'bg-green-500' : 'bg-gray-400')} />
                  {ticket.serial_number || ticket.imei || 'Sin número de serie/IMEI'}
                </p>
              </div>
              <button
                onClick={() => { setEditingPrice(true); setPriceValue((ticket.estimated_cost || 0).toFixed(2)); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#0d9488] hover:bg-[#1d4ed8] text-white rounded font-medium"
              >
                <Plus className="h-3.5 w-3.5" />Agregar servicio<ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <div className="p-4">
              <div className="border border-gray-200 rounded-md">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-repairdesk-50 rounded-md flex items-center justify-center">
                      {getCategoryIconSVG(ticket.device_category, ticket.device_type)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{ticket.device_type}</div>
                      {(() => {
                        const equip = formatEquipoBrandInchesModelLine({
                          category: ticket.device_category,
                          brand: ticket.device_brand,
                          model: ticket.device_model,
                          screenInches: ticket.device_screen_inches,
                        });
                        const tail = equip || [ticket.device_brand, ticket.device_model].filter(Boolean).join(' · ');
                        if (!ticket.device_category && !tail) return null;
                        return (
                          <div className="text-xs text-gray-500">
                            {ticket.device_category ? `${ticket.device_category} → ` : null}
                            {tail || '—'}
                          </div>
                        );
                      })()}
                      <div className="text-xs text-gray-500 mt-0.5">{ticket.issue_description?.substring(0, 50)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative" ref={statusRef}>
                      <button onClick={() => setStatusDropdown(!statusDropdown)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded">
                        <StatusDot color={currentStatus.dot} />{currentStatus.label}<ChevronDown className="h-3 w-3" />
                      </button>
                      {statusDropdown && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 w-64">
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                              <input autoFocus value={statusSearch} onChange={(e) => setStatusSearch(e.target.value)} placeholder="Buscar estado..." className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 bg-white rounded focus:outline-none focus:ring-1 focus:ring-[#0d9488]" />
                            </div>
                          </div>
                          <div className="max-h-72 overflow-y-auto py-1 [-webkit-overflow-scrolling:touch]">
                            {filteredStatuses ? filteredStatuses.map((s) => (
                              <button key={s.value} onClick={() => handleStatusChange(s.value)} className={cn('w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2.5', ticket.status === s.value && 'bg-gray-50 font-medium')}>
                                <StatusDot color={s.dot} />{s.label}
                              </button>
                            )) : STATUS_GROUPS.map((group) => (
                              <div key={group.label}>
                                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{group.label}</div>
                                {group.items.map((s) => (
                                  <button key={s.value} onClick={() => handleStatusChange(s.value)} className={cn('w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2.5', ticket.status === s.value && 'bg-gray-50 font-medium')}>
                                    <StatusDot color={s.dot} />{s.label}
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(ticket.ticket_number); toast.success('Copiado'); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                </div>

                <div className="border-t border-gray-100 px-3 py-2.5">
                  {editingPrice ? (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        value={priceValue}
                        onChange={e => setPriceValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSavePrice(); if (e.key === 'Escape') setEditingPrice(false); }}
                        className="border border-[#0d9488] bg-white rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488] w-36"
                        placeholder="Introducir precio"
                      />
                      <button onClick={handleSavePrice} disabled={savingPrice} className="bg-[#0d9488] text-white text-xs px-3 py-1.5 rounded hover:bg-[#1d4ed8] flex items-center gap-1">
                        {savingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Guardar
                      </button>
                      <button onClick={() => setEditingPrice(false)} className="text-xs px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => { setEditingPrice(true); setPriceValue((ticket.estimated_cost || 0).toFixed(2)); }}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-[#0d9488] group"
                      >
                        <DollarSign className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#0d9488]" />
                        {currSym}{total.toFixed(2)}
                        <Pencil className="h-3 w-3 text-gray-300 group-hover:text-[#0d9488] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded">Haz clic para editar el precio</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 px-3 py-2.5 grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-3">
                  <div className="min-w-0">
                    <span className="text-xs text-gray-500 block mb-1">Asignado a:</span>
                    {(() => {
                      const assignedLabel =
                        formatAssignedToLabel(ticket.assigned_to, techIdToName) || 'Sin asignar';
                      const initial =
                        assignedLabel === 'Sin asignar'
                          ? 'U'
                          : assignedLabel.trim()[0]?.toUpperCase() || '?';
                      let techIdForColor: string | undefined =
                        ticket.assigned_to && isUuid(ticket.assigned_to)
                          ? ticket.assigned_to
                          : undefined;
                      if (!techIdForColor) {
                        const hit = Array.from(techIdToName.entries()).find(
                          ([, n]) => n.trim().toLowerCase() === assignedLabel.trim().toLowerCase()
                        );
                        techIdForColor = hit?.[0];
                      }
                      const circleColor =
                        (techIdForColor && techIdToColor.get(techIdForColor)) || '#0d9488';
                      const showPhoto =
                        Boolean(assigneeAvatarUrl) && !assigneeAvatarBroken;
                      const assigneeRoleLine =
                        (assigneePanelUserId &&
                          commentUserRoleById.get(assigneePanelUserId)) ||
                        assigneeTechnicianRoleLabel ||
                        null;
                      const canReassign =
                        myPerms.can_edit_tickets && !myPerms.loading && !savingAssignee;
                      const q = assignSearch.trim().toLowerCase();
                      const filteredTechs = activeTechnicians.filter((t) =>
                        t.name.toLowerCase().includes(q)
                      );

                      const avatar = showPhoto ? (
                        <img
                          src={assigneeAvatarUrl!}
                          alt={assignedLabel}
                          className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-gray-200"
                          onError={() => setAssigneeAvatarBroken(true)}
                        />
                      ) : (
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-1 ring-white/25"
                          style={{ backgroundColor: circleColor }}
                        >
                          {initial}
                        </div>
                      );

                      const textBlock = (
                        <div className="min-w-0 flex flex-1 flex-col justify-center gap-0.5 text-left">
                          <span className="text-xs font-medium text-gray-800">{assignedLabel}</span>
                          {assigneeRoleLine ? (
                            <span className="text-[11px] leading-tight text-gray-500">
                              {assigneeRoleLine}
                            </span>
                          ) : null}
                        </div>
                      );

                      if (!canReassign) {
                        return (
                          <div className="flex items-center gap-2">
                            {avatar}
                            {textBlock}
                          </div>
                        );
                      }

                      return (
                        <Popover
                          open={assignPopoverOpen}
                          onOpenChange={(open) => {
                            setAssignPopoverOpen(open);
                            if (!open) setAssignSearch('');
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={savingAssignee}
                              className="flex w-full max-w-full items-center gap-2 rounded-lg py-1 pr-1 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/40 disabled:opacity-60"
                            >
                              {avatar}
                              {textBlock}
                              {savingAssignee ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-[min(100vw-2rem,20rem)] p-0 motion-reduce:hover:scale-100"
                            sideOffset={6}
                          >
                            <div className="border-b border-gray-100 p-2">
                              <div className="relative">
                                <Input
                                  value={assignSearch}
                                  onChange={(e) => setAssignSearch(e.target.value)}
                                  placeholder="Buscar técnico"
                                  className="h-9 pr-9 text-sm bg-white"
                                  autoComplete="off"
                                />
                                <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-1 [-webkit-overflow-scrolling:touch]">
                              {ticket.assigned_to ? (
                                <button
                                  type="button"
                                  onClick={() => void handleReassignTechnician(null)}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                                >
                                  <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-gray-200"
                                    style={{ backgroundColor: '#0d9488' }}
                                  >
                                    U
                                  </div>
                                  <span className="font-medium text-gray-800">Sin asignar</span>
                                </button>
                              ) : null}
                              {filteredTechs.map((t) => {
                                const sel =
                                  ticket.assigned_to && isUuid(ticket.assigned_to)
                                    ? ticket.assigned_to === t.id
                                    : false;
                                const col = techIdToColor.get(t.id) || '#0d9488';
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => void handleReassignTechnician(t.id)}
                                    className={cn(
                                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                                      sel ? 'bg-emerald-50 text-[#124c48]' : 'hover:bg-gray-50'
                                    )}
                                  >
                                    <div
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-gray-100"
                                      style={{ backgroundColor: col }}
                                    >
                                      {t.name.trim()[0]?.toUpperCase() || '?'}
                                    </div>
                                    <span className="truncate font-medium text-gray-800">{t.name}</span>
                                  </button>
                                );
                              })}
                              {activeTechnicians.length === 0 && !ticket.assigned_to ? (
                                <p className="px-2 py-3 text-center text-xs text-gray-500">
                                  No hay empleados dados de alta (activos). Añádelos en Ajustes → Empleados.
                                </p>
                              ) : null}
                              {activeTechnicians.length > 0 &&
                              filteredTechs.length === 0 &&
                              q ? (
                                <p className="px-2 py-3 text-center text-xs text-gray-500">
                                  Sin coincidencias
                                </p>
                              ) : null}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })()}
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:col-span-3">
                    <div className="min-w-0">
                      <span className="mb-1 block text-xs text-gray-500">Fecha de vencimiento:</span>
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="datetime-local"
                          value={dueDateDraft}
                          onChange={(e) => setDueDateDraft(e.target.value)}
                          onBlur={() => commitDueDate()}
                          disabled={savingTicketMeta}
                          title="Seleccione fecha y hora"
                          className="h-9 bg-white pl-8 text-xs"
                        />
                      </div>
                      {!dueDateDraft ? (
                        <p className="mt-0.5 text-[10px] text-gray-400">Opcional — elige fecha y hora</p>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <span className="mb-1 block text-xs text-gray-500">Tipo de tarea:</span>
                      <Select
                        value={ticket.task_type || 'TIENDA'}
                        onValueChange={(v) => void patchTicketMeta({ task_type: v })}
                        disabled={savingTicketMeta}
                      >
                        <SelectTrigger className="h-9 bg-white text-xs">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {taskTypeOptions.map((name) => (
                            <SelectItem key={name} value={name} className="text-xs">
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0">
                      <span className="mb-1 block text-xs text-gray-500">Tiempo de reparación:</span>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="time"
                          step={1}
                          value={repairTimeDraft}
                          onChange={(e) => setRepairTimeDraft(e.target.value || '00:00:00')}
                          onBlur={() => commitRepairTime()}
                          disabled={savingTicketMeta}
                          className="h-9 bg-white pl-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {isDelayTrackedStatus(ticket.status) ? (
                  <div className="border-t border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-amber-50/30 px-3 py-3">
                    <div className="mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-950/80">
                        Seguimiento por retraso
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-950/70 max-w-2xl">
                        Si {rc.delaySigue} mucho tiempo en este estado, el técnico
                        asignado puede recibir avisos en la
                        campana (revisión diaria). Indica el <strong>motivo de espera</strong> para ajustar plazos: un
                        pedido de pieza no es lo mismo que una gestión con el cliente.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="min-w-[200px] flex-1">
                        <span className="mb-1 block text-xs font-medium text-amber-950/80">Motivo de espera</span>
                        <Select
                          value={ticket.follow_up_wait_reason || '__none__'}
                          onValueChange={(v) =>
                            void patchFollowUp({
                              follow_up_wait_reason: v === '__none__' ? null : v,
                            })
                          }
                          disabled={savingFollowUp || !myPerms.can_edit_tickets || myPerms.loading}
                        >
                          <SelectTrigger className="h-9 bg-white/90 text-xs border-amber-200">
                            <SelectValue placeholder="Sin especificar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">
                              Sin especificar
                            </SelectItem>
                            {WAIT_REASON_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-amber-950/80">Posponer avisos</span>
                        <button
                          type="button"
                          disabled={savingFollowUp || !myPerms.can_edit_tickets || myPerms.loading}
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 3);
                            void patchFollowUp({ follow_up_snoozed_until: d.toISOString() });
                          }}
                          className="rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-950 shadow-sm hover:bg-amber-100/50 disabled:opacity-50"
                        >
                          +3 días
                        </button>
                        <button
                          type="button"
                          disabled={savingFollowUp || !myPerms.can_edit_tickets || myPerms.loading}
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            void patchFollowUp({ follow_up_snoozed_until: d.toISOString() });
                          }}
                          className="rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-950 shadow-sm hover:bg-amber-100/50 disabled:opacity-50"
                        >
                          +7 días
                        </button>
                        {ticket.follow_up_snoozed_until ? (
                          <button
                            type="button"
                            disabled={savingFollowUp || !myPerms.can_edit_tickets || myPerms.loading}
                            onClick={() => void patchFollowUp({ follow_up_snoozed_until: null })}
                            className="rounded-md border border-transparent px-2 py-1.5 text-xs text-amber-900/80 underline-offset-2 hover:underline disabled:opacity-50"
                          >
                            Quitar posposición
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-amber-950/65">
                      {ticket.follow_up_started_at ? (
                        <span>
                          Seguimiento activo desde{' '}
                          {new Date(ticket.follow_up_started_at).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      ) : null}
                      <span>Motivo registrado: {waitReasonLabel(ticket.follow_up_wait_reason)}</span>
                      {typeof ticket.follow_up_notify_count === 'number' ? (
                        <span>Avisos de seguimiento en este periodo: {ticket.follow_up_notify_count}</span>
                      ) : null}
                      {ticket.follow_up_snoozed_until ? (
                        <span className="font-medium text-amber-900">
                          Avisos pospuestos hasta{' '}
                          {new Date(ticket.follow_up_snoozed_until).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mb-3 rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50/90 to-white p-2.5 shadow-sm sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Problema · piezas · suministros · evidencia visual · condiciones
              </p>
              {openToolbox ? (
                <button
                  type="button"
                  onClick={() => setOpenToolbox(null)}
                  className="shrink-0 text-[10px] font-medium text-[#0d9488] hover:underline"
                >
                  Cerrar panel
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              <button
                type="button"
                onClick={() => setOpenToolbox((k) => (k === 'problem' ? null : 'problem'))}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition-all',
                  openToolbox === 'problem'
                    ? 'border-red-400 bg-red-50 shadow-sm ring-1 ring-red-300/50'
                    : 'border-red-200/80 bg-red-50/25 hover:border-red-300 hover:bg-red-50/40'
                )}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  Problema
                </span>
                <span className="line-clamp-2 w-full text-[10px] font-normal leading-snug text-red-800/85">
                  {ticket.issue_description?.trim()
                    ? `${ticket.issue_description.trim().slice(0, 72)}${ticket.issue_description.trim().length > 72 ? '…' : ''}`
                    : 'Sin descripción'}
                </span>
              </button>

              <div
                className={cn(
                  'relative rounded-lg border transition-all',
                  openToolbox === 'parts'
                    ? 'border-[#0d9488] bg-teal-50/70 shadow-sm ring-1 ring-[#0d9488]/35'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenToolbox((k) => (k === 'parts' ? null : 'parts'))}
                  className="no-ui-hover-grow w-full px-2.5 py-2 pr-8 text-left"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                    <Package className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    Piezas
                  </span>
                  <span className="mt-0.5 block text-[10px] text-gray-500">{parts.length} en ticket</span>
                </button>
                <button
                  type="button"
                  title="Añadir repuesto desde inventario"
                  aria-label="Añadir repuesto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRepuesto(null);
                    setRepuestoQty(1);
                    setRepuestoSearch('');
                    setShowRepuestoModal(true);
                  }}
                  className="absolute right-1 top-1 rounded-md p-1 text-[#0d9488] hover:bg-teal-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpenToolbox((k) => (k === 'supply' ? null : 'supply'))}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-all',
                  openToolbox === 'supply'
                    ? 'border-[#0d9488] bg-teal-50/70 shadow-sm ring-1 ring-[#0d9488]/35'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                  <Package className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  Suministros
                </span>
                <span className="text-[10px] text-gray-500">
                  {toolboxSupplyCheckedCount > 0 ? `${toolboxSupplyCheckedCount} marcados` : 'Accesorios'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOpenToolbox((k) => (k === 'images' ? null : 'images'))}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-all',
                  openToolbox === 'images'
                    ? 'border-[#0d9488] bg-teal-50/70 shadow-sm ring-1 ring-[#0d9488]/35'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                  <ImageIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                  Evidencia visual
                </span>
                <span className="text-[10px] text-gray-500">
                  {images.length > 0
                    ? `${images.length} en ticket`
                    : 'Antes · después · microscopio'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOpenToolbox((k) => (k === 'conditions' ? null : 'conditions'))}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-all sm:col-span-1 col-span-2 xl:col-span-1',
                  openToolbox === 'conditions'
                    ? 'border-[#0d9488] bg-teal-50/70 shadow-sm ring-1 ring-[#0d9488]/35'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  Condiciones
                </span>
                <span className="text-[10px] text-gray-500">Pre y post reparación</span>
              </button>
            </div>

            {openToolbox === 'problem' ? (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50/40 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700/90">Problema reportado</p>
                <p className="mt-1 text-sm font-medium text-red-900 whitespace-pre-wrap">{ticket.issue_description}</p>
              </div>
            ) : null}

            {openToolbox === 'parts' ? (
              <div className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-3 shadow-sm">
                {parts.length > 0 ? (
                  <div className="space-y-2">
                    {parts.map((part) => {
                      const liveStock = part.products?.quantity;
                      return (
                        <div key={part.id} className="flex items-center justify-between gap-2 rounded bg-gray-50 p-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{part.part_name}</p>
                            {part.part_number ? <p className="truncate text-xs text-gray-500">#{part.part_number}</p> : null}
                            <p className="text-xs text-gray-500">
                              Cant: {part.quantity} × {currSym}
                              {Number(part.unit_cost).toFixed(2)} = {currSym}
                              {Number(part.total_cost).toFixed(2)}
                            </p>
                            {part.products?.storage_location ? (
                              <span className="mt-1 inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                📍 {part.products.storage_location}
                              </span>
                            ) : null}
                            {part.product_id && liveStock !== undefined ? (
                              <p className="mt-0.5 text-[11px] font-medium text-[#0d9488]">Stock inventario ahora: {liveStock}</p>
                            ) : part.product_id ? (
                              <p className="mt-0.5 text-[11px] text-gray-400">Vinculado a inventario</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePart(part.id)}
                            className="shrink-0 p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    No hay piezas adjuntas. Pulsa <span className="font-medium text-[#0d9488]">+</span> en el recuadro
                    «Piezas» para elegir del inventario.
                  </p>
                )}
              </div>
            ) : null}

            {openToolbox === 'supply' ? (
              <div className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-3 shadow-sm">
                {!accessories ? (
                  <p className="text-sm text-gray-400">Cargando datos de accesorios…</p>
                ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'has_sim', label: 'SIM' },
                      { key: 'has_case', label: 'FUNDA' },
                      { key: 'has_pencil', label: 'PENCIL' },
                      { key: 'has_usb_cable', label: 'CABLE USB' },
                      { key: 'has_charger', label: 'BASE DE CARGA' },
                      { key: 'has_memory_card', label: 'MICRO SD/SD' },
                      { key: 'has_power_bank', label: 'POWER BANK' },
                      { key: 'has_replacement', label: 'REPUESTO' },
                      { key: 'has_headphones', label: 'AURICULARES' },
                      { key: 'has_original_box', label: 'CAJA ORIGINAL' },
                    ].map((item) => (
                      <label key={item.key} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={accessories[item.key as keyof TicketAccessories] as boolean}
                          onChange={(e) => handleSaveAccessories({ [item.key]: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-[#0d9488] focus:ring-[#0d9488]"
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <label className="mb-1 block text-xs text-gray-500">Notas adicionales:</label>
                    <textarea
                      value={accessories.notes || ''}
                      onChange={(e) => handleSaveAccessories({ notes: e.target.value })}
                      placeholder="Notas sobre accesorios..."
                      rows={2}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                )}
              </div>
            ) : null}

            {openToolbox === 'images' ? (
              <div className="mt-2 rounded-md border border-gray-200 bg-white px-2 py-2 shadow-sm sm:px-2.5 sm:py-2.5">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-0 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => setActiveImageTab('pre')}
                      className={cn(
                        'whitespace-nowrap border-b-2 px-2 py-1 text-[11px] font-medium sm:px-2.5 sm:py-1.5 sm:text-xs',
                        activeImageTab === 'pre'
                          ? 'border-[#0d9488] text-[#0d9488]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      )}
                    >
                      Antes ({images.filter((i) => isPreRepairImage(i.image_type)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageTab('post')}
                      className={cn(
                        'whitespace-nowrap border-b-2 px-2 py-1 text-[11px] font-medium sm:px-2.5 sm:py-1.5 sm:text-xs',
                        activeImageTab === 'post'
                          ? 'border-[#0d9488] text-[#0d9488]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      )}
                    >
                      Después ({images.filter((i) => i.image_type === 'post_repair').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageTab('micro')}
                      className={cn(
                        'whitespace-nowrap border-b-2 px-2 py-1 text-[11px] font-medium sm:px-2.5 sm:py-1.5 sm:text-xs',
                        activeImageTab === 'micro'
                          ? 'border-[#0d9488] text-[#0d9488]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      )}
                    >
                      Microscopio ({images.filter((i) => isMicroscopioImage(i.image_type)).length})
                    </button>
                  </div>

                  {activeImageTab === 'micro' ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] leading-snug text-gray-600">
                        Hasta 3 fotos (microscopio o archivos). Con la webcam: capturá y tocá «Guardar capturas».
                      </p>
                      <TicketIntakeWebcam
                        key={`micro-wcam-${images.filter((i) => isMicroscopioImage(i.image_type)).length}`}
                        value={microscopeWebcamFiles}
                        onChange={setMicroscopeWebcamFiles}
                        maxPhotos={Math.max(0, 3 - images.filter((i) => isMicroscopioImage(i.image_type)).length)}
                        disabled={uploadingMicroscope}
                        hideSectionHeader
                        compact
                        captureNamePrefix="microscopio-"
                        className="max-w-full"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 bg-[#0d9488] text-white hover:bg-[#0f766e]"
                          disabled={
                            uploadingMicroscope ||
                            microscopeWebcamFiles.length === 0 ||
                            images.filter((i) => isMicroscopioImage(i.image_type)).length >= 3
                          }
                          onClick={() => void flushMicroscopeWebcam()}
                        >
                          {uploadingMicroscope ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Subiendo…
                            </>
                          ) : (
                            'Guardar capturas en el ticket'
                          )}
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleUploadImages(e, 'micro')}
                          className="hidden"
                          id="image-upload-micro"
                        />
                        <label
                          htmlFor="image-upload-micro"
                          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-input bg-white px-2.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <Plus className="h-3 w-3" />
                          Agregar archivos
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-2 py-1.5">
                      <Camera className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                      <p className="min-w-0 flex-1 text-[10px] leading-tight text-gray-600">
                        Estado {activeImageTab === 'pre' ? 'inicial' : 'final'}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleUploadImages(e, activeImageTab)}
                        className="hidden"
                        id={`image-upload-${activeImageTab}`}
                      />
                      <label
                        htmlFor={`image-upload-${activeImageTab}`}
                        className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded bg-[#0d9488] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#0f766e]"
                      >
                        <Plus className="h-3 w-3" />
                        Agregar
                      </label>
                    </div>
                  )}

                  {(() => {
                    const list = images.filter((i) =>
                      activeImageTab === 'pre'
                        ? isPreRepairImage(i.image_type)
                        : activeImageTab === 'post'
                          ? i.image_type === 'post_repair'
                          : isMicroscopioImage(i.image_type)
                    );
                    if (list.length === 0) {
                      return (
                        <p className="py-2 text-center text-[10px] text-gray-400">
                          {activeImageTab === 'pre'
                            ? 'No hay imágenes previas'
                            : activeImageTab === 'post'
                              ? 'No hay imágenes posteriores'
                              : 'No hay fotos de microscopio'}
                        </p>
                      );
                    }
                    return (
                      <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                        {list.map((img) => {
                          const thumbUrl =
                            ticketImageDisplayById[img.id] ?? img.thumbnail_url ?? img.image_url;
                          return (
                            <div
                              key={img.id}
                              className="flex w-[4.5rem] shrink-0 flex-col items-center gap-0.5 sm:w-20"
                              title={img.description || undefined}
                            >
                              <div className="group relative h-14 w-14 overflow-hidden rounded border border-gray-200 bg-gray-50 sm:h-16 sm:w-16">
                                <button
                                  type="button"
                                  className="absolute inset-0 z-0 flex h-full w-full items-center justify-center p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1"
                                  onClick={() => {
                                    if (thumbUrl) {
                                      setImageLightbox({
                                        url: thumbUrl,
                                        alt: img.description || 'Imagen del ticket',
                                      });
                                    }
                                  }}
                                  aria-label="Ver imagen en grande"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={thumbUrl}
                                    alt=""
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    void handleDeleteImage(img.id);
                                  }}
                                  className="absolute right-0 top-0 z-10 rounded-bl bg-red-500 px-0.5 py-0.5 text-white opacity-90 shadow-sm hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                  aria-label="Eliminar imagen"
                                >
                                  <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                </button>
                              </div>
                              {img.description ? (
                                <p className="line-clamp-2 w-full text-center text-[8px] leading-tight text-gray-500 sm:text-[9px]">
                                  {img.description}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            {openToolbox === 'conditions' ? (
              <div className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-3 shadow-sm">
                <div className="space-y-4">
                  <div className="flex gap-2 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => setActiveConditionTab('pre')}
                      className={cn(
                        'border-b-2 px-3 py-2 text-sm font-medium',
                        activeConditionTab === 'pre'
                          ? 'border-[#0d9488] text-[#0d9488]'
                          : 'border-transparent text-gray-500'
                      )}
                    >
                      Condiciones previas
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveConditionTab('post')}
                      className={cn(
                        'border-b-2 px-3 py-2 text-sm font-medium',
                        activeConditionTab === 'post'
                          ? 'border-[#0d9488] text-[#0d9488]'
                          : 'border-transparent text-gray-500'
                      )}
                    >
                      Condiciones posteriores
                    </button>
                  </div>
                  {(() => {
                    const currentConditions = activeConditionTab === 'pre' ? preConditions : postConditions;
                    const conditionFields = [
                      { key: 'powers_on', label: '¿Enciende?', options: ['yes', 'no', 'unknown'] },
                      { key: 'charging', label: '¿Carga?', options: ['yes', 'no', 'unknown'] },
                      { key: 'restarts', label: '¿Se reinicia?', options: ['yes', 'no', 'unknown'] },
                      { key: 'software', label: 'Software', options: ['working', 'issues', 'unknown'] },
                      { key: 'wet_damage', label: '¿Daño por agua?', options: ['yes', 'no', 'unknown'] },
                      { key: 'tampered', label: '¿Manipulado?', options: ['yes', 'no', 'unknown'] },
                      { key: 'screen_new', label: 'Pantalla nueva', options: ['yes', 'no', 'unknown'] },
                      { key: 'screen_used', label: 'Pantalla usada', options: ['yes', 'no', 'unknown'] },
                      { key: 'screen_broken', label: 'Pantalla rota', options: ['yes', 'no', 'unknown'] },
                      { key: 'battery_good', label: 'Batería bien', options: ['yes', 'no', 'unknown'] },
                      { key: 'touchscreen', label: 'Táctil', options: ['working', 'issues', 'unknown'] },
                      { key: 'power_button', label: 'Botón encendido', options: ['working', 'issues', 'unknown'] },
                      { key: 'volume_button', label: 'Botón volumen', options: ['working', 'issues', 'unknown'] },
                      { key: 'face_id', label: 'Face ID', options: ['working', 'issues', 'unknown'] },
                      { key: 'touch_id', label: 'Touch ID', options: ['working', 'issues', 'unknown'] },
                      { key: 'wifi', label: 'Wi-Fi', options: ['working', 'issues', 'unknown'] },
                      { key: 'bluetooth', label: 'Bluetooth', options: ['working', 'issues', 'unknown'] },
                    ];
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {conditionFields.map((field) => (
                            <div key={field.key} className="flex items-center justify-between rounded bg-gray-50 p-2">
                              <span className="text-sm text-gray-700">{field.label}</span>
                              <select
                                value={currentConditions?.[field.key as keyof TicketCondition] || 'unknown'}
                                onChange={(e) =>
                                  handleSaveConditions(activeConditionTab, { [field.key]: e.target.value })
                                }
                                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                              >
                                {field.options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt === 'yes'
                                      ? 'Sí'
                                      : opt === 'no'
                                        ? 'No'
                                        : opt === 'working'
                                          ? 'Funciona'
                                          : opt === 'issues'
                                            ? 'Problemas'
                                            : 'Desconocido'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <label className="mb-1 block text-xs text-gray-500">Notas adicionales:</label>
                          <textarea
                            value={currentConditions?.notes || ''}
                            onChange={(e) => handleSaveConditions(activeConditionTab, { notes: e.target.value })}
                            placeholder={`Notas sobre condiciones ${activeConditionTab === 'pre' ? 'previas' : 'posteriores'}...`}
                            rows={2}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={currentConditions?.checked_by || ''}
                            onChange={(e) =>
                              handleSaveConditions(activeConditionTab, { checked_by: e.target.value })
                            }
                            placeholder="Revisado por..."
                            className="flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                          />
                          {savingConditions ? <span className="text-xs text-gray-500">Guardando...</span> : null}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : null}
          </div>

          <Dialog open={showRepuestoModal} onOpenChange={(open) => { if (!open) resetRepuestoModal(); }}>
              <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4 text-[#0d9488]" />
                    Añadir repuesto (inventario)
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-1">
                  <p className="text-xs text-gray-500">
                    Busca en <strong>Gestión de repuestos</strong>. Al elegir una fila verás el stock actual del almacén.
                  </p>
                  <input
                    type="search"
                    autoFocus
                    placeholder="Nombre, SKU o UPC…"
                    value={repuestoSearch}
                    onChange={(e) => setRepuestoSearch(e.target.value)}
                    className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
                  />
                  {repuestoSearchLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-[#0d9488]" />
                    </div>
                  ) : selectedRepuesto ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
                      <p className="text-sm font-semibold text-gray-900">{selectedRepuesto.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                        {selectedRepuesto.sku ? <span>SKU: {selectedRepuesto.sku}</span> : null}
                        <span
                          className={cn(
                            'font-medium',
                            selectedRepuesto.quantity <= 0 ? 'text-red-600' : 'text-[#0d9488]'
                          )}
                        >
                          Stock en inventario: {selectedRepuesto.quantity}
                        </span>
                        <span>P. venta: {currSym}{Number(selectedRepuesto.price || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-xs text-gray-600">Cantidad en el ticket:</label>
                        <input
                          type="number"
                          min={1}
                          max={selectedRepuesto.quantity > 0 ? selectedRepuesto.quantity : undefined}
                          value={repuestoQty}
                          onChange={(e) => setRepuestoQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-20 border border-gray-300 bg-white rounded px-2 py-1 text-sm"
                        />
                      </div>
                      {repuestoQty > (selectedRepuesto.quantity || 0) && (selectedRepuesto.quantity || 0) > 0 ? (
                        <p className="text-[11px] text-amber-700">La cantidad supera el stock registrado; revisa el inventario.</p>
                      ) : null}
                      {selectedRepuesto.quantity <= 0 ? (
                        <p className="text-[11px] text-red-600">Este repuesto figura con stock 0 en inventario.</p>
                      ) : null}
                      <button
                        type="button"
                        className="text-xs text-[#0d9488] hover:underline"
                        onClick={() => { setSelectedRepuesto(null); setRepuestoQty(1); }}
                      >
                        Elegir otro repuesto
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 [-webkit-overflow-scrolling:touch]">
                      {repuestoResults.length === 0 ? (
                        <p className="p-4 text-center text-xs text-gray-400">Sin resultados. Crea repuestos en Inventario.</p>
                      ) : (
                        repuestoResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedRepuesto(p);
                              setRepuestoQty(1);
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#0d9488]/5 transition-colors"
                          >
                            <span className="font-medium text-gray-900 block truncate">{p.name}</span>
                            <span className="text-xs text-gray-500">
                              {p.sku ? `${p.sku} · ` : ''}
                              <span className={cn(p.quantity <= 0 ? 'text-red-600 font-medium' : 'text-gray-700')}>
                                Stock: {p.quantity}
                              </span>
                              {p.unit_cost != null ? ` · Coste ${currSym}${Number(p.unit_cost).toFixed(2)}` : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <button
                    type="button"
                    onClick={resetRepuestoModal}
                    className="text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedRepuesto}
                    onClick={() => void handleAddPartFromInventario()}
                    className="text-sm px-4 py-2 rounded-md bg-[#0d9488] text-white hover:bg-[#0f766e] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Añadir al ticket
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          <div className="bg-white border border-gray-200 rounded-md mt-4">
            <div className="border-b border-gray-200 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max">
                {COMMENT_TABS.map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn('px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors touch-manipulation', activeTab === tab.key ? 'border-[#0d9488] text-[#0d9488]' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                    {tab.label}
                    {tab.key !== 'tareas' && comments.filter(c => c.comment_type === tab.key || (tab.key === 'privados' && c.is_private)).length > 0 && (
                      <span className="ml-1.5 text-xs bg-repairdesk-100 text-repairdesk-600 px-1.5 py-0.5 rounded-full">{comments.filter(c => c.comment_type === tab.key || (tab.key === 'privados' && c.is_private)).length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'email_sms' ? (
              <div className="p-4">
                {emailPreview ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 text-sm">Vista previa del email</h3>
                      <button onClick={() => setEmailPreview(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3" style={{ height: '520px' }}>
                      <iframe srcDoc={emailBody} className="w-full h-full" title="Email preview" />
                    </div>
                    {additionalNote.trim() ? (
                      <p className="text-xs text-gray-500 mb-3">
                        La nota para el cliente ya está integrada en el cuerpo del correo (apartado «Mensaje del taller»).
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <button onClick={handleSendEmail} disabled={sendingEmail} className="flex items-center gap-2 bg-[#0d9488] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded text-sm font-medium">
                        {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar a {emailTo}
                      </button>
                      <button onClick={() => setEmailPreview(false)} className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">Editar</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">A:</label>
                        <input value={emailTo} onChange={e => setEmailTo(e.target.value)} className="w-full border border-gray-300 bg-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0d9488]" placeholder="email@cliente.com" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">C.C.:</label>
                        <input value={emailCC} onChange={e => setEmailCC(e.target.value)} className="w-full border border-gray-300 bg-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0d9488]" placeholder="cc@email.com" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Respuesta enlazada:</label>
                        <div className="relative" ref={templateRef}>
                          <button
                            onClick={() => setTemplateDropdown(!templateDropdown)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0d9488] text-left flex items-center justify-between bg-white hover:bg-gray-50"
                          >
                            <span className={selectedTemplate ? 'text-gray-900' : 'text-gray-400'}>{selectedTemplate?.name || 'Seleccionar plantilla...'}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          </button>
                          {templateDropdown && (
                            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 w-72">
                              <div className="p-1.5 border-b border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 px-2 py-1 uppercase tracking-wide">Plantillas de email</p>
                              </div>
                              <div className="max-h-64 overflow-y-auto py-1 [-webkit-overflow-scrolling:touch]">
                                {buildTicketEmailTemplates().map((tmpl) => (
                                  <button key={tmpl.id} onClick={() => applyTemplate(tmpl)} className={cn('w-full text-left px-3 py-2.5 text-sm hover:bg-repairdesk-50 transition-colors', selectedTemplate?.id === tmpl.id && 'bg-repairdesk-50 text-[#0d9488] font-medium')}>
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                      {tmpl.name}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Asunto:</label>
                      <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full border border-gray-300 bg-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0d9488]" placeholder="Asunto del correo..." />
                    </div>

                    {emailBody && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500">Plantilla seleccionada:</label>
                          <button onClick={() => setEmailPreview(true)} className="text-xs text-[#0d9488] hover:underline flex items-center gap-1">
                            <Eye className="h-3 w-3" />Vista previa
                          </button>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '280px' }}>
                          <iframe
                            srcDoc={emailBody}
                            className="w-full h-full"
                            title="Email preview small"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Mensaje personalizado para el cliente (opcional):</label>
                      <textarea value={additionalNote} onChange={e => setAdditionalNote(e.target.value)} rows={3} className="w-full border border-gray-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0d9488] resize-none" placeholder="Aparecerá en el correo en el apartado «Mensaje del taller», debajo de los datos del cliente." />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openWhatsAppModal()}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#0d9488] hover:bg-[#1d4ed8] text-white rounded font-medium disabled:opacity-50"
                        >
                          <WhatsAppLogo className="h-3.5 w-3.5 shrink-0" />
                          Enviar
                        </button>
                        <WhatsAppBudgetButton
                          size="sm"
                          ticket={{
                            ticket_number: ticket.ticket_number,
                            customer_name: ticket.customers?.name ?? 'Cliente',
                            customer_phone: ticket.customers?.phone ?? null,
                            device_brand: ticket.device_brand,
                            device_model: ticket.device_model,
                            device_type: ticket.device_type,
                            issue_description: ticket.issue_description,
                            parts: parts.map((p) => ({
                              part_name: p.part_name,
                              quantity: p.quantity,
                              unit_cost: p.unit_cost,
                              total_cost: p.total_cost,
                            })),
                            estimated_cost: ticket.estimated_cost,
                            final_cost: ticket.final_cost,
                            country: effectiveOrgCountry,
                            currency_symbol: currSym,
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        {emailBody && (
                          <button onClick={() => setEmailPreview(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                            <Eye className="h-3.5 w-3.5" />Vista previa
                          </button>
                        )}
                        <button
                          onClick={handleSendEmail}
                          disabled={!emailTo.trim() || sendingEmail}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#0d9488] hover:bg-[#1d4ed8] text-white rounded font-medium disabled:opacity-50"
                        >
                          {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Enviar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                {activeTab === 'tareas' && (
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <input
                      type="checkbox"
                      id="showSystemMessages"
                      checked={showSystemMessages}
                      onChange={(e) => setShowSystemMessages(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#0d9488] focus:ring-[#0d9488]"
                    />
                    <label htmlFor="showSystemMessages" className="text-sm text-[#0d9488] cursor-pointer">
                      Mostrar mensajes del sistema
                    </label>
                  </div>
                )}
                <>
                  {activeTab === 'privados' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-yellow-600" />
                      <p className="text-xs text-yellow-700">Los comentarios privados solo son visibles para el equipo interno.</p>
                    </div>
                  )}
                  {activeTab === 'diagnostico' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                      <p className="text-xs text-blue-700">Las notas de diagnóstico son registros técnicos del proceso de reparación.</p>
                    </div>
                  )}
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={activeTab === 'privados' ? 'Comentario interno privado...' : activeTab === 'diagnostico' ? 'Registrar hallazgos técnicos...' : 'Escribir comentario...'}
                    rows={3}
                    className="w-full border border-gray-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0d9488] resize-none"
                  />
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => void handlePolishComment()}
                      disabled={polishingComment || !commentText.trim()}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {polishingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Pulir con IA
                    </button>
                    <button onClick={handleAddComment} disabled={!commentText.trim() || savingComment} className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#0d9488] hover:bg-[#1d4ed8] text-white rounded disabled:opacity-50 ml-auto">
                      {savingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Guardar
                    </button>
                  </div>
                </>

                {tabComments.length > 0 && (
                  <div className="border-t border-gray-200 pt-3 mt-3 space-y-3">
                    {tabComments.map((comment) => {
                      let bgClass = 'bg-gray-50 border-gray-100';
                      let badge = null;
                      let avatarColor = '#0d9488';

                      if (comment.comment_type === 'sistema') {
                        bgClass = 'bg-red-50 border-red-100';
                        badge = <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">sistema</span>;
                        avatarColor = '#dc2626';
                      } else if (comment.comment_type === 'estado') {
                        bgClass = 'bg-sky-50 border-sky-100';
                        badge = <span className="text-xs bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">estado</span>;
                        avatarColor = '#0284c7';
                      } else if (comment.comment_type === 'acceso') {
                        bgClass = 'bg-emerald-50 border-emerald-100';
                        badge = <span className="text-xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">lectura</span>;
                        avatarColor = '#059669';
                      } else if (comment.comment_type === 'pieza') {
                        bgClass = 'bg-violet-50 border-violet-100';
                        badge = <span className="text-xs bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded">pieza / inventario</span>;
                        avatarColor = '#7c3aed';
                      } else if (comment.comment_type === 'nota_ticket') {
                        bgClass = 'bg-teal-50 border-teal-100';
                        badge = <span className="text-xs bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">nota en ticket</span>;
                        avatarColor = '#0f766e';
                      } else if (comment.comment_type === 'diagnostico') {
                        bgClass = 'bg-amber-50 border-amber-100';
                        badge = <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">diagnóstico</span>;
                        avatarColor = '#d97706';
                      } else if (comment.is_private) {
                        bgClass = 'bg-yellow-50 border-yellow-200';
                        badge = <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">privado</span>;
                        avatarColor = '#ca8a04';
                      }

                      const displayHeadline = comment.user_id
                        ? formatActivityAuthorLabel({
                            userId: comment.user_id,
                            emailFallback:
                              legacyStoredAuthorPersonPrefix(comment.author_name) || 'Usuario',
                            roleByUserId: commentUserRoleById,
                            displayNameByUserId: commentUserDisplayNameById,
                          })
                        : (comment.author_name || 'Usuario').trim();

                      const displayContent = beautifyActivityCommentMarkdownContent(
                        comment.content,
                        comment.author_name,
                        displayHeadline
                      );

                      const lockedTypes = ['estado', 'acceso', 'email_sms', 'sistema', 'pieza', 'nota_ticket'];
                      const tipoInmutable =
                        lockedTypes.includes(comment.comment_type) || comment.immutable_comment === true;
                      const canEditCommentRow =
                        Boolean(sessionUserId) &&
                        comment.user_id === sessionUserId &&
                        !tipoInmutable &&
                        ['tareas', 'hacer', 'privados', 'diagnostico'].includes(
                          comment.comment_type,
                        );

                      const showEdited =
                        Boolean(comment.updated_at) &&
                        new Date(comment.updated_at as string).getTime() -
                          new Date(comment.created_at).getTime() >
                          2000;

                      const avatarUrl =
                        comment.user_id && commentUserAvatarUrlById.get(comment.user_id)?.trim()
                          ? commentUserAvatarUrlById.get(comment.user_id)!.trim()
                          : null;
                      const showAvatarPhoto =
                        Boolean(avatarUrl) && !commentAvatarBrokenUserIds.has(comment.user_id);

                      return (
                        <div key={comment.id} className="flex gap-3">
                          {showAvatarPhoto ? (
                            <img
                              src={avatarUrl!}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/40"
                              onError={() =>
                                setCommentAvatarBrokenUserIds((prev) => {
                                  const next = new Set(prev);
                                  next.add(comment.user_id);
                                  return next;
                                })
                              }
                            />
                          ) : (
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white/25"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {activityAuthorAvatarInitial(displayHeadline)}
                            </div>
                          )}
                          <div className={cn('flex-1 rounded-lg p-3 text-sm border', bgClass)}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-semibold text-gray-900">{displayHeadline}</span>
                                {badge}
                              </div>
                              {canEditCommentRow ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  {editingCommentId === comment.id ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void handleSaveCommentEdit()}
                                        disabled={savingCommentEdit}
                                        className="text-xs px-2 py-1 rounded bg-[#0d9488] text-white disabled:opacity-50"
                                      >
                                        {savingCommentEdit ? '…' : 'Guardar'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditingCommentText('');
                                        }}
                                        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingCommentText(comment.content);
                                      }}
                                      className="text-gray-400 hover:text-[#0d9488] p-0.5"
                                      title="Editar texto"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              ) : null}
                            </div>
                            {editingCommentId === comment.id ? (
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 bg-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0d9488] resize-none"
                              />
                            ) : (
                              <p className="text-gray-700 whitespace-pre-wrap">{displayContent}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1.5">
                              {formatShort(comment.created_at)}
                              {showEdited ? (
                                <span className="ml-2 text-gray-400">(editado)</span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(activeTab === 'archivos') && (
                  <div className="py-4">
                    <input
                      type="file"
                      id="ticket-attachment-upload"
                      className="hidden"
                      multiple
                      onChange={(e) => void handleUploadAttachments(e)}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                    {(() => {
                      const attachments = images.filter((i) => i.image_type === 'attachment');
                      const labelBtn = (
                        <label
                          htmlFor="ticket-attachment-upload"
                          className="mt-3 inline-block text-sm text-[#0d9488] hover:underline cursor-pointer"
                        >
                          + Subir archivo
                        </label>
                      );
                      if (attachments.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-500">Sin archivos adjuntos</p>
                            {labelBtn}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          <ul className="space-y-2">
                            {attachments.map((att) => {
                              const name = att.file_name || att.description || 'Archivo';
                              const thumb = /\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(name);
                              return (
                                <li
                                  key={att.id}
                                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                                >
                                  {thumb ? (
                                    <a
                                      href={
                                        ticketImageDisplayById[att.id] ??
                                        att.image_url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-12 w-12 shrink-0 overflow-hidden rounded border border-gray-100 bg-gray-50"
                                    >
                                      <img
                                        src={
                                          ticketImageDisplayById[att.id] ??
                                          att.thumbnail_url ??
                                          att.image_url
                                        }
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    </a>
                                  ) : (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-gray-100 bg-gray-50">
                                      <FileText className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <a
                                      href={
                                        ticketImageDisplayById[att.id] ??
                                        att.image_url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-[#0d9488] hover:underline break-all"
                                    >
                                      {name}
                                    </a>
                                    <p className="text-xs text-gray-400">{formatShort(att.created_at)}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteImage(att.id)}
                                    className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          {labelBtn}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col border-t border-gray-200 bg-white pb-24 lg:w-80 lg:border-l lg:border-t-0 lg:pb-10">
          <div className="order-1 flex flex-col lg:order-2">
          <div className="border-b border-gray-200">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <User className="h-4 w-4 text-gray-500" />Información del cliente
              </div>
              <ChevronUp className="h-4 w-4 text-gray-400" />
            </div>
            {ticket.customers ? (
              <div className="px-4 pb-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  <span className="text-gray-500 text-xs">Nombre</span>
                  <Link href={`/dashboard/customers`} className="font-semibold text-[#0d9488] hover:underline text-xs">{ticket.customers.name}</Link>
                  {ticket.customers.email && (<><span className="text-gray-500 text-xs">Email</span><a href={`mailto:${ticket.customers.email}`} className="text-blue-600 hover:underline text-xs break-all">{ticket.customers.email}</a></>)}
                  {ticket.customers.phone && (<><span className="text-gray-500 text-xs">Teléfono</span><span className="text-xs text-gray-900">{ticket.customers.phone}</span></>)}
                  {ticket.customers.customer_group && (<><span className="text-gray-500 text-xs">Grupo</span><span className="text-xs text-gray-900">{ticket.customers.customer_group}</span></>)}
                  {ticket.customers.organization && (<><span className="text-gray-500 text-xs">Organización</span><span className="text-xs text-gray-900">{ticket.customers.organization}</span></>)}
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button onClick={() => { setActiveTab('email_sms'); setEmailTo(ticket.customers?.email || ''); }} className="text-xs text-[#0d9488] border border-[#0d9488] rounded px-2.5 py-1 hover:bg-blue-50 flex items-center gap-1">
                    <Mail className="h-3 w-3" />Email
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsAppModal()}
                    className="text-xs font-medium rounded px-2.5 py-1 flex items-center gap-1 bg-[#0d9488] hover:bg-[#1d4ed8] text-white"
                  >
                    <WhatsAppLogo className="h-3 w-3 shrink-0" />
                    Enviar
                  </button>
                  <button 
                    onClick={() => loadCustomerOrders()}
                    className="text-xs text-gray-600 border border-gray-300 rounded px-2.5 py-1 hover:bg-gray-50 flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />Órdenes del Cliente
                  </button>
                </div>
              </div>
            ) : <div className="px-4 pb-4 text-sm text-gray-400">Sin cliente asignado</div>}
          </div>

          <div className="border-b border-gray-200">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Info className="h-4 w-4 text-gray-500" />Información del dispositivo
              </div>
              <ChevronUp className="h-4 w-4 text-gray-400" />
            </div>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
                <span className="text-gray-500">Nº de serie / IMEI</span>
                <span className="text-gray-900 font-medium font-mono">{ticket.imei || ticket.serial_number || '---'}</span>
                <span className="text-gray-500">Pin / Patrón</span>
                <button
                  type="button"
                  onClick={openDeviceLockModal}
                  className="text-left text-gray-900 whitespace-pre-wrap break-words rounded px-0.5 -mx-0.5 hover:text-[#0d9488] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
                >
                  {ticket.pin_pattern || 'No tiene'}
                </button>
                {ticket.device_brand ? (
                  <>
                    <span className="text-gray-500">Marca</span>
                    <span className="text-gray-900">
                      {ticket.device_brand}
                      {ticket.device_category === 'SMART_TV' && ticket.device_screen_inches?.trim()
                        ? ` · ${ticket.device_screen_inches.trim()}`
                        : ''}
                    </span>
                  </>
                ) : null}
                {ticket.device_model ? (
                  <>
                    <span className="text-gray-500">Modelo</span>
                    <span className="text-gray-900">{ticket.device_model}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Historial clínico del dispositivo */}
          {deviceHistoryLoaded && deviceHistory.length > 0 && (
            <div className="border-b border-amber-200 bg-amber-50">
              <div className="px-4 py-3 flex items-center gap-2">
                <History className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm font-semibold text-amber-800">
                  Historial del dispositivo
                </span>
                <span className="ml-auto text-xs font-medium bg-amber-200 text-amber-800 rounded-full px-2 py-0.5">
                  {deviceHistory.length} visita{deviceHistory.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="px-4 pb-3 space-y-2">
                {deviceHistory.map((t) => (
                  <a
                    key={t.id}
                    href={`/dashboard/tickets/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-0.5 p-2 rounded-md border border-amber-200 bg-white hover:bg-amber-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0d9488] group-hover:underline">
                        #{t.ticket_number}
                      </span>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {new Date(t.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2">
                      {t.issue_description}
                    </p>
                    <span className={`self-start mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      t.status === 'reparado' || t.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : t.status === 'no_reparado' || t.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {t.status}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <TicketWarrantyEditor
            ticketId={ticket.id}
            status={ticket.status}
            warranty_start_date={ticket.warranty_start_date}
            warranty_end_date={ticket.warranty_end_date}
            warranty_info={ticket.warranty_info}
            defaultCollapsed
            onPatch={(patch) =>
              setTicket((prev) => (prev && prev.id === ticket.id ? { ...prev, ...patch } : prev))
            }
          />
          </div>

          <div className="order-2 border-t border-gray-200 bg-white lg:order-1 lg:border-b lg:border-gray-200 lg:border-t-0">
            <div className="border-b border-gray-200">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Receipt className="h-4 w-4 text-gray-500" />Facturación
              </div>
              <ChevronUp className="h-4 w-4 text-gray-400" />
            </div>
            <div className="px-4 pb-4 text-sm">
              <p className="text-[#0d9488] text-xs font-medium mb-3">1 Artículo</p>
              <div className="border border-gray-200 rounded-lg p-2.5 mb-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-gray-100 rounded flex-shrink-0 mt-0.5 flex items-center justify-center">
                    <Phone className="h-3 w-3 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 leading-tight truncate">{ticket.device_type} — {ticket.issue_description.substring(0, 30)}</div>
                    {editingPrice ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="0.01"
                          value={priceValue}
                          onChange={e => setPriceValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSavePrice(); if (e.key === 'Escape') setEditingPrice(false); }}
                          autoFocus
                          className="border border-[#0d9488] rounded px-2 py-1 text-xs w-24 focus:outline-none"
                          placeholder="0.00"
                        />
                        <button onClick={handleSavePrice} className="bg-[#0d9488] text-white text-xs px-2 py-1 rounded">{savingPrice ? '...' : 'OK'}</button>
                        <button onClick={() => setEditingPrice(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingPrice(true); setPriceValue((ticket.estimated_cost || 0).toFixed(2)); }} className="text-xs text-gray-900 font-bold mt-1 flex items-center gap-1 group hover:text-[#0d9488]">
                        {currSym}{total.toFixed(2)}
                        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 py-2 mb-2 border border-gray-200 rounded-lg px-2.5 bg-white">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800">Sumar IVA 21%</p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {applyIvaEffective
                      ? 'Total = base + IVA (mismo criterio al imprimir)'
                      : 'El total es el importe del servicio, sin sumar IVA'}
                  </p>
                </div>
                <Switch
                  checked={applyIvaEffective}
                  onCheckedChange={(c) => void handleApplyIvaChange(c)}
                  disabled={savingApplyIva}
                  className="data-[state=checked]:bg-[#0d9488] shrink-0"
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 mb-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-800">Seña / adelanto al ingreso</span>
                  <p className="text-[10px] text-gray-500 leading-snug">
                    Opcional. Se suma al &quot;Pagado&quot; junto con los cobros en caja. Si ya registraste la seña como cobro, dejá 0.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 tabular-nums">{currSym}</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 text-xs max-w-[120px]"
                      value={depositDraft}
                      onChange={(e) => setDepositDraft(e.target.value)}
                      onBlur={() => void handleSaveDeposit()}
                      disabled={savingDeposit || billingPaidAmount >= billingGrandTotal}
                      placeholder={billingPaidAmount >= billingGrandTotal ? 'Pagado' : '0'}
                      title={billingPaidAmount >= billingGrandTotal ? 'La factura ya está pagada en su totalidad' : ''}
                    />
                    {savingDeposit ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0" /> : null}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                {applyIvaEffective ? (
                  <div className="text-[10px] text-gray-600 space-y-0.5 mb-2 pb-2 border-b border-gray-200">
                    <div className="flex justify-between">
                      <span>Base imponible</span>
                      <span className="font-medium text-gray-800">
                        {currSym}
                        {total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA 21%</span>
                      <span className="font-medium text-gray-800">
                        {currSym}
                        {billingIvaAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-3 gap-1 text-xs mb-1.5">
                  <div>
                    <span className="text-gray-500">Total</span>
                    <p className="font-bold text-gray-900">
                      {currSym}
                      {billingGrandTotal.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Pagado</span>
                    <p className="font-bold text-green-600">
                      {currSym}
                      {billingPaidAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Pendiente</span>
                    <p className="font-bold text-red-500">
                      {currSym}
                      {billingPendingAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-[#0d9488] font-medium pt-1 border-t border-gray-200">
                  Utilidad estimada: {currSym}
                  {total.toFixed(2)}
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {myPerms.can_collect_payment ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      disabled={!canCollectMore}
                      className="min-w-0 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <CreditCard className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Cobrar</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canCollectMore}
                      onClick={async () => {
                        const amountDue =
                          collectionDueAmount > 0
                            ? collectionDueAmount
                            : billingGrandTotal > 0
                              ? billingGrandTotal
                              : ticket?.final_cost || ticket?.estimated_cost || 0;
                        await handleProcessPayment({ method: 'cash', amount: amountDue });
                      }}
                      className="min-w-0 text-xs border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Banknote className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Efectivo</span>
                    </button>
                    {(myPerms.can_collect_payment || myPerms.can_edit_tickets) && !myPerms.loading ? (
                      <button
                        type="button"
                        onClick={openReturnModal}
                        className="relative min-w-0 text-xs bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Devolución al cliente"
                      >
                        <Undo2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Devolución</span>
                        {returnPending ? (
                          <span
                            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white shadow-sm"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    ) : null}
                  </div>
                ) : myPerms.can_edit_tickets && !myPerms.loading ? (
                  <button
                    type="button"
                    onClick={openReturnModal}
                    className="relative w-full text-xs bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    title="Devolución al cliente"
                  >
                    <Undo2 className="h-3.5 w-3.5 shrink-0" />
                    Devolución
                    {returnPending ? (
                      <span
                        className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-white shadow-sm"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                ) : (
                  <p className="w-full text-center text-[11px] text-gray-400 py-2 border border-dashed border-gray-200 rounded-lg">
                    Sin permiso de cobro
                  </p>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* VISTA DE IMPRESIÓN - FORMATO IMPRESORA TÉRMICA */}
      {showPrintView && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print-view">
          <div className="max-w-[80mm] mx-auto p-2 text-xs leading-tight">
            {/* Botones (ocultos al imprimir) */}
            <div className="flex justify-end gap-2 mb-4 print:hidden">
              <button 
                onClick={() => { window.print(); setShowPrintView(false); }}
                className="bg-[#0d9488] text-white px-3 py-1 rounded text-sm"
              >
                🖨️ Imprimir
              </button>
              <button 
                onClick={() => setShowPrintView(false)}
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Header - Orden Nº */}
            <div className="text-center border-b border-gray-800 pb-2 mb-3">
              <h1 className="text-base font-bold">Orden Nº{ticket.ticket_number}</h1>
            </div>

            {/* Info Tienda */}
            <div className="text-center mb-3">
              {shopSettings?.shop_name?.trim() ? <p className="font-bold">{shopSettings.shop_name}</p> : null}
              {shopSettings?.address?.trim() ? <p>{shopSettings.address}</p> : null}
              {shopSettings?.phone?.trim() ? <p>Tel.: {shopSettings.phone}</p> : null}
              {shopSettings?.registration_number?.trim() ? (
                <p>{shopSettings?.currency === 'ARS' ? 'CUIT' : 'N.º registro / CIF'}: {shopSettings.registration_number}</p>
              ) : null}
            </div>

            {/* Separador */}
            <div className="border-b border-gray-400 my-2"></div>

            {/* Info Cliente */}
            <div className="mb-3">
              <p className="font-bold uppercase">{ticket.customers?.name || 'Cliente'}</p>
              {ticket.customers?.email && <p>Correo electrónico:{ticket.customers.email}</p>}
              {ticket.customers?.address && <p>Dirección:{ticket.customers.address}</p>}
              {ticket.customers?.organization && <p>Organización:{ticket.customers.organization}</p>}
            </div>

            {/* Separador */}
            <div className="border-b border-gray-400 my-2"></div>

            {/* Ticket y Fecha */}
            <div className="mb-2">
              <p><span className="font-bold">Ticket:</span> {ticket.ticket_number}</p>
              <p><span className="font-bold">Fecha:</span> {new Date(ticket.created_at).toLocaleDateString('es-ES')}</p>
            </div>

            {/* Tabla de dispositivo */}
            <table className="w-full border-collapse mb-2">
              <thead>
                <tr className="border-t-2 border-b-2 border-gray-800">
                  <th className="text-left py-1 font-bold">Nombre</th>
                  <th className="text-center py-1 font-bold">Cantidad</th>
                  <th className="text-right py-1 font-bold">Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1">
                    <p className="font-bold uppercase">{ticket.device_type}</p>
                  </td>
                  <td className="text-center py-1">1</td>
                  <td className="text-right py-1">{currSym} {total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Lo que el cliente declara al entregar el equipo — siempre visible en el ticket */}
            <div className="mb-3 text-[10px]">
              <p className="text-[11px] font-bold text-gray-900 mb-1">Descripción del problema</p>
              {ticket.issue_description?.trim() ? (
                <p className="text-[10px] text-gray-900 whitespace-pre-wrap leading-snug">
                  {ticket.issue_description.trim()}
                </p>
              ) : null}
            </div>

            {/* Datos técnicos del equipo — solo si hay algo que mostrar */}
            {(() => {
              const brand = ticket.device_brand?.trim();
              const devType = ticket.device_type?.trim();
              const devModel = ticket.device_model?.trim();
              const inches =
                ticket.device_category === 'SMART_TV'
                  ? ticket.device_screen_inches?.trim()
                  : '';
              const hasDescBlock = !!(brand || devType || devModel || inches);
              if (!hasDescBlock) return null;
              return (
                <div className="mb-3 text-[10px]">
                  <p><span className="font-bold">Equipo:</span></p>
                  {brand ? (
                    <p className="uppercase">
                      Fabricante: {brand}
                      {inches ? ` · ${inches}` : ''}
                    </p>
                  ) : null}
                  {devType ? <p>Dispositivo: {devType}</p> : null}
                  {devModel ? <p>Modelo: {devModel}</p> : null}
                </div>
              );
            })()}

            {/* Notas — solo si hay texto guardado */}
            {ticket.notes?.trim() ? (
              <div className="mb-3 text-[10px]">
                <p className="font-bold">Notas:</p>
                <p className="whitespace-pre-wrap mt-0.5">{ticket.notes.trim()}</p>
              </div>
            ) : null}
            {ticket.diagnostic_notes?.trim() ? (
              <div className="mb-3 text-[10px]">
                <p className="font-bold">Notas de diagnóstico:</p>
                <p className="whitespace-pre-wrap mt-0.5">{ticket.diagnostic_notes.trim()}</p>
              </div>
            ) : null}

            {/* Garantía */}
            <div className="mb-3 text-[10px]">
              {(() => {
                const wb = computeWarrantyBadge({
                  warranty_start_date: ticket.warranty_start_date,
                  warranty_end_date: ticket.warranty_end_date,
                  warranty_info: ticket.warranty_info,
                });
                const ws = ticket.warranty_start_date ? String(ticket.warranty_start_date).slice(0, 10) : '';
                const we = ticket.warranty_end_date ? String(ticket.warranty_end_date).slice(0, 10) : '';
                const wm = ws && we && we >= ws ? warrantyMonthsBetween(ws, we) : null;
                return (
                  <>
                    <p>
                      <span className="font-bold">Garantía (etiqueta):</span>{' '}
                      {ticket.warranty_info || 'Sin garantía'}
                    </p>
                    {ws || we ? (
                      <p className="mt-0.5">
                        <span className="font-bold">Período:</span>{' '}
                        {ws ? formatWarrantyDateEs(ws) : '—'} → {we ? formatWarrantyDateEs(we) : '—'}
                        {wm != null ? (
                          <span className="font-semibold"> ({wm} mes{wm !== 1 ? 'es' : ''})</span>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="mt-0.5">
                      <span className="font-bold">Estado:</span> {wb.label}
                      {wb.detail ? ` — ${wb.detail}` : ''}
                    </p>
                  </>
                );
              })()}
            </div>

            {/* Separador */}
            <div className="border-b-2 border-gray-800 my-2"></div>

            {/* Totales */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span>{currSym} {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Descuento</span>
                <span>{currSym} 0.00</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (21%)</span>
                <span>{currSym} {printIvaAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-400 pt-1">
                <span>Total</span>
                <span>{currSym} {printTotalWithTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pagado</span>
                <span>{currSym} 0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Pendiente</span>
                <span>{currSym} {printTotalWithTax.toFixed(2)}</span>
              </div>
            </div>

            {/* Separador doble */}
            <div className="border-b-2 border-gray-800 my-2"></div>
            <div className="border-b border-gray-400 my-1"></div>

            {/* Condiciones y Garantía (ES / AR según país de la organización) */}
            <div className="text-[9px] leading-tight mb-3">
              <p className="font-bold mb-1">Condiciones y Garantía</p>
              <p className="whitespace-pre-wrap">{warrantyFootnote}</p>
            </div>

            {/* ── PICKING LIST (solo si hay repuestos con ubicación) ── */}
            {(() => {
              const pickParts = parts.filter(p => p.products?.storage_location);
              if (pickParts.length === 0) return null;
              return (
                <div className="mt-3 mb-2">
                  <div className="border-t-2 border-gray-800 pt-2 mb-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide">📦 Picking List — Repuestos a usar</p>
                  </div>
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-gray-400">
                        <th className="text-left py-0.5 font-semibold">Repuesto</th>
                        <th className="text-center py-0.5 font-semibold w-8">Cant.</th>
                        <th className="text-left py-0.5 font-semibold">📍 Ubicación</th>
                        <th className="text-center py-0.5 font-semibold w-8">✔</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickParts.map((p) => (
                        <tr key={p.id} className="border-b border-dashed border-gray-200">
                          <td className="py-1 pr-1">{p.part_name}</td>
                          <td className="py-1 text-center">{p.quantity}</td>
                          <td className="py-1 font-medium text-amber-800">{p.products?.storage_location}</td>
                          <td className="py-1 text-center">
                            <span className="inline-block w-3.5 h-3.5 border border-gray-400 rounded-sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[8px] text-gray-400 mt-1">El técnico debe marcar ✔ cada repuesto al retirarlo del almacén.</p>
                </div>
              );
            })()}

            {/* QR de seguimiento del estado */}
            {(() => {
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              if (!origin || !ticket.id) return null;
              const trackingUrl = `${origin}/check/${ticket.id}`;
              return (
                <PrintQrCode url={trackingUrl} />
              );
            })()}

            {/* Footer */}
            <div className="text-center mt-4 pt-2 border-t border-gray-400">
              <p className="font-bold text-sm">
                {shopSettings?.shop_name?.trim()
                  ? `Muchas gracias por confiar en ${shopSettings.shop_name}`
                  : 'Muchas gracias por confiar en nosotros'}
              </p>
            </div>

            {/* CSS para impresión térmica */}
            <style>{`
              @media print {
                .print-view { 
                  position: static; 
                  width: 80mm;
                  max-width: 80mm;
                }
                .print\\:hidden { display: none !important; }
                body { 
                  background: white; 
                  width: 80mm;
                  font-size: 10px;
                }
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* MODAL DE ÓRDENES DEL CLIENTE */}
      {showCustomerOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Órdenes del Cliente</h2>
                <p className="text-sm text-gray-500">{ticket.customers?.name || 'Cliente'}</p>
              </div>
              <button 
                onClick={() => setShowCustomerOrders(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Contenido */}
            <div className="p-6">
              {loadingCustomerOrders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0d9488]" />
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay órdenes anteriores para este cliente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Total de órdenes: {customerOrders.length}
                  </p>
                  {customerOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/tickets/${order.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[#0d9488]">
                              #{order.ticket_number}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              order.status === 'completed' ? 'bg-green-100 text-green-700' :
                              order.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium">{order.device_type}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{order.issue_description}</p>
                          {order.estimated_cost > 0 && (
                            <p className="text-sm font-medium text-gray-900 mt-2">
                              {currSym}{order.estimated_cost.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500 ml-4">
                          <p>{new Date(order.created_at).toLocaleDateString('es-ES')}</p>
                          <p className="mt-1">{new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button 
                onClick={() => setShowCustomerOrders(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {labelPrintData ? (
        <TicketLabelPrintSheet
          open={showLabelPrint}
          onOpenChange={setShowLabelPrint}
          templateId={labelTemplateId}
          data={labelPrintData}
          isArgentina={isArgentinaUi}
        />
      ) : null}

      <WhatsAppQuickSendModal
        open={waModal.open}
        onOpenChange={(open) => {
          if (!open) setWaModal({ open: false, defaultMessage: '' });
        }}
        customerName={ticket?.customers?.name || 'Cliente'}
        phone={ticket?.customers?.phone}
        defaultMessage={waModal.defaultMessage}
        deviceCategory={ticket?.device_category}
        deviceType={ticket?.device_type}
        deviceBrand={ticket?.device_brand}
        deviceModel={ticket?.device_model}
      />

      <Dialog open={deviceLockModalOpen} onOpenChange={setDeviceLockModalOpen}>
        <DialogContent
          className="sm:max-w-md gap-0 p-0 hover:scale-100 motion-reduce:hover:scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 space-y-1 pr-12">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Bloqueo del dispositivo — Detalles
            </DialogTitle>
            <DialogDescription className="sr-only">
              Editar código de acceso o patrón de desbloqueo del dispositivo.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <DeviceUnlockInputs
              key={deviceLockFormKey}
              pin={deviceLockPin}
              pattern={deviceLockPattern}
              onPinChange={setDeviceLockPin}
              onPatternChange={setDeviceLockPattern}
              sectionLabel="Tipo de bloqueo"
              className="[&_.rounded-lg]:shadow-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 px-6 py-4 border-t border-gray-200 bg-gray-50/80 rounded-b-lg">
            <button
              type="button"
              onClick={() => setDeviceLockModalOpen(false)}
              disabled={savingDeviceLock}
              className="text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDeviceLock()}
              disabled={savingDeviceLock}
              className="text-sm px-4 py-2 rounded-md bg-[#0d9488] text-white hover:bg-[#0f766e] disabled:opacity-50 inline-flex items-center justify-center gap-2 min-w-[7rem]"
            >
              {savingDeviceLock ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(imageLightbox)}
        onOpenChange={(open) => {
          if (!open) setImageLightbox(null);
        }}
      >
        <DialogContent
          className="max-h-[92vh] w-auto max-w-[min(96vw,1280px)] gap-2 overflow-y-auto border-gray-200 p-3 sm:p-4 hover:scale-100 motion-reduce:hover:scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Vista de imagen</DialogTitle>
            <DialogDescription>Evidencia ampliada del ticket.</DialogDescription>
          </DialogHeader>
          {imageLightbox ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageLightbox.url}
              alt={imageLightbox.alt}
              className="mx-auto max-h-[min(90vh,1080px)] w-full max-w-full object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Modal de cobro ── */}
      <PaymentModal
        open={showPaymentModal}
        totalDue={
          collectionDueAmount > 0
            ? collectionDueAmount
            : billingGrandTotal > 0
              ? billingGrandTotal
              : ticket?.final_cost || ticket?.estimated_cost || 0
        }
        referenceTotal={
          billingGrandTotal > 0 &&
          collectionDueAmount > 0 &&
          billingGrandTotal > collectionDueAmount + 0.01
            ? billingGrandTotal
            : null
        }
        currencySymbol={shopSettings?.currency_symbol || currSym || '€'}
        currency={shopSettings?.currency || 'ARS'}
        allowInvoiceWithoutAfip={isArgentinaUi && Boolean(shopSettings?.ar_allow_invoice_without_afip)}
        processingHint={
          isArgentinaUi
            ? 'Si corresponde factura electrónica y ARCA está activo, se solicita el CAE (puede tardar unos segundos).'
            : null
        }
        onConfirm={handleProcessPayment}
        onClose={() => setShowPaymentModal(false)}
      />

    </div>
  );
}
