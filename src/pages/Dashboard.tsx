import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Package,
  Users,
  ArrowRight,
  Wrench,
  Timer,
} from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, TicketStatus } from '@/types/database';

export default function Dashboard() {
  const navigate = useNavigate();

  // Fetch ticket statistics
  const { data: ticketStats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select('status');
      
      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        new: 0,
        inProgress: 0,
        ready: 0,
        waiting: 0,
      };

      data?.forEach((ticket: { status: string }) => {
        if (ticket.status === 'NEU_EINGEGANGEN') stats.new++;
        if (ticket.status === 'IN_DIAGNOSE' || ticket.status === 'IN_REPARATUR') stats.inProgress++;
        if (ticket.status === 'FERTIG_ZUR_ABHOLUNG') stats.ready++;
        if (ticket.status === 'WARTET_AUF_TEIL_ODER_FREIGABE') stats.waiting++;
      });

      return stats;
    },
  });

  // Fetch recent tickets
  const { data: recentTickets } = useQuery({
    queryKey: ['recent-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          *,
          customer:customers(*),
          device:devices(*)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch parts with low stock
  const { data: lowStockParts } = useQuery({
    queryKey: ['low-stock-parts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .lt('stock_quantity', 10)
        .order('stock_quantity', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const statCards = [
    {
      title: 'Neue Tickets',
      value: ticketStats?.new || 0,
      icon: Ticket,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'Heute eingegangen',
    },
    {
      title: 'In Bearbeitung',
      value: ticketStats?.inProgress || 0,
      icon: Wrench,
      color: 'text-info',
      bgColor: 'bg-info/10',
      description: 'Diagnose & Reparatur',
    },
    {
      title: 'Abholbereit',
      value: ticketStats?.ready || 0,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
      description: 'Warten auf Kunde',
    },
    {
      title: 'Wartend',
      value: ticketStats?.waiting || 0,
      icon: Timer,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      description: 'Teil oder Freigabe',
    },
  ];

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status as TicketStatus] || 'status-new';
    return (
      <span className={`status-badge ${colorClass}`}>
        {STATUS_LABELS[status as TicketStatus] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Übersicht aller Reparaturen und Aktivitäten</p>
        </div>
        <Button onClick={() => navigate('/intake')} className="gap-2">
          <Ticket className="h-4 w-4" />
          Neues Ticket erstellen
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="card-elevated hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Aktuelle Tickets</CardTitle>
              <CardDescription>Die neuesten Reparaturaufträge</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')} className="gap-1">
              Alle anzeigen
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTickets?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Noch keine Tickets vorhanden
                </p>
              )}
              {recentTickets?.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{ticket.ticket_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.customer?.first_name} {ticket.customer?.last_name} • {ticket.device?.brand} {ticket.device?.model}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Lagerbestand niedrig
              </CardTitle>
              <CardDescription>Teile mit geringem Bestand</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/parts')} className="gap-1">
              Lager öffnen
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockParts?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Alle Teile ausreichend vorrätig
                </p>
              )}
              {lowStockParts?.map((part: any) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{part.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {part.brand} {part.model}
                      </p>
                    </div>
                  </div>
                  <Badge variant={part.stock_quantity <= 3 ? 'destructive' : 'secondary'}>
                    {part.stock_quantity} Stk.
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Schnellzugriff</CardTitle>
          <CardDescription>Häufig verwendete Aktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/intake')}
            >
              <Ticket className="h-6 w-6 text-primary" />
              <span>Ticket erstellen</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/workshop')}
            >
              <Wrench className="h-6 w-6 text-info" />
              <span>Werkstatt-Board</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/customers')}
            >
              <Users className="h-6 w-6 text-success" />
              <span>Kunden</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/parts')}
            >
              <Package className="h-6 w-6 text-warning" />
              <span>Ersatzteile</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
