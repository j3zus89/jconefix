'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader as Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';

export default function DemoSetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const supabase = createClient();

  const createDemoUser = async () => {
    setLoading(true);
    setResult('');

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-demo-user`;

      const headers = {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      setResult(`✅ ${result.message}\n\nEmail: demo@repairdesk.com\nContraseña: demo123456`);
      toast.success('Usuario demo listo para usar');

      const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'demo@repairdesk.com',
        password: 'demo123456',
      });

      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: 'Usuario Demo',
          shop_name: 'Taller Demo',
        });

        await supabase.from('customers').upsert([
          {
            user_id: authData.user.id,
            name: 'Juan Pérez',
            email: 'juan@example.com',
            phone: '+34 612 345 678',
            address: 'Calle Mayor 123, Madrid',
          },
          {
            user_id: authData.user.id,
            name: 'María García',
            email: 'maria@example.com',
            phone: '+34 623 456 789',
            address: 'Avenida Principal 45, Barcelona',
          },
        ]);

        const { data: customers } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', authData.user.id)
          .limit(2);

        if (customers && customers.length > 0) {
          await supabase.from('repair_tickets').upsert([
            {
              user_id: authData.user.id,
              customer_id: customers[0].id,
              ticket_number: 'TKT-001-DEMO',
              device_type: 'iPhone 13 Pro',
              device_model: 'A2483',
              issue_description: 'Pantalla rota, necesita reemplazo',
              status: 'in_progress',
              priority: 'high',
              estimated_cost: 199.99,
            },
            {
              user_id: authData.user.id,
              customer_id: customers[1].id,
              ticket_number: 'TKT-002-DEMO',
              device_type: 'Samsung Galaxy S21',
              issue_description: 'Batería no carga correctamente',
              status: 'pending',
              priority: 'medium',
              estimated_cost: 89.99,
            },
          ]);
        }

        await supabase.from('inventory_items').upsert([
          {
            user_id: authData.user.id,
            name: 'Pantalla iPhone 13 Pro',
            sku: 'SCR-IPH13P-BLK',
            category: 'Pantallas',
            quantity: 5,
            min_quantity: 2,
            cost_price: 120.00,
            selling_price: 199.99,
          },
          {
            user_id: authData.user.id,
            name: 'Batería Samsung Galaxy S21',
            sku: 'BAT-SGS21-OEM',
            category: 'Baterías',
            quantity: 8,
            min_quantity: 3,
            cost_price: 45.00,
            selling_price: 89.99,
          },
        ]);
      }
    } catch (error: any) {
      setResult('❌ Error: ' + error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <JcOneFixAppIcon className="rounded-lg" />
            <JcOneFixMark tone="onLight" className="text-2xl font-bold" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuración de Usuario Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Haz clic en el botón para crear un usuario de demostración con datos de ejemplo.
            </p>

            <Button
              onClick={createDemoUser}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario Demo
            </Button>

            {result && (
              <div className="p-4 bg-slate-100 rounded-lg whitespace-pre-wrap text-sm">
                {result}
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Credenciales Demo:</p>
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>Email:</strong> demo@repairdesk.com</p>
                <p><strong>Contraseña:</strong> demo123456</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
