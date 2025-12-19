import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer, Loader2 } from 'lucide-react';
import { useDocumentTemplate } from '@/hooks/useDocumentTemplates';
import { PDF_STYLES, generatePdfFilename } from '@/lib/pdf-styles';
import { 
  IntakeDocument, 
  KvaDocument, 
  RepairReportDocument, 
  DeliveryNoteDocument 
} from './PdfDocumentTemplate';
import ThermalReceipt from './ThermalReceipt';

interface TicketDocumentsProps {
  ticket: any;
  partUsage?: any[];
}

export default function TicketDocuments({ ticket, partUsage }: TicketDocumentsProps) {
  const intakeRef = useRef<HTMLDivElement>(null);
  const kvaRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  // Fetch templates (for future customization)
  const { isLoading: intakeLoading } = useDocumentTemplate('EINGANGSBELEG');
  const { isLoading: kvaLoading } = useDocumentTemplate('KVA');
  const { isLoading: reportLoading } = useDocumentTemplate('REPARATURBERICHT');
  const { isLoading: deliveryLoading } = useDocumentTemplate('LIEFERSCHEIN');

  // Print via dedicated iframe for correct PDF filename
  const handlePrint = (
    ref: React.RefObject<HTMLDivElement>,
    docType: 'eingangsbeleg' | 'kva' | 'reparaturbericht' | 'lieferschein'
  ) => {
    if (!ref.current) return;

    const ticketNumber = ticket.ticket_number || 'Auftrag';
    const pdfFilename = generatePdfFilename(docType, ticketNumber);

    const originalTitle = document.title;
    document.title = pdfFilename;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.left = '-9999px';
    iframe.src = 'about:blank';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.title = originalTitle;
      document.body.removeChild(iframe);
      return;
    }

    const cleanup = () => {
      document.title = originalTitle;
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>${PDF_STYLES}</style>
        </head>
        <body>
          ${ref.current.outerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(cleanup, 4000);
    }, 150);
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
      {/* Eingangsbeleg / Reparaturbegleitschein */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Reparaturbegleitschein
          </CardTitle>
          <div className="flex gap-2">
            <ThermalReceipt ticket={ticket} />
            <Button size="sm" variant="outline" onClick={() => handlePrint(intakeRef, 'eingangsbeleg')}>
              <Printer className="h-4 w-4 mr-2" />
              PDF drucken
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={intakeRef} className="bg-white p-4 rounded-lg border overflow-auto max-h-[500px]">
            <IntakeDocument ticket={ticket} partUsage={partUsage} />
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
            PDF drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={kvaRef} className="bg-white p-4 rounded-lg border overflow-auto max-h-[500px]">
            <KvaDocument ticket={ticket} partUsage={partUsage} />
          </div>
        </CardContent>
      </Card>

      {/* Reparaturbericht */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Reparaturbericht
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(reportRef, 'reparaturbericht')}>
            <Printer className="h-4 w-4 mr-2" />
            PDF drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={reportRef} className="bg-white p-4 rounded-lg border overflow-auto max-h-[500px]">
            <RepairReportDocument ticket={ticket} partUsage={partUsage} />
          </div>
        </CardContent>
      </Card>

      {/* Lieferschein */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lieferschein / Abholbeleg
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(deliveryRef, 'lieferschein')}>
            <Printer className="h-4 w-4 mr-2" />
            PDF drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={deliveryRef} className="bg-white p-4 rounded-lg border overflow-auto max-h-[500px]">
            <DeliveryNoteDocument ticket={ticket} partUsage={partUsage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
