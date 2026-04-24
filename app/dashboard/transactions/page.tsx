'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';

export default function TransactionsPage() {
  const loc = useOrgLocale();
  const sym = loc.symbol;
  const supabase = createClient();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t =>
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.reference?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Registro de Transacciones</h1>
        <Button className="bg-primary hover:bg-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Transacción
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Ingresos Hoy</p>
            <p className="text-2xl font-bold text-green-600">
              {loc.format(transactions
                .filter(t => t.type === 'income' && new Date(t.created_at).toDateString() === new Date().toDateString())
                .reduce((sum, t) => sum + (t.amount || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Gastos Hoy</p>
            <p className="text-2xl font-bold text-red-600">
              {loc.format(transactions
                .filter(t => t.type === 'expense' && new Date(t.created_at).toDateString() === new Date().toDateString())
                .reduce((sum, t) => sum + (t.amount || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Balance</p>
            <p className="text-2xl font-bold text-primary">
              {loc.format(transactions
                .filter(t => new Date(t.created_at).toDateString() === new Date().toDateString())
                .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar transacciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Historial de Transacciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Cargando...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No hay transacciones</p>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      t.type === 'income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}>
                      {t.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{t.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(t.created_at).toLocaleString('es-ES')} • {t.reference}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "font-bold",
                      t.type === 'income' ? "text-green-600" : "text-red-600"
                    )}>
                      {t.type === 'income' ? '+' : '-'} {sym} {t.amount?.toFixed(2)}
                    </span>
                    <Badge variant={t.status === 'completed' ? 'default' : 'secondary'}>
                      {t.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
