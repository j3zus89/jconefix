'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Search, Trash2, RefreshCw, Mail, Edit3, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function OutboxPage() {
  const supabase = createClient();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({
    to: '',
    subject: '',
    content: '',
  });

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
        .eq('folder', 'outbox')
        .order('created_at', { ascending: false });

      setEmails(data || []);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!compose.to || !compose.subject || !compose.content) {
      toast.error('Completa todos los campos');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('emails').insert({
        user_id: user.id,
        folder: 'outbox',
        sender: user.email,
        recipient: compose.to,
        subject: compose.subject,
        content: compose.content,
        status: 'sent',
        created_at: new Date().toISOString(),
      });

      toast.success('Correo enviado');
      setCompose({ to: '', subject: '', content: '' });
      setShowCompose(false);
      loadEmails();
    } catch (error: any) {
      toast.error('Error al enviar: ' + error.message);
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
    e.recipient?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Bandeja de Salida</h1>
        <div className="flex gap-2">
          <Button className="bg-primary text-white hover:bg-primary/90" onClick={loadEmails}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button
            className="bg-primary hover:bg-primary"
            onClick={() => setShowCompose(!showCompose)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Redactar
          </Button>
        </div>
      </div>

      {/* Compose Form */}
      {showCompose && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nuevo Correo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Para</Label>
              <Input
                type="email"
                placeholder="destinatario@email.com"
                value={compose.to}
                onChange={(e) => setCompose({ ...compose, to: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input
                placeholder="Asunto del correo"
                value={compose.subject}
                onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                placeholder="Escribe tu mensaje aquí..."
                rows={6}
                value={compose.content}
                onChange={(e) => setCompose({ ...compose, content: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => setShowCompose(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary"
                onClick={sendEmail}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar en correos enviados..."
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
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Correos Enviados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Cargando...</p>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay correos enviados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className="p-4 rounded-lg border bg-white border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Para: {email.recipient}</p>
                        <Badge variant="outline">Enviado</Badge>
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
                        onClick={() => toast.info('Vista previa en desarrollo')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEmail(email.id)}
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
