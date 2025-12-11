import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Filter,
  Wrench,
  Clock,
  User,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Package,
} from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, TicketStatus, RepairTicket } from '@/types/database';
import { formatDistanceToNow, subDays } from 'date-fns';
import { de } from 'date-fns/locale';

const STATUS_ORDER: TicketStatus[] = [
  'NEU_EINGEGANGEN',
  'IN_DIAGNOSE',
  'WARTET_AUF_TEIL_ODER_FREIGABE',
  'IN_REPARATUR',
  'FERTIG_ZUR_ABHOLUNG',
];

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
  
  // Get unique brands from tickets for filter
  const uniqueBrands = useMemo(() => {
    if (!tickets) return [];
    const brands = tickets.map((t: any) => t.device?.brand).filter(Boolean);
    return [...new Set(brands)].sort();
  }, [tickets]);

  const ticketsByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filteredTickets?.filter((t: any) => t.status === status) || [];
    return acc;
  }, {} as Record<TicketStatus, any[]>);

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'NEU_EINGEGANGEN':
        return <Clock className="h-4 w-4" />;
      case 'IN_DIAGNOSE':
        return <Wrench className="h-4 w-4" />;
      case 'WARTET_AUF_TEIL_ODER_FREIGABE':
        return <Timer className="h-4 w-4" />;
      case 'IN_REPARATUR':
        return <Wrench className="h-4 w-4" />;
      case 'FERTIG_ZUR_ABHOLUNG':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'NEU_EINGEGANGEN':
        return 'bg-primary';
      case 'IN_DIAGNOSE':
        return 'bg-purple-500';
      case 'WARTET_AUF_TEIL_ODER_FREIGABE':
        return 'bg-warning';
      case 'IN_REPARATUR':
        return 'bg-info';
      case 'FERTIG_ZUR_ABHOLUNG':
        return 'bg-success';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Werkstatt-Board</h1>
          <p className="text-muted-foreground">Übersicht aller offenen Reparaturen</p>
        </div>
        <Button onClick={() => navigate('/intake')} className="gap-2">
          <Wrench className="h-4 w-4" />
          Neuer Auftrag
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Suchen (Auftrag, Kunde, Gerät)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
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
            <SelectTrigger className="w-[150px]">
              <Smartphone className="h-4 w-4 mr-2" />
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
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priorität" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="express">Express</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="overdue"
            checked={showOverdueOnly}
            onCheckedChange={(checked) => setShowOverdueOnly(checked as boolean)}
          />
          <Label htmlFor="overdue" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Nur überfällige Aufträge anzeigen (&gt;7 Tage)
          </Label>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-3 lg:grid-cols-5 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => (
          <Card key={status} className="min-w-[240px] bg-muted/30">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
                  <span className="truncate">{STATUS_LABELS[status]}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
                  {ticketsByStatus[status]?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2 space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
              {ticketsByStatus[status]?.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Keine Aufträge
                </p>
              )}
              {ticketsByStatus[status]?.map((ticket: any) => {
                const isOverdue = new Date(ticket.created_at) < sevenDaysAgo;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className={`bg-card rounded-md border p-2 cursor-pointer hover:shadow-sm transition-all hover:border-primary/50 ${
                      isOverdue ? 'border-destructive/50' : ''
                    } ${ticket.priority === 'express' ? 'border-l-2 border-l-destructive' : ''}`}
                  >
                    {/* Compact Header: Ticket Number + Priority + Overdue */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-mono font-semibold text-primary truncate">
                        {ticket.ticket_number.replace('TELYA-', '')}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {ticket.priority === 'express' && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                            EXP
                          </Badge>
                        )}
                        {isOverdue && (
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                    </div>

                    {/* Device: Brand + Model in one line */}
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <Smartphone className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {ticket.device?.brand} {ticket.device?.model}
                      </span>
                    </div>

                    {/* Bottom Row: Customer + KVA Status + Time */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate max-w-[80px]">
                        {ticket.customer?.last_name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ticket.kva_required && (
                          <Badge 
                            variant={ticket.kva_approved ? "default" : "outline"} 
                            className={`text-[9px] px-1 py-0 h-4 ${
                              ticket.kva_approved 
                                ? 'bg-success text-success-foreground' 
                                : 'border-warning text-warning'
                            }`}
                          >
                            KVA
                          </Badge>
                        )}
                        <span className="text-[10px]">
                          {formatDistanceToNow(new Date(ticket.created_at), { 
                            addSuffix: false, 
                            locale: de 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
