import type { SmartImportMode, TargetFieldId } from '@/lib/smart-import/constants';
import {
  CUSTOMER_TARGET_FIELDS,
  TARGET_SYNONYMS,
  TICKET_TARGET_FIELDS,
} from '@/lib/smart-import/constants';
import { normalizeHeaderKey } from '@/lib/smart-import/normalize';

function scoreHeaderAgainstSynonym(headerNorm: string, syn: string): number {
  const s = normalizeHeaderKey(syn);
  if (headerNorm === s) return 100;
  if (headerNorm.includes(s) || s.includes(headerNorm)) return 70;
  const hw = headerNorm.split(' ').filter(Boolean);
  const sw = s.split(' ').filter(Boolean);
  if (hw.length && sw.length && hw.some((w) => sw.includes(w))) return 40;
  return 0;
}

const SAMPLE_ROWS = 35;

function columnNonEmptyCount(rows: string[][], col: number): number {
  if (col < 0) return 0;
  let n = 0;
  for (let r = 0; r < Math.min(rows.length, SAMPLE_ROWS); r++) {
    if (String(rows[r]?.[col] ?? '').trim()) n++;
  }
  return n;
}

/** 0..1 — cuántos valores distintos hay entre las celdas no vacías (1 = todos distintos). */
function columnVarietyRatio(rows: string[][], col: number): number {
  if (col < 0) return 0;
  const vals: string[] = [];
  for (let r = 0; r < Math.min(rows.length, SAMPLE_ROWS); r++) {
    const v = String(rows[r]?.[col] ?? '').trim();
    if (!v) continue;
    vals.push(v.toLowerCase());
  }
  if (vals.length === 0) return 0;
  return new Set(vals).size / vals.length;
}

/** Suma de “calidad” si parece teléfono (muchos dígitos). */
function columnPhoneScore(rows: string[][], col: number): number {
  if (col < 0) return 0;
  let s = 0;
  for (let r = 0; r < Math.min(rows.length, SAMPLE_ROWS); r++) {
    const v = String(rows[r]?.[col] ?? '').trim();
    if (!v) continue;
    const d = v.replace(/\D/g, '').length;
    if (d >= 7) s += d;
  }
  return s;
}

function columnEmailScore(rows: string[][], col: number): number {
  if (col < 0) return 0;
  let s = 0;
  for (let r = 0; r < Math.min(rows.length, SAMPLE_ROWS); r++) {
    const v = String(rows[r]?.[col] ?? '').trim();
    if (v.includes('@') && /\.[a-z]{2,}/i.test(v)) s += 3;
    else if (v.includes('@')) s += 1;
  }
  return s;
}

type Cand = { h: string; score: number; col: number };

function candidatesForTarget(headers: string[], used: Set<string>, tid: TargetFieldId): Cand[] {
  const syns = TARGET_SYNONYMS[tid];
  const out: Cand[] = [];
  for (let col = 0; col < headers.length; col++) {
    const h = headers[col];
    if (!h?.trim() || used.has(h)) continue;
    const hn = normalizeHeaderKey(h);
    if (!hn) continue;
    let max = 0;
    for (const syn of syns) {
      max = Math.max(max, scoreHeaderAgainstSynonym(hn, syn));
    }
    if (max >= 40) out.push({ h, score: max, col });
  }
  return out;
}

function pickBestCandidate(
  tid: TargetFieldId,
  cands: Cand[],
  rows: string[][]
): Cand | null {
  if (cands.length === 0) return null;
  if (rows.length === 0) {
    return cands.reduce((a, b) => (b.score > a.score ? b : a));
  }

  const enriched = cands.map((c) => ({
    ...c,
    nonempty: columnNonEmptyCount(rows, c.col),
    variety: columnVarietyRatio(rows, c.col),
    phone: columnPhoneScore(rows, c.col),
    email: columnEmailScore(rows, c.col),
  }));

  if (tid === 'customer_name') {
    const minS = 4;
    enriched.sort((a, b) => {
      const aData = a.nonempty >= minS;
      const bData = b.nonempty >= minS;
      if (aData && bData) {
        if (Math.abs(a.variety - b.variety) > 0.04) return b.variety - a.variety;
      }
      if (b.score !== a.score) return b.score - a.score;
      return b.nonempty - a.nonempty;
    });
    return enriched[0]!;
  }

  if (tid === 'customer_phone') {
    enriched.sort((a, b) => {
      if (b.phone !== a.phone) return b.phone - a.phone;
      if (b.score !== a.score) return b.score - a.score;
      return b.nonempty - a.nonempty;
    });
    return enriched[0]!;
  }

  if (tid === 'customer_email') {
    enriched.sort((a, b) => {
      if (b.email !== a.email) return b.email - a.email;
      if (b.score !== a.score) return b.score - a.score;
      return b.nonempty - a.nonempty;
    });
    return enriched[0]!;
  }

  if (tid === 'customer_organization') {
    const minS = 4;
    enriched.sort((a, b) => {
      const aData = a.nonempty >= minS;
      const bData = b.nonempty >= minS;
      if (aData && bData && a.score >= 70 && b.score >= 70) {
        const aLow = a.variety < 0.28;
        const bLow = b.variety < 0.28;
        if (aLow !== bLow) return aLow ? -1 : 1;
      }
      if (b.score !== a.score) return b.score - a.score;
      return b.nonempty - a.nonempty;
    });
    return enriched[0]!;
  }

  enriched.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.nonempty - a.nonempty;
  });
  return enriched[0]!;
}

/**
 * Sugiere mapeo columna → campo. Si pasás `rows` (muestra del Excel), desambigua
 * columnas con cabeceras parecidas (p. ej. razón social repetida vs nombre de cliente variado).
 */
export function suggestMapping(
  headers: string[],
  mode: SmartImportMode,
  rows: string[][] = []
): Record<TargetFieldId, string | null> {
  const targets: TargetFieldId[] = [
    ...CUSTOMER_TARGET_FIELDS.map((f) => f.id),
    ...(mode === 'customers_and_tickets' ? TICKET_TARGET_FIELDS.map((f) => f.id) : []),
  ];

  const usedHeaders = new Set<string>();
  const out = {} as Record<TargetFieldId, string | null>;

  for (const tid of targets) {
    out[tid] = null;
    const cands = candidatesForTarget(headers, usedHeaders, tid);
    const best = pickBestCandidate(tid, cands, rows);
    if (best) {
      out[tid] = best.h;
      usedHeaders.add(best.h);
    }
  }

  return out;
}
