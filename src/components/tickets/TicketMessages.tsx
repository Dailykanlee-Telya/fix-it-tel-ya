import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface TicketMessagesProps {
  ticketId: string;
}

interface Message {
  id: string;
  sender_type: 'customer' | 'employee';
  sender_user_id: string | null;
  message_text: string;
  created_at: string;
  sender_name?: string;
}

export default function TicketMessages({ ticketId }: TicketMessagesProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          id,
          sender_type,
          sender_user_id,
          message_text,
          created_at
        `)
        .eq('repair_ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get employee names for messages
      const employeeIds = data
        .filter(m => m.sender_type === 'employee' && m.sender_user_id)
        .map(m => m.sender_user_id);

      let employeeNames: Record<string, string> = {};
      if (employeeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', employeeIds);
        
        if (profiles) {
          employeeNames = profiles.reduce((acc, p) => {
            acc[p.id] = p.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return data.map(m => ({
        ...m,
        sender_name: m.sender_type === 'employee' && m.sender_user_id
          ? employeeNames[m.sender_user_id] || 'Mitarbeiter'
          : 'Kunde'
      })) as Message[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          repair_ticket_id: ticketId,
          sender_type: 'employee',
          sender_user_id: profile?.id,
          message_text: messageText.trim(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
      toast({
        title: 'Nachricht gesendet',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Nachricht konnte nicht gesendet werden',
      });
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Kundenkommunikation
        </CardTitle>
        <CardDescription>
          Nachrichtenverlauf mit dem Kunden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'employee' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender_type === 'employee'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {message.sender_name}
                    </span>
                    <span className="text-xs opacity-70">
                      {format(new Date(message.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Noch keine Nachrichten</p>
            </div>
          )}
        </div>

        {/* New message form */}
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Antwort an den Kunden..."
            rows={2}
            className="flex-1"
            maxLength={1000}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            size="icon"
            className="h-auto"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
