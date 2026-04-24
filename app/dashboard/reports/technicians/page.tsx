'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

type Tech = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
};

export default function TechniciansReportsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await (supabase as any)
        .from('technicians')
        .select('id, name, email, phone, role, is_active')
        .eq('shop_owner_id', user.id)
        .order('name');
      if (error) {
        toast.error(error.message);
        setRows([]);
      } else setRows(data || []);
      setLoading(false);
    };
    run();
  }, [supabase]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Técnicos y roles
          </h1>
          <p className="text-sm text-gray-500 mt-1">Equipo configurado en tu taller (tabla technicians).</p>
        </div>
        <Button asChild className="bg-primary text-white hover:bg-primary/90">
          <Link href="/dashboard/reports">Volver a informes</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No hay técnicos dados de alta. Añádelos en Configuración → Empleados o desde la creación de tickets.
        </p>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Rol</th>
                <th className="text-left p-3">Activo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-gray-600">{r.email}</td>
                  <td className="p-3 capitalize">{r.role}</td>
                  <td className="p-3">{r.is_active ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
