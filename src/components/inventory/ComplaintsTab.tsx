import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { Plus, Loader2, FileWarning, Send } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { COMPLAINT_STATUS_LABELS, ComplaintStatus } from '@/types/inventory';

interface ComplaintsTabProps {
  selectedLocation: string;
}

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  OPEN: 'bg-warning/10 text-warning',
  SENT_BACK: 'bg-info/10 text-info',
  CREDIT_RECEIVED: 'bg-success/10 text-success',
  REPLACEMENT_RECEIVED: 'bg-success/10 text-success',
  CLOSED: 'bg-muted text-muted-foreground',
};

export default function ComplaintsTab({ selectedLocation }: ComplaintsTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [partId, setPartId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [stockLocationId, setStockLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          part:parts(id, name, sku),
          supplier:suppliers(id, name),
          stock_location:stock_locations(id, name, location:locations(id, name))
        `)
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

  const { data: stockLocations = [] } = useQuery({
    queryKey: ['stock-locations-for-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_locations')
        .select('id, name, location:locations(id, name)')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts-with-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parts')
        .select('id, name, sku, stock_quantity, stock_location_id, supplier_id')
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setPartId('');
    setSupplierId('');
    setStockLocationId('');
    setQuantity(1);
    setReason('');
  };

  const createComplaintMutation = useMutation({
    mutationFn: async () => {
      if (!partId) throw new Error('Bitte Artikel auswählen');
      if (!supplierId) throw new Error('Bitte Lieferant auswählen');
      if (!stockLocationId) throw new Error('Bitte Lagerort auswählen');
      if (!reason.trim()) throw new Error('Bitte Reklamationsgrund angeben');
      if (quantity <= 0) throw new Error('Ungültige Menge');

      // Generate complaint number
      const { data: numData, error: numError } = await supabase.rpc('generate_complaint_number');
      if (numError) throw numError;

      const { error } = await supabase
        .from('complaints')
        .insert({
          complaint_number: numData,
          part_id: partId,
          supplier_id: supplierId,
          stock_location_id: stockLocationId,
          quantity,
          reason: reason.trim(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      // Create stock movement for complaint (reduce stock)
      const { error: movError } = await supabase.rpc('create_stock_movement', {
        _movement_type: 'COMPLAINT_OUT',
        _part_id: partId,
        _stock_location_id: stockLocationId,
        _quantity: -quantity,
        _reason: `Reklamation: ${reason.trim()}`,
      });

      if (movError) throw movError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: 'Reklamation erstellt',
        description: 'Die Reklamation wurde angelegt und der Bestand reduziert.',
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

  const selectedPart = parts.find((p: any) => p.id === partId);

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileWarning className="h-5 w-5" />
          Reklamationen
        </CardTitle>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neue Reklamation
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rekl.-Nr.</TableHead>
                <TableHead>Artikel</TableHead>
                <TableHead>Lieferant</TableHead>
                <TableHead>Lagerort</TableHead>
                <TableHead className="text-right">Menge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grund</TableHead>
                <TableHead>Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : complaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Keine Reklamationen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                complaints.map((complaint: any) => (
                  <TableRow key={complaint.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{complaint.complaint_number}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{complaint.part?.name}</span>
                        {complaint.part?.sku && (
                          <span className="block text-xs text-muted-foreground font-mono">
                            {complaint.part.sku}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{complaint.supplier?.name}</TableCell>
                    <TableCell>{complaint.stock_location?.location?.name}</TableCell>
                    <TableCell className="text-right font-medium">{complaint.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[complaint.status as ComplaintStatus]}>
                        {COMPLAINT_STATUS_LABELS[complaint.status as ComplaintStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={complaint.reason}>
                      {complaint.reason}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(complaint.created_at), 'dd.MM.yy', { locale: de })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* New Complaint Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5" />
              Neue Reklamation
            </DialogTitle>
            <DialogDescription>
              Erstellen Sie eine Reklamation für ein defektes oder falsches Ersatzteil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lagerort *</Label>
              <Select value={stockLocationId} onValueChange={setStockLocationId}>
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
              <Label>Artikel *</Label>
              <Select value={partId} onValueChange={setPartId}>
                <SelectTrigger>
                  <SelectValue placeholder="Artikel wählen" />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.stock_quantity} Stk.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lieferant *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Lieferant wählen" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div className="space-y-2">
              <Label>Reklamationsgrund *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Beschreiben Sie den Mangel..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => createComplaintMutation.mutate()} disabled={createComplaintMutation.isPending} className="gap-2">
              {createComplaintMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reklamation erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
