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
  street: TELYA_ADDRESS.street,
  zip: TELYA_ADDRESS.zip,
  city: TELYA_ADDRESS.city,
  fullAddress: `${TELYA_ADDRESS.street}, ${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}`,
  phone: TELYA_ADDRESS.phone,
  email: TELYA_ADDRESS.email,
  website: 'www.repariert.de',
  hrb: TELYA_ADDRESS.hrb,
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

  // Unified print strategy with proper filenames
  const PRINT_ROOT_ID = 'telya-print-root';

  const handlePrint = (ref: React.RefObject<HTMLDivElement>, docType: 'eingangsbeleg' | 'kva' | 'reparaturbericht' | 'lieferschein') => {
    if (!ref.current) return;

    // Set document title for PDF filename
    const ticketNumber = ticket.ticket_number || 'Auftrag';
    const filenameMap = {
      'eingangsbeleg': `Eingangsbeleg-${ticketNumber}`,
      'kva': `KVA-${ticketNumber}`,
      'reparaturbericht': `Reparaturbericht-${ticketNumber}`,
      'lieferschein': `Lieferschein-${ticketNumber}`
    };
    const originalTitle = document.title;
    document.title = filenameMap[docType];

    let printRoot = document.getElementById(PRINT_ROOT_ID);
    if (!printRoot) {
      printRoot = document.createElement('div');
      printRoot.id = PRINT_ROOT_ID;
      document.body.appendChild(printRoot);
    }

    printRoot.innerHTML = '';
    printRoot.appendChild(ref.current.cloneNode(true));

    const cleanup = () => {
      document.body.classList.remove('telya-printing');
      document.title = originalTitle;
      const root = document.getElementById(PRINT_ROOT_ID);
      if (root) root.innerHTML = '';
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    document.body.classList.add('telya-printing');
    window.print();
  };

  const totalPartsPrice = partUsage?.reduce((sum: number, p: any) => sum + (p.unit_sales_price || 0) * p.quantity, 0) || 0;

  // Compact Document Header with Telya branding
  const DocumentHeader = ({ title, ticketNumber, date }: { title: string; ticketNumber: string; date: string }) => (
    <div className="doc-header flex justify-between items-start mb-4 pb-3 border-b border-primary/30">
      <div className="flex items-start gap-3">
        <img src={telyaLogo} alt="Telya" className="h-10 w-10 object-contain rounded-full" />
        <div className="text-[9px] text-muted-foreground leading-tight">
          <div className="font-semibold text-foreground">{COMPANY_INFO.name}</div>
          <div>{COMPANY_INFO.fullAddress}</div>
          <div>Tel: {COMPANY_INFO.phone} · {COMPANY_INFO.email}</div>
          {ticket.location?.name && (
            <div className="font-medium text-primary">Filiale: {ticket.location.name}</div>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="text-base font-bold text-primary leading-tight">{title}</div>
        <div className="text-sm font-semibold">{ticketNumber}</div>
        <div className="text-[10px] text-muted-foreground">{date}</div>
      </div>
    </div>
  );

  // Compact Company Footer (single line)
  const CompanyFooter = () => (
    <div className="doc-footer mt-4 pt-2 border-t text-center text-[8px] text-muted-foreground leading-tight">
      {COMPANY_INFO.name} · {COMPANY_INFO.fullAddress} · {COMPANY_INFO.hrb} · USt-IdNr. {COMPANY_INFO.ust_id} · {COMPANY_INFO.website}
    </div>
  );

  // Compact Conditions Block (smaller, fixed height)
  const ConditionsBlock = ({ text }: { text: string | null }) => {
    if (!text) return null;
    const processedText = replacePlaceholders(text, placeholderMap);
    return (
      <div className="conditions-block mt-2 p-2 bg-muted/20 rounded text-[8px] text-muted-foreground whitespace-pre-wrap leading-[1.3] max-h-[70px] overflow-hidden">
        <div className="font-semibold text-[9px] mb-1">Wichtige Hinweise</div>
        {processedText}
      </div>
    );
  };

  const FooterText = ({ text }: { text: string | null }) => {
    if (!text) return null;
    const processedText = replacePlaceholders(text, placeholderMap);
    return (
      <p className="footer-text text-[8px] text-muted-foreground italic mt-2">
        {processedText}
      </p>
    );
  };

  // Compact Section Header
  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[9px] font-semibold text-primary uppercase tracking-wide mb-1.5 pb-1 border-b border-primary/20">
      {children}
    </div>
  );

  // Compact Data Row
  const DataRow = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="mb-0.5">
      <span className="text-[8px] text-muted-foreground">{label}: </span>
      <span className={`text-[10px] font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );

  const isLoading = intakeLoading || kvaLoading || reportLoading || deliveryLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          html, body { height: initial !important; overflow: initial !important; font-size: 10px !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          body.telya-printing > :not(#telya-print-root) { display: none !important; }
          body.telya-printing #telya-print-root { display: block !important; }

          body.telya-printing #telya-print-root { position: relative; width: 100%; }
          body.telya-printing #telya-print-root .document { 
            padding: 4mm !important;
            font-size: 9px !important;
          }
          body.telya-printing #telya-print-root .doc-header { 
            margin-bottom: 3mm !important;
            padding-bottom: 2mm !important;
          }
          body.telya-printing #telya-print-root .conditions-block { 
            font-size: 7px !important; 
            line-height: 1.2 !important;
            max-height: 60px !important;
            overflow: hidden !important;
            padding: 4px !important;
            margin-top: 4px !important;
          }
          body.telya-printing #telya-print-root .doc-footer { 
            font-size: 7px !important;
            margin-top: 4px !important;
            padding-top: 4px !important;
          }
          body.telya-printing #telya-print-root .footer-text {
            font-size: 7px !important;
            margin-top: 4px !important;
          }
          body.telya-printing #telya-print-root .section-header {
            font-size: 8px !important;
          }
          body.telya-printing #telya-print-root table {
            font-size: 8px !important;
          }
          body.telya-printing #telya-print-root table th,
          body.telya-printing #telya-print-root table td {
            padding: 2px 4px !important;
          }
        }
      `}</style>
      <div className="space-y-6">
      {/* Eingangsbeleg (Intake Receipt) */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Eingangsbeleg
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(intakeRef, 'eingangsbeleg')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={intakeRef} className="document bg-white p-4 rounded-lg border text-[10px]">
            <DocumentHeader 
              title={replacePlaceholders(intake.title, placeholderMap)}
              ticketNumber={ticket.ticket_number}
              date={format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
            />

            {intake.intro && (
              <p className="text-[9px] text-muted-foreground mb-3">
                {replacePlaceholders(intake.intro, placeholderMap)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <SectionHeader>Kundendaten</SectionHeader>
                <DataRow label="Name" value={`${ticket.customer?.first_name} ${ticket.customer?.last_name}`} />
                <DataRow label="Telefon" value={ticket.customer?.phone} />
                {ticket.customer?.email && <DataRow label="E-Mail" value={ticket.customer?.email} />}
                {ticket.customer?.address && <DataRow label="Adresse" value={ticket.customer?.address} />}
              </div>

              <div>
                <SectionHeader>Gerätedaten</SectionHeader>
                <DataRow label="Gerät" value={`${ticket.device?.brand} ${ticket.device?.model}`} />
                <DataRow label="Typ" value={DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType]} />
                {ticket.device?.imei_or_serial && (
                  <DataRow label="IMEI/SN" value={ticket.device?.imei_or_serial} mono />
                )}
                {ticket.device?.color && <DataRow label="Farbe" value={ticket.device?.color} />}
              </div>
            </div>

            <div className="mb-3">
              <SectionHeader>Fehlerbeschreibung</SectionHeader>
              <DataRow label="Fehlercode" value={ERROR_CODE_LABELS[ticket.error_code as ErrorCode]} />
              <DataRow label="Beschreibung" value={ticket.error_description_text || 'Keine Beschreibung'} />
              {ticket.accessories && <DataRow label="Zubehör" value={ticket.accessories} />}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <SectionHeader>Benachrichtigungen</SectionHeader>
                <div className="text-[9px]">
                  E-Mail: <span className="font-medium">{ticket.email_opt_in ? 'Ja' : 'Nein'}</span> · 
                  SMS: <span className="font-medium">{ticket.sms_opt_in ? 'Ja' : 'Nein'}</span>
                </div>
              </div>
              <div>
                <SectionHeader>Preismodus</SectionHeader>
                <div className="text-[9px] font-medium">
                  {ticket.price_mode === 'FIXPREIS' ? 'Festpreis' : ticket.price_mode === 'KVA' ? 'Nach Kostenvoranschlag' : 'Nach Aufwand'}
                </div>
              </div>
            </div>

            <ConditionsBlock text={intake.conditions} />

            <div className="mt-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="border-t border-foreground pt-1 text-[8px] text-muted-foreground mt-6">
                    Unterschrift Kunde
                  </div>
                </div>
                <div>
                  <div className="border-t border-foreground pt-1 text-[8px] text-muted-foreground mt-6">
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
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Kostenvoranschlag (KVA)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(kvaRef, 'kva')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={kvaRef} className="document bg-white p-4 rounded-lg border text-[10px]">
            <DocumentHeader 
              title={replacePlaceholders(kva.title, placeholderMap)}
              ticketNumber={ticket.ticket_number}
              date={format(new Date(), 'dd.MM.yyyy', { locale: de })}
            />

            {kva.intro && (
              <p className="text-[9px] text-muted-foreground mb-3">
                {replacePlaceholders(kva.intro, placeholderMap)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <SectionHeader>Kunde</SectionHeader>
                <DataRow label="Name" value={`${ticket.customer?.first_name} ${ticket.customer?.last_name}`} />
                <DataRow label="Telefon" value={ticket.customer?.phone} />
                {ticket.customer?.email && <DataRow label="E-Mail" value={ticket.customer?.email} />}
              </div>

              <div>
                <SectionHeader>Gerät</SectionHeader>
                <DataRow label="Gerät" value={`${ticket.device?.brand} ${ticket.device?.model}`} />
                <DataRow label="Typ" value={DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType]} />
                {ticket.device?.imei_or_serial && (
                  <DataRow label="IMEI/SN" value={ticket.device?.imei_or_serial} mono />
                )}
              </div>
            </div>

            <div className="mb-3">
              <SectionHeader>Fehlerbeschreibung / Geplante Arbeiten</SectionHeader>
              <DataRow label="Defekt" value={ERROR_CODE_LABELS[ticket.error_code as ErrorCode]} />
              <DataRow label="Beschreibung" value={ticket.error_description_text || 'Keine Beschreibung'} />
            </div>

            <div className="mb-3">
              <SectionHeader>Kostenaufstellung</SectionHeader>
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 font-semibold">Position</th>
                    <th className="text-center py-1 font-semibold w-12">Menge</th>
                    <th className="text-right py-1 font-semibold w-20">Einzelpreis</th>
                    <th className="text-right py-1 font-semibold w-20">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-1">Reparaturarbeiten ({ERROR_CODE_LABELS[ticket.error_code as ErrorCode]})</td>
                    <td className="py-1 text-center">1</td>
                    <td className="py-1 text-right">{(ticket.estimated_price || 0).toFixed(2)} €</td>
                    <td className="py-1 text-right">{(ticket.estimated_price || 0).toFixed(2)} €</td>
                  </tr>
                  {partUsage && partUsage.length > 0 && partUsage.map((usage: any) => (
                    <tr key={usage.id} className="border-b">
                      <td className="py-1">{usage.part?.name}</td>
                      <td className="py-1 text-center">{usage.quantity}</td>
                      <td className="py-1 text-right">{(usage.unit_sales_price || 0).toFixed(2)} €</td>
                      <td className="py-1 text-right">{((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-muted/30">
                    <td colSpan={3} className="py-1 text-right">Gesamtbetrag (inkl. MwSt.):</td>
                    <td className="py-1 text-right">{((ticket.estimated_price || 0) + totalPartsPrice).toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-3 p-2 bg-muted/20 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-medium">KVA Status</div>
                  <div className="text-[8px] text-muted-foreground">
                    {ticket.kva_approved === true ? 'Vom Kunden angenommen' : ticket.kva_approved === false ? 'Vom Kunden abgelehnt' : 'Ausstehend'}
                  </div>
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                  ticket.kva_approved === true ? 'bg-success/10 text-success' : 
                  ticket.kva_approved === false ? 'bg-destructive/10 text-destructive' : 
                  'bg-warning/10 text-warning'
                }`}>
                  {ticket.kva_approved === true ? 'Angenommen' : ticket.kva_approved === false ? 'Abgelehnt' : 'Offen'}
                </span>
              </div>
            </div>

            <ConditionsBlock text={kva.conditions} />

            <div className="mt-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[8px] text-muted-foreground mb-4">
                    [ ] KVA angenommen · [ ] KVA abgelehnt · [ ] Gerät entsorgen
                  </div>
                  <div className="border-t border-foreground pt-1 text-[8px] text-muted-foreground">
                    Unterschrift Kunde
                  </div>
                </div>
                <div>
                  <div className="h-4" />
                  <div className="border-t border-foreground pt-1 text-[8px] text-muted-foreground mt-4">
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
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Reparaturbericht
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(reportRef, 'reparaturbericht')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={reportRef} className="document bg-white p-4 rounded-lg border text-[10px]">
            <DocumentHeader 
              title={replacePlaceholders(report.title, placeholderMap)}
              ticketNumber={ticket.ticket_number}
              date={format(new Date(), 'dd.MM.yyyy', { locale: de })}
            />

            <div className="mb-3">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                ticket.status === 'FERTIG_ZUR_ABHOLUNG' || ticket.status === 'ABGEHOLT' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {STATUS_LABELS[ticket.status as TicketStatus]}
              </span>
            </div>

            {report.intro && (
              <p className="text-[9px] text-muted-foreground mb-3">
                {replacePlaceholders(report.intro, placeholderMap)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <SectionHeader>Kundendaten</SectionHeader>
                <DataRow label="Name" value={`${ticket.customer?.first_name} ${ticket.customer?.last_name}`} />
                <DataRow label="Telefon" value={ticket.customer?.phone} />
              </div>

              <div>
                <SectionHeader>Gerätedaten</SectionHeader>
                <DataRow label="Gerät" value={`${ticket.device?.brand} ${ticket.device?.model}`} />
                {ticket.device?.imei_or_serial && (
                  <DataRow label="IMEI/SN" value={ticket.device?.imei_or_serial} mono />
                )}
              </div>
            </div>

            <div className="mb-3">
              <SectionHeader>Durchgeführte Arbeiten</SectionHeader>
              <DataRow label="Reparatur" value={ERROR_CODE_LABELS[ticket.error_code as ErrorCode]} />
              <DataRow label="Beschreibung" value={ticket.error_description_text || 'Standard-Reparatur durchgeführt'} />
            </div>

            {partUsage && partUsage.length > 0 && (
              <div className="mb-3">
                <SectionHeader>Verwendete Ersatzteile</SectionHeader>
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 font-semibold">Artikel</th>
                      <th className="text-center py-1 font-semibold w-16">Menge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partUsage.map((usage: any) => (
                      <tr key={usage.id} className="border-b">
                        <td className="py-1">{usage.part?.name}</td>
                        <td className="py-1 text-center">{usage.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <ConditionsBlock text={report.conditions} />

            <div className="mt-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="border-t border-foreground pt-1 text-[8px] text-muted-foreground mt-6">
                    Unterschrift Techniker
                  </div>
                </div>
                <div>
                  <div className="border-t border-foreground pt-1 text-[8px] text-muted-foreground mt-6">
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
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lieferschein / Abholbeleg
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(deliveryRef, 'lieferschein')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={deliveryRef} className="document bg-white p-4 rounded-lg border text-[10px]">
            <DocumentHeader 
              title={replacePlaceholders(delivery.title, placeholderMap)}
              ticketNumber={ticket.ticket_number}
              date={format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}
            />

            <div className="mb-3">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                ticket.status === 'ABGEHOLT' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {STATUS_LABELS[ticket.status as TicketStatus]}
              </span>
            </div>

            {delivery.intro && (
              <p className="text-[9px] text-muted-foreground mb-3">
                {replacePlaceholders(delivery.intro, placeholderMap)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <SectionHeader>Kundendaten</SectionHeader>
                <DataRow label="Name" value={`${ticket.customer?.first_name} ${ticket.customer?.last_name}`} />
                <DataRow label="Telefon" value={ticket.customer?.phone} />
              </div>

              <div>
                <SectionHeader>Gerätedaten</SectionHeader>
                <DataRow label="Gerät" value={`${ticket.device?.brand} ${ticket.device?.model}`} />
                {ticket.device?.imei_or_serial && (
                  <DataRow label="IMEI/SN" value={ticket.device?.imei_or_serial} mono />
                )}
              </div>
            </div>

            {partUsage && partUsage.length > 0 && (
              <div className="mb-3">
                <SectionHeader>Verwendete Ersatzteile</SectionHeader>
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 font-semibold">Artikel</th>
                      <th className="text-center py-1 font-semibold w-12">Menge</th>
                      <th className="text-right py-1 font-semibold w-20">Einzelpreis</th>
                      <th className="text-right py-1 font-semibold w-20">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partUsage.map((usage: any) => (
                      <tr key={usage.id} className="border-b">
                        <td className="py-1">{usage.part?.name}</td>
                        <td className="py-1 text-center">{usage.quantity}</td>
                        <td className="py-1 text-right">{(usage.unit_sales_price || 0).toFixed(2)} €</td>
                        <td className="py-1 text-right">{((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-muted/30">
                      <td colSpan={3} className="py-1 text-right">Teile gesamt:</td>
                      <td className="py-1 text-right">{totalPartsPrice.toFixed(2)} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="mb-3">
              <SectionHeader>Preisübersicht</SectionHeader>
              <div className="space-y-0.5 text-[9px]">
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
                <Separator className="my-1" />
                <div className="flex justify-between text-[11px] font-semibold">
                  <span>Gesamtbetrag</span>
                  <span>{((ticket.final_price || ticket.estimated_price || 0) + totalPartsPrice).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <SectionHeader>Abholstandort</SectionHeader>
                <div className="text-[9px]">
                  <div className="font-medium">{ticket.location?.name}</div>
                  <div className="text-muted-foreground">{ticket.location?.address}</div>
                  {ticket.location?.phone && <div className="text-muted-foreground">Tel: {ticket.location?.phone}</div>}
                </div>
              </div>

              <div>
                <SectionHeader>Rückgabe Zubehör</SectionHeader>
                <div className="text-[9px] font-medium">{ticket.accessories || 'Kein Zubehör'}</div>
              </div>
            </div>

            <ConditionsBlock text={delivery.conditions} />

            <div className="mt-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="border-t border-foreground pt-1 text-[8px] text-muted-foreground mt-6">
                    Unterschrift Kunde (Gerät erhalten)
                  </div>
                </div>
                <div>
                  <div className="border-t border-foreground pt-1 text-[8px] text-muted-foreground mt-6">
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
    </>
  );
}
