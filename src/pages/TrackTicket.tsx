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

interface KvaData {
  id: string;
  version: number;
  kva_type: string;
  status: string;
  repair_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  min_cost: number | null;
  max_cost: number | null;
  kva_fee_amount: number | null;
  kva_fee_waived: boolean;
  valid_until: string | null;
  diagnosis: string | null;
  repair_description: string | null;
  decision_at: string | null;
  disposal_option: string | null;
  endcustomer_price: number | null;
  endcustomer_price_released: boolean;
}

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
  price_mode: string;
  device: { brand: string; model: string; device_type: string } | null;
  location: { name: string } | null;
  status_history: Array<{
    id: string;
    new_status: TicketStatus;
    created_at: string;
    note: string | null;
  }>;
  // New KVA data from kva_estimates table
  kva?: KvaData | null;
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
  
  // KVA should only show when:
  // 1. There is a KVA record OR kva_required is true
  // 2. KVA status is GESENDET or WARTET_AUF_ANTWORT (ready for customer decision)
  // 3. For B2B: also check endcustomer_price_released
  const kva = ticket?.kva;
  const isKvaReady = kva && ['GESENDET', 'WARTET_AUF_ANTWORT'].includes(kva.status);
  const shouldShowKVA = (ticket?.kva_required || kva) && 
    (isKvaReady || ticket?.kva_approved !== null) &&
    (!ticket?.is_b2b || (kva?.endcustomer_price_released ?? ticket?.endcustomer_price_released)) &&
    (displayPrice != null || kva?.total_cost != null || ticket?.kva_approved !== null);
  
  // Get KVA display price (from new KVA system or fallback)
  const kvaDisplayPrice = kva ? (
    ticket?.is_b2b && kva.endcustomer_price_released 
      ? kva.endcustomer_price 
      : kva.total_cost
  ) : displayPrice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/telya-logo.png" 
            alt="Telya Logo" 
            className="h-16 w-auto rounded-2xl shadow-lg mb-4"
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
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{ticket.location.name}</p>
                        <p className="text-sm text-muted-foreground">Standort</p>
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
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Kostenvoranschlag
                  </CardTitle>
                  <CardDescription>
                    Bitte entscheiden Sie, ob wir die Reparatur durchführen sollen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ticket.kva_approved === null && kva?.status !== 'FREIGEGEBEN' && kva?.status !== 'ABGELEHNT' ? (
                    <div className="space-y-4">
                      {/* KVA Price Display */}
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        {kva?.kva_type === 'BIS_ZU' ? (
                          <>
                            <p className="text-3xl font-bold text-primary">
                              bis {kvaDisplayPrice?.toFixed(2)} €
                            </p>
                            {kva?.min_cost && (
                              <p className="text-sm text-muted-foreground">Mindestens: {kva.min_cost.toFixed(2)} €</p>
                            )}
                          </>
                        ) : (
                          <p className="text-3xl font-bold text-primary">
                            {kvaDisplayPrice?.toFixed(2)} €
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {kva?.kva_type === 'FIXPREIS' ? 'Festpreis (inkl. MwSt.)' : 'Geschätzter Reparaturpreis (inkl. MwSt.)'}
                        </p>
                      </div>

                      {/* KVA Fee Info */}
                      {kva && !kva.kva_fee_waived && kva.kva_fee_amount && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Bei Ablehnung: KVA-Gebühr von {kva.kva_fee_amount.toFixed(2)} €
                          </p>
                        </div>
                      )}

                      {/* Validity Info */}
                      {kva?.valid_until && (
                        <p className="text-xs text-muted-foreground text-center">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Gültig bis: {format(new Date(kva.valid_until), 'dd.MM.yyyy', { locale: de })}
                        </p>
                      )}

                      {/* Diagnosis */}
                      {(kva?.diagnosis || ticket.error_description_text) && (
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200">
                          <p className="text-sm font-medium mb-1">Diagnose:</p>
                          <p className="text-sm">{kva?.diagnosis || ticket.error_description_text}</p>
                        </div>
                      )}

                      {/* Repair Description */}
                      {kva?.repair_description && (
                        <div className="p-4 rounded-lg bg-muted/30">
                          <p className="text-sm font-medium mb-1">Geplante Arbeiten:</p>
                          <p className="text-sm text-muted-foreground">{kva.repair_description}</p>
                        </div>
                      )}

                      {/* Disposal options - shown before rejection */}
                      <Card className="bg-muted/30 border-dashed">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Falls Sie ablehnen möchten
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <RadioGroup 
                            value={disposalOption} 
                            onValueChange={(v) => setDisposalOption(v as 'ZURUECKSENDEN' | 'KOSTENLOS_ENTSORGEN')}
                            className="space-y-2"
                          >
                            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-background">
                              <RadioGroupItem value="ZURUECKSENDEN" id="return" />
                              <Label htmlFor="return" className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                  <span>Gerät zurücksenden</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Wir senden Ihnen das Gerät unrepariert zurück
                                </p>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-background">
                              <RadioGroupItem value="KOSTENLOS_ENTSORGEN" id="dispose" />
                              <Label htmlFor="dispose" className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                  <span>Kostenlos entsorgen</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Wir entsorgen das Gerät umweltgerecht für Sie
                                </p>
                              </Label>
                            </div>
                          </RadioGroup>
                        </CardContent>
                      </Card>

                      <div className="flex gap-3">
                        <Button 
                          onClick={() => handleKVADecision(true)} 
                          className="flex-1 gap-2"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-4 w-4" />
                          )}
                          Reparatur beauftragen
                        </Button>
                        <Button 
                          onClick={() => handleKVADecision(false)} 
                          variant="outline"
                          className="flex-1 gap-2"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ThumbsDown className="h-4 w-4" />
                          )}
                          Ablehnen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-lg text-center ${
                      ticket.kva_approved 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200' 
                        : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200'
                    }`}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {ticket.kva_approved ? (
                          <ThumbsUp className="h-5 w-5" />
                        ) : (
                          <ThumbsDown className="h-5 w-5" />
                        )}
                        <p className="font-semibold">
                          {ticket.kva_approved ? 'KVA angenommen' : 'KVA abgelehnt'}
                        </p>
                      </div>
                      {ticket.kva_approved_at && (
                        <p className="text-sm opacity-80">
                          am {format(new Date(ticket.kva_approved_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Message Section */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Nachricht senden
                </CardTitle>
                <CardDescription>
                  Haben Sie Fragen zu Ihrer Reparatur? Schreiben Sie uns eine Nachricht.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Ihre Nachricht..."
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    className="min-h-[100px]"
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {customerMessage.length}/1000 Zeichen
                    </span>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!customerMessage.trim() || submitting}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Senden
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            {ticket.status_history && ticket.status_history.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Verlauf
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ticket.status_history.map((entry, index) => (
                      <div 
                        key={entry.id} 
                        className={`flex items-start gap-3 ${
                          index !== ticket.status_history.length - 1 ? 'pb-3 border-b' : ''
                        }`}
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {STATUS_LABELS[entry.new_status]}
                          </p>
                          {entry.note && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {entry.note}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(entry.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Bei Fragen erreichen Sie uns unter:</p>
          <p className="font-medium">service@telya.de | +49 (0) 123 456789</p>
        </div>
      </div>
    </div>
  );
}
