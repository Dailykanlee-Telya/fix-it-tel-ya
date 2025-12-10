import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3,
  Ticket,
  Clock,
  TrendingUp,
  Package,
  Star,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { STATUS_LABELS, ERROR_CODE_LABELS, ErrorCode } from '@/types/database';

export default function Reports() {
  // Ticket stats
  const { data: ticketStats } = useQuery({
    queryKey: ['report-ticket-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select('status, error_code, created_at');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        byStatus: {} as Record<string, number>,
        byErrorCode: {} as Record<string, number>,
        thisMonth: 0,
        thisWeek: 0,
      };

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

      data?.forEach((ticket: any) => {
        // By status
        stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1;
        
        // By error code
        if (ticket.error_code) {
          stats.byErrorCode[ticket.error_code] = (stats.byErrorCode[ticket.error_code] || 0) + 1;
        }

        // Time-based
        const createdAt = new Date(ticket.created_at);
        if (createdAt >= monthAgo) stats.thisMonth++;
        if (createdAt >= weekAgo) stats.thisWeek++;
      });

      return stats;
    },
  });

  // Parts stats
  const { data: partsStats } = useQuery({
    queryKey: ['report-parts-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parts')
        .select('*');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        lowStock: 0,
        totalValue: 0,
      };

      data?.forEach((part: any) => {
        if (part.stock_quantity <= part.min_stock_quantity) {
          stats.lowStock++;
        }
        stats.totalValue += (part.purchase_price || 0) * (part.stock_quantity || 0);
      });

      return stats;
    },
  });

  // Feedback stats
  const { data: feedbackStats } = useQuery({
    queryKey: ['report-feedback-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('rating, is_complaint');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        averageRating: 0,
        complaints: 0,
      };

      if (data && data.length > 0) {
        const sum = data.reduce((acc: number, f: any) => acc + f.rating, 0);
        stats.averageRating = sum / data.length;
        stats.complaints = data.filter((f: any) => f.is_complaint).length;
      }

      return stats;
    },
  });

  const kpiCards = [
    {
      title: 'Tickets diese Woche',
      value: ticketStats?.thisWeek || 0,
      icon: Ticket,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Tickets diesen Monat',
      value: ticketStats?.thisMonth || 0,
      icon: TrendingUp,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Durchschnittsbewertung',
      value: feedbackStats?.averageRating?.toFixed(1) || '-',
      suffix: '/ 5',
      icon: Star,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Teile mit niedrigem Bestand',
      value: partsStats?.lowStock || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  const sortedErrorCodes = Object.entries(ticketStats?.byErrorCode || {})
    .sort(([, a], [, b]) => (b as number) - (a as number));

  const sortedStatus = Object.entries(ticketStats?.byStatus || {})
    .sort(([, a], [, b]) => (b as number) - (a as number));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Statistiken</h1>
        <p className="text-muted-foreground">Übersicht über Kennzahlen und Performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {kpi.value}
                    {kpi.suffix && <span className="text-lg text-muted-foreground">{kpi.suffix}</span>}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tickets by Status */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tickets nach Status
            </CardTitle>
            <CardDescription>Verteilung aller {ticketStats?.total || 0} Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedStatus.map(([status, count]) => {
                const percentage = ticketStats?.total ? ((count as number) / ticketStats.total * 100).toFixed(0) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
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

        {/* Tickets by Error Type */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Häufigste Fehlerarten
            </CardTitle>
            <CardDescription>Verteilung nach Schadenstyp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedErrorCodes.slice(0, 6).map(([code, count]) => {
                const percentage = ticketStats?.total ? ((count as number) / ticketStats.total * 100).toFixed(0) : 0;
                return (
                  <div key={code}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {ERROR_CODE_LABELS[code as ErrorCode] || code}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Summary */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-info" />
              Lagerübersicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold text-foreground">{partsStats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Artikelarten</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold text-foreground">
                  {partsStats?.totalValue?.toFixed(0) || 0} €
                </p>
                <p className="text-sm text-muted-foreground">Lagerwert (EK)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Satisfaction */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" />
              Kundenzufriedenheit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <p className="text-3xl font-bold text-foreground">
                    {feedbackStats?.averageRating?.toFixed(1) || '-'}
                  </p>
                  <Star className="h-6 w-6 text-warning fill-warning" />
                </div>
                <p className="text-sm text-muted-foreground">Durchschnitt</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold text-destructive">{feedbackStats?.complaints || 0}</p>
                <p className="text-sm text-muted-foreground">Reklamationen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
