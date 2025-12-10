import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import telyaLogo from '@/assets/telya-logo.png';
import { 
  STATUS_LABELS, 
  TicketStatus, 
  DEVICE_TYPE_LABELS, 
  DeviceType,
  ERROR_CODE_LABELS,
  ErrorCode
} from '@/types/database';

interface TicketDocumentsProps {
  ticket: any;
  partUsage?: any[];
}

export default function TicketDocuments({ ticket, partUsage }: TicketDocumentsProps) {
  const intakeRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  const handlePrint = (ref: React.RefObject<HTMLDivElement>, title: string) => {
    if (!ref.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${ticket.ticket_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1a1a1a; }
            .document { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1e40af; }
            .logo { height: 48px; }
            .doc-info { text-align: right; }
            .doc-title { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 8px; }
            .ticket-number { font-size: 18px; font-weight: 600; }
            .date { color: #666; margin-top: 4px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 14px; font-weight: 600; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .field { margin-bottom: 12px; }
            .field-label { font-size: 12px; color: #666; margin-bottom: 2px; }
            .field-value { font-size: 14px; font-weight: 500; }
            .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .table th { background: #f3f4f6; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .table td { font-size: 14px; }
            .table .amount { text-align: right; }
            .total-row { font-weight: 600; background: #f9fafb; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
            .signature-line { border-top: 1px solid #333; padding-top: 8px; font-size: 12px; color: #666; }
            .legal-notes { font-size: 11px; color: #666; margin-top: 20px; line-height: 1.5; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #dbeafe; color: #1e40af; }
            @media print { body { padding: 0; } .document { max-width: none; } }
          </style>
        </head>
        <body>
          ${ref.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const totalPartsPrice = partUsage?.reduce(
    (sum: number, p: any) => sum + (p.unit_sales_price || 0) * p.quantity,
    0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Eingangsbeleg (Intake Receipt) */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Eingangsbeleg
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(intakeRef, 'Eingangsbeleg')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={intakeRef} className="document bg-white p-6 rounded-lg border">
            <div className="header flex justify-between items-start mb-6 pb-4 border-b-2 border-primary">
              <img src={telyaLogo} alt="Telya Logo" className="h-12" />
              <div className="text-right">
                <div className="text-xl font-bold text-primary">Eingangsbeleg</div>
                <div className="text-lg font-semibold">{ticket.ticket_number}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Kundendaten
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="font-medium">{ticket.customer?.first_name} {ticket.customer?.last_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Telefon</div>
                    <div className="font-medium">{ticket.customer?.phone}</div>
                  </div>
                  {ticket.customer?.email && (
                    <div>
                      <div className="text-xs text-muted-foreground">E-Mail</div>
                      <div className="font-medium">{ticket.customer?.email}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Gerätedaten
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Gerät</div>
                    <div className="font-medium">{ticket.device?.brand} {ticket.device?.model}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Gerätetyp</div>
                    <div className="font-medium">{DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType]}</div>
                  </div>
                  {ticket.device?.imei_or_serial && (
                    <div>
                      <div className="text-xs text-muted-foreground">IMEI/Seriennummer</div>
                      <div className="font-medium font-mono text-sm">{ticket.device?.imei_or_serial}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="section mb-6">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                Fehlerbeschreibung
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Fehlercode</div>
                  <div className="font-medium">{ERROR_CODE_LABELS[ticket.error_code as ErrorCode]}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Beschreibung</div>
                  <div className="font-medium">{ticket.error_description_text || 'Keine Beschreibung'}</div>
                </div>
                {ticket.accessories && (
                  <div>
                    <div className="text-xs text-muted-foreground">Mitgegebenes Zubehör</div>
                    <div className="font-medium">{ticket.accessories}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Annahme-Standort
                </div>
                <div className="font-medium">{ticket.location?.name}</div>
                <div className="text-sm text-muted-foreground">{ticket.location?.address}</div>
              </div>

              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Preisinfo
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Preismodus</div>
                    <div className="font-medium">{ticket.price_mode}</div>
                  </div>
                  {ticket.estimated_price && (
                    <div>
                      <div className="text-xs text-muted-foreground">Geschätzter Preis</div>
                      <div className="font-medium">{ticket.estimated_price.toFixed(2)} €</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="border-t border-foreground pt-2 text-xs text-muted-foreground">
                    Unterschrift Kunde
                  </div>
                </div>
                <div>
                  <div className="border-t border-foreground pt-2 text-xs text-muted-foreground">
                    Unterschrift Mitarbeiter
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Mit meiner Unterschrift bestätige ich die Abgabe des oben genannten Geräts zur Reparatur 
                und erkenne die allgemeinen Geschäftsbedingungen der Telya GmbH an.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lieferschein (Delivery Note) */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lieferschein / Abholbeleg
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(deliveryRef, 'Lieferschein')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={deliveryRef} className="document bg-white p-6 rounded-lg border">
            <div className="header flex justify-between items-start mb-6 pb-4 border-b-2 border-primary">
              <img src={telyaLogo} alt="Telya Logo" className="h-12" />
              <div className="text-right">
                <div className="text-xl font-bold text-primary">Lieferschein</div>
                <div className="text-lg font-semibold">{ticket.ticket_number}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary">
                {STATUS_LABELS[ticket.status as TicketStatus]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Kundendaten
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="font-medium">{ticket.customer?.first_name} {ticket.customer?.last_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Telefon</div>
                    <div className="font-medium">{ticket.customer?.phone}</div>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Gerätedaten
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Gerät</div>
                    <div className="font-medium">{ticket.device?.brand} {ticket.device?.model}</div>
                  </div>
                  {ticket.device?.imei_or_serial && (
                    <div>
                      <div className="text-xs text-muted-foreground">IMEI/Seriennummer</div>
                      <div className="font-medium font-mono text-sm">{ticket.device?.imei_or_serial}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Parts used */}
            {partUsage && partUsage.length > 0 && (
              <div className="section mb-6">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Verwendete Ersatzteile
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Artikel</th>
                      <th className="text-center py-2 font-semibold">Menge</th>
                      <th className="text-right py-2 font-semibold">Einzelpreis</th>
                      <th className="text-right py-2 font-semibold">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partUsage.map((usage: any) => (
                      <tr key={usage.id} className="border-b">
                        <td className="py-2">{usage.part?.name}</td>
                        <td className="py-2 text-center">{usage.quantity}</td>
                        <td className="py-2 text-right">{(usage.unit_sales_price || 0).toFixed(2)} €</td>
                        <td className="py-2 text-right">{((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-muted/30">
                      <td colSpan={3} className="py-2 text-right">Teile gesamt:</td>
                      <td className="py-2 text-right">{totalPartsPrice.toFixed(2)} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="section mb-6">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                Preisübersicht
              </div>
              <div className="space-y-2">
                {ticket.estimated_price && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reparaturkosten (geschätzt)</span>
                    <span className="font-medium">{ticket.estimated_price.toFixed(2)} €</span>
                  </div>
                )}
                {totalPartsPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ersatzteile</span>
                    <span className="font-medium">{totalPartsPrice.toFixed(2)} €</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Gesamtbetrag</span>
                  <span>{((ticket.final_price || ticket.estimated_price || 0) + totalPartsPrice).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Abholstandort
                </div>
                <div className="font-medium">{ticket.location?.name}</div>
                <div className="text-sm text-muted-foreground">{ticket.location?.address}</div>
                {ticket.location?.phone && (
                  <div className="text-sm text-muted-foreground">Tel: {ticket.location?.phone}</div>
                )}
              </div>

              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Rückgabe Zubehör
                </div>
                <div className="font-medium">{ticket.accessories || 'Kein Zubehör'}</div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="border-t border-foreground pt-2 text-xs text-muted-foreground">
                    Unterschrift Kunde (Gerät erhalten)
                  </div>
                </div>
                <div>
                  <div className="border-t border-foreground pt-2 text-xs text-muted-foreground">
                    Unterschrift Mitarbeiter
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Mit meiner Unterschrift bestätige ich den Erhalt des reparierten Geräts und des oben 
                aufgeführten Zubehörs in ordnungsgemäßem Zustand.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
