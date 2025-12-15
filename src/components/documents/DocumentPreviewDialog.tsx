import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentTemplate } from '@/hooks/useDocumentTemplates';
import { 
  buildPlaceholderMap, 
  replacePlaceholders,
  DOCUMENT_TYPE_LABELS 
} from '@/lib/document-placeholders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Printer, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import telyaLogo from '@/assets/telya-logo.png';
import { TELYA_ADDRESS } from '@/types/b2b';

// Company Information
const COMPANY_INFO = {
  name: TELYA_ADDRESS.name,
  fullAddress: `${TELYA_ADDRESS.street}, ${TELYA_ADDRESS.zip} ${TELYA_ADDRESS.city}`,
  phone: TELYA_ADDRESS.phone,
  email: TELYA_ADDRESS.email,
  website: 'www.repariert.de',
  hrb: TELYA_ADDRESS.hrb,
  ust_id: TELYA_ADDRESS.vatId,
};

// Simple Markdown renderer for bold, bullets, and line breaks
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Check for bullet points
    const bulletMatch = line.match(/^[-•]\s*(.*)$/);
    const numberedMatch = line.match(/^(\d+)\.\s*(.*)$/);
    
    let content = bulletMatch ? bulletMatch[1] : numberedMatch ? numberedMatch[2] : line;
    
    // Process bold text (**text**)
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`bold-${lineIndex}-${match.index}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    const processedContent = parts.length > 0 ? parts : content;
    
    if (bulletMatch) {
      return (
        <div key={lineIndex} className="flex items-start gap-1 ml-2">
          <span className="text-primary">•</span>
          <span>{processedContent}</span>
        </div>
      );
    }
    
    if (numberedMatch) {
      return (
        <div key={lineIndex} className="flex items-start gap-1 ml-2">
          <span className="font-medium min-w-[1rem]">{numberedMatch[1]}.</span>
          <span>{processedContent}</span>
        </div>
      );
    }
    
    if (line.trim() === '') {
      return <div key={lineIndex} className="h-1" />;
    }
    
    return <div key={lineIndex}>{processedContent}</div>;
  });
}

interface DocumentPreviewDialogProps {
  type: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentPreviewDialog({ 
  type, 
  open, 
  onOpenChange 
}: DocumentPreviewDialogProps) {
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const { data: template, isLoading: templateLoading } = useDocumentTemplate(type || '');

  // Fetch most recent ticket or selected ticket
  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ['preview-ticket', selectedTicketId],
    queryFn: async () => {
      let query = supabase
        .from('repair_tickets')
        .select(`
          *,
          customer:customers(*),
          device:devices(*),
          location:locations(*)
        `);
      
      if (selectedTicketId) {
        query = query.eq('id', selectedTicketId);
      } else {
        query = query.order('created_at', { ascending: false }).limit(1);
      }
      
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!type,
  });

  // Search tickets
  const { data: searchResults } = useQuery({
    queryKey: ['ticket-search', ticketSearch],
    queryFn: async () => {
      if (!ticketSearch || ticketSearch.length < 2) return [];
      
      const { data, error } = await supabase
        .from('repair_tickets')
        .select('id, ticket_number, created_at')
        .ilike('ticket_number', `%${ticketSearch}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: ticketSearch.length >= 2,
  });

  const handlePrint = () => {
    if (!previewRef.current) return;

    const ticketNumber = ticket?.ticket_number || 'Dokument';
    const typeMap: Record<string, string> = {
      EINGANGSBELEG: 'Eingangsbeleg',
      KVA: 'KVA',
      REPARATURBERICHT: 'Reparaturbericht',
      LIEFERSCHEIN: 'Lieferschein',
    };

    const docName = typeMap[type || ''] || 'Dokument';
    const pdfFilename = `${docName}-${ticketNumber}`;

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

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            ${styles}
            @page { size: A4; margin: 8mm; }
            html, body { margin: 0; padding: 0; font-size: 10px; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .document { padding: 4mm; font-size: 9px; }
            .doc-header { margin-bottom: 3mm; padding-bottom: 2mm; }
            .conditions {
              font-size: 6.5px !important;
              line-height: 1.15 !important;
              max-height: 100px !important;
              overflow: hidden !important;
              padding: 4px !important;
              margin-top: 4px !important;
            }
            .doc-footer { font-size: 7px; margin-top: 4px; padding-top: 4px; }
            .footer-text { font-size: 7px; margin-top: 4px; }
            table { font-size: 8px; }
            table th, table td { padding: 2px 4px; }
          </style>
        </head>
        <body>
          ${previewRef.current.outerHTML}
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

  const isLoading = templateLoading || ticketLoading;

  // Build placeholder map and replace placeholders in template
  const placeholderMap = ticket ? buildPlaceholderMap({ ticket }) : {};
  const processedTitle = template ? replacePlaceholders(template.title, placeholderMap) : '';
  const processedIntro = template?.intro ? replacePlaceholders(template.intro, placeholderMap) : '';
  const processedConditions = template?.conditions ? replacePlaceholders(template.conditions, placeholderMap) : '';
  const processedFooter = template?.footer ? replacePlaceholders(template.footer, placeholderMap) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          html, body { height: initial !important; overflow: initial !important; font-size: 9px !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          body.telya-printing > :not(#telya-print-root) { display: none !important; }
          body.telya-printing #telya-print-root { display: block !important; }

          body.telya-printing #telya-print-root { position: relative; width: 100%; }
          body.telya-printing #telya-print-root .document { padding: 4mm !important; }
          body.telya-printing #telya-print-root .doc-header { 
            margin-bottom: 3mm !important;
            padding-bottom: 2mm !important;
          }
          body.telya-printing #telya-print-root .conditions { 
            font-size: 7px !important; 
            line-height: 1.2 !important;
            max-height: 70px !important;
            overflow: hidden !important;
            padding: 4px !important;
          }
          body.telya-printing #telya-print-root .doc-footer { 
            font-size: 7px !important;
            margin-top: 4px !important;
          }
        }
      `}</style>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vorschau: {type && DOCUMENT_TYPE_LABELS[type]}
          </DialogTitle>
          <DialogDescription>
            Vorschau des Dokuments mit Beispieldaten aus einem Auftrag
          </DialogDescription>
        </DialogHeader>

        {/* Ticket Selector */}
        <div className="flex items-end gap-4 pb-4 border-b">
          <div className="flex-1">
            <Label htmlFor="ticket-search" className="text-sm">
              Auftrag für Vorschau auswählen
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="ticket-search"
                placeholder="Auftragsnummer suchen..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="pl-9"
              />
              {searchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {searchResults.map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        setTicketSearch('');
                      }}
                    >
                      <span className="font-medium">{t.ticket_number}</span>
                      <span className="text-muted-foreground ml-2">
                        ({format(new Date(t.created_at), 'dd.MM.yyyy', { locale: de })})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
            <Printer className="h-4 w-4 mr-2" />
            Drucken
          </Button>
        </div>

        {/* Preview Content - A4 Page Preview */}
        <ScrollArea className="flex-1 bg-muted/30">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ticket ? (
            <div className="flex flex-col items-center py-4">
              {/* A4 Info Label */}
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium">A4</span>
                <span>Druckvorschau mit 8mm Rändern (gestrichelte Linie)</span>
              </div>
              {/* A4 Page Container - 210mm x 297mm ratio, scaled to fit */}
              <div className="a4-page bg-white shadow-lg border border-gray-300 relative" 
                   style={{ 
                     width: '210mm', 
                     minHeight: '297mm',
                     maxWidth: '100%'
                   }}>
                {/* A4 Margin Indicator */}
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-blue-300 m-[8mm]" />
                {/* Document Content */}
                <div ref={previewRef} className="document p-[8mm] text-[10px]">
                  {/* Compact Header */}
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
                      <div className="text-base font-bold text-primary leading-tight">{processedTitle}</div>
                      <div className="text-sm font-semibold">{ticket.ticket_number}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </div>
                    </div>
                  </div>

                  {/* Intro */}
                  {processedIntro && (
                    <div className="text-[9px] text-muted-foreground mb-3">
                      {processedIntro}
                    </div>
                  )}

                  {/* Customer & Device Data */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-[9px] font-semibold text-primary uppercase tracking-wide mb-1.5 pb-1 border-b border-primary/20">
                        Kundendaten
                      </div>
                      <div className="space-y-0.5">
                        <div className="mb-0.5">
                          <span className="text-[8px] text-muted-foreground">Name: </span>
                          <span className="text-[10px] font-medium">
                            {ticket.customer?.first_name} {ticket.customer?.last_name}
                          </span>
                        </div>
                        <div className="mb-0.5">
                          <span className="text-[8px] text-muted-foreground">Telefon: </span>
                          <span className="text-[10px] font-medium">{ticket.customer?.phone}</span>
                        </div>
                        {ticket.customer?.email && (
                          <div className="mb-0.5">
                            <span className="text-[8px] text-muted-foreground">E-Mail: </span>
                            <span className="text-[10px] font-medium">{ticket.customer?.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] font-semibold text-primary uppercase tracking-wide mb-1.5 pb-1 border-b border-primary/20">
                        Gerätedaten
                      </div>
                      <div className="space-y-0.5">
                        <div className="mb-0.5">
                          <span className="text-[8px] text-muted-foreground">Gerät: </span>
                          <span className="text-[10px] font-medium">
                            {ticket.device?.brand} {ticket.device?.model}
                          </span>
                        </div>
                        {ticket.device?.imei_or_serial && (
                          <div className="mb-0.5">
                            <span className="text-[8px] text-muted-foreground">IMEI/SN: </span>
                            <span className="text-[10px] font-medium font-mono">
                              {ticket.device?.imei_or_serial}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conditions - Fixed height with header */}
                  {processedConditions && (
                    <div className="conditions bg-muted/20 p-2 rounded text-[8px] leading-[1.3] max-h-[70px] overflow-hidden mt-2">
                      <div className="font-semibold text-[9px] mb-1">Wichtige Hinweise</div>
                      <div className="space-y-0.5">
                        {renderMarkdown(processedConditions)}
                      </div>
                    </div>
                  )}

                  {/* Footer Text */}
                  {processedFooter && (
                    <p className="text-[8px] text-muted-foreground italic mt-2">
                      {processedFooter}
                    </p>
                  )}

                  {/* Compact Company Footer */}
                  <div className="doc-footer mt-4 pt-2 border-t text-center text-[8px] text-muted-foreground leading-tight">
                    {COMPANY_INFO.name} · {COMPANY_INFO.fullAddress} · {COMPANY_INFO.hrb} · USt-IdNr. {COMPANY_INFO.ust_id} · {COMPANY_INFO.website}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>Keine Aufträge vorhanden für Vorschau</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
