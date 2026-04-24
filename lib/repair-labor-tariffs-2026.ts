/**
 * Tarifas de referencia mano de obra 2026 (Argentina, ARS, taller urbano orientativo).
 */

import {
  SERVICE_DEVICE_CATEGORY_LABELS,
  getCatalogIPhoneModels,
  getServiceCatalogBrands,
} from '@/lib/repair-service-device-catalog';
import { REPAIR_LABOR_MODEL_WILDCARD } from '@/lib/repair-labor-search';

export type LaborCountryCode = 'AR';

/** Claves de tipo de reparación → precio ARS (2026, referencia). */
export const LABOR_TIER_PRICES_2026: Record<string, { AR: number; note?: string }> = {
  mobile_screen: { AR: 128000 },
  mobile_battery: { AR: 58000 },
  mobile_charge_port: { AR: 45000 },
  mobile_mic_speaker: { AR: 40000 },
  mobile_camera: { AR: 52000 },
  mobile_software: { AR: 20000 },
  mobile_liquid_clean: { AR: 72000 },
  mobile_button_flex: { AR: 38000 },
  mobile_data_recovery: { AR: 28000 },
  mobile_board: { AR: 105000 },

  tablet_screen: { AR: 165000 },
  tablet_battery: { AR: 78000 },
  tablet_charge_port: { AR: 52000 },
  tablet_camera: { AR: 62000 },
  tablet_software: { AR: 22000 },
  tablet_liquid_clean: { AR: 82000 },
  tablet_board: { AR: 118000 },

  laptop_screen: { AR: 245000 },
  laptop_battery: { AR: 95000 },
  laptop_keyboard: { AR: 78000 },
  laptop_trackpad: { AR: 65000 },
  laptop_charging: { AR: 72000 },
  laptop_ssd_ram: { AR: 48000 },
  laptop_thermal: { AR: 55000 },
  laptop_hinge: { AR: 88000 },
  laptop_board: { AR: 165000 },

  console_hdmi: { AR: 38000 },
  console_controller: { AR: 32000 },
  console_fan_clean: { AR: 25000 },
  console_disc_laser: { AR: 48000 },
  console_software: { AR: 22000 },

  watch_screen: { AR: 105000 },
  watch_battery: { AR: 62000 },
  watch_sensor: { AR: 72000 },

  earphone_battery: { AR: 35000 },
  earphone_driver: { AR: 42000 },
  earphone_case_charge: { AR: 38000 },

  tv_panel: { AR: 320000 },
  tv_backlight: { AR: 135000 },
  tv_board: { AR: 105000 },
  tv_power: { AR: 72000 },
  tv_hdmi_ports: { AR: 48000 },
  tv_software: { AR: 28000 },

  av_amp_service: { AR: 92000 },
  av_speaker: { AR: 62000 },
  av_connector: { AR: 45000 },
  av_software_update: { AR: 22000 },

  other_diagnosis: { AR: 16000 },
  other_general: { AR: 38000 },
};

export type RepairTypeDef = { code: string; label: string; tier: keyof typeof LABOR_TIER_PRICES_2026 };

/** Tipos de reparación por categoría de equipo (etiquetas del catálogo). */
export const REPAIR_TYPES_BY_SERVICE_CATEGORY: Record<string, RepairTypeDef[]> = {
  Smartphones: [
    { code: 'mobile_screen', label: 'Cambio de pantalla', tier: 'mobile_screen' },
    { code: 'mobile_battery', label: 'Cambio de batería', tier: 'mobile_battery' },
    { code: 'mobile_charge_port', label: 'Reparación puerto de carga', tier: 'mobile_charge_port' },
    { code: 'mobile_mic_speaker', label: 'Micrófono / altavoz', tier: 'mobile_mic_speaker' },
    { code: 'mobile_camera', label: 'Reparación cámara', tier: 'mobile_camera' },
    { code: 'mobile_software', label: 'Software / desbloqueo', tier: 'mobile_software' },
    { code: 'mobile_liquid_clean', label: 'Limpieza por líquido', tier: 'mobile_liquid_clean' },
    { code: 'mobile_button_flex', label: 'Botones / flex', tier: 'mobile_button_flex' },
    { code: 'mobile_data_recovery', label: 'Copia / recuperación de datos', tier: 'mobile_data_recovery' },
    { code: 'mobile_board', label: 'Reparación placa base', tier: 'mobile_board' },
  ],
  Tablets: [
    { code: 'tablet_screen', label: 'Cambio de pantalla', tier: 'tablet_screen' },
    { code: 'tablet_battery', label: 'Cambio de batería', tier: 'tablet_battery' },
    { code: 'tablet_charge_port', label: 'Puerto de carga', tier: 'tablet_charge_port' },
    { code: 'tablet_camera', label: 'Cámara', tier: 'tablet_camera' },
    { code: 'tablet_software', label: 'Software / actualización', tier: 'tablet_software' },
    { code: 'tablet_liquid_clean', label: 'Limpieza por líquido', tier: 'tablet_liquid_clean' },
    { code: 'tablet_board', label: 'Placa / no enciende', tier: 'tablet_board' },
  ],
  'Laptops y PC': [
    { code: 'laptop_screen', label: 'Cambio de pantalla', tier: 'laptop_screen' },
    { code: 'laptop_battery', label: 'Batería interna', tier: 'laptop_battery' },
    { code: 'laptop_keyboard', label: 'Teclado', tier: 'laptop_keyboard' },
    { code: 'laptop_trackpad', label: 'Trackpad / touchpad', tier: 'laptop_trackpad' },
    { code: 'laptop_charging', label: 'Carga / jack CC', tier: 'laptop_charging' },
    { code: 'laptop_ssd_ram', label: 'Upgrade SSD / RAM', tier: 'laptop_ssd_ram' },
    { code: 'laptop_thermal', label: 'Mantenimiento térmico / ventilador', tier: 'laptop_thermal' },
    { code: 'laptop_hinge', label: 'Bisagras / carcasa', tier: 'laptop_hinge' },
    { code: 'laptop_board', label: 'Placa base / encendido', tier: 'laptop_board' },
  ],
  Consolas: [
    { code: 'console_hdmi', label: 'HDMI / salida vídeo', tier: 'console_hdmi' },
    { code: 'console_controller', label: 'Mandos / drift / sticks', tier: 'console_controller' },
    { code: 'console_fan_clean', label: 'Limpieza y ventilador', tier: 'console_fan_clean' },
    { code: 'console_disc_laser', label: 'Lector / láser (físico)', tier: 'console_disc_laser' },
    { code: 'console_software', label: 'Software / actualización', tier: 'console_software' },
  ],
  Smartwatch: [
    { code: 'watch_screen', label: 'Pantalla / cristal', tier: 'watch_screen' },
    { code: 'watch_battery', label: 'Batería', tier: 'watch_battery' },
    { code: 'watch_sensor', label: 'Sensores / carga', tier: 'watch_sensor' },
  ],
  Auriculares: [
    { code: 'earphone_battery', label: 'Batería (TWS)', tier: 'earphone_battery' },
    { code: 'earphone_driver', label: 'Driver / audio unilateral', tier: 'earphone_driver' },
    { code: 'earphone_case_charge', label: 'Estuche / pin carga', tier: 'earphone_case_charge' },
  ],
  'Smart TV': [
    { code: 'tv_panel', label: 'Panel / imagen', tier: 'tv_panel' },
    { code: 'tv_backlight', label: 'Retroiluminación LED', tier: 'tv_backlight' },
    { code: 'tv_board', label: 'Placa principal', tier: 'tv_board' },
    { code: 'tv_power', label: 'Fuente de alimentación', tier: 'tv_power' },
    { code: 'tv_hdmi_ports', label: 'Puertos HDMI', tier: 'tv_hdmi_ports' },
    { code: 'tv_software', label: 'Software / Smart TV', tier: 'tv_software' },
  ],
  'Equipos de audio y vídeo': [
    { code: 'av_amp_service', label: 'Amplificador / AVR', tier: 'av_amp_service' },
    { code: 'av_speaker', label: 'Altavoces / reparación cono', tier: 'av_speaker' },
    { code: 'av_connector', label: 'Conectores / soldadura', tier: 'av_connector' },
    { code: 'av_software_update', label: 'Firmware / configuración', tier: 'av_software_update' },
  ],
  Otros: [
    { code: 'other_diagnosis', label: 'Diagnóstico', tier: 'other_diagnosis' },
    { code: 'other_general', label: 'Reparación general', tier: 'other_general' },
  ],
};

export function getRepairTypesForServiceCategory(categoryLabel: string): RepairTypeDef[] {
  return REPAIR_TYPES_BY_SERVICE_CATEGORY[categoryLabel.trim()] ?? REPAIR_TYPES_BY_SERVICE_CATEGORY.Otros;
}

export function getLaborPriceForTier(tier: string, _country?: LaborCountryCode): number {
  const row = LABOR_TIER_PRICES_2026[tier];
  if (!row) return 0;
  return row.AR;
}

/** Gama iPhone 1 = SE 2016 / 6(s) — 5 = 14–16 (pantalla y placa más costosas). */
export function appleIphoneLaborGenerationTier(model: string): 1 | 2 | 3 | 4 | 5 {
  const s = model.trim().toLowerCase();
  if (s.includes('iphone se (2016') || /^iphone 6/.test(s)) return 1;
  if (
    /iphone [78]\b/.test(s) ||
    s.includes('iphone se (2') ||
    s.includes('iphone se (3') ||
    s.includes('2ª gen') ||
    s.includes('3ª gen')
  )
    return 2;
  if (/iphone 1[456]\b/.test(s) || /iphone 1[456] (mini|plus|pro)/.test(s)) return 5;
  if (/iphone 1[23]\b/.test(s) || /iphone 1[23] (mini|plus|pro)/.test(s)) return 4;
  if (/iphone 11/.test(s) || /iphone x\b/.test(s) || /iphone xr/.test(s) || /iphone xs/.test(s)) return 3;
  return 3;
}

const APPLE_SMARTPHONE_MULT: Record<string, readonly [number, number, number, number, number]> = {
  mobile_screen: [0.58, 0.66, 0.82, 1.0, 1.34],
  mobile_battery: [0.52, 0.6, 0.76, 1.0, 1.22],
  mobile_board: [0.7, 0.76, 0.88, 1.0, 1.28],
  mobile_camera: [0.72, 0.8, 0.9, 1.0, 1.18],
  mobile_charge_port: [0.88, 0.9, 0.94, 1.0, 1.06],
  mobile_mic_speaker: [0.88, 0.92, 0.96, 1.0, 1.05],
  mobile_software: [1, 1, 1, 1, 1],
  mobile_liquid_clean: [0.88, 0.9, 0.94, 1.0, 1.06],
  mobile_button_flex: [0.88, 0.91, 0.95, 1.0, 1.05],
  mobile_data_recovery: [1, 1, 1, 1, 1],
};

const DEFAULT_APPLE_SMARTPHONE_MULT: readonly [number, number, number, number, number] = [
  0.85, 0.88, 0.94, 1.0, 1.08,
];

function appleLargeVariantLaborBump(model: string, repairTierKey: string): number {
  if (!/pro max|plus|xs max|ultra/i.test(model)) return 0;
  if (repairTierKey === 'mobile_screen') return 0.06;
  if (repairTierKey === 'mobile_battery') return 0.04;
  if (repairTierKey === 'mobile_board' || repairTierKey === 'mobile_camera') return 0.03;
  return 0.02;
}

export function appleSmartphoneLaborMultiplier(model: string, repairTierKey: string): number {
  const tier = appleIphoneLaborGenerationTier(model);
  const row = APPLE_SMARTPHONE_MULT[repairTierKey] ?? DEFAULT_APPLE_SMARTPHONE_MULT;
  const base = row[tier - 1] ?? 1;
  return Math.min(1.48, base + appleLargeVariantLaborBump(model, repairTierKey));
}

export function roundLaborMoney(amount: number, _country?: LaborCountryCode): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const step = amount < 8000 ? 500 : 1000;
  return Math.round(amount / step) * step;
}

/**
 * Precio plantilla 2026: para Apple + smartphone aplica multiplicador por generación/tamaño;
 * el resto usa la tarifa base del tier.
 */
export function getLaborSuggestedUnitPrice(
  category: string,
  brand: string,
  model: string,
  tierKey: string,
  country: LaborCountryCode
): number {
  const base = getLaborPriceForTier(tierKey, country);
  const cat = category.trim();
  const b = brand.trim();
  const m = model.trim();
  const wildcard = REPAIR_LABOR_MODEL_WILDCARD;
  if (cat === 'Smartphones' && b === 'Apple' && m && m !== wildcard) {
    return roundLaborMoney(base * appleSmartphoneLaborMultiplier(m, tierKey), country);
  }
  return base;
}

export type LaborSeedRow = {
  user_id: string;
  organization_id: string | null;
  category: string;
  brand: string;
  model: string;
  service_name: string;
  price: number;
  show_in_widget: boolean;
  country_code: LaborCountryCode;
  repair_type_code: string;
  pricing_year: number;
  source: 'catalog_seed';
};

/**
 * Genera filas del tarifario: cada marca de la categoría × cada tipo de reparación (ARS).
 */
export function buildRepairLaborCatalogSeedRows(opts: {
  userId: string;
  organizationId: string | null;
  country?: LaborCountryCode;
}): LaborSeedRow[] {
  const country: LaborCountryCode = opts.country ?? 'AR';
  const out: LaborSeedRow[] = [];
  for (const cat of SERVICE_DEVICE_CATEGORY_LABELS) {
    const brands = getServiceCatalogBrands(cat);
    const types = getRepairTypesForServiceCategory(cat);
    for (const brand of brands) {
      const isAppleSmartphones = cat === 'Smartphones' && brand === 'Apple';
      const models = isAppleSmartphones ? getCatalogIPhoneModels() : [REPAIR_LABOR_MODEL_WILDCARD];
      for (const model of models) {
        for (const t of types) {
          const base = getLaborPriceForTier(t.tier, country);
          if (base <= 0) continue;
          const price = isAppleSmartphones
            ? roundLaborMoney(base * appleSmartphoneLaborMultiplier(model, t.tier), country)
            : base;
          out.push({
            user_id: opts.userId,
            organization_id: opts.organizationId,
            category: cat,
            brand,
            model,
            service_name: t.label,
            price,
            show_in_widget: false,
            country_code: country,
            repair_type_code: t.code,
            pricing_year: 2026,
            source: 'catalog_seed',
          });
        }
      }
    }
  }
  return out;
}

export function laborCurrencyLabel(_country?: LaborCountryCode): string {
  return 'ARS';
}
