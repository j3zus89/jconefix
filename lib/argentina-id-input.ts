/**
 * Formato y validación de documentos AR en UI (CUIT/CUIL con guiones, DNI, etc.).
 */

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/** CUIT/CUIL: hasta 11 dígitos, máscara XX-XXXXXXXX-X */
export function formatCuitCuilInput(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

/** DNI argentino: 7 u 8 dígitos, sin separadores */
export function formatDniArInput(raw: string): string {
  return onlyDigits(raw).slice(0, 8);
}

/** Pasaporte: alfanumérico en mayúsculas */
export function formatPasaporteArInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 14);
}

export function formatOtroIdInput(raw: string): string {
  return raw.replace(/[\r\n]/g, '').slice(0, 40);
}

export function formatArgentinaIdInput(idType: string, raw: string): string {
  const t = (idType || '').trim();
  if (t === 'CUIT' || t === 'CUIL') return formatCuitCuilInput(raw);
  if (t === 'DNI') return formatDniArInput(raw);
  if (t === 'Pasaporte') return formatPasaporteArInput(raw);
  if (t === 'Otro') return formatOtroIdInput(raw);
  return raw;
}

/** Dígito verificador CUIT/CUIL (AFIP). */
export function isValidCuitCuilCheckDigit(elevenDigits: string): boolean {
  if (!/^\d{11}$/.test(elevenDigits)) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(elevenDigits[i]!, 10) * mult[i]!;
  }
  let mod = sum % 11;
  let verif = 11 - mod;
  if (verif === 11) verif = 0;
  else if (verif === 10) verif = 9;
  return verif === parseInt(elevenDigits[10]!, 10);
}

/**
 * Si hay texto, valida según tipo. Vacío → sin error (otros flujos exigen mínimo en recepción).
 */
export function validateArgentinaIdNumber(idType: string, displayed: string): string | null {
  const t = (idType || '').trim();
  const trimmed = displayed.trim();
  if (!trimmed) return null;

  if (t === 'CUIT' || t === 'CUIL') {
    const d = onlyDigits(trimmed);
    if (d.length < 11) {
      return 'CUIT/CUIL incompleto: deben ser 11 dígitos (formato XX-XXXXXXXX-X).';
    }
    if (d.length !== 11) {
      return 'CUIT/CUIL: no puede superar 11 dígitos.';
    }
    if (!isValidCuitCuilCheckDigit(d)) {
      return 'CUIT/CUIL: el dígito verificador no coincide. Revisá el número.';
    }
    return null;
  }

  if (t === 'DNI') {
    const d = onlyDigits(trimmed);
    if (d.length < 7) {
      return 'DNI incompleto: entre 7 y 8 dígitos.';
    }
    if (d.length > 8) {
      return 'DNI: no puede superar 8 dígitos.';
    }
    return null;
  }

  if (t === 'Pasaporte') {
    const compact = formatPasaporteArInput(trimmed);
    if (compact.length < 4) {
      return 'Pasaporte: al menos 4 caracteres alfanuméricos.';
    }
    return null;
  }

  if (t === 'Otro') {
    if (trimmed.length < 2) {
      return 'Documento «Otro»: al menos 2 caracteres o dejá el campo vacío.';
    }
    return null;
  }

  return null;
}

/** Si en BD está guardado sin guiones, mostrar con máscara al cargar. */
export function formatStoredArgentinaIdForDisplay(
  idType: string | null | undefined,
  stored: string | null | undefined,
): string {
  const s = (stored || '').trim();
  if (!s) return '';
  const t = (idType || '').trim();
  if (t === 'CUIT' || t === 'CUIL') {
    const d = onlyDigits(s);
    if (d.length === 11) return formatCuitCuilInput(d);
  }
  return s;
}
