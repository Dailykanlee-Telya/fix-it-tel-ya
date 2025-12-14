import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Smartphone, Laptop, Watch, Tablet, HelpCircle, Package, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { STATUS_LABELS, STATUS_COLORS, TicketStatus, DeviceType, DEVICE_TYPE_LABELS } from '@/types/database';

const deviceIcons: Record<DeviceType, React.ComponentType<{ className?: string }>> = {
  HANDY: Smartphone,
  TABLET: Tablet,
  LAPTOP: Laptop,
  SMARTWATCH: Watch,
  SONSTIGES: HelpCircle,
};

export default function B2BOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { b2bPartnerId } = useB2BAuth();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ['b2b-order', id],
    queryFn: async () => {
      if (!id || !b2bPartnerId) return null;

      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          *,
          device:devices(*),
          status_history:status_history(
            id,
            old_status,
            new_status,
            created_at,
            note
          ),
          shipment:b2b_shipments(
            id,
            shipment_number,
            status,
            dhl_tracking_number
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Auftrag nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">
          Der Auftrag existiert nicht oder Sie haben keinen Zugriff.
        </p>
        <Button onClick={() => navigate('/b2b/orders')}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  const DeviceIcon = deviceIcons[order.device?.device_type as DeviceType] || HelpCircle;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/b2b/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{order.ticket_number}</h1>
            <Badge className={STATUS_COLORS[order.status as TicketStatus]}>
              {STATUS_LABELS[order.status as TicketStatus]}
            </Badge>
          </div>
          {order.endcustomer_reference && (
            <p className="text-muted-foreground">
              Referenz: {order.endcustomer_reference}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DeviceIcon className="h-5 w-5" />
              Gerätedaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Typ:</span>
                <p className="font-medium">
                  {DEVICE_TYPE_LABELS[order.device?.device_type as DeviceType]}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Marke:</span>
                <p className="font-medium">{order.device?.brand}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Modell:</span>
                <p className="font-medium">{order.device?.model}</p>
              </div>
              {order.device?.color && (
                <div>
                  <span className="text-muted-foreground">Farbe:</span>
                  <p className="font-medium">{order.device.color}</p>
                </div>
              )}
              {order.device?.imei_or_serial && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">
                    {order.device.device_type === 'HANDY' ? 'IMEI:' : 'Seriennummer:'}
                  </span>
                  <p className="font-mono">{order.device.imei_or_serial}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Auftragsdaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Erstellt am:</span>
                <p className="font-medium">
                  {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">KVA erforderlich:</span>
                <p className="font-medium">{order.kva_required ? 'Ja' : 'Nein'}</p>
              </div>
              {order.kva_required && (
                <div>
                  <span className="text-muted-foreground">KVA Status:</span>
                  <p>
                    {order.kva_approved === null ? (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700">
                        Ausstehend
                      </Badge>
                    ) : order.kva_approved ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Angenommen
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        Abgelehnt
                      </Badge>
                    )}
                  </p>
                </div>
              )}
              {order.auto_approved_limit && (
                <div>
                  <span className="text-muted-foreground">Auto-Genehmigung bis:</span>
                  <p className="font-medium">{order.auto_approved_limit} €</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Description */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fehlerbeschreibung</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{order.error_description_text || '-'}</p>
          </CardContent>
        </Card>

        {/* Shipment Info */}
        {order.shipment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Versand
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Sendungsnummer:</span>
                <p className="font-mono">{order.shipment.shipment_number}</p>
              </div>
              {order.shipment.dhl_tracking_number && (
                <div>
                  <span className="text-muted-foreground">DHL Tracking:</span>
                  <p>
                    <a
                      href={`https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${order.shipment.dhl_tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono"
                    >
                      {order.shipment.dhl_tracking_number}
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status History */}
        <Card className={order.shipment ? '' : 'md:col-span-2'}>
          <CardHeader>
            <CardTitle>Statusverlauf</CardTitle>
          </CardHeader>
          <CardContent>
            {order.status_history && order.status_history.length > 0 ? (
              <div className="space-y-3">
                {order.status_history
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((history) => (
                    <div key={history.id} className="flex items-start gap-3 text-sm">
                      <div className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(history.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </div>
                      <div>
                        <Badge className={STATUS_COLORS[history.new_status as TicketStatus]} variant="secondary">
                          {STATUS_LABELS[history.new_status as TicketStatus]}
                        </Badge>
                        {history.note && (
                          <p className="text-muted-foreground mt-1">{history.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Keine Statusänderungen</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
