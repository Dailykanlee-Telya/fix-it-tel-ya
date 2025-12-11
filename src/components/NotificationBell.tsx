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
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string | null;
  message: string | null;
  related_ticket_id: string | null;
  is_read: boolean;
  created_at: string;
  ticket_number?: string;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Fetch notifications from notification_logs
  const { data: notifications } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      // Fetch from notification_logs with ticket info
      const { data, error } = await supabase
        .from('notification_logs')
        .select(`
          id,
          type,
          title,
          message,
          related_ticket_id,
          is_read,
          created_at,
          repair_ticket:repair_tickets(ticket_number)
        `)
        .or(`user_id.eq.${profile.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((entry: any) => ({
        id: entry.id,
        type: entry.type || 'info',
        title: entry.title,
        message: entry.message,
        related_ticket_id: entry.related_ticket_id,
        is_read: entry.is_read || false,
        created_at: entry.created_at,
        ticket_number: entry.repair_ticket?.ticket_number,
      }));
    },
    enabled: !!profile,
    refetchInterval: 30000,
  });

  // Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notification_logs')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      
      const { error } = await supabase
        .from('notification_logs')
        .update({ is_read: true })
        .or(`user_id.eq.${profile.id},user_id.is.null`)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Alle als gelesen markiert',
      });
    },
  });

  const unreadNotifications = notifications?.filter(n => !n.is_read) || [];
  const unreadCount = unreadNotifications.length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'customer_message':
      case 'NEW_CUSTOMER_MESSAGE':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'kva_decision':
      case 'KVA_DECISION':
        return <FileCheck className="h-4 w-4 text-amber-500" />;
      case 'new_ticket':
      case 'NEW_TICKET':
        return <Ticket className="h-4 w-4 text-emerald-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    
    // Navigate to ticket if available
    if (notification.related_ticket_id) {
      navigate(`/tickets/${notification.related_ticket_id}`);
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
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                markAllReadMutation.mutate();
              }}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Alle gelesen
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {(!notifications || notifications.length === 0) ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Keine Benachrichtigungen
            </p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex items-start gap-3 p-3 cursor-pointer ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {notification.title || notification.ticket_number || 'Benachrichtigung'}
                    </p>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                  )}
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
