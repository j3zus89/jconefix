'use client';

import { SupportChatInbox } from '@/components/admin/SupportChatInbox';

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Soporte técnico</h1>
        <p className="mt-1 text-sm text-gray-500">
          Conversaciones iniciadas por los clientes desde «Contacto apoyo» en su panel. Abre un hilo con el botón flotante
          abajo a la derecha; cuando el caso esté cerrado puedes eliminar el hilo de la lista. Para escribir tú primero a
          un usuario concreto, usa <strong className="font-medium text-gray-700">Admin → Usuarios</strong> (panel
          Acciones → mensaje por soporte).
        </p>
      </div>

      <SupportChatInbox />
    </div>
  );
}
