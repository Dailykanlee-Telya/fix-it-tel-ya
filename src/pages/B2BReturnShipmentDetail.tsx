import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Printer, Package, Truck, CheckCircle, Smartphone, Tablet, Laptop, Watch, HelpCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { B2B_SHIPMENT_STATUS_LABELS, B2B_SHIPMENT_STATUS_COLORS, B2BShipmentStatus, TELYA_ADDRESS, ReturnAddress } from '@/types/b2b';
import { Json } from '@/integrations/supabase/types';

const deviceIcons: Record<string, any> = {
  HANDY: Smartphone,
  TABLET: Tablet,
  LAPTOP: Laptop,
  SMARTWATCH: Watch,
  OTHER: HelpCircle,
};

export default function B2BReturnShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  // Fetch shipment details
  const { data: shipment, isLoading } = useQuery({
    queryKey: ['b2b-return-shipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_shipments')
        .select(`
          *,
          b2b_partner:b2b_partners(*),
          creator:profiles!b2b_shipments_created_by_fkey(name),
          tickets:repair_tickets(
            id, 
            ticket_number, 
            endcustomer_reference, 
            status, 
            final_price,
            device:devices(device_type, brand, model, color)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: B2BShipmentStatus) => {
      const { error } = await supabase
        .from('b2b_shipments')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // If marked as delivered, update all tickets to ABGEHOLT
      if (newStatus === 'RETOUR_ZUGESTELLT') {
        const ticketIds = shipment?.tickets?.map((t: any) => t.id) || [];
        if (ticketIds.length > 0) {
          const { error: ticketError } = await supabase
            .from('repair_tickets')
            .update({ status: 'ABGEHOLT' })
            .in('id', ticketIds);

          if (ticketError) throw ticketError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-return-shipment', id] });
      toast.success('Status aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Status');
    },
  });

  // Add tracking number mutation
  const addTrackingMutation = useMutation({
    mutationFn: async (tracking: string) => {
      const { error } = await supabase
        .from('b2b_shipments')
        .update({ 
          dhl_tracking_number: tracking,
          status: 'RETOUR_UNTERWEGS',
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-return-shipment', id] });
      setTrackingDialogOpen(false);
      setTrackingNumber('');
      toast.success('Tracking-Nummer hinzugefügt');
    },
    onError: () => {
      toast.error('Fehler beim Hinzufügen der Tracking-Nummer');
    },
  });

  // Print packing slip
  const printPackingSlip = () => {
    const recipientAddress = shipment?.recipient_address as ReturnAddress | null;
    const tickets = shipment?.tickets || [];
    const totalPrice = tickets.reduce((sum: number, t: any) => sum + (t.final_price || 0), 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lieferschein ${shipment?.shipment_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #1e40af; }
          .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .address-box { width: 45%; }
          .address-box h3 { margin-bottom: 10px; font-size: 14px; color: #666; }
          .address-box p { margin: 4px 0; }
          .shipment-info { margin-bottom: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .shipment-info h2 { margin: 0 0 10px 0; font-size: 18px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          .table th { background: #f9fafb; font-weight: 600; }
          .table td.right { text-align: right; }
          .total-row { font-weight: bold; background: #f0f9ff; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TELYA</div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #666;">Lieferschein</p>
            <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">${shipment?.shipment_number}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">${format(new Date(shipment?.created_at || new Date()), 'dd.MM.yyyy', { locale: de })}</p>
          </div>
        </div>

        <div class="addresses">
          <div class="address-box">
            <h3>ABSENDER</h3>
            <p><strong>${TELYA_ADDRESS.name}</strong></p>
            <p>${TELYA_ADDRESS.street}</p>
            <p>${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}</p>
            <p>${TELYA_ADDRESS.country}</p>
            <p style="margin-top: 10px;">Tel: ${TELYA_ADDRESS.phone}</p>
          </div>
          <div class="address-box">
            <h3>EMPFÄNGER</h3>
            <p><strong>${recipientAddress?.name || shipment?.b2b_partner?.name}</strong></p>
            <p>${recipientAddress?.street || shipment?.b2b_partner?.street || ''}</p>
            <p>${recipientAddress?.zip || shipment?.b2b_partner?.zip || ''} ${recipientAddress?.city || shipment?.b2b_partner?.city || ''}</p>
            <p>${recipientAddress?.country || shipment?.b2b_partner?.country || 'Deutschland'}</p>
          </div>
        </div>

        <div class="shipment-info">
          <h2>Rücksendung reparierter Geräte</h2>
          ${shipment?.dhl_tracking_number ? `<p><strong>DHL Tracking:</strong> ${shipment.dhl_tracking_number}</p>` : ''}
          <p><strong>Anzahl Geräte:</strong> ${tickets.length}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Auftragsnr.</th>
              <th>Endkunden-Ref.</th>
              <th>Gerät</th>
              <th class="right">Betrag</th>
            </tr>
          </thead>
          <tbody>
            ${tickets.map((ticket: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>${ticket.ticket_number}</td>
                <td>${ticket.endcustomer_reference || '—'}</td>
                <td>${ticket.device?.brand} ${ticket.device?.model}${ticket.device?.color ? ` (${ticket.device.color})` : ''}</td>
                <td class="right">${ticket.final_price ? ticket.final_price.toFixed(2) + ' €' : '—'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">Gesamtbetrag:</td>
              <td class="right">${totalPrice.toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>

        ${shipment?.notes ? `
          <div style="margin-bottom: 30px;">
            <h4 style="margin-bottom: 10px;">Anmerkungen:</h4>
            <p style="padding: 10px; background: #f5f5f5; border-radius: 4px;">${shipment.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>${TELYA_ADDRESS.name} • ${TELYA_ADDRESS.street} • ${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}</p>
          <p>Tel: ${TELYA_ADDRESS.phone} • E-Mail: ${TELYA_ADDRESS.email}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Rücksendung nicht gefunden</p>
        <Button onClick={() => navigate('/b2b-return-shipments')}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  const recipientAddress = shipment.recipient_address as ReturnAddress | null;
  const canAddTracking = shipment.status === 'RETOUR_ANGELEGT';
  const canMarkDelivered = shipment.status === 'RETOUR_UNTERWEGS';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/b2b-return-shipments')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{shipment.shipment_number}</h1>
            <p className="text-muted-foreground">
              Rücksendung an {shipment.b2b_partner?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={printPackingSlip}>
            <Printer className="mr-2 h-4 w-4" />
            Lieferschein drucken
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge className={`text-sm ${B2B_SHIPMENT_STATUS_COLORS[shipment.status as B2BShipmentStatus]}`}>
              {B2B_SHIPMENT_STATUS_LABELS[shipment.status as B2BShipmentStatus]}
            </Badge>

            <Separator />

            <div className="space-y-2">
              {canAddTracking && (
                <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Truck className="mr-2 h-4 w-4" />
                      Tracking-Nr. hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>DHL Tracking-Nummer</DialogTitle>
                      <DialogDescription>
                        Geben Sie die DHL Tracking-Nummer ein
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="tracking">Tracking-Nummer</Label>
                      <Input
                        id="tracking"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="z.B. 00340434..."
                        className="mt-2"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => addTrackingMutation.mutate(trackingNumber)}
                        disabled={!trackingNumber || addTrackingMutation.isPending}
                      >
                        Speichern
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {canMarkDelivered && (
                <Button
                  className="w-full"
                  onClick={() => updateStatusMutation.mutate('RETOUR_ZUGESTELLT')}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Als zugestellt markieren
                </Button>
              )}
            </div>

            {shipment.dhl_tracking_number && (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">DHL Tracking</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono">{shipment.dhl_tracking_number}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => window.open(`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?lang=de&idc=${shipment.dhl_tracking_number}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sender Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Absender</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{TELYA_ADDRESS.name}</p>
            <p className="text-muted-foreground">{TELYA_ADDRESS.street}</p>
            <p className="text-muted-foreground">{TELYA_ADDRESS.zip} {TELYA_ADDRESS.city}</p>
            <p className="text-muted-foreground">{TELYA_ADDRESS.country}</p>
          </CardContent>
        </Card>

        {/* Recipient Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Empfänger</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{recipientAddress?.name || shipment.b2b_partner?.name}</p>
            <p className="text-muted-foreground">{recipientAddress?.street || shipment.b2b_partner?.street}</p>
            <p className="text-muted-foreground">
              {recipientAddress?.zip || shipment.b2b_partner?.zip} {recipientAddress?.city || shipment.b2b_partner?.city}
            </p>
            <p className="text-muted-foreground">{recipientAddress?.country || shipment.b2b_partner?.country || 'Deutschland'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Geräte ({shipment.tickets?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auftragsnr.</TableHead>
                <TableHead>Endkunden-Ref.</TableHead>
                <TableHead>Gerät</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Preis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipment.tickets?.map((ticket: any) => {
                const DeviceIcon = deviceIcons[ticket.device?.device_type] || HelpCircle;
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                    <TableCell>{ticket.endcustomer_reference || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                        {ticket.device?.brand} {ticket.device?.model}
                        {ticket.device?.color && (
                          <span className="text-muted-foreground">({ticket.device.color})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ticket.final_price ? `${ticket.final_price.toFixed(2)} €` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {shipment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notizen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{shipment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
