/**
 * repair_tickets.pin_pattern stores PIN and unlock pattern in one column.
 * New format: labeled lines (PIN / Patrón). Legacy: plain text = PIN only,
 * or bullet-separated "PIN: … · Patrón: …".
 */
export function parseStoredAccessCredentials(
  raw: string | null | undefined
): { pin: string; pattern: string } {
  if (raw == null || !String(raw).trim()) return { pin: '', pattern: '' };
  const s = String(raw).trim();

  if (s.includes('·') && /Patrón:/i.test(s)) {
    let pin = '';
    let pattern = '';
    for (const part of s.split(/\s*·\s*/)) {
      const t = part.trim();
      if (/^PIN:/i.test(t)) pin = t.replace(/^PIN:\s*/i, '').trim();
      if (/^Patrón:/i.test(t)) pattern = t.replace(/^Patrón:\s*/i, '').trim();
    }
    if (pin || pattern) return { pin, pattern };
  }

  const labeledLine = /^(PIN:|Patrón:)/im.test(s);
  if (!labeledLine) {
    return { pin: s, pattern: '' };
  }

  let pin = '';
  let pattern = '';
  for (const line of s.split(/\r?\n/)) {
    const t = line.trim();
    if (/^PIN:/i.test(t)) pin = t.replace(/^PIN:\s*/i, '').trim();
    else if (/^Patrón:/i.test(t)) pattern = t.replace(/^Patrón:\s*/i, '').trim();
  }
  return { pin, pattern };
}

export function composeAccessCredentials(
  pin: string,
  pattern: string
): string | null {
  const p = pin.trim();
  const pat = pattern.trim();
  if (!p && !pat) return null;
  const lines: string[] = [];
  if (p) lines.push(`PIN: ${p}`);
  if (pat) lines.push(`Patrón: ${pat}`);
  return lines.join('\n');
}
