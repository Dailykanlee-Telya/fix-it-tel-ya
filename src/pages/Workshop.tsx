import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Wrench,
  Clock,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Package,
  Plus,
  Zap,
} from 'lucide-react';
import { STATUS_LABELS, TicketStatus } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { subDays } from 'date-fns';

const STATUS_ORDER: TicketStatus[] = [
  'NEU_EINGEGANGEN',
  'IN_DIAGNOSE',
  'WARTET_AUF_TEIL_ODER_FREIGABE',
  'IN_REPARATUR',
  'FERTIG_ZUR_ABHOLUNG',
];

const STATUS_CONFIG: Record<TicketStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  'NEU_EINGEGANGEN': { 
    icon: <Package className="h-4 w-4" />, 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500'
  },
  'IN_DIAGNOSE': { 
    icon: <Clock className="h-4 w-4" />, 
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500'
  },
  'WARTET_AUF_TEIL_ODER_FREIGABE': { 
    icon: <Timer className="h-4 w-4" />, 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500'
  },
  'IN_REPARATUR': { 
    icon: <Wrench className="h-4 w-4" />, 
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500'
  },
  'FERTIG_ZUR_ABHOLUNG': { 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500'
  },
  'ABGEHOLT': { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  'STORNIERT': { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  'EINGESENDET': { icon: <Package className="h-4 w-4" />, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500' },
  'RUECKVERSAND_AN_B2B': { icon: <Package className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500' },
  'RUECKVERSAND_AN_ENDKUNDE': { icon: <Package className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500' },
};

export default function Workshop() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState<boolean>(searchParams.get('filter') === 'overdue');
  
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['workshop-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          *,
          customer:customers(*),
          device:devices(*),
          location:locations(*),
          assigned_technician:profiles(*)
        `)
        .in('status', STATUS_ORDER)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const filteredTickets = tickets?.filter((ticket: any) => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.device?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.device?.model?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesBrand = brandFilter === 'all' || ticket.device?.brand === brandFilter;
    const isOverdue = new Date(ticket.created_at) < sevenDaysAgo;
    const matchesOverdue = !showOverdueOnly || isOverdue;

    return matchesSearch && matchesStatus && matchesPriority && matchesBrand && matchesOverdue;
  });
  
  const uniqueBrands = useMemo(() => {
    if (!tickets) return [];
    const brands = tickets.map((t: any) => t.device?.brand).filter(Boolean);
    return [...new Set(brands)].sort();
  }, [tickets]);

  const ticketsByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filteredTickets?.filter((t: any) => t.status === status) || [];
    return acc;
  }, {} as Record<TicketStatus, any[]>);

  const totalTickets = filteredTickets?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Werkstatt-Board
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalTickets} offene Aufträge
          </p>
        </div>
        <Button onClick={() => navigate('/intake')} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Auftrag
        </Button>
      </div>

      {/* Filters - Compact Row */}
      <div className="flex flex-wrap items-center gap-3 shrink-0 p-3 bg-muted/40 rounded-lg border">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Marke" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Marken</SelectItem>
            {uniqueBrands.map((brand: string) => (
              <SelectItem key={brand} value={brand}>{brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue placeholder="Priorität" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="express">Express</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Checkbox
            id="overdue"
            checked={showOverdueOnly}
            onCheckedChange={(checked) => setShowOverdueOnly(checked as boolean)}
          />
          <Label htmlFor="overdue" className="text-xs cursor-pointer flex items-center gap-1 text-muted-foreground whitespace-nowrap">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Überfällig
          </Label>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto min-h-0">
        <div className="grid grid-cols-5 gap-3 h-full min-w-[1100px]">
          {STATUS_ORDER.map((status) => {
            const config = STATUS_CONFIG[status];
            const statusTickets = ticketsByStatus[status] || [];
            
            return (
              <div key={status} className="flex flex-col h-full min-h-0">
                {/* Column Header */}
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${config.bgColor}`} />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-[10px] px-1.5 h-5 min-w-[20px] flex items-center justify-center font-medium"
                  >
                    {statusTickets.length}
                  </Badge>
                </div>

                {/* Column Content */}
                <Card className="flex-1 min-h-0 bg-muted/20 border-dashed">
                  <ScrollArea className="h-full">
                    <CardContent className="p-2 space-y-2">
                      {statusTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <div className={`${config.color} opacity-30`}>
                            {config.icon}
                          </div>
                          <p className="text-xs mt-2">Keine Aufträge</p>
                        </div>
                      ) : (
                        statusTickets.map((ticket: any) => {
                          const isOverdue = new Date(ticket.created_at) < sevenDaysAgo;
                          const isExpress = ticket.priority === 'express';
                          
                          return (
                            <div
                              key={ticket.id}
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              className={`
                                bg-card rounded-lg border p-3 cursor-pointer 
                                transition-all duration-200 
                                hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5
                                ${isOverdue ? 'border-destructive/40 bg-destructive/5' : ''}
                                ${isExpress ? 'ring-1 ring-destructive/30' : ''}
                              `}
                            >
                              {/* Ticket Header */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-xs font-mono font-bold text-primary">
                                  {ticket.ticket_number.split('-').slice(-2).join('-')}
                                </span>
                                <div className="flex items-center gap-1">
                                  {isExpress && (
                                    <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 gap-0.5">
                                      <Zap className="h-2.5 w-2.5" />
                                      EXP
                                    </Badge>
                                  )}
                                  {isOverdue && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                  )}
                                </div>
                              </div>

                              {/* Device Info */}
                              <div className="flex items-center gap-2 mb-2">
                                <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate">
                                  {ticket.device?.brand}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-2 pl-5">
                                {ticket.device?.model}
                              </p>

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">
                                  {ticket.customer?.last_name}, {ticket.customer?.first_name?.charAt(0)}.
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {ticket.kva_required && (
                                    <Badge 
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 h-4 ${
                                        ticket.kva_approved 
                                          ? 'bg-success/10 text-success border-success/30' 
                                          : 'bg-warning/10 text-warning border-warning/30'
                                      }`}
                                    >
                                      KVA
                                    </Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(new Date(ticket.created_at), { 
                                      addSuffix: false, 
                                      locale: de 
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </ScrollArea>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
