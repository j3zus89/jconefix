'use client';

import { SimpleTicketList } from '@/components/dashboard/SimpleTicketList';

export default function WarrantyPage() {
  return (
    <SimpleTicketList
      title="Garantías"
      subtitle="Consulta rápida: busca por cliente o ticket y revisa si la garantía sigue vigente, venció o cuántos días quedan. Las fechas las defines en cada orden."
      warrantyOnly
    />
  );
}
