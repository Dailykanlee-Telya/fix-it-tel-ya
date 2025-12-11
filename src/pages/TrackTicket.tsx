import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
  History,
  AlertTriangle,
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
  device: { brand: string; model: string; device_type: string } | null;
  location: { name: string } | null;
  status_history: Array<{
    id: string;
    new_status: TicketStatus;
    created_at: string;
    note: string | null;
  }>;
}

export default function TrackTicket() {
  const { toast } = useToast();
  const [ticketNumber, setTicketNumber] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [customerMessage, setCustomerMessage] = useState('');

  const callTrackingApi = async (action: string, extraData: Record<string, any> = {}) => {
    const response = await supabase.functions.invoke('track-ticket', {
      body: {
        action,
        ticket_number: ticketNumber,
        tracking_token: trackingToken,
        ...extraData
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'Ein Fehler ist aufgetreten.');
    }
    
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    
    return response.data;
  };

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
      const result = await callTrackingApi('kva_decision', { kva_approved: approved });
      
      setTicket({ 
        ...ticket, 
        kva_approved: result.kva_approved, 
        kva_approved_at: result.kva_approved_at 
      });
      
      toast({
        title: approved ? 'KVA angenommen' : 'KVA abgelehnt',
        description: approved 
          ? 'Vielen Dank! Wir werden die Reparatur durchführen.' 
          : 'Ihre Ablehnung wurde registriert. Wir werden Sie kontaktieren.',
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

  const getStatusInfo = (status: TicketStatus) => {
    const statusConfig: Record<TicketStatus, { icon: any; color: string; description: string }> = {
      NEU_EINGEGANGEN: {
        icon: Clock,
        color: 'text-primary',
        description: 'Ihr Gerät wurde entgegengenommen und wartet auf die Diagnose.',
      },
      IN_DIAGNOSE: {
        icon: Search,
        color: 'text-purple-500',
        description: 'Unser Techniker analysiert gerade den Schaden.',
      },
      WARTET_AUF_TEIL_ODER_FREIGABE: {
        icon: Package,
        color: 'text-amber-500',
        description: 'Wir warten auf benötigte Ersatzteile oder Ihre Freigabe für den Kostenvoranschlag.',
      },
      IN_REPARATUR: {
        icon: Wrench,
        color: 'text-cyan-500',
        description: 'Die Reparatur ist in vollem Gange.',
      },
      FERTIG_ZUR_ABHOLUNG: {
        icon: CheckCircle2,
        color: 'text-emerald-500',
        description: 'Ihr Gerät ist fertig und wartet auf Sie!',
      },
      ABGEHOLT: {
        icon: CheckCircle2,
        color: 'text-emerald-500',
        description: 'Das Gerät wurde abgeholt. Vielen Dank!',
      },
      STORNIERT: {
        icon: Clock,
        color: 'text-muted-foreground',
        description: 'Dieser Auftrag wurde storniert.',
      },
    };

    return statusConfig[status] || statusConfig.NEU_EINGEGANGEN;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg">
            <Wrench className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Telya Reparatur</h1>
          <p className="text-muted-foreground mt-1">Reparatur-Status prüfen</p>
        </div>

        {/* Search Form */}
        <Card className="shadow-xl border-0 mb-6">
          <CardHeader>
            <CardTitle>Auftrag suchen</CardTitle>
            <CardDescription>
              Geben Sie Ihre Auftragsnummer und den Tracking-Code aus Ihrer Bestätigungs-E-Mail ein.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket">Auftragsnummer</Label>
                <Input
                  id="ticket"
                  placeholder="TELYA-20241210-0001"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Tracking-Code</Label>
                <Input
                  id="token"
                  placeholder="Ihr Tracking-Code aus der E-Mail"
                  value={trackingToken}
                  onChange={(e) => setTrackingToken(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suche...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Status prüfen
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {ticket && (
          <div className="space-y-6 animate-slide-up">
            {/* Status Card */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-mono">{ticket.ticket_number}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status */}
                <div className="text-center py-6 rounded-lg bg-muted/50">
                  {(() => {
                    const statusInfo = getStatusInfo(ticket.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <>
                        <StatusIcon className={`h-12 w-12 mx-auto mb-3 ${statusInfo.color}`} />
                        <h3 className="text-xl font-semibold mb-2">
                          {STATUS_LABELS[ticket.status]}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                          {statusInfo.description}
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* Device Info */}
                {ticket.device && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{ticket.device.brand} {ticket.device.model}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.error_description_text || 'Keine Beschreibung'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {ticket.location && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{ticket.location.name}</p>
                      <p className="text-sm text-muted-foreground">Abholstandort</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KVA Section */}
            {ticket.kva_required && (
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
                        {ticket.estimated_price && (
                          <p className="text-2xl font-bold text-amber-600">
                            {ticket.estimated_price.toFixed(2)} €
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Bitte bestätigen Sie, ob wir die Reparatur zu diesem Preis durchführen sollen.
                        </p>
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

            {/* Status History */}
            {ticket.status_history && ticket.status_history.length > 0 && (
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Statusverlauf
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ticket.status_history.map((entry, index) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`h-2 w-2 rounded-full ${index === ticket.status_history.length - 1 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                          {index < ticket.status_history.length - 1 && (
                            <div className="w-px h-full bg-muted-foreground/20 my-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-sm font-medium">
                            {STATUS_LABELS[entry.new_status]}
                          </p>
                          {entry.note && (
                            <p className="text-sm text-muted-foreground mt-0.5">{entry.note}</p>
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
