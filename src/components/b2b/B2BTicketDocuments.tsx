import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer } from 'lucide-react';
import { PDF_STYLES, generatePdfFilename } from '@/lib/pdf-styles';
import { 
  IntakeDocument, 
  RepairReportDocument, 
  DeliveryNoteDocument 
} from '@/components/documents/PdfDocumentTemplate';

interface B2BTicketDocumentsProps {
  ticket: any;
  partUsage?: any[];
}

/**
 * B2B-specific document view - simplified version of TicketDocuments
 * Shows Eingangsbeleg, Reparaturbericht, and Lieferschein (no KVA for B2B)
 */
export default function B2BTicketDocuments({ ticket, partUsage }: B2BTicketDocumentsProps) {
  const intakeRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  // Print via dedicated iframe for correct PDF filename
  const handlePrint = (
    ref: React.RefObject<HTMLDivElement>,
    docType: 'eingangsbeleg' | 'reparaturbericht' | 'lieferschein'
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

  return (
    <div className="space-y-4">
      {/* Eingangsbeleg / Reparaturbegleitschein */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Reparaturbegleitschein
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => handlePrint(intakeRef, 'eingangsbeleg')}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </CardHeader>
        <CardContent>
          <div ref={intakeRef} className="bg-white p-4 rounded-lg border overflow-auto max-h-[400px] text-sm">
            <IntakeDocument ticket={ticket} partUsage={partUsage} />
          </div>
        </CardContent>
      </Card>

      {/* Reparaturbericht - only show if status is beyond diagnosis */}
      {['IN_REPARATUR', 'FERTIG_ZUR_ABHOLUNG', 'ABGEHOLT', 'RUECKVERSAND_AN_B2B', 'RUECKVERSAND_AN_ENDKUNDE'].includes(ticket.status) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Reparaturbericht
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => handlePrint(reportRef, 'reparaturbericht')}>
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={reportRef} className="bg-white p-4 rounded-lg border overflow-auto max-h-[400px] text-sm">
              <RepairReportDocument ticket={ticket} partUsage={partUsage} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lieferschein - only show if ready for pickup/shipped */}
      {['FERTIG_ZUR_ABHOLUNG', 'ABGEHOLT', 'RUECKVERSAND_AN_B2B', 'RUECKVERSAND_AN_ENDKUNDE'].includes(ticket.status) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Lieferschein
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => handlePrint(deliveryRef, 'lieferschein')}>
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={deliveryRef} className="bg-white p-4 rounded-lg border overflow-auto max-h-[400px] text-sm">
              <DeliveryNoteDocument ticket={ticket} partUsage={partUsage} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
