import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Check, X, AlertCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DEVICE_TYPE_LABELS, DeviceType } from '@/types/database';

interface ModelRequest {
  id: string;
  b2b_partner_id: string;
  device_type: string;
  brand: string;
  model_name: string;
  status: string;
  created_at: string;
  rejection_reason?: string;
  b2b_partner?: { name: string };
}

export default function ModelRequests() {
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ModelRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editForm, setEditForm] = useState({
    brand: '',
    model_name: '',
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['model-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_requests')
        .select(`
          *,
          b2b_partner:b2b_partners(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ModelRequest[];
    },
  });

  const pendingRequests = requests?.filter(r => r.status === 'PENDING') || [];
  const processedRequests = requests?.filter(r => r.status !== 'PENDING') || [];

  // Update model request (edit brand/model_name)
  const updateMutation = useMutation({
    mutationFn: async ({ id, brand, model_name }: { id: string; brand: string; model_name: string }) => {
      const { error } = await supabase
        .from('model_requests')
        .update({ brand, model_name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Anfrage aktualisiert');
      setEditDialogOpen(false);
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['model-requests'] });
    },
    onError: (error: any) => {
      toast.error('Fehler: ' + error.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (request: ModelRequest) => {
      // 1. Add to device_catalog
      const { error: catalogError } = await supabase
        .from('device_catalog')
        .insert({
          brand: request.brand,
          model: request.model_name,
          device_type: request.device_type,
        });

      if (catalogError && catalogError.code !== '23505') {
        throw catalogError;
      }

      // 2. Update request status
      const { error: updateError } = await supabase
        .from('model_requests')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success('Modell genehmigt und zum Katalog hinzugefügt');
      queryClient.invalidateQueries({ queryKey: ['model-requests'] });
      queryClient.invalidateQueries({ queryKey: ['device-catalog'] });
    },
    onError: (error: any) => {
      toast.error('Fehler: ' + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from('model_requests')
        .update({
          status: 'REJECTED',
          rejection_reason: reason,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Anfrage abgelehnt');
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['model-requests'] });
    },
    onError: (error: any) => {
      toast.error('Fehler: ' + error.message);
    },
  });

  const openRejectDialog = (request: ModelRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const openEditDialog = (request: ModelRequest) => {
    setSelectedRequest(request);
    setEditForm({
      brand: request.brand,
      model_name: request.model_name,
    });
    setEditDialogOpen(true);
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    rejectMutation.mutate({
      requestId: selectedRequest.id,
      reason: rejectionReason,
    });
  };

  const handleSaveEdit = () => {
    if (!selectedRequest) return;
    updateMutation.mutate({
      id: selectedRequest.id,
      brand: editForm.brand,
      model_name: editForm.model_name,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Offen</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Genehmigt</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Abgelehnt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modellanfragen</h1>
        <p className="text-muted-foreground">
          B2B-Partner können fehlende Modelle anfragen. Sie können die Angaben vor der Genehmigung bearbeiten.
        </p>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Offene Anfragen ({pendingRequests.length})
          </CardTitle>
          <CardDescription>
            Prüfen und bearbeiten Sie die Anfragen vor der Genehmigung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Keine offenen Anfragen
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>B2B Partner</TableHead>
                  <TableHead>Gerätetyp</TableHead>
                  <TableHead>Hersteller</TableHead>
                  <TableHead>Modell</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.b2b_partner?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {DEVICE_TYPE_LABELS[request.device_type as DeviceType] || request.device_type}
                    </TableCell>
                    <TableCell>{request.brand}</TableCell>
                    <TableCell>{request.model_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(request)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => approveMutation.mutate(request)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Genehmigen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => openRejectDialog(request)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Ablehnen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bearbeitete Anfragen</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>B2B Partner</TableHead>
                  <TableHead>Modell</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.slice(0, 20).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.b2b_partner?.name || '-'}</TableCell>
                    <TableCell>
                      {request.brand} {request.model_name}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.created_at), 'dd.MM.yyyy', { locale: de })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anfrage bearbeiten</DialogTitle>
            <DialogDescription>
              Korrigieren Sie die Angaben vor der Genehmigung
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-brand">Hersteller</Label>
              <Input
                id="edit-brand"
                value={editForm.brand}
                onChange={(e) => setEditForm(f => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Modellname</Label>
              <Input
                id="edit-model"
                value={editForm.model_name}
                onChange={(e) => setEditForm(f => ({ ...f, model_name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anfrage ablehnen</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  Anfrage für "{selectedRequest.brand} {selectedRequest.model_name}" ablehnen
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Begründung (optional)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
