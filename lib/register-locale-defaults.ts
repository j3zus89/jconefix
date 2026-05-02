import type { NextRequest } from 'next/server';
import {
  getLocationConfig,
  listConfiguredCountryCodes,
  normalizeGeoCountryToOrgCountry,
  primaryTimezoneForCountry,
  resolveSiteModeFromHost,
} from '@/lib/location-config';
import { currencySymbol } from '@/lib/locale';

const ALLOWED_ISO = new Set(listConfiguredCountryCodes());

/** Defaults para `organizations` + `shop_settings` en registro público según host y cookie/IP. */
export function registerLocaleFromRequest(
  req: NextRequest,
  opts?: { overrideCountryIso?: string | null }
) {
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || req.headers.get('host') || '';
  const siteMode = resolveSiteModeFromHost(host);
  let orgCountry: string;
  const override = opts?.overrideCountryIso?.trim().toUpperCase();
  if (override && ALLOWED_ISO.has(override)) {
    orgCountry = override;
  } else if (siteMode === 'ar') {
    orgCountry = 'AR';
  } else {
    const cc = req.cookies.get('jc_region')?.value;
    const ip = req.headers.get('x-vercel-ip-country');
    orgCountry =
      cc && /^[a-zA-Z]{2}$/.test(cc) ? cc.toUpperCase() : normalizeGeoCountryToOrgCountry(ip, 'global');
  }
  const cfg = getLocationConfig(orgCountry);
  const iso = cfg.iso === 'XX' ? 'MX' : cfg.iso;
  const cur = getLocationConfig(iso);
  return {
    orgCountry: iso,
    currency: cur.currency,
    currencySymbol: currencySymbol(cur.currency),
    taxRate: 21,
    timezone: primaryTimezoneForCountry(iso),
    language: 'Spanish',
    countryName: cur.defaultCountryName,
    invoicePrefix: 'F-',
    ticketPrefix: iso === 'AR' ? '0-' : 'T-',
  };
}
