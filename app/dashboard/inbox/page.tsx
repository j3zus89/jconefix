'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Search, Trash2, RefreshCw, MailOpen, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function InboxPage() {
  const supabase = createClient();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', user.id)
        .eq('folder', 'inbox')
        .order('created_at', { ascending: false });

      setEmails(data || []);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('emails').update({ status: 'read' }).eq('id', id);
      loadEmails();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteEmail = async (id: string) => {
    try {
      await supabase.from('emails').delete().eq('id', id);
      toast.success('Email eliminado');
      loadEmails();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const filteredEmails = emails.filter(e =>
    e.subject?.toLowerCase().includes(search.toLowerCase()) ||
    e.sender?.toLowerCase().includes(search.toLowerCase()) ||
    e.content?.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = emails.filter(e => e.status === 'unread').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Bandeja de Entrada</h1>
        <Button variant="outline" onClick={loadEmails}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-sm text-gray-500">mensajes sin leer de {emails.length} totales</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar en correos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Emails List */}
      <Card>
        <CardHeader>
          <CardTitle>Correos Recibidos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Cargando...</p>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8">
              <MailOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay correos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-colors",
                    email.status === 'unread'
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  )}
                  onClick={() => markAsRead(email.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-medium truncate",
                          email.status === 'unread' && "font-bold"
                        )}>
                          {email.sender}
                        </p>
                        {email.status === 'unread' && (
                          <Badge variant="default" className="bg-blue-500">Nuevo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{email.subject}</p>
                      <p className="text-sm text-gray-400 truncate mt-1">
                        {email.content?.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(email.created_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info('Función de respuesta en desarrollo');
                        }}
                      >
                        <Reply className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEmail(email.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
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
