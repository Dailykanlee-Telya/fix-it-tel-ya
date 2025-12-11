import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, MessageSquare, FileCheck, Ticket, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'kva_decision' | 'customer_message' | 'new_ticket';
  ticket_id: string;
  ticket_number: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch recent status history entries that could be notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      // Get recent status history with customer messages or KVA decisions
      const { data, error } = await supabase
        .from('status_history')
        .select(`
          id,
          created_at,
          note,
          new_status,
          repair_ticket:repair_tickets(id, ticket_number)
        `)
        .or('note.ilike.%[Kundennachricht]%,note.ilike.%KVA vom Kunden%')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform to notification format
      return (data || []).map((entry: any) => {
        let type: Notification['type'] = 'new_ticket';
        let message = entry.note || '';

        if (entry.note?.includes('[Kundennachricht]')) {
          type = 'customer_message';
          message = entry.note.replace('[Kundennachricht] ', '');
        } else if (entry.note?.includes('KVA vom Kunden')) {
          type = 'kva_decision';
        }

        return {
          id: entry.id,
          type,
          ticket_id: entry.repair_ticket?.id,
          ticket_number: entry.repair_ticket?.ticket_number,
          message: message.substring(0, 100),
          created_at: entry.created_at,
          read: false, // Could be tracked separately
        };
      });
    },
    enabled: !!profile,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notifications?.length || 0;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'customer_message':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'kva_decision':
        return <FileCheck className="h-4 w-4 text-amber-500" />;
      default:
        return <Ticket className="h-4 w-4 text-emerald-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.ticket_id) {
      navigate(`/tickets/${notification.ticket_id}`);
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="font-medium text-sm">Benachrichtigungen</p>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} neu
            </span>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {(!notifications || notifications.length === 0) ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Keine neuen Benachrichtigungen
            </p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="flex items-start gap-3 p-3 cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {notification.ticket_number}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { 
                      addSuffix: true, 
                      locale: de 
                    })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {notifications && notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigate('/tickets');
                setOpen(false);
              }}
              className="justify-center text-sm text-primary"
            >
              Alle Aufträge anzeigen
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
