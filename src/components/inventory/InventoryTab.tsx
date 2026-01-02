import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useInventoryPermissions } from '@/hooks/useInventoryPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Loader2, ClipboardCheck, Check, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { INVENTORY_STATUS_LABELS, InventoryStatus } from '@/types/inventory';

interface InventoryTabProps {
  selectedLocation: string;
  stockLocations: any[];
}

const STATUS_COLORS: Record<InventoryStatus, string> = {
  IN_PROGRESS: 'bg-info/10 text-info',
  PENDING_APPROVAL: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-destructive/10 text-destructive',
};

export default function InventoryTab({ selectedLocation, stockLocations }: InventoryTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canApproveInventory } = useInventoryPermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStockLocationId, setNewStockLocationId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['inventory-sessions', selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('inventory_sessions')
        .select(`
          *,
          stock_location:stock_locations(id, name, location:locations(id, name))
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedLocation !== 'all') {
        query = query.eq('stock_location_id', selectedLocation);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setNewStockLocationId('');
    setNotes('');
  };

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!newStockLocationId) throw new Error('Bitte Lagerort auswählen');

      // Generate session number
      const { data: numData, error: numError } = await supabase.rpc('generate_inventory_session_number');
      if (numError) throw numError;

      const { data: session, error } = await supabase
        .from('inventory_sessions')
        .insert({
          session_number: numData,
          stock_location_id: newStockLocationId,
          notes: notes.trim() || null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Pre-populate inventory counts with all parts for this location
      const { data: parts, error: partsError } = await supabase
        .from('parts')
        .select('id, stock_quantity, purchase_price')
        .eq('stock_location_id', newStockLocationId)
        .eq('is_active', true);

      if (partsError) throw partsError;

      if (parts && parts.length > 0) {
        const user = (await supabase.auth.getUser()).data.user;
        const counts = parts.map((p: any) => ({
          inventory_session_id: session.id,
          part_id: p.id,
          expected_quantity: p.stock_quantity || 0,
          counted_quantity: p.stock_quantity || 0, // Pre-fill with expected
          unit_value: p.purchase_price || 0,
          counted_by: user?.id,
        }));

        const { error: countsError } = await supabase
          .from('inventory_counts')
          .insert(counts);

        if (countsError) throw countsError;
      }

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-sessions'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: 'Inventursitzung erstellt',
        description: 'Die Inventur wurde gestartet. Zählen Sie jetzt die Bestände.',
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
          <ClipboardCheck className="h-5 w-5" />
          Inventursitzungen
        </CardTitle>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neue Inventur
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sitzungs-Nr.</TableHead>
                <TableHead>Lagerort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gezählt</TableHead>
                <TableHead className="text-right">Differenzen</TableHead>
                <TableHead className="text-right">Wertdifferenz</TableHead>
                <TableHead>Gestartet</TableHead>
                <TableHead>Abgeschlossen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Keine Inventursitzungen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session: any) => (
                  <TableRow key={session.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{session.session_number}</TableCell>
                    <TableCell>{session.stock_location?.location?.name} - {session.stock_location?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[session.status as InventoryStatus]}>
                        {INVENTORY_STATUS_LABELS[session.status as InventoryStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{session.total_items_counted}</TableCell>
                    <TableCell className="text-right">
                      {session.total_discrepancies > 0 ? (
                        <span className="text-warning font-medium">{session.total_discrepancies}</span>
                      ) : (
                        <span className="text-success">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.total_value_difference !== 0 ? (
                        <span className={session.total_value_difference > 0 ? 'text-success' : 'text-destructive'}>
                          {session.total_value_difference > 0 ? '+' : ''}{session.total_value_difference?.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0,00 €</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(session.started_at), 'dd.MM.yy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.completed_at
                        ? format(new Date(session.completed_at), 'dd.MM.yy HH:mm', { locale: de })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* New Inventory Session Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Neue Inventur starten
            </DialogTitle>
            <DialogDescription>
              Starten Sie eine Inventur für einen Lagerort. Alle Teile werden automatisch vorbelegt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lagerort *</Label>
              <Select value={newStockLocationId} onValueChange={setNewStockLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Lagerort wählen" />
                </SelectTrigger>
                <SelectContent>
                  {stockLocations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location?.name} - {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bemerkungen</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optionale Bemerkungen zur Inventur..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => createSessionMutation.mutate()} disabled={createSessionMutation.isPending} className="gap-2">
              {createSessionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <ClipboardCheck className="h-4 w-4" />
              Inventur starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
