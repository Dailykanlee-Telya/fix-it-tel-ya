import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Package, Smartphone, Tablet, Laptop, Watch, HelpCircle } from 'lucide-react';
import { TELYA_ADDRESS } from '@/types/b2b';
import { DEVICE_TYPE_LABELS, DeviceType } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

const deviceIcons: Record<string, any> = {
  HANDY: Smartphone,
  TABLET: Tablet,
  LAPTOP: Laptop,
  SMARTWATCH: Watch,
  OTHER: HelpCircle,
};

export default function B2BReturnShipmentNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const preselectedPartnerId = searchParams.get('partner');
  
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(preselectedPartnerId || '');
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Fetch partners
  const { data: partners } = useQuery({
    queryKey: ['b2b-partners-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_partners')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Fetch ready tickets for selected partner
  const { data: readyTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['ready-tickets-for-partner', selectedPartnerId],
    queryFn: async () => {
      if (!selectedPartnerId) return [];

      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          id,
          ticket_number,
          endcustomer_reference,
          status,
          final_price,
          device:devices(device_type, brand, model, color)
        `)
        .eq('is_b2b', true)
        .eq('b2b_partner_id', selectedPartnerId)
        .eq('status', 'FERTIG_ZUR_ABHOLUNG')
        .is('shipment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPartnerId,
  });

  // Reset selection when partner changes
  useEffect(() => {
    setSelectedTicketIds([]);
  }, [selectedPartnerId]);

  // Auto-select all tickets when loaded
  useEffect(() => {
    if (readyTickets?.length && selectedTicketIds.length === 0) {
      setSelectedTicketIds(readyTickets.map((t: any) => t.id));
    }
  }, [readyTickets]);

  const selectedPartner = partners?.find((p: any) => p.id === selectedPartnerId);

  // Generate return shipment number
  const generateShipmentNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `RET-${year}-${random}`;
  };

  // Create return shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPartnerId || selectedTicketIds.length === 0) {
        throw new Error('Bitte Partner und mindestens ein Gerät auswählen');
      }

      const shipmentNumber = generateShipmentNumber();
      
      // Get partner address for recipient
      const partner = partners?.find((p: any) => p.id === selectedPartnerId);
      const recipientAddress = partner?.default_return_address || {
        name: partner?.name,
        street: partner?.street,
        zip: partner?.zip,
        city: partner?.city,
        country: partner?.country || 'Deutschland',
      };

      // Create shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('b2b_shipments')
        .insert({
          b2b_partner_id: selectedPartnerId,
          shipment_number: shipmentNumber,
          shipment_type: 'OUTBOUND',
          status: 'RETOUR_ANGELEGT',
          sender_address: TELYA_ADDRESS,
          recipient_address: recipientAddress,
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Update tickets to link to this shipment
      const { error: updateError } = await supabase
        .from('repair_tickets')
        .update({ shipment_id: shipment.id })
        .in('id', selectedTicketIds);

      if (updateError) throw updateError;

      return shipment;
    },
    onSuccess: (shipment) => {
      queryClient.invalidateQueries({ queryKey: ['b2b-return-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['partners-with-ready-tickets'] });
      toast.success('Rücksendung erfolgreich erstellt');
      navigate(`/b2b-return-shipments/${shipment.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Fehler beim Erstellen der Rücksendung');
    },
  });

  const toggleTicket = (ticketId: string) => {
    setSelectedTicketIds((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const toggleAll = () => {
    if (selectedTicketIds.length === readyTickets?.length) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(readyTickets?.map((t: any) => t.id) || []);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/b2b-return-shipments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Neue Rücksendung</h1>
          <p className="text-muted-foreground">
            Wählen Sie Geräte für die Rücksendung an den B2B-Partner
          </p>
        </div>
      </div>

      {/* Partner Selection */}
      <Card>
        <CardHeader>
          <CardTitle>B2B-Partner auswählen</CardTitle>
          <CardDescription>
            Wählen Sie den Partner, an den die Geräte zurückgesendet werden sollen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Partner auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {partners?.map((partner: any) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name} {partner.customer_number && `(${partner.customer_number})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPartner && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Empfängeradresse:</h4>
              <div className="text-sm text-muted-foreground">
                <p>{selectedPartner.name}</p>
                <p>{selectedPartner.street}</p>
                <p>{selectedPartner.zip} {selectedPartner.city}</p>
                <p>{selectedPartner.country || 'Deutschland'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Selection */}
      {selectedPartnerId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Geräte auswählen
            </CardTitle>
            <CardDescription>
              {readyTickets?.length || 0} Geräte bereit zur Rücksendung
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Laden...</div>
            ) : readyTickets?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Keine fertigen Geräte für diesen Partner gefunden
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTicketIds.length === readyTickets?.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Auftrag</TableHead>
                    <TableHead>Endkunden-Ref.</TableHead>
                    <TableHead>Gerät</TableHead>
                    <TableHead className="text-right">Preis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readyTickets?.map((ticket: any) => {
                    const DeviceIcon = deviceIcons[ticket.device?.device_type] || HelpCircle;
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTicketIds.includes(ticket.id)}
                            onCheckedChange={() => toggleTicket(ticket.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                        <TableCell>
                          {ticket.endcustomer_reference || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {ticket.device?.brand} {ticket.device?.model}
                              {ticket.device?.color && (
                                <span className="text-muted-foreground ml-1">
                                  ({ticket.device.color})
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {ticket.final_price ? (
                            <span className="font-medium">
                              {ticket.final_price.toFixed(2)} €
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {selectedPartnerId && (
        <Card>
          <CardHeader>
            <CardTitle>Notizen</CardTitle>
            <CardDescription>Optionale Anmerkungen zur Rücksendung</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="z.B. Besondere Hinweise zur Verpackung..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Summary & Create */}
      {selectedPartnerId && selectedTicketIds.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {selectedTicketIds.length} Gerät(e) ausgewählt
                </p>
                <p className="text-sm text-muted-foreground">
                  Rücksendung an: {selectedPartner?.name}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => createShipmentMutation.mutate()}
                disabled={createShipmentMutation.isPending}
              >
                {createShipmentMutation.isPending ? 'Erstelle...' : 'Rücksendung erstellen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
