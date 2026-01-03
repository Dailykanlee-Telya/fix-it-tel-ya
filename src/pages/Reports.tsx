import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Ticket,
  Clock,
  TrendingUp,
  Package,
  Star,
  AlertTriangle,
  CheckCircle2,
  Download,
  User,
  Wrench,
  Euro,
  Calendar,
} from 'lucide-react';
import { STATUS_LABELS, ERROR_CODE_LABELS, ErrorCode, TicketStatus } from '@/types/database';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import { exportToCSV, formatCurrency, formatDuration } from '@/lib/excel-export';

type TimeRange = 'today' | 'week' | 'month' | 'all';

export default function Reports() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Get date range based on selection
  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return { start: format(now, 'yyyy-MM-dd') + 'T00:00:00', end: null };
      case 'week':
        return { start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00"), end: null };
      case 'month':
        return { start: format(startOfMonth(now), "yyyy-MM-dd'T'00:00:00"), end: null };
      default:
        return { start: null, end: null };
    }
  };

  const dateRange = getDateRange();

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ['report-locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Ticket stats with technician data
  const { data: ticketStats } = useQuery({
    queryKey: ['report-ticket-stats', dateRange.start, locationFilter],
    queryFn: async () => {
      let query = supabase
        .from('repair_tickets')
        .select(`
          id, status, error_code, created_at, updated_at, location_id, final_price,
          assigned_technician:profiles!repair_tickets_assigned_technician_id_fkey(id, name)
        `);

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (locationFilter !== 'all') {
        query = query.eq('location_id', locationFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        completed: 0,
        byStatus: {} as Record<string, number>,
        byErrorCode: {} as Record<string, number>,
        totalRevenue: 0,
        avgProcessingMinutes: 0,
      };

      let totalProcessingMinutes = 0;
      let processedCount = 0;

      data?.forEach((ticket: any) => {
        // By status
        stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1;

        // Count completed
        if (ticket.status === 'ABGEHOLT') {
          stats.completed++;
        }

        // Revenue
        if (ticket.final_price) {
          stats.totalRevenue += Number(ticket.final_price);
        }

        // By error code
        if (ticket.error_code) {
          stats.byErrorCode[ticket.error_code] = (stats.byErrorCode[ticket.error_code] || 0) + 1;
        }

        // Processing time for completed tickets
        if (ticket.status === 'ABGEHOLT' || ticket.status === 'FERTIG_ZUR_ABHOLUNG') {
          const created = new Date(ticket.created_at);
          const updated = new Date(ticket.updated_at);
          totalProcessingMinutes += differenceInMinutes(updated, created);
          processedCount++;
        }
      });

      if (processedCount > 0) {
        stats.avgProcessingMinutes = totalProcessingMinutes / processedCount;
      }

      return stats;
    },
  });

  // Technician performance
  const { data: technicianStats } = useQuery({
    queryKey: ['report-technician-stats', dateRange.start, locationFilter],
    queryFn: async () => {
      let query = supabase
        .from('repair_tickets')
        .select(`
          id, status, created_at, updated_at, assigned_technician_id, location_id,
          assigned_technician:profiles!repair_tickets_assigned_technician_id_fkey(id, name)
        `)
        .not('assigned_technician_id', 'is', null);

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (locationFilter !== 'all') {
        query = query.eq('location_id', locationFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const techMap: Record<string, {
        id: string;
        name: string;
        totalAssigned: number;
        completed: number;
        totalProcessingMinutes: number;
        completedCount: number;
      }> = {};

      data?.forEach((ticket: any) => {
        const techId = ticket.assigned_technician_id;
        const techName = ticket.assigned_technician?.name || 'Unbekannt';

        if (!techMap[techId]) {
          techMap[techId] = {
            id: techId,
            name: techName,
            totalAssigned: 0,
            completed: 0,
            totalProcessingMinutes: 0,
            completedCount: 0,
          };
        }

        techMap[techId].totalAssigned++;

        if (ticket.status === 'ABGEHOLT' || ticket.status === 'FERTIG_ZUR_ABHOLUNG') {
          techMap[techId].completed++;
          const created = new Date(ticket.created_at);
          const updated = new Date(ticket.updated_at);
          techMap[techId].totalProcessingMinutes += differenceInMinutes(updated, created);
          techMap[techId].completedCount++;
        }
      });

      return Object.values(techMap).map((tech) => ({
        ...tech,
        avgProcessingMinutes: tech.completedCount > 0
          ? tech.totalProcessingMinutes / tech.completedCount
          : 0,
        completionRate: tech.totalAssigned > 0
          ? (tech.completed / tech.totalAssigned) * 100
          : 0,
      })).sort((a, b) => b.completed - a.completed);
    },
  });

  // Parts usage by category
  const { data: partsUsage } = useQuery({
    queryKey: ['report-parts-usage', dateRange.start, locationFilter],
    queryFn: async () => {
      let query = supabase
        .from('ticket_part_usage')
        .select(`
          quantity, unit_sales_price,
          part:parts(part_category, name),
          repair_ticket:repair_tickets(created_at, location_id)
        `);

      const { data, error } = await query;
      if (error) throw error;

      const categoryMap: Record<string, { count: number; revenue: number }> = {};

      data?.forEach((usage: any) => {
        // Filter by date and location if needed
        if (dateRange.start && usage.repair_ticket?.created_at < dateRange.start) {
          return;
        }
        if (locationFilter !== 'all' && usage.repair_ticket?.location_id !== locationFilter) {
          return;
        }

        const category = usage.part?.part_category || 'SONSTIGES';
        if (!categoryMap[category]) {
          categoryMap[category] = { count: 0, revenue: 0 };
        }
        categoryMap[category].count += usage.quantity || 1;
        categoryMap[category].revenue += (usage.unit_sales_price || 0) * (usage.quantity || 1);
      });

      return Object.entries(categoryMap)
        .map(([category, stats]) => ({ category, ...stats }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Parts stats for inventory value
  const { data: partsStats } = useQuery({
    queryKey: ['report-parts-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('parts').select('*');
      if (error) throw error;

      const stats = { total: data?.length || 0, lowStock: 0, totalValue: 0 };
      data?.forEach((part: any) => {
        if (part.stock_quantity <= part.min_stock_quantity) {
          stats.lowStock++;
        }
        stats.totalValue += (part.purchase_price || 0) * (part.stock_quantity || 0);
      });
      return stats;
    },
  });

  // Export functions
  const exportTechnicianStats = () => {
    if (!technicianStats?.length) return;
    exportToCSV(
      technicianStats.map((t) => ({
        name: t.name,
        totalAssigned: t.totalAssigned,
        completed: t.completed,
        completionRate: `${t.completionRate.toFixed(1)}%`,
        avgProcessingTime: formatDuration(t.avgProcessingMinutes),
      })),
      `technikerleistung_${format(new Date(), 'yyyy-MM-dd')}`,
      [
        { key: 'name', label: 'Techniker' },
        { key: 'totalAssigned', label: 'Zugewiesen' },
        { key: 'completed', label: 'Erledigt' },
        { key: 'completionRate', label: 'Abschlussrate' },
        { key: 'avgProcessingTime', label: 'Ø Bearbeitungszeit' },
      ]
    );
  };

  const exportStatusStats = () => {
    if (!ticketStats?.byStatus) return;
    const data = Object.entries(ticketStats.byStatus).map(([status, count]) => ({
      status: STATUS_LABELS[status as TicketStatus] || status,
      count,
      percentage: `${((count / ticketStats.total) * 100).toFixed(1)}%`,
    }));
    exportToCSV(
      data,
      `status_uebersicht_${format(new Date(), 'yyyy-MM-dd')}`,
      [
        { key: 'status', label: 'Status' },
        { key: 'count', label: 'Anzahl' },
        { key: 'percentage', label: 'Anteil' },
      ]
    );
  };

  const exportPartsUsage = () => {
    if (!partsUsage?.length) return;
    exportToCSV(
      partsUsage.map((p) => ({
        category: p.category,
        count: p.count,
        revenue: p.revenue,
      })),
      `teileverbrauch_${format(new Date(), 'yyyy-MM-dd')}`,
      [
        { key: 'category', label: 'Kategorie' },
        { key: 'count', label: 'Verbraucht' },
        { key: 'revenue', label: 'Umsatz (€)' },
      ]
    );
  };

  const timeRangeLabels: Record<TimeRange, string> = {
    today: 'Heute',
    week: 'Diese Woche',
    month: 'Diesen Monat',
    all: 'Gesamt',
  };

  const kpiCards = [
    {
      title: 'Aufträge gesamt',
      value: ticketStats?.total || 0,
      icon: Ticket,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Abgeschlossen',
      value: ticketStats?.completed || 0,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Ø Bearbeitungszeit',
      value: ticketStats?.avgProcessingMinutes ? formatDuration(ticketStats.avgProcessingMinutes) : '-',
      icon: Clock,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Lagerwert (EK)',
      value: formatCurrency(partsStats?.totalValue || 0),
      icon: Package,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Statistiken</h1>
          <p className="text-muted-foreground">Übersicht über Kennzahlen und Performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeRangeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle Filialen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Filialen</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Reports Tabs */}
      <Tabs defaultValue="technician" className="space-y-4">
        <TabsList>
          <TabsTrigger value="technician" className="gap-2">
            <Wrench className="h-4 w-4" />
            Technikerleistung
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Status-Übersicht
          </TabsTrigger>
          <TabsTrigger value="parts" className="gap-2">
            <Package className="h-4 w-4" />
            Teileverbrauch
          </TabsTrigger>
        </TabsList>

        {/* Technician Performance Tab */}
        <TabsContent value="technician">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Technikerleistung
                </CardTitle>
                <CardDescription>
                  Performance der Techniker im Zeitraum: {timeRangeLabels[timeRange]}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportTechnicianStats}>
                <Download className="h-4 w-4 mr-2" />
                Excel Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Techniker</TableHead>
                    <TableHead className="text-right">Zugewiesen</TableHead>
                    <TableHead className="text-right">Erledigt</TableHead>
                    <TableHead className="text-right">Quote</TableHead>
                    <TableHead className="text-right">Ø Bearbeitungszeit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicianStats?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Keine Daten vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                  {technicianStats?.map((tech) => (
                    <TableRow key={tech.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          {tech.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{tech.totalAssigned}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{tech.completed}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={tech.completionRate >= 80 ? 'text-success' : tech.completionRate >= 50 ? 'text-warning' : 'text-destructive'}>
                          {tech.completionRate.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDuration(tech.avgProcessingMinutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Overview Tab */}
        <TabsContent value="status">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Status-Übersicht
                </CardTitle>
                <CardDescription>
                  Verteilung aller {ticketStats?.total || 0} Aufträge
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportStatusStats}>
                <Download className="h-4 w-4 mr-2" />
                Excel Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(ticketStats?.byStatus || {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([status, count]) => {
                    const percentage = ticketStats?.total ? ((count as number) / ticketStats.total * 100).toFixed(0) : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {STATUS_LABELS[status as TicketStatus] || status}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parts Usage Tab */}
        <TabsContent value="parts">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-info" />
                  Teileverbrauch nach Kategorie
                </CardTitle>
                <CardDescription>
                  Verbrauchte Ersatzteile im Zeitraum: {timeRangeLabels[timeRange]}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportPartsUsage}>
                <Download className="h-4 w-4 mr-2" />
                Excel Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="text-right">Verbraucht</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partsUsage?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Keine Daten vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                  {partsUsage?.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
