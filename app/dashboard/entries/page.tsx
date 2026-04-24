'use client';

import { SimpleTicketList } from '@/components/dashboard/SimpleTicketList';

export default function EntriesPage() {
  return (
    <SimpleTicketList
      title="Administrar entradas"
      subtitle="Tickets en estado «entrada». Gestiona el mismo flujo desde la ficha de cada ticket."
      statusIn={['entrada']}
    />
  );
}
