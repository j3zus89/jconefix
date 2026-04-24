'use client';

import { Suspense, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { normalizeCheckoutCycle } from '@/lib/checkout-pricing';

/**
 * Checkout comercial unificado en pesos (Argentina). Esta ruta conserva enlaces viejos a /checkout/plan.
 */
function PlanCheckoutRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cycleParam = searchParams.get('cycle');

  useLayoutEffect(() => {
    const c = normalizeCheckoutCycle(cycleParam) || 'mensual';
    router.replace(`/checkout/ar?cycle=${c}`);
  }, [router, cycleParam]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050a12]">
      <Loader2 className="h-8 w-8 animate-spin text-[#a3e635]" />
    </div>
  );
}

export default function PlanCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#050a12]">
          <Loader2 className="h-8 w-8 animate-spin text-[#a3e635]" />
        </div>
      }
    >
      <PlanCheckoutRedirect />
    </Suspense>
  );
}
