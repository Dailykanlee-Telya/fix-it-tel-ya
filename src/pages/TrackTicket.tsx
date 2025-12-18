import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Loader2,
  Wrench,
  CheckCircle2,
  Clock,
  Package,
  Smartphone,
  MapPin,
  Euro,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertTriangle,
  Truck,
  Trash2,
} from 'lucide-react';
import { STATUS_LABELS, TicketStatus } from '@/types/database';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TicketData {
  ticket_number: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  error_description_text: string | null;
  kva_required: boolean;
  kva_approved: boolean | null;
  kva_approved_at: string | null;
  estimated_price: number | null;
  endcustomer_price: number | null;
  endcustomer_price_released: boolean;
  is_b2b: boolean;
  device: { brand: string; model: string; device_type: string } | null;
  location: { name: string } | null;
  status_history: Array<{
    id: string;
    new_status: TicketStatus;
    created_at: string;
    note: string | null;
  }>;
}

// Status timeline steps (simplified for customer view)
const STATUS_TIMELINE: { status: TicketStatus; label: string; icon: React.ComponentType<any> }[] = [
  { status: 'NEU_EINGEGANGEN', label: 'Eingegangen', icon: Package },
  { status: 'IN_DIAGNOSE', label: 'In Diagnose', icon: Search },
  { status: 'WARTET_AUF_TEIL_ODER_FREIGABE', label: 'KVA / Ersatzteil', icon: Clock },
  { status: 'IN_REPARATUR', label: 'In Reparatur', icon: Wrench },
  { status: 'FERTIG_ZUR_ABHOLUNG', label: 'Fertig', icon: CheckCircle2 },
];

const getStatusIndex = (status: TicketStatus): number => {
  const index = STATUS_TIMELINE.findIndex(s => s.status === status);
  if (status === 'ABGEHOLT') return STATUS_TIMELINE.length;
  if (status === 'STORNIERT') return -1;
  return index >= 0 ? index : 0;
};

export default function TrackTicket() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [ticketNumber, setTicketNumber] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [customerMessage, setCustomerMessage] = useState('');
  const [disposalOption, setDisposalOption] = useState<'ZURUECKSENDEN' | 'KOSTENLOS_ENTSORGEN'>('ZURUECKSENDEN');
  const [autoSearchDone, setAutoSearchDone] = useState(false);

  const callTrackingApi = useCallback(async (action: string, extraData: Record<string, any> = {}, overrideTicket?: string, overrideToken?: string) => {
    const response = await supabase.functions.invoke('track-ticket', {
      body: {
        action,
        ticket_number: overrideTicket || ticketNumber,
        tracking_token: overrideToken || trackingToken,
        ...extraData
      }
    });
    
    // Handle edge function errors (non-2xx responses)
    if (response.error) {
      // Try to extract error message from the response context
      const errorMessage = response.data?.error 
        || response.error.message 
        || 'Ein Fehler ist aufgetreten.';
      throw new Error(errorMessage);
    }
    
    // Handle application-level errors in successful responses
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    
    return response.data;
  }, [ticketNumber, trackingToken]);

  // Auto-search from URL parameters
  useEffect(() => {
    const ticketParam = searchParams.get('ticket');
    const tokenParam = searchParams.get('token');
    
    if (ticketParam && tokenParam && !autoSearchDone) {
      setTicketNumber(ticketParam);
      setTrackingToken(tokenParam.toUpperCase());
      setAutoSearchDone(true);
      
      // Perform automatic lookup
      const performAutoSearch = async () => {
        setLoading(true);
        try {
          const response = await supabase.functions.invoke('track-ticket', {
            body: {
              action: 'lookup',
              ticket_number: ticketParam,
              tracking_token: tokenParam.toUpperCase()
            }
          });
          
          // Handle edge function errors (non-2xx responses)
          if (response.error) {
            const errorMessage = response.data?.error 
              || response.error.message 
              || 'Ein Fehler ist aufgetreten.';
            throw new Error(errorMessage);
          }
          
          if (response.data?.error) {
            throw new Error(response.data.error);
          }
          
          setTicket(response.data);
        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Fehler',
            description: error.message,
          });
        } finally {
          setLoading(false);
        }
      };
      
      performAutoSearch();
    }
  }, [searchParams, autoSearchDone, toast]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTicket(null);

    try {
      const data = await callTrackingApi('lookup');
      setTicket(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKVADecision = async (approved: boolean) => {
    if (!ticket) return;
    setSubmitting(true);

    try {
      const extraData: Record<string, any> = { kva_approved: approved };
      if (!approved) {
        extraData.disposal_option = disposalOption;
      }
      
      const result = await callTrackingApi('kva_decision', extraData);
      
      setTicket({ 
        ...ticket, 
        kva_approved: result.kva_approved, 
        kva_approved_at: result.kva_approved_at 
      });
      
      toast({
        title: approved ? 'KVA angenommen' : 'KVA abgelehnt',
        description: approved 
          ? 'Vielen Dank! Wir werden die Reparatur durchführen.' 
          : disposalOption === 'KOSTENLOS_ENTSORGEN'
            ? 'Ihre Ablehnung wurde registriert. Das Gerät wird kostenlos entsorgt.'
            : 'Ihre Ablehnung wurde registriert. Das Gerät wird zurückgesendet.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!ticket || !customerMessage.trim()) return;
    setSubmitting(true);

    try {
      await callTrackingApi('send_message', { message: customerMessage.trim() });

      // Refresh ticket data to get updated history
      const data = await callTrackingApi('lookup');
      setTicket(data);

      setCustomerMessage('');
      toast({
        title: 'Nachricht gesendet',
        description: 'Ihre Nachricht wurde erfolgreich übermittelt.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatusIndex = ticket ? getStatusIndex(ticket.status) : -1;

  // Determine which price to show
  const getDisplayPrice = (): number | null => {
    if (!ticket) return null;
    // For B2B orders, only show price if explicitly released
    if (ticket.is_b2b) {
      if (ticket.endcustomer_price_released && ticket.endcustomer_price != null) {
        return ticket.endcustomer_price;
      }
      return null; // Don't show any price for B2B if not released
    }
    // For B2C, show estimated_price
    return ticket.estimated_price;
  };

  const displayPrice = getDisplayPrice();
  const shouldShowKVA = ticket?.kva_required && (!ticket.is_b2b || ticket.endcustomer_price_released);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/telya-logo.png" 
            alt="Telya Logo" 
            className="h-16 w-16 rounded-2xl shadow-lg mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground text-center">Reparaturstatus abfragen</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Geben Sie Ihre Auftragsdaten ein, um den Status zu prüfen
          </p>
        </div>

        {/* Search Form */}
        <Card className="shadow-xl border-0 mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket" className="text-base font-medium">Auftragsnummer</Label>
                <Input
                  id="ticket"
                  placeholder="z.B. TELYA-20241210-0001"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  required
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token" className="text-base font-medium">Tracking-Code</Label>
                <Input
                  id="token"
                  placeholder="8-stelliger Code aus Ihrer Bestätigung"
                  value={trackingToken}
                  onChange={(e) => setTrackingToken(e.target.value.toUpperCase())}
                  required
                  className="h-12 text-lg uppercase"
                  maxLength={8}
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Suche...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Status anzeigen
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {ticket && (
          <div className="space-y-6 animate-slide-up">
            {/* Status Timeline */}
            <Card className="shadow-xl border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-mono">{ticket.ticket_number}</CardTitle>
                  {ticket.status === 'STORNIERT' && (
                    <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
                      Storniert
                    </span>
                  )}
                  {ticket.status === 'ABGEHOLT' && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-medium">
                      Abgeholt
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Visual Timeline */}
                {ticket.status !== 'STORNIERT' && (
                  <div className="relative">
                    {/* Progress bar background */}
                    <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full" />
                    {/* Progress bar filled */}
                    <div 
                      className="absolute top-5 left-0 h-1 bg-primary rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, (currentStatusIndex / (STATUS_TIMELINE.length - 1)) * 100)}%` 
                      }}
                    />
                    
                    {/* Timeline steps */}
                    <div className="relative flex justify-between">
                      {STATUS_TIMELINE.map((step, index) => {
                        const isCompleted = index < currentStatusIndex;
                        const isCurrent = index === currentStatusIndex;
                        const StepIcon = step.icon;
                        
                        return (
                          <div key={step.status} className="flex flex-col items-center">
                            <div 
                              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                                isCompleted 
                                  ? 'bg-primary text-primary-foreground' 
                                  : isCurrent 
                                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/30' 
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <StepIcon className="h-5 w-5" />
                              )}
                            </div>
                            <span className={`text-xs mt-2 text-center max-w-[60px] ${
                              isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Current Status Description */}
                <div className="mt-8 p-4 rounded-lg bg-muted/50 text-center">
                  <p className="font-semibold text-lg">
                    {STATUS_LABELS[ticket.status]}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Letzte Aktualisierung: {format(new Date(ticket.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Device & Location Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {ticket.device && (
                <Card className="shadow-lg border-0">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{ticket.device.brand} {ticket.device.model}</p>
                        <p className="text-sm text-muted-foreground">Ihr Gerät</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {ticket.location && (
                <Card className="shadow-lg border-0">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium">{ticket.location.name}</p>
                        <p className="text-sm text-muted-foreground">Abholstandort</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* KVA Section */}
            {shouldShowKVA && (
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="h-5 w-5 text-amber-500" />
                    Kostenvoranschlag (KVA)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ticket.kva_approved === null ? (
                    <>
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm mb-2">
                          Für Ihre Reparatur liegt ein Kostenvoranschlag vor.
                        </p>
                        {displayPrice != null && (
                          <p className="text-2xl font-bold text-amber-600">
                            {displayPrice.toFixed(2)} €
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Bitte bestätigen Sie, ob wir die Reparatur zu diesem Preis durchführen sollen.
                        </p>
                      </div>

                      {/* Disposal options shown when rejecting */}
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-3">Falls Sie den KVA ablehnen möchten:</p>
                        <RadioGroup 
                          value={disposalOption} 
                          onValueChange={(v) => setDisposalOption(v as 'ZURUECKSENDEN' | 'KOSTENLOS_ENTSORGEN')}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ZURUECKSENDEN" id="return" />
                            <Label htmlFor="return" className="flex items-center gap-2 cursor-pointer">
                              <Truck className="h-4 w-4" />
                              Gerät zurücksenden
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <RadioGroupItem value="KOSTENLOS_ENTSORGEN" id="dispose" />
                            <Label htmlFor="dispose" className="flex items-center gap-2 cursor-pointer">
                              <Trash2 className="h-4 w-4" />
                              Gerät kostenlos entsorgen
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => handleKVADecision(true)}
                          disabled={submitting}
                        >
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                          KVA annehmen
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleKVADecision(false)}
                          disabled={submitting}
                        >
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                          KVA ablehnen
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className={`p-4 rounded-lg ${ticket.kva_approved ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                      <div className="flex items-center gap-2">
                        {ticket.kva_approved ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                        <span className={`font-medium ${ticket.kva_approved ? 'text-emerald-600' : 'text-red-600'}`}>
                          {ticket.kva_approved ? 'KVA angenommen' : 'KVA abgelehnt'}
                        </span>
                      </div>
                      {ticket.kva_approved_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          am {format(new Date(ticket.kva_approved_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Message Section */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Nachricht senden
                </CardTitle>
                <CardDescription>
                  Haben Sie Fragen zu Ihrem Auftrag? Schreiben Sie uns.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Ihre Nachricht..."
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!customerMessage.trim() || submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Senden...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Nachricht senden
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Telya GmbH · Alle Rechte vorbehalten
            </p>
          </div>
        )}

        {/* Footer when no ticket */}
        {!ticket && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            © {new Date().getFullYear()} Telya GmbH · Alle Rechte vorbehalten
          </p>
        )}
      </div>
    </div>
  );
}