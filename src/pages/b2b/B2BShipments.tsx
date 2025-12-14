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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Search, Filter, Package, Truck, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { B2BShipmentStatus, B2BShipmentType, B2B_SHIPMENT_STATUS_LABELS, B2B_SHIPMENT_STATUS_COLORS } from '@/types/b2b';

export default function B2BShipments() {
  const { b2bPartnerId } = useB2BAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'INBOUND' | 'OUTBOUND'>('all');

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['b2b-shipments', b2bPartnerId, statusFilter, typeFilter],
    queryFn: async () => {
      if (!b2bPartnerId) return [];

      let query = supabase
        .from('b2b_shipments')
        .select(`
          *,
          tickets:repair_tickets(id)
        `)
        .eq('b2b_partner_id', b2bPartnerId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as B2BShipmentStatus);
      }

      if (typeFilter !== 'all') {
        query = query.eq('shipment_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!b2bPartnerId,
  });

  const filteredShipments = shipments?.filter(shipment => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      shipment.shipment_number?.toLowerCase().includes(searchLower) ||
      shipment.dhl_tracking_number?.toLowerCase().includes(searchLower)
    );
  });

  // Status options based on selected type
  const getStatusOptions = () => {
    const baseOptions = [{ value: 'all', label: 'Alle Status' }];
    
    if (typeFilter === 'OUTBOUND') {
      return [
        ...baseOptions,
        { value: 'RETOUR_ANGELEGT', label: 'Rücksendung angelegt' },
        { value: 'RETOUR_UNTERWEGS', label: 'Rücksendung unterwegs' },
        { value: 'RETOUR_ZUGESTELLT', label: 'Rücksendung zugestellt' },
      ];
    }
    
    if (typeFilter === 'INBOUND') {
      return [
        ...baseOptions,
        { value: 'ANGELEGT', label: 'Angelegt' },
        { value: 'GERAETE_UNTERWEGS', label: 'Geräte unterwegs' },
        { value: 'BEI_TELYA_EINGEGANGEN', label: 'Bei Telya eingegangen' },
        { value: 'ABGESCHLOSSEN', label: 'Abgeschlossen' },
      ];
    }

    // All types
    return [
      ...baseOptions,
      { value: 'ANGELEGT', label: 'Angelegt' },
      { value: 'GERAETE_UNTERWEGS', label: 'Geräte unterwegs' },
      { value: 'BEI_TELYA_EINGEGANGEN', label: 'Bei Telya eingegangen' },
      { value: 'ABGESCHLOSSEN', label: 'Abgeschlossen' },
      { value: 'RETOUR_ANGELEGT', label: 'Rücksendung angelegt' },
      { value: 'RETOUR_UNTERWEGS', label: 'Rücksendung unterwegs' },
      { value: 'RETOUR_ZUGESTELLT', label: 'Rücksendung zugestellt' },
    ];
  };

  const statusOptions = getStatusOptions();

  const getShipmentTypeIcon = (type: string) => {
    if (type === 'OUTBOUND') {
      return <ArrowDownToLine className="h-4 w-4 text-green-600" />;
    }
    return <ArrowUpFromLine className="h-4 w-4 text-blue-600" />;
  };

  const getShipmentTypeLabel = (type: string) => {
    if (type === 'OUTBOUND') {
      return 'Rücksendung';
    }
    return 'Eingang';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sendungen</h1>
          <p className="text-muted-foreground">
            Geräte bündeln und an Telya versenden
          </p>
        </div>
        <Button onClick={() => navigate('/b2b/shipments/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Neue Sendung
        </Button>
      </div>

      {/* Type Tabs */}
      <Tabs value={typeFilter} onValueChange={(v) => {
        setTypeFilter(v as 'all' | 'INBOUND' | 'OUTBOUND');
        setStatusFilter('all');
      }}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Alle
          </TabsTrigger>
          <TabsTrigger value="INBOUND" className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4" />
            Eingang
          </TabsTrigger>
          <TabsTrigger value="OUTBOUND" className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            Rücksendung
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Sendungsnummer, Tracking..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
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

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sendungen ({filteredShipments?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredShipments?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Keine Sendungen gefunden' 
                  : 'Noch keine Sendungen vorhanden'}
              </p>
              {!search && statusFilter === 'all' && typeFilter === 'all' && (
                <Button onClick={() => navigate('/b2b/shipments/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Sendung erstellen
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ</TableHead>
                    <TableHead>Sendungsnummer</TableHead>
                    <TableHead>Geräte</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>DHL Tracking</TableHead>
                    <TableHead>Erstellt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments?.map((shipment) => (
                    <TableRow 
                      key={shipment.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/b2b/shipments/${shipment.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getShipmentTypeIcon(shipment.shipment_type)}
                          <span className="text-sm text-muted-foreground">
                            {getShipmentTypeLabel(shipment.shipment_type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {shipment.shipment_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {shipment.tickets?.length || 0} Gerät(e)
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={B2B_SHIPMENT_STATUS_COLORS[shipment.status as B2BShipmentStatus]}>
                          {B2B_SHIPMENT_STATUS_LABELS[shipment.status as B2BShipmentStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {shipment.dhl_tracking_number ? (
                          <a
                            href={`https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${shipment.dhl_tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-mono text-sm flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Truck className="h-3 w-3" />
                            {shipment.dhl_tracking_number}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(shipment.created_at), 'dd.MM.yyyy', { locale: de })}
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