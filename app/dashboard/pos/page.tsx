'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { ShoppingCart, Search, Receipt, CreditCard, Banknote, Smartphone, CircleCheck as CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import {
  posCheckoutFormSchema,
  type PosCheckoutFormValues,
} from '@/lib/form-schemas/high-risk-forms';

type Product = {
  id: string;
  name: string;
  sku: string;
  selling_price: number;
  quantity: number;
  category: string;
  /** Código interno del repuesto (Gestión de repuestos) */
  product_id?: string;
};

type CartItem = Product & { qty: number };

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo', icon: Banknote },
  { id: 'card', label: 'Tarjeta', icon: CreditCard },
  { id: 'bizum', label: 'Bizum', icon: Smartphone },
];

export default function POSPage() {
  const supabase = createClient();
  const loc = useOrgLocale();
  const sym = loc.symbol; // '$' para AR, '€' para ES
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [completed, setCompleted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const checkoutForm = useForm<PosCheckoutFormValues>({
    resolver: zodResolver(posCheckoutFormSchema),
    defaultValues: {
      payMethod: 'cash',
      discount: '0',
      cashGiven: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });
  const payMethod = checkoutForm.watch('payMethod');
  const discountWatch = checkoutForm.watch('discount');

  const loadProducts = async () => {
    setLoadError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProducts([]);
      return;
    }
    // Misma fuente que Inventario → Gestión de repuestos (`products`), no `inventory_items`.
    const orgId = await getActiveOrganizationId(supabase);
    let q = (supabase as any)
      .from('products')
      .select('id, name, sku, price, quantity, category, product_id')
      .gt('quantity', 0)
      .order('name');
    q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', user.id);
    const { data, error } = await q;
    if (error) {
      setLoadError(error.message);
      setProducts([]);
      toast.error(
        'No se pudo cargar el catálogo: ' + error.message + ' · ¿Migración 202604021500 aplicada en Supabase?'
      );
      return;
    }
    const rows = (data || []) as Array<{
      id: string;
      name: string;
      sku: string | null;
      price: number | null;
      quantity: number;
      category: string | null;
      product_id: string | null;
    }>;
    setProducts(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku ?? '',
        selling_price: Number(r.price ?? 0),
        quantity: r.quantity,
        category: r.category ?? '',
        product_id: r.product_id ?? '',
      }))
    );
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial; `createClient()` es estable
  }, []);

  const searchNorm = search.trim().toLowerCase();
  const filtered = !searchNorm
    ? products
    : products.filter((p) => {
        const hay = [
          p.name,
          p.sku,
          p.category,
          p.product_id ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(searchNorm);
      });

  const stockCap = (id: string) => products.find((p) => p.id === id)?.quantity ?? 0;

  const isCheckingOut = checkoutForm.formState.isSubmitting;

  const addToCart = (product: Product) => {
    if (isCheckingOut) return;
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      const nextQty = (ex?.qty ?? 0) + 1;
      if (nextQty > product.quantity) {
        toast.error('No hay más stock disponible de este producto');
        return prev;
      }
      if (ex) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    if (isCheckingOut) return;
    setCart((prev) => prev.filter((i) => i.id !== id));
  };
  const updateQty = (id: string, qty: number) => {
    if (isCheckingOut) return;
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    const cap = stockCap(id);
    if (qty > cap) {
      toast.error('Cantidad superior al stock disponible');
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const subtotal = cart.reduce((s, i) => s + i.selling_price * i.qty, 0);
  const discountPct = useMemo(() => {
    const t = (discountWatch ?? '0').trim().replace(',', '.');
    const n = parseFloat(t);
    return !Number.isFinite(n) || Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
  }, [discountWatch]);
  const discountAmount = (subtotal * discountPct) / 100;
  const tax = (subtotal - discountAmount) * 0.21;
  const total = subtotal - discountAmount + tax;
  const cashGivenVal = parseFloat(
    (checkoutForm.watch('cashGiven') || '0').trim().replace(',', '.') || '0'
  );
  const change = cashGivenVal - total;

  const runCheckout = async (vals: PosCheckoutFormValues) => {
    if (cart.length === 0) {
      toast.error('Agregá al menos un producto al carrito para cobrar.');
      return;
    }
    const discountAmountCalc = (subtotal * parseFloat(vals.discount.trim().replace(',', '.') || '0')) / 100;
    const taxAmt = (subtotal - discountAmountCalc) * 0.21;
    const totalSale = subtotal - discountAmountCalc + taxAmt;

    if (vals.payMethod === 'cash') {
      const given = parseFloat(vals.cashGiven.trim().replace(',', '.'));
      if (given < totalSale) {
        checkoutForm.setError('cashGiven', {
          message: 'El efectivo recibido no alcanza para cubrir el total',
        });
        toast.error('El efectivo recibido no alcanza para cubrir el total.');
        return;
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo.');
        return;
      }
      const orgId = await getActiveOrganizationId(supabase);
      const items = cart.map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        qty: i.qty,
        unit: i.selling_price,
        line: i.selling_price * i.qty,
      }));
      const { error } = await (supabase as any).from('pos_sales').insert([
        {
          user_id: user.id,
          organization_id: orgId,
          payment_method: vals.payMethod,
          subtotal,
          discount_pct: parseFloat(vals.discount.trim().replace(',', '.') || '0') || 0,
          tax_amount: taxAmt,
          total: totalSale,
          items,
        },
      ]);
      if (error) throw error;

      for (const line of cart) {
        const { data: row } = await (supabase as any)
          .from('products')
          .select('quantity')
          .eq('id', line.id)
          .maybeSingle();
        const q = (row as { quantity?: number } | null)?.quantity ?? 0;
        const next = Math.max(0, q - line.qty);
        const { error: uerr } = await (supabase as any)
          .from('products')
          .update({ quantity: next, updated_at: new Date().toISOString() })
          .eq('id', line.id);
        if (uerr) {
          const stockMsg =
            uerr && typeof uerr === 'object' && 'message' in uerr
              ? String((uerr as { message?: string }).message)
              : 'Error al actualizar stock';
          toast.error(
            `La venta se guardó pero no se pudo descontar stock de «${line.name}»: ${stockMsg}. Revisá inventario manualmente.`
          );
        }
      }

      toast.success('Venta registrada correctamente');
      setCompleted(true);
      setTimeout(() => {
        setCart([]);
        setCompleted(false);
        checkoutForm.reset({ payMethod: 'cash', discount: '0', cashGiven: '' });
        loadProducts();
      }, 2200);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message)
          : 'Error desconocido';
      toast.error(
        msg
          ? `No se pudo completar el cobro: ${msg}`
          : 'No se pudo guardar la venta. Revisá permisos en Supabase o que exista la tabla pos_sales (migración 202604021500).'
      );
    }
  };

  const onCharge = checkoutForm.handleSubmit(runCheckout);

  if (completed) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Venta completada</h2>
          <p className="text-gray-500 mt-1">Procesando siguiente venta...</p>
          {payMethod === 'cash' && change > 0 && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 inline-block">
              <p className="text-green-700 font-bold text-lg">Cambio: {sym}{change.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="flex flex-1 flex-col border-r border-border p-4">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 h-10"
              placeholder="Nombre, SKU, categoría o código de repuesto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <Package className="h-12 w-12 text-amber-200 mb-3" />
            <p className="font-medium text-gray-800">No se pudo cargar el catálogo</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md">{loadError}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <Package className="h-12 w-12 text-gray-200 mb-3" />
            <p className="font-medium text-gray-600">Sin productos con stock</p>
            <p className="text-sm text-gray-400 mt-1">
              Crea repuestos en Inventario y asigna cantidad mayor que 0 para venderlos aquí
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <Search className="h-12 w-12 text-gray-200 mb-3" />
            <p className="font-medium text-gray-600">Ningún producto coincide con la búsqueda</p>
            <p className="text-sm text-gray-400 mt-1">Prueba con otra palabra, SKU o código</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                disabled={isCheckingOut}
                onClick={() => addToCart(p)}
                className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-blue-400 hover:shadow-md transition-all group disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-200 transition-colors">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Stock: {p.quantity}</p>
                <p className="text-base font-bold text-[#0d9488] mt-1">{sym}{p.selling_price?.toFixed(2) || '0.00'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-80 flex-col bg-muted/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-5 w-5 text-gray-700" />
          <h2 className="text-base font-bold text-gray-900">Carrito</h2>
          {cart.length > 0 && (
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{cart.length}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Toca un producto para añadirlo</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{sym}{item.selling_price.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={isCheckingOut} onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center disabled:opacity-40">-</button>
                  <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                  <button type="button" disabled={isCheckingOut} onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center disabled:opacity-40">+</button>
                </div>
                <div className="text-right ml-1">
                  <p className="text-xs font-bold text-gray-900">{sym}{(item.selling_price * item.qty).toFixed(2)}</p>
                  <button type="button" disabled={isCheckingOut} onClick={() => removeFromCart(item.id)} className="text-[10px] text-red-400 hover:text-red-600 disabled:opacity-40">quitar</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Subtotal</span><span>{sym}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Descuento</span>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <Input
                  className="w-16 h-7 text-xs text-right"
                  disabled={isCheckingOut}
                  {...checkoutForm.register('discount')}
                  aria-invalid={!!checkoutForm.formState.errors.discount}
                />
                <span className="text-gray-500 text-xs">%</span>
              </div>
              {checkoutForm.formState.errors.discount?.message ? (
                <span className="text-[10px] text-red-600 max-w-[140px] text-right">
                  {checkoutForm.formState.errors.discount.message}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{loc.vat} (21%)</span><span>{sym}{tax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
            <span>TOTAL</span><span className="text-lg">{sym}{total.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {PAYMENT_METHODS.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={isCheckingOut}
                  onClick={() => checkoutForm.setValue('payMethod', m.id as PosCheckoutFormValues['payMethod'])}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors',
                    payMethod === m.id
                      ? 'bg-[#0d9488] text-white border-[#0d9488]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {payMethod === 'cash' && (
            <div>
              <label className="text-xs text-gray-500">Efectivo recibido</label>
              <Input
                className="h-9 mt-1"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                disabled={isCheckingOut}
                {...checkoutForm.register('cashGiven')}
                aria-invalid={!!checkoutForm.formState.errors.cashGiven}
              />
              {checkoutForm.formState.errors.cashGiven?.message ? (
                <p className="text-xs text-red-600 mt-1">{checkoutForm.formState.errors.cashGiven.message}</p>
              ) : null}
              {change > 0 && !checkoutForm.formState.errors.cashGiven && (
                <p className="text-xs text-green-600 font-semibold mt-1">Cambio: {sym}{change.toFixed(2)}</p>
              )}
            </div>
          )}

          <Button
            type="button"
            onClick={() => {
              void onCharge();
            }}
            disabled={cart.length === 0 || isCheckingOut}
            className="w-full bg-[#0d9488] hover:bg-[#1d4ed8] text-white h-10 gap-2"
          >
            {isCheckingOut ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Receipt className="h-4 w-4" />
            )}
            Cobrar {sym}{total.toFixed(2)}
          </Button>
        </div>
      </div>
    </div>
  );
}
