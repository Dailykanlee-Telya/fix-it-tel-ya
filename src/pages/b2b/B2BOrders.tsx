import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { STATUS_LABELS, STATUS_COLORS, TicketStatus } from '@/types/database';

export default function B2BOrders() {
  const { b2bPartnerId } = useB2BAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['b2b-orders', b2bPartnerId, statusFilter],
    queryFn: async () => {
      if (!b2bPartnerId) return [];

      let query = supabase
        .from('repair_tickets')
        .select(`
          id,
          ticket_number,
          endcustomer_reference,
          status,
          created_at,
          kva_approved,
          kva_required,
          device:devices(device_type, brand, model)
        `)
        .eq('b2b_partner_id', b2bPartnerId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as TicketStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!b2bPartnerId,
  });

  const filteredOrders = orders?.filter(order => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.ticket_number?.toLowerCase().includes(searchLower) ||
      order.endcustomer_reference?.toLowerCase().includes(searchLower) ||
      order.device?.brand?.toLowerCase().includes(searchLower) ||
      order.device?.model?.toLowerCase().includes(searchLower)
    );
  });

  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Alle Status' },
    { value: 'NEU_EINGEGANGEN', label: 'Neu eingegangen' },
    { value: 'IN_DIAGNOSE', label: 'In Diagnose' },
    { value: 'WARTET_AUF_TEIL_ODER_FREIGABE', label: 'Wartet auf Freigabe' },
    { value: 'IN_REPARATUR', label: 'In Reparatur' },
    { value: 'FERTIG_ZUR_ABHOLUNG', label: 'Fertig' },
    { value: 'ABGEHOLT', label: 'Abgeholt/Retour' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meine Aufträge</h1>
          <p className="text-muted-foreground">
            Alle Reparaturaufträge im Überblick
          </p>
        </div>
        <Button onClick={() => navigate('/b2b/orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Auftrag
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Auftragsnummer, Referenz, Gerät..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Aufträge ({filteredOrders?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredOrders?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== 'all' 
                  ? 'Keine Aufträge gefunden' 
                  : 'Noch keine Aufträge vorhanden'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button onClick={() => navigate('/b2b/orders/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ersten Auftrag anlegen
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auftragsnummer</TableHead>
                    <TableHead>Endkunden-Referenz</TableHead>
                    <TableHead>Gerät</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>KVA</TableHead>
                    <TableHead>Erstellt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/b2b/orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {order.ticket_number}
                      </TableCell>
                      <TableCell>
                        {order.endcustomer_reference || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.device ? (
                          <div className="text-sm">
                            <div className="font-medium">{order.device.brand}</div>
                            <div className="text-muted-foreground">{order.device.model}</div>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[order.status as TicketStatus]}>
                          {STATUS_LABELS[order.status as TicketStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.kva_required ? (
                          order.kva_approved === null ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              Offen
                            </Badge>
                          ) : order.kva_approved ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Angenommen
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              Abgelehnt
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(order.created_at), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
