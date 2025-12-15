import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import telyaLogo from '@/assets/telya-logo.png';
import { STATUS_LABELS, TicketStatus, DEVICE_TYPE_LABELS, DeviceType, ERROR_CODE_LABELS, ErrorCode } from '@/types/database';
import { TELYA_ADDRESS } from '@/types/b2b';
import { useDocumentTemplate } from '@/hooks/useDocumentTemplates';
import { buildPlaceholderMap, replacePlaceholders, DEFAULT_TEMPLATES } from '@/lib/document-placeholders';

// Company Information (using real Telya data)
const COMPANY_INFO = {
  name: TELYA_ADDRESS.name,
  address: `${TELYA_ADDRESS.street}, ${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}`,
  phone: TELYA_ADDRESS.phone,
  email: TELYA_ADDRESS.email,
  website: 'www.telya.de',
  hrb: `${TELYA_ADDRESS.hrb}, Amtsgericht Gelsenkirchen`,
  ust_id: TELYA_ADDRESS.vatId,
  geschaeftsfuehrer: TELYA_ADDRESS.managingDirector
};

interface TicketDocumentsProps {
  ticket: any;
  partUsage?: any[];
}

export default function TicketDocuments({ ticket, partUsage }: TicketDocumentsProps) {
  const intakeRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const kvaRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch templates from database
  const { data: intakeTemplate, isLoading: intakeLoading } = useDocumentTemplate('EINGANGSBELEG');
  const { data: kvaTemplate, isLoading: kvaLoading } = useDocumentTemplate('KVA');
  const { data: reportTemplate, isLoading: reportLoading } = useDocumentTemplate('REPARATURBERICHT');
  const { data: deliveryTemplate, isLoading: deliveryLoading } = useDocumentTemplate('LIEFERSCHEIN');

  // Build placeholder map for this ticket
  const placeholderMap = buildPlaceholderMap({ ticket, partUsage });

  // Helper to get template with fallback
  const getTemplate = (type: string, dbTemplate: any) => {
    const fallback = DEFAULT_TEMPLATES[type];
    if (!dbTemplate) return fallback;
    return dbTemplate;
  };

  // Get processed template texts
  const intake = getTemplate('EINGANGSBELEG', intakeTemplate);
  const kva = getTemplate('KVA', kvaTemplate);
  const report = getTemplate('REPARATURBERICHT', reportTemplate);
  const delivery = getTemplate('LIEFERSCHEIN', deliveryTemplate);

  // HTML escape function to prevent XSS
  const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const handlePrint = (ref: React.RefObject<HTMLDivElement>, title: string) => {
    if (!ref.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const safeTitle = escapeHtml(title);
    const safeTicketNumber = escapeHtml(ticket.ticket_number || '');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${safeTitle} - ${safeTicketNumber}</title>
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
            .company-info { font-size: 10px; color: #666; line-height: 1.4; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .intro-text { font-size: 14px; line-height: 1.6; margin-bottom: 20px; color: #333; }
            .conditions-block { font-size: 12px; line-height: 1.6; margin: 20px 0; padding: 16px; background: #f9fafb; border-radius: 8px; white-space: pre-wrap; }
            .footer-text { font-size: 11px; color: #666; line-height: 1.5; margin-top: 16px; font-style: italic; }
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

  const totalPartsPrice = partUsage?.reduce((sum: number, p: any) => sum + (p.unit_sales_price || 0) * p.quantity, 0) || 0;

  const CompanyFooter = () => (
    <div className="company-info mt-6 pt-4 border-t text-center text-[10px] text-muted-foreground">
      <p className="font-semibold">{COMPANY_INFO.name}</p>
      <p>{COMPANY_INFO.address}</p>
      <p>Tel: {COMPANY_INFO.phone} | E-Mail: {COMPANY_INFO.email} | Web: {COMPANY_INFO.website}</p>
      <p>Geschäftsführer: {COMPANY_INFO.geschaeftsfuehrer} | {COMPANY_INFO.hrb} | USt-IdNr.: {COMPANY_INFO.ust_id}</p>
    </div>
  );

  const ConditionsBlock = ({ text }: { text: string | null }) => {
    if (!text) return null;
    const processedText = replacePlaceholders(text, placeholderMap);
    return (
      <div className="conditions-block mt-4 p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {processedText}
      </div>
    );
  };

  const FooterText = ({ text }: { text: string | null }) => {
    if (!text) return null;
    const processedText = replacePlaceholders(text, placeholderMap);
    return (
      <p className="footer-text text-xs text-muted-foreground italic mt-4">
        {processedText}
      </p>
    );
  };

  const isLoading = intakeLoading || kvaLoading || reportLoading || deliveryLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
              <div>
                <img src={telyaLogo} alt="Telya Logo" className="h-12" />
                <p className="text-xs text-muted-foreground mt-1">{COMPANY_INFO.address}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">
                  {replacePlaceholders(intake.title, placeholderMap)}
                </div>
                <div className="text-lg font-semibold">{ticket.ticket_number}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
              </div>
            </div>

            {intake.intro && (
              <p className="intro-text text-sm text-muted-foreground mb-4">
                {replacePlaceholders(intake.intro, placeholderMap)}
              </p>
            )}

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
                  Benachrichtigungen
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">E-Mail:</span>
                    <span className="font-medium text-sm">{ticket.email_opt_in ? 'Ja' : 'Nein'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">SMS:</span>
                    <span className="font-medium text-sm">{ticket.sms_opt_in ? 'Ja' : 'Nein'}</span>
                  </div>
                </div>
              </div>
            </div>

            <ConditionsBlock text={intake.conditions} />

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
              <FooterText text={intake.footer} />
            </div>
            <CompanyFooter />
          </div>
        </CardContent>
      </Card>

      {/* Kostenvoranschlag (KVA) */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Kostenvoranschlag (KVA)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(kvaRef, 'Kostenvoranschlag')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={kvaRef} className="document bg-white p-6 rounded-lg border">
            <div className="header flex justify-between items-start mb-6 pb-4 border-b-2 border-primary">
              <div>
                <img src={telyaLogo} alt="Telya Logo" className="h-12" />
                <p className="text-xs text-muted-foreground mt-1">{COMPANY_INFO.address}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">
                  {replacePlaceholders(kva.title, placeholderMap)}
                </div>
                <div className="text-lg font-semibold">{ticket.ticket_number}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(), 'dd.MM.yyyy', { locale: de })}
                </div>
              </div>
            </div>

            {kva.intro && (
              <p className="intro-text text-sm text-muted-foreground mb-4">
                {replacePlaceholders(kva.intro, placeholderMap)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Kunde
                </div>
                <div className="space-y-1">
                  <div className="font-medium">{ticket.customer?.first_name} {ticket.customer?.last_name}</div>
                  <div className="text-sm text-muted-foreground">{ticket.customer?.phone}</div>
                  {ticket.customer?.email && <div className="text-sm text-muted-foreground">{ticket.customer?.email}</div>}
                  {ticket.customer?.address && <div className="text-sm text-muted-foreground">{ticket.customer?.address}</div>}
                </div>
              </div>

              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Gerät
                </div>
                <div className="space-y-1">
                  <div className="font-medium">{ticket.device?.brand} {ticket.device?.model}</div>
                  <div className="text-sm text-muted-foreground">{DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType]}</div>
                  {ticket.device?.imei_or_serial && <div className="text-sm font-mono text-muted-foreground">{ticket.device?.imei_or_serial}</div>}
                </div>
              </div>
            </div>

            <div className="section mb-6">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                Fehlerbeschreibung / Geplante Arbeiten
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Defekt</div>
                  <div className="font-medium">{ERROR_CODE_LABELS[ticket.error_code as ErrorCode]}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Beschreibung</div>
                  <div className="font-medium">{ticket.error_description_text || 'Keine Beschreibung'}</div>
                </div>
              </div>
            </div>

            <div className="section mb-6">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                Kostenaufstellung
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold">Position</th>
                    <th className="text-center py-2 font-semibold">Menge</th>
                    <th className="text-right py-2 font-semibold">Einzelpreis</th>
                    <th className="text-right py-2 font-semibold">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">Reparaturarbeiten ({ERROR_CODE_LABELS[ticket.error_code as ErrorCode]})</td>
                    <td className="py-2 text-center">1</td>
                    <td className="py-2 text-right">{(ticket.estimated_price || 0).toFixed(2)} €</td>
                    <td className="py-2 text-right">{(ticket.estimated_price || 0).toFixed(2)} €</td>
                  </tr>
                  {partUsage && partUsage.length > 0 && partUsage.map((usage: any) => (
                    <tr key={usage.id} className="border-b">
                      <td className="py-2">{usage.part?.name}</td>
                      <td className="py-2 text-center">{usage.quantity}</td>
                      <td className="py-2 text-right">{(usage.unit_sales_price || 0).toFixed(2)} €</td>
                      <td className="py-2 text-right">{((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-muted/30">
                    <td colSpan={3} className="py-2 text-right">Gesamtbetrag (inkl. MwSt.):</td>
                    <td className="py-2 text-right">{((ticket.estimated_price || 0) + totalPartsPrice).toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="section mb-6 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">KVA Status</div>
                  <div className="text-xs text-muted-foreground">
                    {ticket.kva_approved === true ? 'Vom Kunden angenommen' : ticket.kva_approved === false ? 'Vom Kunden abgelehnt' : 'Ausstehend'}
                  </div>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  ticket.kva_approved === true ? 'bg-success/10 text-success' : 
                  ticket.kva_approved === false ? 'bg-destructive/10 text-destructive' : 
                  'bg-warning/10 text-warning'
                }`}>
                  {ticket.kva_approved === true ? 'Angenommen' : ticket.kva_approved === false ? 'Abgelehnt' : 'Offen'}
                </span>
              </div>
            </div>

            <ConditionsBlock text={kva.conditions} />

            <div className="mt-8 pt-4 border-t">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs text-muted-foreground mb-6">
                    [ ] KVA angenommen<br />
                    [ ] KVA abgelehnt<br />
                    [ ] Gerät kostenfrei entsorgen
                  </div>
                  <div className="border-t border-foreground pt-2 text-xs text-muted-foreground">
                    Unterschrift Kunde
                  </div>
                </div>
                <div>
                  <div className="h-6" />
                  <div className="border-t border-foreground pt-2 text-xs text-muted-foreground">
                    Datum
                  </div>
                </div>
              </div>
              <FooterText text={kva.footer} />
            </div>
            <CompanyFooter />
          </div>
        </CardContent>
      </Card>

      {/* Reparaturbericht (Repair Report) */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Reparaturbericht
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(reportRef, 'Reparaturbericht')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={reportRef} className="document bg-white p-6 rounded-lg border">
            <div className="header flex justify-between items-start mb-6 pb-4 border-b-2 border-primary">
              <div>
                <img src={telyaLogo} alt="Telya Logo" className="h-12" />
                <p className="text-xs text-muted-foreground mt-1">{COMPANY_INFO.address}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">
                  {replacePlaceholders(report.title, placeholderMap)}
                </div>
                <div className="text-lg font-semibold">{ticket.ticket_number}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(), 'dd.MM.yyyy', { locale: de })}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary">
                {STATUS_LABELS[ticket.status as TicketStatus]}
              </span>
            </div>

            {report.intro && (
              <p className="intro-text text-sm text-muted-foreground mb-4">
                {replacePlaceholders(report.intro, placeholderMap)}
              </p>
            )}

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

            <div className="section mb-6">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                Durchgeführte Arbeiten
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Reparatur</div>
                  <div className="font-medium">{ERROR_CODE_LABELS[ticket.error_code as ErrorCode]}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Beschreibung</div>
                  <div className="font-medium">{ticket.error_description_text || 'Standard-Reparatur durchgeführt'}</div>
                </div>
              </div>
            </div>

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
                    </tr>
                  </thead>
                  <tbody>
                    {partUsage.map((usage: any) => (
                      <tr key={usage.id} className="border-b">
                        <td className="py-2">{usage.part?.name}</td>
                        <td className="py-2 text-center">{usage.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <ConditionsBlock text={report.conditions} />

            <div className="mt-8 pt-4 border-t">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="border-t border-foreground pt-2 text-xs text-muted-foreground">
                    Unterschrift Techniker
                  </div>
                </div>
                <div>
                  <div className="border-t border-foreground pt-2 text-xs text-muted-foreground">
                    Datum
                  </div>
                </div>
              </div>
              <FooterText text={report.footer} />
            </div>
            <CompanyFooter />
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
              <div>
                <img src={telyaLogo} alt="Telya Logo" className="h-12" />
                <p className="text-xs text-muted-foreground mt-1">{COMPANY_INFO.address}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">
                  {replacePlaceholders(delivery.title, placeholderMap)}
                </div>
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

            {delivery.intro && (
              <p className="intro-text text-sm text-muted-foreground mb-4">
                {replacePlaceholders(delivery.intro, placeholderMap)}
              </p>
            )}

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
                    <span className="text-muted-foreground">Reparaturkosten</span>
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
                {ticket.location?.phone && <div className="text-sm text-muted-foreground">Tel: {ticket.location?.phone}</div>}
              </div>

              <div className="section">
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                  Rückgabe Zubehör
                </div>
                <div className="font-medium">{ticket.accessories || 'Kein Zubehör'}</div>
              </div>
            </div>

            <ConditionsBlock text={delivery.conditions} />

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
              <FooterText text={delivery.footer} />
            </div>
            <CompanyFooter />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
