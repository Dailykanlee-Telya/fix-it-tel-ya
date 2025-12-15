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
        <div key={lineIndex} className="flex items-start gap-2 ml-4">
          <span className="text-primary mt-1">•</span>
          <span>{processedContent}</span>
        </div>
      );
    }
    
    if (numberedMatch) {
      return (
        <div key={lineIndex} className="flex items-start gap-2 ml-4">
          <span className="font-medium min-w-[1.5rem]">{numberedMatch[1]}.</span>
          <span>{processedContent}</span>
        </div>
      );
    }
    
    if (line.trim() === '') {
      return <div key={lineIndex} className="h-2" />;
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

  const handlePrint = async () => {
    if (!previewRef.current) return;
    
    // Convert logo to base64 for print
    const logoBase64 = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = telyaLogo;
    });
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Replace img src with base64
    let content = previewRef.current.innerHTML;
    content = content.replace(/src="[^"]*telya-logo[^"]*"/g, `src="${logoBase64}"`);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template?.title || 'Dokument'}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { 
              width: 210mm;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
              color: #1a1a1a; 
              font-size: 11px; 
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .document { 
              width: 100%;
              padding: 0;
            }
            
            /* Header */
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 20px; 
              padding-bottom: 12px; 
              border-bottom: 2px solid #1e40af; 
            }
            .header img { height: 40px; display: block; }
            
            .text-right { text-align: right; }
            .text-xl { font-size: 18px; }
            .text-lg { font-size: 14px; }
            .text-sm { font-size: 11px; }
            .text-xs { font-size: 9px; }
            .text-\\[10px\\] { font-size: 9px; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-mono { font-family: 'Courier New', monospace; }
            .text-primary { color: #1e40af; }
            .text-muted-foreground { color: #666; }
            
            /* Grid */
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr; }
            .gap-6 { gap: 20px; }
            .gap-2 { gap: 6px; }
            .space-y-2 > * + * { margin-top: 6px; }
            .space-y-1 > * + * { margin-top: 4px; }
            
            /* Margins */
            .mb-6 { margin-bottom: 20px; }
            .mb-4 { margin-bottom: 14px; }
            .mb-3 { margin-bottom: 10px; }
            .mt-8 { margin-top: 24px; }
            .mt-1 { margin-top: 3px; }
            .ml-4 { margin-left: 12px; }
            .p-4 { padding: 12px; }
            .pb-4 { padding-bottom: 12px; }
            .pb-2 { padding-bottom: 6px; }
            .pt-4 { padding-top: 12px; }
            .m-2 { margin: 0; }
            
            /* Borders */
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-b-2 { border-bottom: 2px solid #1e40af; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .rounded-lg { border-radius: 6px; }
            .border { border: none; }
            
            /* Backgrounds */
            .bg-muted\\/50 { background: #f3f4f6 !important; }
            .bg-white { background: white; }
            
            /* Sections */
            .intro { margin-bottom: 14px; line-height: 1.5; }
            .conditions { 
              background: #f3f4f6 !important; 
              padding: 12px; 
              border-radius: 6px; 
              font-size: 10px; 
              line-height: 1.5; 
            }
            .footer { 
              margin-top: 20px; 
              padding-top: 10px; 
              border-top: 1px solid #e5e7eb; 
              font-size: 9px; 
              color: #666; 
              text-align: center; 
            }
            
            /* Flex */
            .flex { display: flex; }
            .items-start { align-items: flex-start; }
            .justify-between { justify-content: space-between; }
            .min-w-\\[1\\.5rem\\] { min-width: 1.2rem; }
            
            /* Text */
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: 0.4px; }
            .text-center { text-align: center; }
            
            /* Spacing */
            .h-2 { height: 6px; }
            .h-12 { height: 40px; }
            
            strong { font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="document">
            ${content}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 100);
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

        {/* Preview Content */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ticket ? (
            <div ref={previewRef} className="document bg-white p-6 rounded-lg border m-2">
              {/* Header */}
              <div className="header flex justify-between items-start mb-6 pb-4 border-b-2 border-primary">
                <div>
                  <img src={telyaLogo} alt="Telya Logo" className="h-12" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {TELYA_ADDRESS.street}, {TELYA_ADDRESS.zip} {TELYA_ADDRESS.city}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary">{processedTitle}</div>
                  <div className="text-lg font-semibold">{ticket.ticket_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </div>
                </div>
              </div>

              {/* Intro */}
              {processedIntro && (
                <div className="intro text-sm mb-6">
                  {processedIntro}
                </div>
              )}

              {/* Customer & Device Data */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="section">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 pb-2 border-b">
                    Kundendaten
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Name</div>
                      <div className="font-medium">
                        {ticket.customer?.first_name} {ticket.customer?.last_name}
                      </div>
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
                      <div className="font-medium">
                        {ticket.device?.brand} {ticket.device?.model}
                      </div>
                    </div>
                    {ticket.device?.imei_or_serial && (
                      <div>
                        <div className="text-xs text-muted-foreground">IMEI/Seriennummer</div>
                        <div className="font-medium font-mono text-sm">
                          {ticket.device?.imei_or_serial}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Conditions */}
              {processedConditions && (
                <div className="conditions bg-muted/50 p-4 rounded-lg text-sm space-y-1">
                  {renderMarkdown(processedConditions)}
                </div>
              )}

              {/* Footer */}
              {processedFooter && (
                <div className="footer mt-8 pt-4 border-t text-center text-[10px] text-muted-foreground">
                  {processedFooter}
                </div>
              )}
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
