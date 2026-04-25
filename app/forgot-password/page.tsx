'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader as Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { JcOneFixAppIcon, JcOneFixMark } from '@/components/jc-one-fix-mark';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

const APP_URL =
  typeof window !== 'undefined' ? window.location.origin : getSiteCanonicalUrl();

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Introduce un correo electrónico válido.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: sbError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${APP_URL}/auth/callback?type=recovery`,
    });

    setLoading(false);

    // Aunque el email no exista, mostramos "enviado" para no revelar
    // si una cuenta está registrada (prevención de enumeración).
    if (sbError && sbError.message.toLowerCase().includes('rate')) {
      setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
      return;
    }

    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1117] text-white px-4 relative overflow-hidden">
      {/* Ambiente visual */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#F5C518]/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#F5C518]/10 blur-[90px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500 hover:text-[#F5C518] transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#0D1117]/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <JcOneFixAppIcon className="h-10 w-10 rounded-full" />
            <div>
              <JcOneFixMark tone="onDark" className="text-xl font-bold tracking-tight" />
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">Recuperar contraseña</p>
            </div>
          </div>

          {sent ? (
            /* ── Estado: email enviado ── */
            <div className="text-center py-4">
              <div className="flex justify-center mb-5">
                <div className="h-16 w-16 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-[#F5C518]" />
                </div>
              </div>
              <h2 className="font-serif text-2xl font-bold text-white mb-3">
                Revisa tu correo
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-2">
                Si existe una cuenta con el correo{' '}
                <span className="text-white font-medium">{email}</span>, recibirás un enlace para
                restablecer tu contraseña.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed mb-8">
                El enlace es válido durante <strong className="text-slate-400">1 hora</strong>. Revisa también
                la carpeta de spam.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5C518] hover:text-[#D4A915] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            /* ── Formulario ── */
            <>
              <div className="mb-8">
                <h1 className="font-serif text-3xl font-bold text-white leading-tight mb-2">
                  ¿Olvidaste tu contraseña?
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Introduce tu correo electrónico y te enviaremos un enlace para crear una nueva contraseña.
                  Funciona para dueños <strong className="text-slate-300">y empleados</strong>.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 font-medium text-sm">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@ejemplo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#F5C518]/50 focus-visible:ring-[#F5C518]/25 shadow-inner pl-11"
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-full bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold border-0 shadow-lg shadow-[#F5C518]/20"
                  disabled={loading}
                >
                  {loading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    : 'Enviar enlace de recuperación'
                  }
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500">
                ¿Recuerdas la contraseña?{' '}
                <Link href="/login" className="text-[#F5C518] hover:text-[#D4A915] font-medium transition-colors">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
