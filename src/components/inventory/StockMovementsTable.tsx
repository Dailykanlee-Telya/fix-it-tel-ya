import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  X,
  Package,
} from 'lucide-react';
import {
  StockMovementType,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_COLORS,
} from '@/types/inventory';

interface StockMovementsTableProps {
  selectedLocation: string;
  canCreateManualOut: boolean;
  onOpenManualOut: () => void;
}

const MOVEMENT_TYPES: { value: StockMovementType; label: string }[] = [
  { value: 'PURCHASE', label: 'Wareneingang' },
  { value: 'CONSUMPTION', label: 'Verbrauch (Auftrag)' },
  { value: 'MANUAL_OUT', label: 'Manuelle Entnahme' },
  { value: 'TRANSFER_OUT', label: 'Umlagerung Ausgang' },
  { value: 'TRANSFER_IN', label: 'Umlagerung Eingang' },
  { value: 'COMPLAINT_OUT', label: 'Reklamation Rücksendung' },
  { value: 'COMPLAINT_CREDIT', label: 'Reklamation Gutschrift' },
  { value: 'COMPLAINT_REPLACE', label: 'Reklamation Ersatz' },
  { value: 'WRITE_OFF', label: 'Abschreibung' },
  { value: 'INVENTORY_PLUS', label: 'Inventur +' },
  { value: 'INVENTORY_MINUS', label: 'Inventur -' },
  { value: 'INITIAL_STOCK', label: 'Anfangsbestand' },
];

export default function StockMovementsTable({
  selectedLocation,
  canCreateManualOut,
  onOpenManualOut,
}: StockMovementsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', selectedLocation, typeFilter, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          part:parts(id, name, sku),
          stock_location:stock_locations(id, name, location:locations(id, name)),
          supplier:suppliers(id, name),
          repair_ticket:repair_tickets(id, ticket_number),
          created_by_profile:profiles!stock_movements_created_by_fkey(id, name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (selectedLocation !== 'all') {
        query = query.eq('stock_location_id', selectedLocation);
      }

      if (typeFilter !== 'all') {
        query = query.eq('movement_type', typeFilter as any);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Client-side search filter
      let filtered = data || [];
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filtered = filtered.filter((m: any) =>
          m.part?.name?.toLowerCase().includes(search) ||
          m.part?.sku?.toLowerCase().includes(search) ||
          m.reason?.toLowerCase().includes(search) ||
          m.notes?.toLowerCase().includes(search) ||
          m.repair_ticket?.ticket_number?.toLowerCase().includes(search)
        );
      }

      return { movements: filtered, total: count || 0 };
    },
  });

  const movements = data?.movements || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const hasFilters = typeFilter !== 'all' || searchQuery;

  const clearFilters = () => {
    setTypeFilter('all');
    setSearchQuery('');
    setPage(0);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Lagerbewegungen
        </CardTitle>
        {canCreateManualOut && (
          <Button variant="outline" onClick={onOpenManualOut} className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Manuelle Entnahme
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen (Teil, Auftrag, Grund)..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Bewegungstyp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {MOVEMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Filter zurücksetzen
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Datum</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Artikel</TableHead>
                <TableHead>Lagerort</TableHead>
                <TableHead className="text-right">Menge</TableHead>
                <TableHead className="text-right">Preis</TableHead>
                <TableHead>Bezug</TableHead>
                <TableHead>Benutzer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Keine Lagerbewegungen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(movement.created_at), 'dd.MM.yy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={MOVEMENT_TYPE_COLORS[movement.movement_type as StockMovementType]}
                      >
                        {MOVEMENT_TYPE_LABELS[movement.movement_type as StockMovementType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{movement.part?.name}</span>
                        {movement.part?.sku && (
                          <span className="block text-xs text-muted-foreground font-mono">
                            {movement.part.sku}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {movement.stock_location?.location?.name} - {movement.stock_location?.name}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={movement.quantity > 0 ? 'text-success' : 'text-destructive'}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {movement.stock_before} → {movement.stock_after}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {movement.unit_price != null && (
                        <span>{movement.unit_price.toFixed(2)} €</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {movement.repair_ticket?.ticket_number && (
                        <Badge variant="outline" className="font-mono">
                          {movement.repair_ticket.ticket_number}
                        </Badge>
                      )}
                      {movement.supplier?.name && (
                        <span className="text-muted-foreground">{movement.supplier.name}</span>
                      )}
                      {movement.reason && (
                        <span className="block text-xs text-muted-foreground truncate max-w-[150px]" title={movement.reason}>
                          {movement.reason}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movement.created_by_profile?.name}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Zeige {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} von {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Zurück
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Weiter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
