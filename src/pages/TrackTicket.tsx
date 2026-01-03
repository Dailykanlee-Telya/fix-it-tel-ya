import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Mail,
  Ticket,
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
  kva?: KvaData | null;
}

interface TicketListItem {
  id: string;
  ticket_number: string;
  status: TicketStatus;
  created_at: string;
  device: { brand: string; model: string } | null;
  has_token: boolean;
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
  
  // Search mode state
  const [searchMode, setSearchMode] = useState<'email' | 'ticket'>('email');
  const [email, setEmail] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  
  // Ticket list (for email search with multiple results)
  const [ticketList, setTicketList] = useState<TicketListItem[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
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
    
    if (response.error) {
      const errorMessage = response.data?.error 
        || response.error.message 
        || 'Ein Fehler ist aufgetreten.';
      throw new Error(errorMessage);
    }
    
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
      setSearchMode('ticket');
      setTicketNumber(ticketParam);
      setTrackingToken(tokenParam.toUpperCase());
      setAutoSearchDone(true);
      
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

  // Email-based search
  const handleEmailSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTicket(null);
    setTicketList([]);

    try {
      const response = await supabase.functions.invoke('track-ticket', {
        body: {
          action: 'lookup_by_email',
          email: email.toLowerCase().trim()
        }
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message || 'Fehler bei der Suche');
      }

      const data = response.data;

      // If only one ticket with auto-login
      if (data.single_ticket) {
        setTicketNumber(data.single_ticket.ticket_number);
        setTrackingToken(data.single_ticket.tracking_token);
        // Auto-fetch the ticket details
        const ticketData = await callTrackingApi('lookup', {}, data.single_ticket.ticket_number, data.single_ticket.tracking_token);
        setTicket(ticketData);
      } else if (data.tickets && data.tickets.length > 0) {
        setTicketList(data.tickets);
      }
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

  // Select ticket from list (requires token input)
  const handleSelectTicket = async (ticketItem: TicketListItem) => {
    setSelectedTicketId(ticketItem.id);
    setTicketNumber(ticketItem.ticket_number);
    // User needs to enter the token from their confirmation email
    setSearchMode('ticket');
  };

  // Traditional ticket number + token search
  const handleTicketSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTicket(null);

    try {
      const data = await callTrackingApi('lookup');
      setTicket(data);
      setTicketList([]); // Clear list when successfully loaded
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
    if (ticket.is_b2b) {
      if (ticket.endcustomer_price_released && ticket.endcustomer_price != null) {
        return ticket.endcustomer_price;
      }
      return null;
    }
    return ticket.estimated_price;
  };

  const displayPrice = getDisplayPrice();
  
  const kva = ticket?.kva;
  const isKvaReady = kva && ['GESENDET', 'WARTET_AUF_ANTWORT'].includes(kva.status);
  const shouldShowKVA = (ticket?.kva_required || kva) && 
    (isKvaReady || ticket?.kva_approved !== null) &&
    (!ticket?.is_b2b || (kva?.endcustomer_price_released ?? ticket?.endcustomer_price_released)) &&
    (displayPrice != null || kva?.total_cost != null || ticket?.kva_approved !== null);
  
  const kvaDisplayPrice = kva ? (
    ticket?.is_b2b && kva.endcustomer_price_released 
      ? kva.endcustomer_price 
      : kva.total_cost
  ) : displayPrice;

  const resetSearch = () => {
    setTicket(null);
    setTicketList([]);
    setTicketNumber('');
    setTrackingToken('');
    setSelectedTicketId(null);
  };

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
            Geben Sie Ihre Daten ein, um den Status Ihrer Reparatur zu prüfen
          </p>
        </div>

        {/* Search Form */}
        {!ticket && ticketList.length === 0 && (
          <Card className="shadow-xl border-0 mb-6">
            <CardContent className="pt-6">
              <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'email' | 'ticket')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Per E-Mail
                  </TabsTrigger>
                  <TabsTrigger value="ticket" className="gap-2">
                    <Ticket className="h-4 w-4" />
                    Per Auftragsnummer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email">
                  <form onSubmit={handleEmailSearch} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base font-medium">E-Mail-Adresse</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ihre@email.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Die E-Mail-Adresse, die Sie bei der Auftragsannahme angegeben haben
                      </p>
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
                          Aufträge suchen
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="ticket">
                  <form onSubmit={handleTicketSearch} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket" className="text-base font-medium">Auftragsnummer</Label>
                      <Input
                        id="ticket"
                        placeholder="z.B. TEBO250101"
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Ticket Selection List (multiple tickets found) */}
        {ticketList.length > 0 && !ticket && (
          <Card className="shadow-xl border-0 mb-6 animate-slide-up">
            <CardHeader>
              <CardTitle className="text-lg">Ihre Aufträge</CardTitle>
              <CardDescription>
                Wählen Sie einen Auftrag aus und geben Sie den Tracking-Code ein
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticketList.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTicketId === t.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectTicket(t)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-mono font-medium">{t.ticket_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.device?.brand} {t.device?.model}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {STATUS_LABELS[t.status]}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(t.created_at), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {selectedTicketId && (
                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token-list" className="text-base font-medium">Tracking-Code eingeben</Label>
                    <Input
                      id="token-list"
                      placeholder="8-stelliger Code aus Ihrer Bestätigung"
                      value={trackingToken}
                      onChange={(e) => setTrackingToken(e.target.value.toUpperCase())}
                      className="h-12 text-lg uppercase"
                      maxLength={8}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleTicketSearch}
                    disabled={!trackingToken || loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Status anzeigen
                  </Button>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={resetSearch}>
                Andere E-Mail verwenden
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {ticket && (
          <div className="space-y-6 animate-slide-up">
            {/* Back Button */}
            <Button variant="ghost" onClick={resetSearch} className="gap-2">
              ← Neue Suche
            </Button>

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
                    <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full" />
                    <div 
                      className="absolute top-5 left-0 h-1 bg-primary rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, (currentStatusIndex / (STATUS_TIMELINE.length - 1)) * 100)}%` 
                      }}
                    />
                    
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
              <Card className="shadow-xl border-0 border-l-4 border-l-amber-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="h-5 w-5 text-amber-600" />
                    Kostenvoranschlag
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Already decided */}
                  {ticket.kva_approved !== null && (
                    <div className={`p-4 rounded-lg ${ticket.kva_approved ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'}`}>
                      <div className="flex items-center gap-2">
                        {ticket.kva_approved ? (
                          <>
                            <ThumbsUp className="h-5 w-5 text-emerald-600" />
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">KVA angenommen</span>
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="h-5 w-5 text-red-600" />
                            <span className="font-medium text-red-700 dark:text-red-400">KVA abgelehnt</span>
                          </>
                        )}
                      </div>
                      {ticket.kva_approved_at && (
                        <p className="text-sm text-muted-foreground mt-1">
                          am {format(new Date(ticket.kva_approved_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pending decision */}
                  {ticket.kva_approved === null && kvaDisplayPrice != null && (
                    <>
                      {kva?.diagnosis && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Diagnose</p>
                          <p className="text-sm">{kva.diagnosis}</p>
                        </div>
                      )}

                      {kva?.repair_description && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Geplante Reparatur</p>
                          <p className="text-sm">{kva.repair_description}</p>
                        </div>
                      )}

                      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
                        <p className="text-sm text-muted-foreground">Geschätzte Kosten</p>
                        <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                          {kvaDisplayPrice.toFixed(2)} €
                        </p>
                        {kva?.kva_fee_amount && !kva.kva_fee_waived && (
                          <p className="text-xs text-muted-foreground mt-1">
                            inkl. {kva.kva_fee_amount.toFixed(2)} € KVA-Gebühr bei Ablehnung
                          </p>
                        )}
                      </div>

                      {kva?.valid_until && (
                        <p className="text-sm text-center text-muted-foreground">
                          Gültig bis: {format(new Date(kva.valid_until), 'dd.MM.yyyy', { locale: de })}
                        </p>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleKVADecision(true)}
                          disabled={submitting}
                        >
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                          Annehmen
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleKVADecision(false)}
                          disabled={submitting}
                        >
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ThumbsDown className="h-4 w-4 mr-2" />}
                          Ablehnen
                        </Button>
                      </div>

                      {/* Disposal options when rejecting */}
                      <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <p className="text-sm font-medium">Bei Ablehnung:</p>
                        <RadioGroup
                          value={disposalOption}
                          onValueChange={(v) => setDisposalOption(v as typeof disposalOption)}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ZURUECKSENDEN" id="return" />
                            <Label htmlFor="return" className="flex items-center gap-2 cursor-pointer">
                              <Truck className="h-4 w-4" />
                              Gerät zurücksenden
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="KOSTENLOS_ENTSORGEN" id="dispose" />
                            <Label htmlFor="dispose" className="flex items-center gap-2 cursor-pointer">
                              <Trash2 className="h-4 w-4" />
                              Kostenlos entsorgen
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact / Message Section */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Nachricht senden
                </CardTitle>
                <CardDescription>
                  Haben Sie eine Frage zu Ihrer Reparatur?
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
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {customerMessage.length}/1000 Zeichen
                  </span>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!customerMessage.trim() || submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Absenden
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            {ticket.status_history && ticket.status_history.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Verlauf</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ticket.status_history.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <p className="font-medium">{STATUS_LABELS[entry.new_status]}</p>
                          {entry.note && (
                            <p className="text-muted-foreground">{entry.note}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
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
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Telya GmbH • Schalker Str. 59, 45881 Gelsenkirchen</p>
          <p className="mt-1">Tel: 0209 88307161 • service@telya.de</p>
        </div>
      </div>
    </div>
  );
}
