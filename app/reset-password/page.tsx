'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader as Loader2, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { JcOneFixAppIcon, JcOneFixMark } from '@/components/jc-one-fix-mark';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [showCfm, setShowCfm]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [ready, setReady]           = useState(false);   // sesión de recovery verificada
  const [invalid, setInvalid]       = useState(false);   // enlace inválido o expirado
  const [success, setSuccess]       = useState(false);

  // Cuando el usuario llega aquí, el /auth/callback ya intercambió el código por sesión.
  // Verificamos que la sesión sea de tipo 'recovery'.
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Sin sesión: el enlace expiró o ya fue usado
        setInvalid(true);
      } else {
        setReady(true);
      }
    };
    checkSession();

    // También escuchamos el evento PASSWORD_RECOVERY por si el cliente llega
    // con hash (#access_token=...) en lugar del flujo PKCE
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const validate = (): string | null => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (password !== confirm) return 'Las contraseñas no coinciden.';
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Usa al menos una letra y un número.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message || 'No se pudo actualizar la contraseña.');
      return;
    }

    setSuccess(true);
    toast.success('¡Contraseña actualizada!');
    setTimeout(() => router.replace('/dashboard'), 2500);
  };

  /* ── Enlace inválido ── */
  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050a12] px-4">
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#070f18]/80 backdrop-blur-xl p-8 text-center shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <h2 className="font-serif text-2xl font-bold text-white mb-3">Enlace inválido o expirado</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            El enlace de recuperación ya fue usado o ha caducado (válido 1 hora). Solicita uno nuevo.
          </p>
          <Button
            onClick={() => router.push('/forgot-password')}
            className="w-full h-11 rounded-full bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold border-0"
          >
            Solicitar nuevo enlace
          </Button>
        </div>
      </div>
    );
  }

  /* ── Contraseña actualizada ── */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050a12] px-4">
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#070f18]/80 backdrop-blur-xl p-8 text-center shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="h-16 w-16 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-[#F5C518]" />
            </div>
          </div>
          <h2 className="font-serif text-2xl font-bold text-white mb-3">¡Contraseña actualizada!</h2>
          <p className="text-slate-400 text-sm">Redirigiendo al panel…</p>
        </div>
      </div>
    );
  }

  /* ── Cargando (verificando sesión) ── */
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050a12]">
        <Loader2 className="h-8 w-8 text-[#F5C518] animate-spin" />
      </div>
    );
  }

  /* ── Formulario ── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050a12] text-white px-4 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#0D1117] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#F5C518]/8 blur-[90px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#070f18]/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3 mb-8">
            <JcOneFixAppIcon className="h-10 w-10 rounded-full" />
            <div>
              <JcOneFixMark tone="onDark" className="text-xl font-bold tracking-tight" />
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">Nueva contraseña</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-white leading-tight mb-2">
              Crea tu nueva contraseña
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Elige una contraseña segura. Mínimo 8 caracteres con al menos una letra y un número.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nueva contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 font-medium text-sm">
                Nueva contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#F5C518]/50 focus-visible:ring-[#F5C518]/25 shadow-inner pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#F5C518] transition-colors"
                >
                  {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-slate-300 font-medium text-sm">
                Confirmar contraseña
              </Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showCfm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#F5C518]/50 focus-visible:ring-[#F5C518]/25 shadow-inner pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowCfm(!showCfm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#F5C518] transition-colors"
                >
                  {showCfm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Indicador de fuerza */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? i <= 2 ? 'bg-yellow-400' : 'bg-[#F5C518]'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  {password.length < 8
                    ? 'Demasiado corta'
                    : password.length < 12
                    ? 'Aceptable'
                    : 'Segura'}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-full bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold border-0 shadow-lg shadow-[#F5C518]/20"
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                : 'Guardar nueva contraseña'
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
