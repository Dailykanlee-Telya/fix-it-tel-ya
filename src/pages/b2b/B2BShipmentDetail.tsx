import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Package, Truck, FileText, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { B2BShipmentStatus, B2B_SHIPMENT_STATUS_LABELS, B2B_SHIPMENT_STATUS_COLORS, TELYA_ADDRESS, ReturnAddress } from '@/types/b2b';
import { STATUS_LABELS, STATUS_COLORS, TicketStatus } from '@/types/database';
import { Json } from '@/integrations/supabase/types';

export default function B2BShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { b2bPartnerId, b2bPartner } = useB2BAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['b2b-shipment', id],
    queryFn: async () => {
      if (!id || !b2bPartnerId) return null;

      const { data, error } = await supabase
        .from('b2b_shipments')
        .select(`
          *,
          tickets:repair_tickets(
            id,
            ticket_number,
            endcustomer_reference,
            status,
            device:devices(device_type, brand, model)
          )
        `)
        .eq('id', id)
        .eq('b2b_partner_id', b2bPartnerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!b2bPartnerId,
  });

  // Generate DHL Label (placeholder)
  const generateLabelMutation = useMutation({
    mutationFn: async () => {
      if (!shipment) throw new Error('Sendung nicht gefunden');

      // For now, generate a placeholder tracking number
      const trackingNumber = `DHL${Date.now().toString().slice(-10)}`;

      const { error } = await supabase
        .from('b2b_shipments')
        .update({
          dhl_tracking_number: trackingNumber,
          dhl_label_url: '#placeholder', // In production, this would be a real URL
          status: 'GERAETE_UNTERWEGS',
        })
        .eq('id', shipment.id);

      if (error) throw error;
      return trackingNumber;
    },
    onSuccess: (trackingNumber) => {
      toast({
        title: 'DHL-Label erstellt',
        description: `Tracking-Nummer: ${trackingNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['b2b-shipment', id] });
      queryClient.invalidateQueries({ queryKey: ['b2b-shipments'] });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Label konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    },
  });

  const printPackingSlip = () => {
    if (!shipment || !b2bPartner) return;

    const rawAddress = shipment.sender_address as Record<string, unknown> | null;
    const senderAddress: ReturnAddress = rawAddress ? {
      name: rawAddress.name as string | undefined,
      street: rawAddress.street as string | undefined,
      zip: rawAddress.zip as string | undefined,
      city: rawAddress.city as string | undefined,
    } : {
      name: b2bPartner.name,
      street: b2bPartner.street ?? undefined,
      zip: b2bPartner.zip ?? undefined,
      city: b2bPartner.city ?? undefined,
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lieferschein ${shipment.shipment_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; font-size: 12px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .address-block { margin-bottom: 20px; }
          .address-block h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
          .address-block p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .meta { margin-top: 30px; font-size: 11px; color: #666; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>Lieferschein</h1>
        <div class="header">
          <div class="address-block">
            <h3>Absender:</h3>
            <p><strong>${senderAddress.name || ''}</strong></p>
            <p>${senderAddress.street || ''}</p>
            <p>${senderAddress.zip || ''} ${senderAddress.city || ''}</p>
          </div>
          <div class="address-block">
            <h3>Empfänger:</h3>
            <p><strong>${TELYA_ADDRESS.name}</strong></p>
            <p>${TELYA_ADDRESS.street}</p>
            <p>${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}</p>
          </div>
        </div>
        
        <p><strong>Sendungsnummer:</strong> ${shipment.shipment_number}</p>
        <p><strong>Datum:</strong> ${format(new Date(), 'dd.MM.yyyy', { locale: de })}</p>
        ${shipment.dhl_tracking_number ? `<p><strong>DHL Tracking:</strong> ${shipment.dhl_tracking_number}</p>` : ''}
        
        <table>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Auftragsnummer</th>
              <th>Endkunden-Referenz</th>
              <th>Gerät</th>
            </tr>
          </thead>
          <tbody>
            ${shipment.tickets?.map((ticket: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>${ticket.ticket_number}</td>
                <td>${ticket.endcustomer_reference || '-'}</td>
                <td>${ticket.device ? `${ticket.device.brand} ${ticket.device.model}` : '-'}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
        
        <p style="margin-top: 20px;"><strong>Gesamt:</strong> ${shipment.tickets?.length || 0} Gerät(e)</p>
        
        ${shipment.notes ? `<p style="margin-top: 20px;"><strong>Bemerkung:</strong> ${shipment.notes}</p>` : ''}
        
        <div class="meta">
          <p>Erstellt am ${format(new Date(shipment.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const printDHLLabel = () => {
    if (!shipment || !b2bPartner) return;

    const rawAddress = shipment.sender_address as Record<string, unknown> | null;
    const senderAddress: ReturnAddress = rawAddress ? {
      name: rawAddress.name as string | undefined,
      street: rawAddress.street as string | undefined,
      zip: rawAddress.zip as string | undefined,
      city: rawAddress.city as string | undefined,
    } : {
      name: b2bPartner.name,
      street: b2bPartner.street ?? undefined,
      zip: b2bPartner.zip ?? undefined,
      city: b2bPartner.city ?? undefined,
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DHL Versandlabel ${shipment.shipment_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .label { border: 3px solid #000; padding: 20px; max-width: 400px; margin: auto; }
          .dhl-logo { font-size: 36px; font-weight: bold; color: #FFCC00; background: #D40511; padding: 10px 20px; display: inline-block; margin-bottom: 20px; }
          .address-block { margin: 20px 0; padding: 15px; border: 1px solid #ccc; }
          .address-block.to { border: 2px solid #000; background: #f9f9f9; }
          .address-block h4 { margin: 0 0 10px 0; font-size: 12px; color: #666; }
          .address-block p { margin: 3px 0; font-size: 14px; }
          .address-block .name { font-size: 18px; font-weight: bold; }
          .tracking { text-align: center; margin-top: 20px; padding: 15px; background: #f0f0f0; }
          .tracking-number { font-size: 20px; font-weight: bold; font-family: monospace; letter-spacing: 2px; }
          .barcode { font-family: 'Libre Barcode 128', monospace; font-size: 48px; margin: 10px 0; }
          .demo-notice { text-align: center; color: #D40511; font-weight: bold; margin-top: 20px; padding: 10px; border: 2px dashed #D40511; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="dhl-logo">DHL</div>
          
          <div class="address-block">
            <h4>ABSENDER:</h4>
            <p class="name">${senderAddress.name || ''}</p>
            <p>${senderAddress.street || ''}</p>
            <p>${senderAddress.zip || ''} ${senderAddress.city || ''}</p>
          </div>
          
          <div class="address-block to">
            <h4>EMPFÄNGER:</h4>
            <p class="name">${TELYA_ADDRESS.name}</p>
            <p>${TELYA_ADDRESS.street}</p>
            <p>${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}</p>
            <p>${TELYA_ADDRESS.country}</p>
          </div>
          
          ${shipment.dhl_tracking_number ? `
            <div class="tracking">
              <p>SENDUNGSNUMMER:</p>
              <p class="tracking-number">${shipment.dhl_tracking_number}</p>
            </div>
          ` : ''}
          
          <div class="demo-notice">
            ⚠️ DEMO-LABEL - Nicht für echten Versand verwenden ⚠️
          </div>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Sendung nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">
          Die Sendung existiert nicht oder Sie haben keinen Zugriff.
        </p>
        <Button onClick={() => navigate('/b2b/shipments')}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/b2b/shipments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{shipment.shipment_number}</h1>
            <Badge className={B2B_SHIPMENT_STATUS_COLORS[shipment.status as B2BShipmentStatus]}>
              {B2B_SHIPMENT_STATUS_LABELS[shipment.status as B2BShipmentStatus]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {shipment.tickets?.length || 0} Gerät(e) • Erstellt am {format(new Date(shipment.created_at), 'dd.MM.yyyy', { locale: de })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Dokumente & Versand</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={printPackingSlip}>
            <FileText className="h-4 w-4 mr-2" />
            Lieferschein drucken
          </Button>
          
          {!shipment.dhl_tracking_number ? (
            <Button 
              onClick={() => generateLabelMutation.mutate()}
              disabled={generateLabelMutation.isPending}
            >
              {generateLabelMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Truck className="h-4 w-4 mr-2" />
              )}
              DHL-Label erzeugen
            </Button>
          ) : (
            <Button variant="outline" onClick={printDHLLabel}>
              <Download className="h-4 w-4 mr-2" />
              DHL-Label drucken
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tracking Info */}
      {shipment.dhl_tracking_number && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              DHL Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="font-mono text-lg">{shipment.dhl_tracking_number}</span>
              <a
                href={`https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${shipment.dhl_tracking_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Sendungsverfolgung öffnen →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Enthaltene Aufträge ({shipment.tickets?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auftragsnummer</TableHead>
                <TableHead>Endkunden-Referenz</TableHead>
                <TableHead>Gerät</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipment.tickets?.map((ticket: any) => (
                <TableRow 
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/b2b/orders/${ticket.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">
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
        </CardContent>
      </Card>

      {/* Notes */}
      {shipment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Bemerkungen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{shipment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
