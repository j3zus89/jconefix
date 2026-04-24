// Legacy route kept for compatibility.
// The main SUPER_ADMIN dashboard is now `/admin` (Command Center).
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);
  return null;
}
