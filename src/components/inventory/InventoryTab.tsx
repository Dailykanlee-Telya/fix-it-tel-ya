import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useInventoryPermissions } from '@/hooks/useInventoryPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, ClipboardCheck, Check, X, AlertTriangle, Eye, Search, Save } from 'lucide-react';
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
  const { hasRole } = useAuth();
  const { canApproveInventory } = useInventoryPermissions();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStockLocationId, setNewStockLocationId] = useState('');
  const [notes, setNotes] = useState('');
  
  // Detail/Approval dialog state
  const [detailSession, setDetailSession] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Counting state for editable quantities
  const [countEdits, setCountEdits] = useState<Record<string, { counted: number; reason: string }>>({});
  const [countSearch, setCountSearch] = useState('');
  
  // Check if user is admin/GF (only they can approve)
  const isGF = hasRole('ADMIN') || hasRole('FILIALLEITER');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['inventory-sessions', selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('inventory_sessions')
        .select(`
          *,
          stock_location:stock_locations(id, name, location:locations(id, name)),
          created_by_profile:profiles!inventory_sessions_created_by_fkey(id, name)
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

  // Fetch counts for detail view
  const { data: sessionCounts = [], refetch: refetchCounts } = useQuery({
    queryKey: ['inventory-counts', detailSession?.id],
    queryFn: async () => {
      if (!detailSession?.id) return [];
      const { data, error } = await supabase
        .from('inventory_counts')
        .select(`
          *,
          part:parts(id, name, sku, brand, model)
        `)
        .eq('inventory_session_id', detailSession.id)
        .order('counted_at');
      if (error) throw error;
      return data;
    },
    enabled: !!detailSession?.id,
  });
  
  // Initialize count edits when session counts load
  useEffect(() => {
    if (sessionCounts.length > 0 && Object.keys(countEdits).length === 0) {
      const edits: Record<string, { counted: number; reason: string }> = {};
      sessionCounts.forEach((count: any) => {
        edits[count.id] = {
          counted: count.counted_quantity,
          reason: count.discrepancy_reason || ''
        };
      });
      setCountEdits(edits);
    }
  }, [sessionCounts]);
  
  // Filtered counts based on search
  const filteredCounts = sessionCounts.filter((count: any) => {
    if (!countSearch) return true;
    const searchLower = countSearch.toLowerCase();
    return (
      count.part?.name?.toLowerCase().includes(searchLower) ||
      count.part?.sku?.toLowerCase().includes(searchLower) ||
      count.part?.brand?.toLowerCase().includes(searchLower) ||
      count.part?.model?.toLowerCase().includes(searchLower)
    );
  });
  
  // Save count mutation
  const saveCountMutation = useMutation({
    mutationFn: async ({ countId, counted, reason }: { countId: string; counted: number; reason: string }) => {
      const countItem = sessionCounts.find((c: any) => c.id === countId);
      if (!countItem) throw new Error('Zähleintrag nicht gefunden');
      
      const difference = counted - countItem.expected_quantity;
      const valueDiff = difference * (countItem.unit_value || 0);
      
      const { error } = await supabase
        .from('inventory_counts')
        .update({
          counted_quantity: counted,
          difference,
          value_difference: valueDiff,
          discrepancy_reason: difference !== 0 ? reason : null,
          counted_at: new Date().toISOString(),
        })
        .eq('id', countId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetchCounts();
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
    },
  });

  const resetForm = () => {
    setNewStockLocationId('');
    setNotes('');
  };

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!newStockLocationId) throw new Error('Bitte Lagerort auswählen');

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
          counted_quantity: p.stock_quantity || 0,
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
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-sessions'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: 'Inventursitzung erstellt',
        description: 'Die Inventur wurde gestartet. Sie können jetzt die Ist-Mengen erfassen.',
      });
      // Open the newly created session for counting
      setDetailSession(session);
      setDetailDialogOpen(true);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: counts, error: countError } = await supabase
        .from('inventory_counts')
        .select('id, difference, discrepancy_reason')
        .eq('inventory_session_id', sessionId);
      
      if (countError) throw countError;
      
      const unreasoned = counts?.filter(c => c.difference !== 0 && !c.discrepancy_reason);
      if (unreasoned && unreasoned.length > 0) {
        throw new Error(`${unreasoned.length} Abweichung(en) ohne Begründung.`);
      }

      const totalCounted = counts?.length || 0;
      const totalDiscrepancies = counts?.filter(c => c.difference !== 0).length || 0;

      const { error } = await supabase
        .from('inventory_sessions')
        .update({
          status: 'PENDING_APPROVAL',
          completed_at: new Date().toISOString(),
          total_items_counted: totalCounted,
          total_discrepancies: totalDiscrepancies,
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-sessions'] });
      setDetailDialogOpen(false);
      toast({ title: 'Inventur eingereicht', description: 'Zur Freigabe eingereicht.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ sessionId, action }: { sessionId: string; action: 'approve' | 'reject' }) => {
      if (action === 'reject' && !rejectionReason.trim()) {
        throw new Error('Bitte Ablehnungsgrund angeben');
      }

      const user = (await supabase.auth.getUser()).data.user;
      
      if (action === 'approve') {
        const { data: counts, error: countError } = await supabase
          .from('inventory_counts')
          .select('part_id, difference, discrepancy_reason')
          .eq('inventory_session_id', sessionId)
          .neq('difference', 0);
        
        if (countError) throw countError;

        const { data: session, error: sessionError } = await supabase
          .from('inventory_sessions')
          .select('stock_location_id')
          .eq('id', sessionId)
          .single();
        
        if (sessionError) throw sessionError;

        for (const count of counts || []) {
          const movementType = count.difference > 0 ? 'INVENTORY_PLUS' : 'INVENTORY_MINUS';
          await supabase.rpc('create_stock_movement', {
            _movement_type: movementType,
            _part_id: count.part_id,
            _stock_location_id: session.stock_location_id,
            _quantity: count.difference,
            _inventory_session_id: sessionId,
            _reason: count.discrepancy_reason,
            _notes: `Inventurkorrektur`,
          });
        }

        const { error } = await supabase
          .from('inventory_sessions')
          .update({
            status: 'APPROVED',
            approved_at: new Date().toISOString(),
            approved_by: user?.id,
          })
          .eq('id', sessionId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_sessions')
          .update({
            status: 'REJECTED',
            rejection_reason: rejectionReason.trim(),
          })
          .eq('id', sessionId);

        if (error) throw error;
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setApprovalAction(null);
      setRejectionReason('');
      setDetailDialogOpen(false);
      toast({
        title: action === 'approve' ? 'Inventur freigegeben' : 'Inventur abgelehnt',
        description: action === 'approve' ? 'Korrekturen wurden verbucht.' : 'Inventur zurückgewiesen.',
      });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
    },
  });

  const handleViewSession = (session: any) => {
    setDetailSession(session);
    setCountEdits({});
    setCountSearch('');
    setDetailDialogOpen(true);
  };

  const discrepancyCounts = sessionCounts.filter((c: any) => c.difference !== 0);

  return (
    <>
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Inventursitzungen
            </CardTitle>
            <CardDescription>
              Inventur abschließen nur durch Geschäftsführer/Admin möglich
            </CardDescription>
          </div>
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
                  <TableHead>Erstellt von</TableHead>
                  <TableHead className="text-right">Gezählt</TableHead>
                  <TableHead className="text-right">Differenzen</TableHead>
                  <TableHead>Gestartet</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
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
                    <TableRow key={session.id}>
                      <TableCell className="font-mono font-medium">{session.session_number}</TableCell>
                      <TableCell>{session.stock_location?.location?.name} - {session.stock_location?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[session.status as InventoryStatus]}>
                          {INVENTORY_STATUS_LABELS[session.status as InventoryStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{session.created_by_profile?.name}</TableCell>
                      <TableCell className="text-right">{session.total_items_counted || 0}</TableCell>
                      <TableCell className="text-right">
                        {(session.total_discrepancies || 0) > 0 ? (
                          <span className="text-warning font-medium">{session.total_discrepancies}</span>
                        ) : (
                          <span className="text-success">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(session.started_at), 'dd.MM.yy HH:mm', { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleViewSession(session)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Inventory Session Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Neue Inventur starten
            </DialogTitle>
            <DialogDescription>
              Starten Sie eine Inventur für einen Lagerort.
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
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optionale Bemerkungen..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={() => createSessionMutation.mutate()} disabled={createSessionMutation.isPending} className="gap-2">
              {createSessionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <ClipboardCheck className="h-4 w-4" />
              Inventur starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Inventur {detailSession?.session_number}
            </DialogTitle>
            <DialogDescription>
              Status: {detailSession && INVENTORY_STATUS_LABELS[detailSession.status as InventoryStatus]}
              {detailSession?.status === 'IN_PROGRESS' && ' – Erfassen Sie die Ist-Mengen für jedes Teil'}
            </DialogDescription>
          </DialogHeader>

          {detailSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Artikel gesamt</p>
                  <p className="text-xl font-bold">{sessionCounts.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <p className="text-xs text-muted-foreground">Differenzen</p>
                  <p className="text-xl font-bold text-warning">{discrepancyCounts.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Lagerort</p>
                  <p className="font-medium">{detailSession.stock_location?.location?.name}</p>
                </div>
              </div>

              {/* Search for IN_PROGRESS sessions */}
              {detailSession.status === 'IN_PROGRESS' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Artikel suchen (Name, SKU, Hersteller, Modell)..."
                    value={countSearch}
                    onChange={(e) => setCountSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}

              {/* Counting Table for IN_PROGRESS */}
              {detailSession.status === 'IN_PROGRESS' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-semibold">
                    Ist-Mengen erfassen
                  </Label>
                  <div className="rounded-md border max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-[200px]">Artikel</TableHead>
                          <TableHead className="w-[100px]">SKU</TableHead>
                          <TableHead className="w-[80px] text-right">Soll</TableHead>
                          <TableHead className="w-[100px] text-right">Ist</TableHead>
                          <TableHead className="w-[60px] text-right">Diff.</TableHead>
                          <TableHead>Begründung (bei Abweichung)</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCounts.map((count: any) => {
                          const edit = countEdits[count.id] || { counted: count.counted_quantity, reason: count.discrepancy_reason || '' };
                          const diff = edit.counted - count.expected_quantity;
                          const hasUnsavedChanges = edit.counted !== count.counted_quantity || edit.reason !== (count.discrepancy_reason || '');
                          
                          return (
                            <TableRow key={count.id} className={diff !== 0 ? 'bg-warning/5' : ''}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{count.part?.name}</p>
                                  {(count.part?.brand || count.part?.model) && (
                                    <p className="text-xs text-muted-foreground">
                                      {count.part?.brand} {count.part?.model}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{count.part?.sku || '-'}</TableCell>
                              <TableCell className="text-right font-medium">{count.expected_quantity}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={edit.counted}
                                  onChange={(e) => setCountEdits(prev => ({
                                    ...prev,
                                    [count.id]: { ...edit, counted: parseInt(e.target.value) || 0 }
                                  }))}
                                  className="w-20 text-right h-8"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {diff !== 0 && (
                                  <span className={diff > 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                                    {diff > 0 ? '+' : ''}{diff}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {diff !== 0 && (
                                  <Input
                                    placeholder="Grund für Abweichung..."
                                    value={edit.reason}
                                    onChange={(e) => setCountEdits(prev => ({
                                      ...prev,
                                      [count.id]: { ...edit, reason: e.target.value }
                                    }))}
                                    className="h-8 text-sm"
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {hasUnsavedChanges && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => saveCountMutation.mutate({ countId: count.id, counted: edit.counted, reason: edit.reason })}
                                    disabled={saveCountMutation.isPending}
                                    title="Speichern"
                                  >
                                    {saveCountMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredCounts.length === 0 && countSearch && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Keine Artikel gefunden für „{countSearch}"
                    </p>
                  )}
                </div>
              )}

              {/* Discrepancies for non-IN_PROGRESS sessions */}
              {detailSession.status !== 'IN_PROGRESS' && discrepancyCounts.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Abweichungen
                  </Label>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artikel</TableHead>
                          <TableHead className="text-right">Soll</TableHead>
                          <TableHead className="text-right">Ist</TableHead>
                          <TableHead className="text-right">Diff.</TableHead>
                          <TableHead>Begründung</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {discrepancyCounts.map((count: any) => (
                          <TableRow key={count.id}>
                            <TableCell className="font-medium">{count.part?.name}</TableCell>
                            <TableCell className="text-right">{count.expected_quantity}</TableCell>
                            <TableCell className="text-right">{count.counted_quantity}</TableCell>
                            <TableCell className="text-right">
                              <span className={count.difference > 0 ? 'text-success' : 'text-destructive'}>
                                {count.difference > 0 ? '+' : ''}{count.difference}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {count.discrepancy_reason || <span className="text-destructive italic">Fehlt!</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {detailSession.status === 'REJECTED' && detailSession.rejection_reason && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="font-medium text-destructive">Ablehnungsgrund:</p>
                  <p className="text-sm mt-1">{detailSession.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Schließen</Button>
            
            {detailSession?.status === 'IN_PROGRESS' && (
              <Button onClick={() => completeSessionMutation.mutate(detailSession.id)} disabled={completeSessionMutation.isPending} className="gap-2">
                {completeSessionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Zur Freigabe einreichen
              </Button>
            )}

            {detailSession?.status === 'PENDING_APPROVAL' && isGF && (
              <>
                <Button variant="destructive" onClick={() => setApprovalAction('reject')} className="gap-2">
                  <X className="h-4 w-4" />
                  Ablehnen
                </Button>
                <Button onClick={() => approvalMutation.mutate({ sessionId: detailSession.id, action: 'approve' })} disabled={approvalMutation.isPending} className="gap-2 bg-success hover:bg-success/90">
                  {approvalMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Check className="h-4 w-4" />
                  Freigeben & Buchen
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <AlertDialog open={approvalAction === 'reject'} onOpenChange={(open) => !open && setApprovalAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inventur ablehnen</AlertDialogTitle>
            <AlertDialogDescription>Bitte geben Sie einen Grund für die Ablehnung an.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Ablehnungsgrund..." rows={3} />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => detailSession && approvalMutation.mutate({ sessionId: detailSession.id, action: 'reject' })} disabled={!rejectionReason.trim() || approvalMutation.isPending} className="bg-destructive hover:bg-destructive/90">
              Ablehnen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
