import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, ArrowLeftRight, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TransfersTabProps {
  selectedLocation: string;
  stockLocations: any[];
}

export default function TransfersTab({ selectedLocation, stockLocations }: TransfersTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  // Fetch transfer movements (paired)
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfer-movements', selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          part:parts(id, name, sku),
          stock_location:stock_locations(id, name, location:locations(id, name)),
          created_by_profile:profiles!stock_movements_created_by_fkey(id, name)
        `)
        .eq('movement_type', 'TRANSFER_OUT')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedLocation !== 'all') {
        query = query.eq('stock_location_id', selectedLocation);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch parts with stock for selected source location
  const { data: parts = [] } = useQuery({
    queryKey: ['parts-for-transfer', fromLocation],
    queryFn: async () => {
      if (!fromLocation) return [];
      const { data, error } = await supabase
        .from('parts')
        .select('id, name, sku, stock_quantity')
        .eq('is_active', true)
        .eq('stock_location_id', fromLocation)
        .gt('stock_quantity', 0)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!fromLocation,
  });

  const selectedPart = parts.find((p: any) => p.id === partId);

  const resetForm = () => {
    setFromLocation('');
    setToLocation('');
    setPartId('');
    setQuantity(1);
    setReason('');
  };

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!fromLocation || !toLocation) throw new Error('Bitte Quell- und Ziellager auswählen');
      if (fromLocation === toLocation) throw new Error('Quell- und Ziellager müssen unterschiedlich sein');
      if (!partId) throw new Error('Bitte Artikel auswählen');
      if (quantity <= 0) throw new Error('Ungültige Menge');
      if (selectedPart && quantity > selectedPart.stock_quantity) {
        throw new Error(`Nur ${selectedPart.stock_quantity} Stück verfügbar`);
      }

      const { error } = await supabase.rpc('create_stock_transfer', {
        _part_id: partId,
        _from_location_id: fromLocation,
        _to_location_id: toLocation,
        _quantity: quantity,
        _reason: reason || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: 'Umlagerung gebucht',
        description: `${quantity} Stück wurden umgelagert.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Umlagerungen
        </CardTitle>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neue Umlagerung
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Artikel</TableHead>
                <TableHead>Von</TableHead>
                <TableHead></TableHead>
                <TableHead>Nach</TableHead>
                <TableHead className="text-right">Menge</TableHead>
                <TableHead>Grund</TableHead>
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
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Keine Umlagerungen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer: any) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(transfer.created_at), 'dd.MM.yy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{transfer.part?.name}</span>
                        {transfer.part?.sku && (
                          <span className="block text-xs text-muted-foreground font-mono">
                            {transfer.part.sku}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {transfer.stock_location?.location?.name}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="text-sm">
                      {/* Would need to fetch linked transfer_in location */}
                      Ziellager
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Math.abs(transfer.quantity)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transfer.reason || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transfer.created_by_profile?.name}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* New Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Neue Umlagerung
            </DialogTitle>
            <DialogDescription>
              Lagern Sie Artikel von einer Filiale zu einer anderen um.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Source Location */}
            <div className="space-y-2">
              <Label>Von Lager *</Label>
              <Select value={fromLocation} onValueChange={(v) => { setFromLocation(v); setPartId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Quelllager wählen" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.filter((l: any) => l.id !== toLocation).map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location?.name} - {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Location */}
            <div className="space-y-2">
              <Label>Nach Lager *</Label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Ziellager wählen" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.filter((l: any) => l.id !== fromLocation).map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location?.name} - {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Part */}
            <div className="space-y-2">
              <Label>Artikel *</Label>
              <Select value={partId} onValueChange={setPartId} disabled={!fromLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Artikel wählen" />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.stock_quantity} verfügbar)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Menge *</Label>
              <Input
                type="number"
                min={1}
                max={selectedPart?.stock_quantity || 999}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Grund</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional: Grund für Umlagerung"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => transferMutation.mutate()} disabled={transferMutation.isPending} className="gap-2">
              {transferMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <ArrowLeftRight className="h-4 w-4" />
              Umlagern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
