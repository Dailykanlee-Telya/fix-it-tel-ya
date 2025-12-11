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
  Package,
  ArrowRight,
  Wrench,
  Timer,
  Search,
  CalendarPlus,
  TrendingUp,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { STATUS_LABELS, TicketStatus } from '@/types/database';
import { cn } from '@/lib/utils';
import { format, subDays, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';

// Status configuration with colors
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
  NEU_EINGEGANGEN: { 
    label: 'Neu eingegangen', 
    color: 'text-blue-700 dark:text-blue-400', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Ticket 
  },
  IN_DIAGNOSE: { 
    label: 'In Diagnose', 
    color: 'text-purple-700 dark:text-purple-400', 
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: Search 
  },
  WARTET_AUF_TEIL_ODER_FREIGABE: { 
    label: 'Wartet auf Teil/Freigabe', 
    color: 'text-amber-700 dark:text-amber-400', 
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Timer 
  },
  IN_REPARATUR: { 
    label: 'In Reparatur', 
    color: 'text-cyan-700 dark:text-cyan-400', 
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    icon: Wrench 
  },
  FERTIG_ZUR_ABHOLUNG: { 
    label: 'Fertig zur Abholung', 
    color: 'text-emerald-700 dark:text-emerald-400', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2 
  },
  ABGEHOLT: { 
    label: 'Abgeholt', 
    color: 'text-slate-600 dark:text-slate-400', 
    bgColor: 'bg-slate-50 dark:bg-slate-900/50',
    borderColor: 'border-slate-200 dark:border-slate-700',
    icon: CheckCircle2 
  },
  STORNIERT: { 
    label: 'Storniert', 
    color: 'text-red-700 dark:text-red-400', 
    bgColor: 'bg-red-50 dark:bg-red-950/50',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: AlertCircle 
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const sevenDaysAgo = subDays(today, 7);

  // Fetch all open tickets with related data
  const { data: allTickets } = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          *,
          customer:customers(*),
          device:devices(*)
        `)
        .not('status', 'in', '("ABGEHOLT","STORNIERT")')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's new tickets count
  const { data: todayNewCount } = useQuery({
    queryKey: ['today-new-tickets', todayStr],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('repair_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00`);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch today's completed tickets
  const { data: todayCompletedCount } = useQuery({
    queryKey: ['today-completed-tickets', todayStr],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('repair_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ABGEHOLT')
        .gte('updated_at', `${todayStr}T00:00:00`);
      
      if (error) throw error;
      return count || 0;
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

  // Calculate statistics
  const stats = {
    total: allTickets?.length || 0,
    todayNew: todayNewCount || 0,
    todayCompleted: todayCompletedCount || 0,
    overdue: allTickets?.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt < sevenDaysAgo;
    }).length || 0,
  };

  // Group tickets by status
  const ticketsByStatus: Record<string, any[]> = {};
  const activeStatuses = ['NEU_EINGEGANGEN', 'IN_DIAGNOSE', 'WARTET_AUF_TEIL_ODER_FREIGABE', 'IN_REPARATUR', 'FERTIG_ZUR_ABHOLUNG'];
  activeStatuses.forEach(status => {
    ticketsByStatus[status] = allTickets?.filter(t => t.status === status) || [];
  });

  // Get overdue tickets (older than 7 days)
  const overdueTickets = allTickets?.filter(t => {
    const createdAt = new Date(t.created_at);
    return createdAt < sevenDaysAgo;
  }).slice(0, 5) || [];

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    return (
      <span className={cn('status-badge', config.bgColor, config.color)}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd.MM.yyyy HH:mm', { locale: de });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Übersicht aller Reparaturen • {format(today, 'EEEE, d. MMMM yyyy', { locale: de })}</p>
        </div>
        <Button onClick={() => navigate('/intake')} className="gap-2 bg-primary hover:bg-primary/90">
          <CalendarPlus className="h-4 w-4" />
          Neuen Auftrag anlegen
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated hover:shadow-lg transition-shadow border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Offene Aufträge gesamt</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Heute neu</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.todayNew}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated hover:shadow-lg transition-shadow border-l-4 border-l-cyan-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Heute fertiggestellt</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.todayCompleted}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "card-elevated hover:shadow-lg transition-shadow border-l-4",
          stats.overdue > 0 ? "border-l-destructive" : "border-l-muted"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Überfällig (&gt;7 Tage)</p>
                <p className={cn("text-3xl font-bold mt-1", stats.overdue > 0 ? "text-destructive" : "text-foreground")}>
                  {stats.overdue}
                </p>
              </div>
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                stats.overdue > 0 ? "bg-destructive/10" : "bg-muted"
              )}>
                <AlertTriangle className={cn("h-6 w-6", stats.overdue > 0 ? "text-destructive" : "text-muted-foreground")} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Status-Übersicht</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {activeStatuses.map(status => {
            const config = STATUS_CONFIG[status];
            const count = ticketsByStatus[status]?.length || 0;
            const StatusIcon = config.icon;
            return (
              <Card 
                key={status}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border-2",
                  config.borderColor,
                  config.bgColor
                )}
                onClick={() => navigate(`/workshop?status=${status}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", config.bgColor)}>
                      <StatusIcon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-2xl font-bold", config.color)}>{count}</p>
                      <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue Tickets */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Überfällige Aufträge
              </CardTitle>
              <CardDescription>Älter als 7 Tage, nach Alter sortiert</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/workshop?filter=overdue')} className="gap-1">
              Alle anzeigen
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  ✓ Keine überfälligen Aufträge
                </p>
              ) : (
                overdueTickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{ticket.ticket_number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ticket.customer?.first_name} {ticket.customer?.last_name} • {ticket.device?.brand}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(ticket.status)}
                      <span className="text-xs text-destructive font-medium">
                        {formatDate(ticket.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-warning" />
                Lagerbestand niedrig
              </CardTitle>
              <CardDescription>Teile mit weniger als 10 Stück</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/parts')} className="gap-1">
              Lager öffnen
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockParts?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  ✓ Alle Teile ausreichend vorrätig
                </p>
              ) : (
                lowStockParts?.map((part: any) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                        <Package className="h-4 w-4 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{part.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {part.brand} {part.model}
                        </p>
                      </div>
                    </div>
                    <Badge variant={part.stock_quantity <= 3 ? 'destructive' : 'secondary'}>
                      {part.stock_quantity} Stk.
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Open Tickets */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Offene Aufträge</CardTitle>
            <CardDescription>Sortiert nach Erstelldatum (älteste zuerst)</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')} className="gap-1">
            Alle Tickets
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Ticketnummer</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Kunde</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Gerät</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Erstellt</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {allTickets?.slice(0, 10).map((ticket: any) => {
                  const isOverdue = new Date(ticket.created_at) < sevenDaysAgo;
                  return (
                    <tr 
                      key={ticket.id} 
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors",
                        isOverdue && "bg-destructive/5"
                      )}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <td className="py-3 px-2 font-medium">
                        {ticket.ticket_number}
                        {isOverdue && <AlertTriangle className="inline h-3 w-3 text-destructive ml-1" />}
                      </td>
                      <td className="py-3 px-2">
                        {ticket.customer?.first_name} {ticket.customer?.last_name}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {ticket.device?.brand} {ticket.device?.model}
                      </td>
                      <td className="py-3 px-2">{getStatusBadge(ticket.status)}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">
                        {formatDate(ticket.created_at)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {(!allTickets || allTickets.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Noch keine offenen Tickets vorhanden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
