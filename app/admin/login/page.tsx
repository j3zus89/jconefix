'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Lock, Mail, Loader2, Smartphone, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isSuperAdmin } from '@/lib/auth/super-admin';
import { JcOneFixMark } from '@/components/jc-one-fix-mark';
import { reportSuccessfulLogin } from '@/lib/auth/report-login-client';

type Step = 'password' | 'totp' | 'done';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin';

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('password');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpChallengeId, setTotpChallengeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ok = await isSuperAdmin();
        if (ok) router.replace(next);
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1: password login → check if TOTP is enrolled
  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) throw signInErr;

      const ok = await isSuperAdmin();
      if (!ok) {
        await supabase.auth.signOut();
        throw new Error('Acceso denegado: solo SUPER_ADMIN');
      }

      // Check if TOTP factor is enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = (factorsData?.totp ?? []).find((f: any) => f.status === 'verified');

      if (verifiedFactor) {
        // Create MFA challenge
        const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
          factorId: verifiedFactor.id,
        });
        if (challengeErr) throw challengeErr;

        setTotpFactorId(verifiedFactor.id);
        setTotpChallengeId(challengeData.id);
        setStep('totp');
      } else {
        // No TOTP enrolled — proceed directly (can activate from /admin/security)
        reportSuccessfulLogin('super_admin');
        router.replace(next);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify TOTP code from Google Authenticator
  const onSubmitTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpFactorId || !totpChallengeId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: totpFactorId,
        challengeId: totpChallengeId,
        code: totpCode.replace(/\s/g, ''),
      });
      if (verifyErr) throw verifyErr;

      setStep('done');
      reportSuccessfulLogin('super_admin');
      router.replace(next);
    } catch (err: any) {
      setError('Código incorrecto. Asegúrate de que la hora del móvil esté sincronizada.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Loader2 className="h-7 w-7 animate-spin text-[#0d9488]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#0d9488] to-[#14b8a6] text-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                {step === 'totp' ? <Smartphone className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-lg font-bold">SUPER_ADMIN</div>
                <div className="text-xs text-white/80">
                  {step === 'password' && 'Acceso privado · JC ONE FIX'}
                  {step === 'totp' && 'Verificación Google Authenticator'}
                  {step === 'done' && 'Acceso concedido'}
                </div>
              </div>
            </div>
            {step === 'totp' && (
              <div className="flex gap-1 mt-4">
                <div className="h-1 flex-1 rounded-full bg-white" />
                <div className="h-1 flex-1 rounded-full bg-white" />
              </div>
            )}
          </div>

          {/* Step 1: Password */}
          {step === 'password' && (
            <form onSubmit={onSubmitPassword} className="px-6 py-6 space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
                    placeholder="tu email de SUPER_ADMIN"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Contraseña</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Verificando...' : 'Entrar al panel'}
              </button>
              <div className="text-xs text-gray-500 text-center">
                Este acceso es exclusivo para el propietario del sistema.
              </div>
            </form>
          )}

          {/* Step 2: TOTP */}
          {step === 'totp' && (
            <form onSubmit={onSubmitTotp} className="px-6 py-6 space-y-4">
              <div className="rounded-xl border border-[#0d9488]/20 bg-teal-50 px-4 py-3 flex gap-3 text-sm text-teal-800">
                <Smartphone className="h-4 w-4 shrink-0 mt-0.5 text-[#0d9488]" />
                <div>
                  <p className="font-semibold">Abre Google Authenticator</p>
                  <p className="text-xs text-teal-700 mt-0.5">Introduce el código de 6 dígitos que aparece en la app para JC ONE FIX.</p>
                </div>
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600">Código de Google Authenticator</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]{6,7}"
                  maxLength={7}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="mt-1 w-full py-3 text-center text-2xl font-mono tracking-[0.4em] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
                  placeholder="000000"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Verificando...' : 'Confirmar acceso'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('password'); setTotpCode(''); setError(null); }}
                className="w-full text-xs text-gray-500 hover:text-gray-700 underline"
              >
                ← Volver al inicio
              </button>
            </form>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="px-6 py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-[#0d9488] mx-auto mb-3" />
              <p className="font-semibold text-gray-900">Acceso concedido</p>
              <p className="text-sm text-gray-500 mt-1">Redirigiendo al panel...</p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-700 inline-flex flex-wrap items-center gap-1 justify-center">
            Volver a <JcOneFixMark tone="onLight" />
          </Link>
        </div>
      </div>
    </div>
  );
}
