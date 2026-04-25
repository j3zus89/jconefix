'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Puzzle, 
  Mail, 
  MessageSquare, 
  CreditCard, 
  Truck, 
  BarChart3,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const integrations = [
  {
    id: 'email',
    name: 'Email SMTP',
    description: 'Conecta tu servidor de correo para enviar emails desde el sistema',
    icon: Mail,
    status: 'connected',
    category: 'Comunicación'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Envía notificaciones y recibe mensajes de clientes por WhatsApp',
    icon: MessageSquare,
    status: 'disconnected',
    category: 'Comunicación'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Acepta pagos con tarjeta de crédito y débito',
    icon: CreditCard,
    status: 'disconnected',
    category: 'Pagos'
  },
  {
    id: 'shipping',
    name: 'Envío Express',
    description: 'Gestiona envíos con múltiples transportistas',
    icon: Truck,
    status: 'disconnected',
    category: 'Logística'
  },
  {
    id: 'analytics',
    name: 'Google Analytics',
    description: 'Seguimiento de visitas y conversiones en tu tienda',
    icon: BarChart3,
    status: 'connected',
    category: 'Analytics'
  },
  {
    id: 'erp',
    name: 'Integración ERP',
    description: 'Conecta con tu sistema de gestión empresarial',
    icon: Puzzle,
    status: 'disconnected',
    category: 'ERP'
  },
];

export default function IntegrationsPage() {
  const handleConnect = (id: string) => {
    toast.info('Configuración de integración en desarrollo');
  };

  const handleDisconnect = (id: string) => {
    toast.info('Desconexión en desarrollo');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Integraciones</h1>
      <p className="text-gray-500 mb-6">
        Conecta RepairDesk con otras aplicaciones para mejorar tu flujo de trabajo
      </p>

      {/* Connected Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-[#0d9488]">
              {integrations.filter(i => i.status === 'connected').length}
            </p>
            <p className="text-sm text-gray-500">Conectadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-gray-600">
              {integrations.filter(i => i.status === 'disconnected').length}
            </p>
            <p className="text-sm text-gray-500">Disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-blue-600">
              {new Set(integrations.map(i => i.category)).size}
            </p>
            <p className="text-sm text-gray-500">Categorías</p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-[#0d9488]/10 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-[#0d9488]" />
                  </div>
                  <Badge 
                    variant={integration.status === 'connected' ? 'default' : 'secondary'}
                    className={integration.status === 'connected' ? 'bg-green-500' : ''}
                  >
                    {integration.status === 'connected' ? (
                      <><Check className="h-3 w-3 mr-1" /> Conectado</>
                    ) : (
                      'No conectado'
                    )}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-4">{integration.name}</CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-400 mb-4">{integration.category}</p>
                {integration.status === 'connected' ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleConnect(integration.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full bg-[#0d9488] hover:bg-[#0f766e]"
                    onClick={() => handleConnect(integration.id)}
                  >
                    <Puzzle className="h-4 w-4 mr-2" />
                    Conectar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Integration CTA */}
      <Card className="mt-6 bg-gradient-to-r from-[#0d9488]/10 to-transparent border-[#0d9488]/20">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">¿Necesitas una integración personalizada?</h3>
            <p className="text-sm text-gray-500">
              Contacta con nuestro equipo para desarrollar integraciones a medida
            </p>
          </div>
          <Button className="bg-[#0d9488] hover:bg-[#0f766e]">
            Solicitar Integración
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
