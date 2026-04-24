'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';

export default function SetupAdminPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('sr.gonzalezcala89@gmail.com');
  const [password, setPassword] = useState('1989');

  const createAdmin = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Intentar crear usuario con signUp
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Administrador',
            role: 'admin',
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          toast.info('El usuario ya existe. Intenta iniciar sesión.');
        } else {
          toast.error(error.message);
        }
      } else if (data.user) {
        toast.success('Usuario admin creado exitosamente');
        setSuccess(true);
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Usuario Creado!</h1>
          <p className="text-slate-600 mb-6">
            El usuario admin ha sido creado exitosamente.
          </p>
          <div className="bg-white rounded-lg p-4 mb-6 text-left">
            <p className="text-sm"><strong>Email:</strong> {email}</p>
            <p className="text-sm"><strong>Password:</strong> {password}</p>
          </div>
          <a 
            href="/login" 
            className="inline-block w-full py-3 bg-[#F5C518] text-white rounded-xl font-semibold hover:bg-[#D4A915] transition-colors"
          >
            Ir al Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center gap-3 mb-8">
          <JcOneFixAppIcon className="rounded-xl shadow-lg" />
          <JcOneFixMark tone="onLight" className="text-2xl font-bold" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-2 text-center">
            Configuración Inicial
          </h1>
          <p className="text-slate-500 text-sm text-center mb-6">
            Crea el usuario administrador del sistema
          </p>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-700">Email del Admin</Label>
              <Input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-slate-700">Contraseña</Label>
              <Input 
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={createAdmin}
              disabled={loading}
              className="w-full h-12 bg-[#F5C518] hover:bg-[#D4A915] text-white font-semibold rounded-xl"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario Admin
            </Button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-6">
            Esta página se desactivará después de crear el admin
          </p>
        </div>
      </div>
    </div>
  );
}
