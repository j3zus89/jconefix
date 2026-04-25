'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpRight, ArrowDownRight, History, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';

export default function CashFlowPage() {
  const loc = useOrgLocale();
  const sym = loc.symbol;
  const supabase = createClient();
  const [cashIn, setCashIn] = useState({ amount: '', description: '', reference: '' });
  const [cashOut, setCashOut] = useState({ amount: '', description: '', reference: '' });
  const [movements, setMovements] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setMovements(data);
        const balance = data.reduce((sum, m) => {
          return m.type === 'in' ? sum + m.amount : sum - m.amount;
        }, 0);
        setCurrentBalance(balance);
      }
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const handleCashIn = async () => {
    if (!cashIn.amount || !cashIn.description) {
      toast.error('Completa todos los campos');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('cash_movements').insert({
        user_id: user.id,
        type: 'in',
        amount: parseFloat(cashIn.amount),
        description: cashIn.description,
        reference: cashIn.reference,
        created_at: new Date().toISOString(),
      });

      toast.success('Entrada de efectivo registrada');
      setCashIn({ amount: '', description: '', reference: '' });
      loadMovements();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleCashOut = async () => {
    if (!cashOut.amount || !cashOut.description) {
      toast.error('Completa todos los campos');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('cash_movements').insert({
        user_id: user.id,
        type: 'out',
        amount: parseFloat(cashOut.amount),
        description: cashOut.description,
        reference: cashOut.reference,
        created_at: new Date().toISOString(),
      });

      toast.success('Salida de efectivo registrada');
      setCashOut({ amount: '', description: '', reference: '' });
      loadMovements();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Entrada/Salida de Efectivo</h1>

      {/* Current Balance */}
      <Card className="mb-6 bg-gradient-to-r from-[#0d9488] to-[#0f766e]">
        <CardContent className="pt-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80">Balance Actual en Caja</p>
              <p className="text-4xl font-bold">{loc.format(currentBalance)}</p>
            </div>
            <Wallet className="h-12 w-12 text-white/50" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Cash In */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <ArrowUpRight className="h-5 w-5" />
              Entrada de Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Monto ({sym})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cashIn.amount}
                onChange={(e) => setCashIn({ ...cashIn, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Concepto de la entrada"
                value={cashIn.description}
                onChange={(e) => setCashIn({ ...cashIn, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Referencia (opcional)</Label>
              <Input
                placeholder="Nº de factura, ticket, etc."
                value={cashIn.reference}
                onChange={(e) => setCashIn({ ...cashIn, reference: e.target.value })}
              />
            </div>
            <Button
              onClick={handleCashIn}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar Entrada
            </Button>
          </CardContent>
        </Card>

        {/* Cash Out */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ArrowDownRight className="h-5 w-5" />
              Salida de Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Monto ({sym})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cashOut.amount}
                onChange={(e) => setCashOut({ ...cashOut, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Concepto de la salida"
                value={cashOut.description}
                onChange={(e) => setCashOut({ ...cashOut, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Referencia (opcional)</Label>
              <Input
                placeholder="Nº de recibo, comprobante, etc."
                value={cashOut.reference}
                onChange={(e) => setCashOut({ ...cashOut, reference: e.target.value })}
              />
            </div>
            <Button
              onClick={handleCashOut}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar Salida
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#0d9488]" />
            Movimientos Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No hay movimientos registrados</p>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      m.type === 'in' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}>
                      {m.type === 'in' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{m.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(m.created_at).toLocaleString('es-ES')}
                        {m.reference && ` • Ref: ${m.reference}`}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-bold",
                    m.type === 'in' ? "text-green-600" : "text-red-600"
                  )}>
                    {m.type === 'in' ? '+' : '-'} {sym}{m.amount?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
