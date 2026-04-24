'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle,
  X,
  ChevronLeft,
  Send,
  Bot,
  User,
  UserCog,
  Wifi,
  WifiOff,
  QrCode,
  AlertCircle,
  Clock,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MaiaStatus } from './MaiaFloatingWidget';
import { createClient } from '@/lib/supabase/client';

// Types
interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_type: string;
  content: string;
  sender_type: 'customer' | 'ai' | 'human';
  sender_name: string;
  sender_id?: string;
  whatsapp_status: string;
  ai_intent?: string;
  created_at: string;
}

interface WhatsAppConversation {
  id: string;
  chat_id: string;
  customer_name?: string;
  customer_phone?: string;
  status: string;
  ai_enabled: boolean;
  ai_paused_until?: string;
  ai_pause_reason?: string;
  total_messages: number;
  ai_messages_count: number;
  human_messages_count: number;
  created_at: string;
  updated_at: string;
  whatsapp_messages?: WhatsAppMessage[];
}

interface MaiaChatPanelProps {
  onClose: () => void;
  connectionStatus: MaiaStatus;
  onRefreshStatus: () => void;
}

// Helper functions
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatPhone(phone?: string): string {
  if (!phone) return 'Desconocido';
  // Quitar @s.whatsapp.net si existe
  return phone.replace('@s.whatsapp.net', '').replace('@c.us', '');
}

function getSenderIcon(senderType: string) {
  switch (senderType) {
    case 'ai':
      return <Bot className="h-4 w-4" />;
    case 'human':
      return <UserCog className="h-4 w-4" />;
    case 'customer':
    default:
      return <User className="h-4 w-4" />;
  }
}

function getSenderColor(senderType: string): string {
  switch (senderType) {
    case 'ai':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'human':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'customer':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getSenderLabel(senderType: string): string {
  switch (senderType) {
    case 'ai':
      return 'MAIA (IA)';
    case 'human':
      return 'Técnico';
    case 'customer':
    default:
      return 'Cliente';
  }
}

export function MaiaChatPanel({ onClose, connectionStatus, onRefreshStatus }: MaiaChatPanelProps) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Cargar conversaciones
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/maia/conversations', { cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API error response:', res.status, errorText);
        throw new Error(`API Error ${res.status}: ${errorText}`);
      }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Error desconocido';
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar mensajes de una conversación
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/maia/messages?conversationId=${conversationId}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Error cargando mensajes');
    }
  }, []);

  // Efecto para cargar al montar
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`maia_${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as WhatsAppMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, supabase]);

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Seleccionar conversación
  const handleSelectConversation = async (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
  };

  // Enviar mensaje (intervención humana)
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const res = await fetch('/api/maia/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: inputMessage.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error enviando mensaje');
      }

      const data = await res.json();
      
      // Agregar mensaje optimista
      setMessages((prev) => [...prev, data.message]);
      setInputMessage('');
      
      // Actualizar conversación para mostrar IA silenciada
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? {
                ...c,
                ai_enabled: false,
                ai_paused_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                ai_pause_reason: 'human_intervention',
              }
            : c
        )
      );

      toast.success('Mensaje enviado - IA silenciada 10 min');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Error enviando mensaje');
    } finally {
      setSending(false);
    }
  };

  // Verificar si la IA está silenciada
  const isAISilenced = (conversation: WhatsAppConversation): boolean => {
    if (!conversation.ai_paused_until) return false;
    return new Date(conversation.ai_paused_until) > new Date();
  };

  // Formatear tiempo restante de silencio
  const getSilenceTimeRemaining = (conversation: WhatsAppConversation): string => {
    if (!conversation.ai_paused_until) return '';
    const diff = new Date(conversation.ai_paused_until).getTime() - Date.now();
    if (diff <= 0) return '';
    const minutes = Math.ceil(diff / 60000);
    return `${minutes} min`;
  };

  // Renderizar estado de conexión
  const renderConnectionStatus = () => {
    const { status, qr_code } = connectionStatus;

    if (status === 'connected') {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
          <Wifi className="h-3 w-3" />
          <span>Conectado</span>
        </div>
      );
    }

    if (status === 'qr_required' && qr_code) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
            <QrCode className="h-3 w-3" />
            <span>Escanea QR</span>
          </div>
          <div className="p-2 bg-white rounded border">
            <img src={qr_code} alt="QR Code WhatsApp" className="w-32 h-32" />
          </div>
        </div>
      );
    }

    if (status === 'connecting') {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
          <div className="h-3 w-3 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
          <span>Conectando...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
        <WifiOff className="h-3 w-3" />
        <span>Sin conexión</span>
      </div>
    );
  };

  // Vista de lista de conversaciones
  if (!selectedConversation) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl h-[min(70vh,520px)] w-[min(100vw-2rem,420px)]">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-white">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/15"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">MAIA Supervisión</p>
            <p className="truncate text-[11px] text-white/70">WhatsApp Bot</p>
          </div>
          {renderConnectionStatus()}
        </div>

        {/* Lista de conversaciones */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle className="mb-2 h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-500">Sin conversaciones activas</p>
              <p className="mt-1 text-xs text-gray-400">
                Las conversaciones de WhatsApp aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => {
                const lastMessage = conv.whatsapp_messages?.[conv.whatsapp_messages.length - 1];
                const silenced = isAISilenced(conv);

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {conv.customer_name || formatPhone(conv.customer_phone) || 'Cliente'}
                        </p>
                        {silenced && (
                          <Badge variant="secondary" className="shrink-0 text-[10px] bg-amber-100 text-amber-700">
                            <PauseCircle className="h-3 w-3 mr-0.5" />
                            {getSilenceTimeRemaining(conv)}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500 mt-0.5">
                        {lastMessage
                          ? `${getSenderLabel(lastMessage.sender_type)}: ${lastMessage.content.substring(0, 40)}...`
                          : 'Sin mensajes'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">
                          {conv.total_messages} mensajes
                        </span>
                        <span className="text-[10px] text-gray-300">•</span>
                        <span className="text-[10px] text-emerald-600">
                          {conv.ai_messages_count} IA
                        </span>
                        {conv.human_messages_count > 0 && (
                          <>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-blue-600">
                              {conv.human_messages_count} tú
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {lastMessage && (
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {formatTime(lastMessage.created_at)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Vista de conversación seleccionada
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl h-[min(70vh,520px)] w-[min(100vw-2rem,420px)]">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-white">
        <button
          onClick={() => setSelectedConversation(null)}
          className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/15"
          title="Volver a la lista"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">
            {selectedConversation.customer_name || formatPhone(selectedConversation.customer_phone)}
          </p>
          <p className="truncate text-[11px] text-white/70">
            {formatPhone(selectedConversation.customer_phone)}
          </p>
        </div>
        {isAISilenced(selectedConversation) ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/30 text-amber-100 text-xs">
            <PauseCircle className="h-3 w-3" />
            <span>{getSilenceTimeRemaining(selectedConversation)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5C518]/30 text-[#F5C518] text-xs">
            <Bot className="h-3 w-3" />
            <span>IA activa</span>
          </div>
        )}
      </div>

      {/* Mensajes */}
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="mb-2 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-500">Sin mensajes aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2',
                  msg.sender_type === 'customer' ? 'flex-row' : 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                    getSenderColor(msg.sender_type)
                  )}
                >
                  {getSenderIcon(msg.sender_type)}
                </div>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                    msg.sender_type === 'customer'
                      ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                      : msg.sender_type === 'ai'
                      ? 'bg-emerald-100 text-emerald-800 rounded-tr-none'
                      : 'bg-blue-100 text-blue-800 rounded-tr-none'
                  )}
                >
                  <p className="text-[11px] font-medium mb-0.5 opacity-75">
                    {msg.sender_name || getSenderLabel(msg.sender_type)}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] opacity-50 mt-1 text-right">
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input para intervención humana */}
      <div className="flex-shrink-0 border-t border-gray-100 p-3 bg-gray-50">
        {isAISilenced(selectedConversation) && (
          <div className="flex items-center gap-1.5 mb-2 text-amber-600 text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>
              IA silenciada - {getSilenceTimeRemaining(selectedConversation)} restantes
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe para intervenir manualmente..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sending}
            size="icon"
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          Al enviar, la IA se silenciará 10 minutos para esta conversación
        </p>
      </div>
    </div>
  );
}
