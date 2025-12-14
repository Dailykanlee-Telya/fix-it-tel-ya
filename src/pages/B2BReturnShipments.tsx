import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Package, Truck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { B2B_SHIPMENT_STATUS_LABELS, B2B_SHIPMENT_STATUS_COLORS, B2BShipmentStatus } from '@/types/b2b';

export default function B2BReturnShipments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch return shipments (OUTBOUND type)
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['b2b-return-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_shipments')
        .select(`
          *,
          b2b_partner:b2b_partners(id, name, customer_number),
          tickets:repair_tickets(id, ticket_number, endcustomer_reference, status, device:devices(device_type, brand, model))
        `)
        .eq('shipment_type', 'OUTBOUND')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch partners with ready-for-return tickets
  const { data: partnersWithReadyTickets } = useQuery({
    queryKey: ['partners-with-ready-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          b2b_partner_id,
          b2b_partner:b2b_partners(id, name, customer_number)
        `)
        .eq('is_b2b', true)
        .eq('status', 'FERTIG_ZUR_ABHOLUNG')
        .is('shipment_id', null);

      if (error) throw error;

      // Group by partner
      const partnerMap = new Map();
      data?.forEach((ticket: any) => {
        if (ticket.b2b_partner) {
          const existing = partnerMap.get(ticket.b2b_partner_id) || { ...ticket.b2b_partner, count: 0 };
          existing.count++;
          partnerMap.set(ticket.b2b_partner_id, existing);
        }
      });

      return Array.from(partnerMap.values());
    },
  });

  const filteredShipments = shipments?.filter((shipment: any) => {
    const matchesSearch = 
      shipment.shipment_number?.toLowerCase().includes(search.toLowerCase()) ||
      shipment.b2b_partner?.name?.toLowerCase().includes(search.toLowerCase()) ||
      shipment.dhl_tracking_number?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const returnStatusOptions = [
    { value: 'all', label: 'Alle Status' },
    { value: 'RETOUR_ANGELEGT', label: 'Angelegt' },
    { value: 'RETOUR_UNTERWEGS', label: 'Unterwegs' },
    { value: 'RETOUR_ZUGESTELLT', label: 'Zugestellt' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rücksendungen</h1>
          <p className="text-muted-foreground">
            Reparierte Geräte an B2B-Partner zurücksenden
          </p>
        </div>
        <Button onClick={() => navigate('/b2b-return-shipments/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Rücksendung
        </Button>
      </div>

      {/* Partners with ready tickets */}
      {partnersWithReadyTickets && partnersWithReadyTickets.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              Fertige Geräte zur Rücksendung
            </CardTitle>
            <CardDescription>
              Diese Partner haben Geräte, die zur Rücksendung bereit sind
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {partnersWithReadyTickets.map((partner: any) => (
                <Button
                  key={partner.id}
                  variant="outline"
                  className="bg-white"
                  onClick={() => navigate(`/b2b-return-shipments/new?partner=${partner.id}`)}
                >
                  {partner.name}
                  <Badge variant="secondary" className="ml-2">
                    {partner.count} Geräte
                  </Badge>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Sendungsnummer, Partner oder Tracking-Nr. suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                {returnStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sendungsnummer</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Geräte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>DHL Tracking</TableHead>
                <TableHead>Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Laden...
                  </TableCell>
                </TableRow>
              ) : filteredShipments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Keine Rücksendungen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments?.map((shipment: any) => (
                  <TableRow
                    key={shipment.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/b2b-return-shipments/${shipment.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {shipment.shipment_number}
                      </div>
                    </TableCell>
                    <TableCell>{shipment.b2b_partner?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {shipment.tickets?.length || 0} Geräte
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={B2B_SHIPMENT_STATUS_COLORS[shipment.status as B2BShipmentStatus]}>
                        {B2B_SHIPMENT_STATUS_LABELS[shipment.status as B2BShipmentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {shipment.dhl_tracking_number ? (
                        <span className="font-mono text-sm">{shipment.dhl_tracking_number}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(shipment.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
