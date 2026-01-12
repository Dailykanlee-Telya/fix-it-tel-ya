import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Package, Truck } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, TicketStatus } from '@/types/database';

export default function B2BShipmentNew() {
  const { b2bPartnerId, b2bPartner, profile } = useB2BAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [generateLabel, setGenerateLabel] = useState(true);

  // Sender address from B2B partner (readonly)
  const senderAddress = {
    name: b2bPartner?.name || '',
    street: b2bPartner?.street || '',
    zip: b2bPartner?.zip || '',
    city: b2bPartner?.city || '',
    country: b2bPartner?.country || 'Deutschland',
  };

  // Fetch available tickets (not yet assigned to a shipment)
  const { data: availableTickets, isLoading } = useQuery({
    queryKey: ['b2b-available-tickets', b2bPartnerId],
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
        .is('shipment_id', null)
        .in('status', ['NEU_EINGEGANGEN', 'IN_DIAGNOSE', 'WARTET_AUF_TEIL_ODER_FREIGABE'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!b2bPartnerId,
  });

  const toggleTicket = (ticketId: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const selectAll = () => {
    if (selectedTickets.size === availableTickets?.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(availableTickets?.map(t => t.id) || []));
    }
  };

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async () => {
      if (!b2bPartnerId || selectedTickets.size === 0) {
        throw new Error('Bitte wählen Sie mindestens ein Gerät aus.');
      }

      // 1. Generate shipment number
      const { data: shipmentNumber, error: numberError } = await supabase
        .rpc('generate_shipment_number');

      if (numberError) throw numberError;

      // 2. Create shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('b2b_shipments')
        .insert({
          b2b_partner_id: b2bPartnerId,
          shipment_number: shipmentNumber,
          created_by: profile?.id,
          sender_address: senderAddress,
          notes: notes || null,
          status: 'ANGELEGT',
        })
        .select('id, shipment_number')
        .single();

      if (shipmentError) throw shipmentError;

      // 3. Update tickets with shipment_id
      const ticketIds = Array.from(selectedTickets);
      const { error: updateError } = await supabase
        .from('repair_tickets')
        .update({ shipment_id: shipment.id })
        .in('id', ticketIds);

      if (updateError) throw updateError;

      return shipment;
    },
    onSuccess: (shipment) => {
      toast({
        title: 'Sendung erstellt',
        description: `Sendung ${shipment.shipment_number} wurde erfolgreich angelegt.`,
      });
      queryClient.invalidateQueries({ queryKey: ['b2b-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-orders'] });
      navigate(`/b2b/shipments/${shipment.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Sendung konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedTickets.size === 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie mindestens ein Gerät aus.',
        variant: 'destructive',
      });
      return;
    }

    createShipmentMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/b2b/shipments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Neue Sendung</h1>
          <p className="text-muted-foreground">Geräte bündeln und versenden</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Select Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Geräte auswählen
            </CardTitle>
            <CardDescription>
              Wählen Sie die Aufträge aus, die Sie in dieser Sendung bündeln möchten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : availableTickets?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine verfügbaren Aufträge zum Versenden.</p>
                <p className="text-sm mt-2">
                  Erstellen Sie zuerst neue Aufträge oder warten Sie, bis bestehende Aufträge bearbeitet wurden.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedTickets.size === availableTickets?.length && availableTickets.length > 0}
                      onCheckedChange={selectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm">
                      Alle auswählen ({availableTickets?.length || 0})
                    </Label>
                  </div>
                  <Badge variant="secondary">
                    {selectedTickets.size} ausgewählt
                  </Badge>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Auftragsnummer</TableHead>
                        <TableHead>Referenz</TableHead>
                        <TableHead>Gerät</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableTickets?.map((ticket) => (
                        <TableRow 
                          key={ticket.id}
                          className="cursor-pointer"
                          onClick={() => toggleTicket(ticket.id)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedTickets.has(ticket.id)}
                              onCheckedChange={() => toggleTicket(ticket.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {ticket.ticket_number}
                          </TableCell>
                          <TableCell>
                            {ticket.endcustomer_reference || '-'}
                          </TableCell>
                          <TableCell>
                            {ticket.device ? (
                              <span className="text-sm">
                                {ticket.device.brand} {ticket.device.model}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[ticket.status as TicketStatus]} variant="secondary">
                              {STATUS_LABELS[ticket.status as TicketStatus]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sender Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Absenderadresse
            </CardTitle>
            <CardDescription>
              Die Adresse wird für den Lieferschein und das Versandlabel verwendet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Absender wird automatisch aus Ihren Firmendaten übernommen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="md:col-span-2">
                <p className="text-sm font-medium">{senderAddress.name}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">{senderAddress.street}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{senderAddress.zip} {senderAddress.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{senderAddress.country}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes & Options */}
        <Card>
          <CardHeader>
            <CardTitle>Optionen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Bemerkung (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Zusätzliche Hinweise zur Sendung..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-label"
                checked={generateLabel}
                onCheckedChange={(checked) => setGenerateLabel(!!checked)}
              />
              <Label htmlFor="generate-label">
                Lieferschein und Versandlabel nach dem Speichern erzeugen
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/b2b/shipments')}
          >
            Abbrechen
          </Button>
          <Button 
            type="submit" 
            disabled={createShipmentMutation.isPending || selectedTickets.size === 0}
          >
            {createShipmentMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Sendung erstellen ({selectedTickets.size} Gerät{selectedTickets.size !== 1 ? 'e' : ''})
          </Button>
        </div>
      </form>
    </div>
  );
}
