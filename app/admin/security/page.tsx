'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Shield, Lock, Eye, EyeOff, CheckCircle2, Loader2,
  KeyRound, Info, Smartphone, Copy, AlertTriangle, XCircle,
} from 'lucide-react';

/* ─── Password change ─── */
function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (newPassword.length >= 12) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-[#0d9488]', 'bg-[#0d9488]'][strength];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) { setError('Las contraseñas nuevas no coinciden.'); return; }
    if (newPassword.length < 8) { setError('Mínimo 8 caracteres.'); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No se pudo obtener el usuario.');

      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyErr) throw new Error('La contraseña actual es incorrecta.');

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      setSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Lock className="h-4 w-4 text-gray-500" />
        <p className="text-sm font-semibold text-gray-900">Cambiar contraseña</p>
      </div>
      <form onSubmit={onSubmit} className="px-5 py-5 space-y-4">
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Contraseña actualizada correctamente.
          </div>
        )}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div>
          <label className="text-xs font-semibold text-gray-600">Contraseña actual</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30" placeholder="Tu contraseña actual" required />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600">Nueva contraseña</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30" placeholder="Mínimo 8 caracteres" required minLength={8} />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPassword.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">{[1,2,3,4,5].map((i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColor : 'bg-gray-200'}`} />)}</div>
              <p className="text-xs text-gray-500">{strengthLabel}</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600">Confirmar nueva contraseña</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 ${confirmPassword && confirmPassword !== newPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              placeholder="Repite la nueva contraseña" required />
          </div>
          {confirmPassword && confirmPassword !== newPassword && <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden.</p>}
        </div>

        <button type="submit" disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  );
}

/* ─── TOTP / Google Authenticator ─── */
type MfaStatus = 'loading' | 'enrolled' | 'not_enrolled';
type EnrollStep = 'idle' | 'scanning' | 'verifying' | 'done';

function TotpSection() {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>('loading');
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);
  const [enrollStep, setEnrollStep] = useState<EnrollStep>('idle');
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp ?? []).find((f: any) => f.status === 'verified');
    if (verified) {
      setMfaStatus('enrolled');
      setEnrolledFactorId(verified.id);
    } else {
      setMfaStatus('not_enrolled');
    }
  };

  const startEnroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (enrollErr || !data) throw enrollErr || new Error('Error iniciando configuración');
      setEnrollData({ factorId: data.id, qrCode: (data as any).totp.qr_code, secret: (data as any).totp.secret });
      setEnrollStep('scanning');
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  const verifyEnroll = async () => {
    if (!enrollData) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (challengeErr) throw challengeErr;
      const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId: enrollData.factorId, challengeId: challengeData.id, code: enrollCode });
      if (verifyErr) throw new Error('Código incorrecto. Asegúrate de que la hora del móvil esté sincronizada.');
      setMfaStatus('enrolled');
      setEnrolledFactorId(enrollData.factorId);
      setEnrollStep('done');
      setEnrollData(null);
      setEnrollCode('');
      setSuccess('Google Authenticator activado correctamente. Ahora se pedirá en cada inicio de sesión.');
    } catch (err: any) {
      setError(err?.message || 'Error al verificar el código.');
    } finally {
      setLoading(false);
    }
  };

  const cancelEnroll = async () => {
    if (enrollData) {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId }).catch(() => {});
    }
    setEnrollStep('idle');
    setEnrollData(null);
    setEnrollCode('');
    setError(null);
  };

  const unenroll = async () => {
    if (!confirm('¿Seguro que quieres desactivar Google Authenticator? El panel quedará protegido solo por contraseña.')) return;
    if (!enrolledFactorId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactorId });
      if (unenrollErr) throw unenrollErr;
      setMfaStatus('not_enrolled');
      setEnrolledFactorId(null);
      setSuccess('Google Authenticator desactivado.');
    } catch (err: any) {
      setError(err?.message || 'Error al desactivar.');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (!enrollData) return;
    navigator.clipboard.writeText(enrollData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-gray-500" />
          <p className="text-sm font-semibold text-gray-900">Google Authenticator (TOTP)</p>
        </div>
        {mfaStatus === 'enrolled' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Activo
          </span>
        )}
        {mfaStatus === 'not_enrolled' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            No configurado
          </span>
        )}
      </div>

      <div className="px-5 py-5 space-y-4">
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Status: loading */}
        {mfaStatus === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando estado...
          </div>
        )}

        {/* Status: enrolled — show deactivate option */}
        {mfaStatus === 'enrolled' && enrollStep !== 'done' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex gap-3 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold">Protección activa</p>
                <p className="text-xs mt-0.5 text-green-700">Cada inicio de sesión requerirá el código de 6 dígitos de tu app Google Authenticator.</p>
              </div>
            </div>
            <button onClick={unenroll} disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-sm font-medium text-red-700 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Desactivar Google Authenticator
            </button>
          </div>
        )}

        {/* Status: not enrolled — show start button */}
        {mfaStatus === 'not_enrolled' && enrollStep === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <p>Sin segundo factor activo. Solo la contraseña protege este panel. Se recomienda activar Google Authenticator.</p>
            </div>
            <button onClick={startEnroll} disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Configurar Google Authenticator
            </button>
          </div>
        )}

        {/* Enrollment step: scanning QR */}
        {enrollStep === 'scanning' && enrollData && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Paso 1 — Escanea el código QR</p>
              <p className="text-xs text-gray-500 mb-4">
                Abre Google Authenticator (o Authy) en tu móvil → pulsa <strong>+</strong> → <strong>Escanear código QR</strong>.
              </p>
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4 inline-block shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={enrollData.qrCode} alt="QR Google Authenticator" width={200} height={200} className="block" />
                </div>
              </div>
            </div>

            {/* Manual secret */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">O introduce el código manualmente:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 tracking-wider break-all">
                  {enrollData.secret}
                </code>
                <button onClick={copySecret} className="shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500" title="Copiar">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button onClick={() => setEnrollStep('verifying')}
              className="w-full py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold">
              Ya lo escaneé → Continuar
            </button>
            <button onClick={cancelEnroll} className="w-full text-xs text-gray-500 hover:text-gray-700 underline">Cancelar</button>
          </div>
        )}

        {/* Enrollment step: verify first code */}
        {enrollStep === 'verifying' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Paso 2 — Verifica el código</p>
              <p className="text-xs text-gray-500">Introduce el código de 6 dígitos que aparece ahora en Google Authenticator para confirmar que todo está bien.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Código de verificación</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                className="mt-1 w-full py-3 text-center text-2xl font-mono tracking-[0.4em] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
                placeholder="000000"
                autoFocus
              />
            </div>
            <button onClick={verifyEnroll} disabled={loading || enrollCode.length !== 6}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Verificando...' : 'Activar Google Authenticator'}
            </button>
            <button onClick={() => setEnrollStep('scanning')} className="w-full text-xs text-gray-500 hover:text-gray-700 underline">
              ← Volver al QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminSecurityPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#0d9488]" />
          Seguridad de la cuenta
        </h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de credenciales y segundo factor de autenticación.</p>
      </div>

      <TotpSection />
      <PasswordSection />

      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#0d9488]" />
          Recomendaciones
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            'Activa Google Authenticator para máxima seguridad (recomendado).',
            'Usa una contraseña única de más de 12 caracteres con letras, números y símbolos.',
            'Si sospechas acceso no autorizado, cambia la contraseña inmediatamente.',
            'Cierra sesión siempre al terminar desde el botón del menú lateral.',
            'No accedas al panel desde redes WiFi públicas sin VPN.',
          ].map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="text-[#0d9488] shrink-0">✓</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
