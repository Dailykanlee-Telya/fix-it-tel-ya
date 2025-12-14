import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package, Wrench, CheckCircle, Clock, Plus, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/database';

export default function B2BDashboard() {
  const { b2bPartner, b2bPartnerId, isLoadingPartner } = useB2BAuth();
  const navigate = useNavigate();

  // Fetch KPIs
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['b2b-dashboard-stats', b2bPartnerId],
    queryFn: async () => {
      if (!b2bPartnerId) return null;

      const { data: tickets, error } = await supabase
        .from('repair_tickets')
        .select('status, kva_approved')
        .eq('b2b_partner_id', b2bPartnerId);

      if (error) throw error;

      const openStatuses = ['NEU_EINGEGANGEN', 'IN_DIAGNOSE', 'WARTET_AUF_TEIL_ODER_FREIGABE'];
      const inRepairStatuses = ['IN_REPARATUR'];
      const readyStatuses = ['FERTIG_ZUR_ABHOLUNG'];

      return {
        open: tickets?.filter(t => openStatuses.includes(t.status)).length || 0,
        inRepair: tickets?.filter(t => inRepairStatuses.includes(t.status)).length || 0,
        ready: tickets?.filter(t => readyStatuses.includes(t.status)).length || 0,
        kvaOpen: tickets?.filter(t => t.kva_approved === null && t.status === 'WARTET_AUF_TEIL_ODER_FREIGABE').length || 0,
      };
    },
    enabled: !!b2bPartnerId,
  });

  // Fetch recent orders
  const { data: recentOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['b2b-recent-orders', b2bPartnerId],
    queryFn: async () => {
      if (!b2bPartnerId) return [];

      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          id,
          ticket_number,
          endcustomer_reference,
          status,
          created_at,
          device:devices(device_type, brand, model)
        `)
        .eq('b2b_partner_id', b2bPartnerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!b2bPartnerId,
  });

  if (isLoadingPartner) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!b2bPartner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Kein B2B-Partner zugeordnet</h2>
        <p className="text-muted-foreground">
          Ihr Konto ist keinem B2B-Partner zugeordnet. Bitte kontaktieren Sie den Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">B2B-Dashboard</h1>
          <p className="text-muted-foreground">{b2bPartner.name}</p>
        </div>
        <Button onClick={() => navigate('/b2b/orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Auftrag
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offene Aufträge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">
                {isLoadingStats ? '...' : stats?.open || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Reparatur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">
                {isLoadingStats ? '...' : stats?.inRepair || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fertig / Retour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {isLoadingStats ? '...' : stats?.ready || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              KVA offen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">
                {isLoadingStats ? '...' : stats?.kvaOpen || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Letzte Aufträge</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/b2b/orders')}>
            Alle anzeigen
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recentOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Noch keine Aufträge vorhanden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auftragsnummer</TableHead>
                  <TableHead>Endkunden-Ref.</TableHead>
                  <TableHead>Gerät</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders?.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/b2b/orders/${order.id}`)}
                  >
                    <TableCell className="font-mono text-sm">
                      {order.ticket_number}
                    </TableCell>
                    <TableCell>
                      {order.endcustomer_reference || '-'}
                    </TableCell>
                    <TableCell>
                      {order.device ? (
                        <span className="text-sm">
                          {order.device.brand} {order.device.model}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]}>
                        {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
