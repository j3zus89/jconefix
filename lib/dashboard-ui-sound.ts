/**
 * Sonidos del panel: chat y campana.
 *
 * Los navegadores bloquean audio en callbacks (p. ej. Supabase Realtime). Lo que suele funcionar:
 * 1) En el primer pointerdown, reproducir algo (aunque sea casi silencioso) en un MISMO &lt;audio&gt;
 *    del documento y marcarlo como desbloqueado.
 * 2) Los mensajes nuevos cambian el `src` de ESE elemento y llaman play() de nuevo.
 *
 * Web Audio se usa como refuerzo si el contexto ya está en `running`.
 */

export const DASHBOARD_UI_SOUND_STORAGE_KEY = 'dashboard_ui_sound_on';

export function getDashboardUiSoundOn(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(DASHBOARD_UI_SOUND_STORAGE_KEY);
  if (v === null) return true;
  return v !== '0' && v !== 'false';
}

export function setDashboardUiSoundOn(on: boolean): void {
  localStorage.setItem(DASHBOARD_UI_SOUND_STORAGE_KEY, on ? '1' : '0');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dashboard-ui-sound-pref'));
  }
}

/** True tras un play() exitoso en el audio compartido durante un gesto del usuario. */
export function isDashboardHtmlAudioUnlocked(): boolean {
  return htmlMediaUnlocked;
}

let sharedAudioCtx: AudioContext | null = null;
let sharedSfxAudio: HTMLAudioElement | null = null;
let htmlMediaUnlocked = false;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AC();
  }
  return sharedAudioCtx;
}

function getSharedSfxAudio(): HTMLAudioElement {
  if (typeof document === 'undefined') {
    throw new Error('no document');
  }
  if (!sharedSfxAudio) {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    el.preload = 'auto';
    el.style.display = 'none';
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    sharedSfxAudio = el;
  }
  return sharedSfxAudio;
}

/** WAV 16‑bit helpers */
function int16PcmToWavBlob(samples: Int16Array, sampleRate: number): Blob {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buffer);
  let o = 0;
  const wStr = (s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o++, s.charCodeAt(i));
  };
  wStr('RIFF');
  v.setUint32(o, 36 + dataSize, true);
  o += 4;
  wStr('WAVEfmt ');
  v.setUint32(o, 16, true);
  o += 4;
  v.setUint16(o, 1, true);
  o += 2;
  v.setUint16(o, 1, true);
  o += 2;
  v.setUint32(o, sampleRate, true);
  o += 4;
  v.setUint32(o, sampleRate * 2, true);
  o += 4;
  v.setUint16(o, 2, true);
  o += 2;
  v.setUint16(o, 16, true);
  o += 2;
  wStr('data');
  v.setUint32(o, dataSize, true);
  o += 4;
  for (let i = 0; i < samples.length; i++) {
    v.setInt16(o, samples[i]!, true);
    o += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function sineInt16Segment(freq: number, durationSec: number, sampleRate: number, vol: number): Int16Array {
  const len = Math.max(1, Math.floor(durationSec * sampleRate));
  const out = new Int16Array(len);
  const max = 32767 * vol;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, i / (sampleRate * 0.014));
    const release = Math.min(1, (len - 1 - i) / (sampleRate * 0.045));
    const env = attack * release;
    const s = Math.sin(2 * Math.PI * freq * t) * env * max;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(s)));
  }
  return out;
}

function concatInt16(...parts: Int16Array[]): Int16Array {
  const t = parts.reduce((a, p) => a + p.length, 0);
  const out = new Int16Array(t);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function silenceInt16(samples: number): Int16Array {
  return new Int16Array(Math.max(1, samples));
}

/** Casi silencioso: suficiente para que el motor marque el elemento como “usable”. */
function blobPrimeUnlock16(): Blob {
  const sr = 8000;
  return int16PcmToWavBlob(sineInt16Segment(440, 0.04, sr, 0.02), sr);
}

function blobChatPing16(): Blob {
  const sr = 44100;
  const a = sineInt16Segment(830, 0.07, sr, 0.22);
  const g = silenceInt16(Math.floor(sr * 0.022));
  const b = sineInt16Segment(1108, 0.085, sr, 0.2);
  return int16PcmToWavBlob(concatInt16(a, g, b), sr);
}

function blobPanelChime16(): Blob {
  const sr = 44100;
  const a = sineInt16Segment(523.25, 0.1, sr, 0.24);
  const g1 = silenceInt16(Math.floor(sr * 0.035));
  const b = sineInt16Segment(392, 0.1, sr, 0.22);
  const g2 = silenceInt16(Math.floor(sr * 0.035));
  const c = sineInt16Segment(329.63, 0.12, sr, 0.2);
  return int16PcmToWavBlob(concatInt16(a, g1, b, g2, c), sr);
}

async function playBlobOnSharedAudio(blob: Blob, volume: number): Promise<boolean> {
  if (!htmlMediaUnlocked) return false;
  try {
    const el = getSharedSfxAudio();
    const url = URL.createObjectURL(blob);
    el.pause();
    el.currentTime = 0;
    el.volume = volume;
    el.src = url;
    await el.play();
    const revoke = () => URL.revokeObjectURL(url);
    el.addEventListener('ended', revoke, { once: true });
    window.setTimeout(revoke, 8000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Desbloquea Web Audio y el &lt;audio&gt; compartido (debe llamarse en un gesto: pointerdown, clic en Chat, etc.).
 */
export async function primeDashboardUiAudio(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Importante: llamar a `HTMLAudioElement.play()` antes de cualquier `await` (p. ej. AudioContext.resume),
  // o Chrome/Safari pueden perder la "user gesture" y el audio queda bloqueado para siempre en esa pestaña.
  if (!htmlMediaUnlocked) {
    try {
      const el = getSharedSfxAudio();
      const url = URL.createObjectURL(blobPrimeUnlock16());
      el.volume = 0.06;
      el.src = url;
      await el.play();
      el.pause();
      el.currentTime = 0;
      URL.revokeObjectURL(url);
      htmlMediaUnlocked = true;
    } catch {
      htmlMediaUnlocked = false;
    }
  }

  try {
    const ctx = getSharedAudioContext();
    if (ctx) {
      await ctx.resume().catch(() => {});
      if (ctx.state === 'running') {
        const now = ctx.currentTime;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.00001, now);
        g.connect(ctx.destination);
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(440, now);
        osc.connect(g);
        osc.start(now);
        osc.stop(now + 0.001);
      }
    }
  } catch {
    /* ignorar */
  }
}

function playWebAudioSoftChatDing(): boolean {
  const ctx = getSharedAudioContext();
  if (!ctx || ctx.state !== 'running') return false;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.07, now + 0.02);
  master.gain.linearRampToValueAtTime(0.0001, now + 0.22);

  const tone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.55, start + 0.012);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.015);
  };

  tone(830, now, 0.075);
  tone(1108, now + 0.065, 0.085);
  return true;
}

function playWebAudioAssignChime(): boolean {
  const ctx = getSharedAudioContext();
  if (!ctx || ctx.state !== 'running') return false;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.09, now + 0.022);
  master.gain.linearRampToValueAtTime(0.0001, now + 0.52);

  const tone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.62, start + 0.014);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.018);
  };

  tone(523.25, now, 0.095);
  tone(392, now + 0.15, 0.095);
  tone(329.63, now + 0.3, 0.11);
  return true;
}

async function playWavNewAudioElement(blob: Blob, volume: number): Promise<boolean> {
  const url = URL.createObjectURL(blob);
  const el = new Audio();
  el.volume = volume;
  el.setAttribute('playsinline', 'true');
  el.src = url;
  try {
    await el.play();
    el.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
    window.setTimeout(() => URL.revokeObjectURL(url), 8000);
    return true;
  } catch {
    URL.revokeObjectURL(url);
    return false;
  }
}

/**
 * Pitido chat: 1) audio HTML compartido si ya se desbloqueó con un clic/tacto en el panel.
 * 2) Web Audio si el contexto sigue activo. 3) nuevo &lt;audio&gt; por si acaso.
 */
export async function playDashboardUiSoftPing(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!getDashboardUiSoundOn()) return;

  if (htmlMediaUnlocked) {
    const ok = await playBlobOnSharedAudio(blobChatPing16(), 0.42);
    if (ok) return;
  }

  try {
    const ctx = getSharedAudioContext();
    if (ctx) {
      await ctx.resume().catch(() => {});
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await ctx.resume().catch(() => {});
      if (ctx.state === 'running' && playWebAudioSoftChatDing()) return;
    }
  } catch {
    /* seguir */
  }

  await playWavNewAudioElement(blobChatPing16(), 0.42);
}

export async function playPanelTicketAssignedChime(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!getDashboardUiSoundOn()) return;

  if (htmlMediaUnlocked) {
    const ok = await playBlobOnSharedAudio(blobPanelChime16(), 0.44);
    if (ok) return;
  }

  try {
    const ctx = getSharedAudioContext();
    if (ctx) {
      await ctx.resume().catch(() => {});
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await ctx.resume().catch(() => {});
      if (ctx.state === 'running' && playWebAudioAssignChime()) return;
    }
  } catch {
    /* seguir */
  }

  await playWavNewAudioElement(blobPanelChime16(), 0.44);
}

export async function primeAndPlayDashboardPing(): Promise<void> {
  await primeDashboardUiAudio();
  await playDashboardUiSoftPing();
}

export async function primeAndPlayPanelAssignChime(): Promise<void> {
  await primeDashboardUiAudio();
  await playPanelTicketAssignedChime();
}
