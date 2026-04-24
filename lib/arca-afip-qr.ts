/**
 * URL del QR oficial de comprobantes electrónicos (AFIP / ARCA).
 * @see Resolución General AFIP 4892 y actualizaciones.
 */
export function buildAfipComprobanteQrUrl(params: {
  fechaCbteYyyymmdd: number;
  cuitEmisor: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda?: string;
  ctz?: number;
  docTipoRec: number;
  docNroRec: number;
  cae: string;
}): string {
  const moneda = params.moneda ?? 'PES';
  const ctz = params.ctz ?? 1;
  const codAut = parseInt(String(params.cae).replace(/\D/g, ''), 10);
  const payload = {
    ver: 1,
    fecha: String(params.fechaCbteYyyymmdd),
    cuit: params.cuitEmisor,
    ptoVta: params.ptoVta,
    tipoCmp: params.tipoCmp,
    nroCmp: params.nroCmp,
    importe: round2(params.importe),
    moneda,
    ctz,
    tipoDocRec: params.docTipoRec,
    nroDocRec: params.docNroRec,
    tipoCodAut: 'E',
    codAut: Number.isFinite(codAut) ? codAut : 0,
  };
  const json = JSON.stringify(payload);
  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(json, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(json)));
  return `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(base64)}`;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Fecha de comprobante yyyymmdd (Argentina) desde ISO created_at de la factura. */
export function invoiceIsoToCbteFch(iso: string | null | undefined): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '2000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return parseInt(`${y}${m}${day}`, 10);
}

export function formatArCbteNumero(ptoVta: number, nroCbte: number): string {
  return `${String(Math.floor(ptoVta)).padStart(4, '0')}-${String(Math.floor(nroCbte)).padStart(8, '0')}`;
}
