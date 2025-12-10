import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { STATUS_LABELS, TicketStatus } from '@/types/database';

export default function TrackTicket() {
  const { toast } = useToast();
  const [ticketNumber, setTicketNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTicket(null);

    try {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          ticket_number,
          status,
          created_at,
          device:devices(brand, model, device_type),
          location:locations(name),
          customer:customers(phone)
        `)
        .eq('ticket_number', ticketNumber.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Nicht gefunden',
          description: 'Kein Ticket mit dieser Nummer gefunden.',
        });
        return;
      }

      // Verify phone number for security
      if (data.customer?.phone !== phone) {
        toast({
          variant: 'destructive',
          title: 'Verifizierung fehlgeschlagen',
          description: 'Die Telefonnummer stimmt nicht mit dem Ticket überein.',
        });
        return;
      }

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
        color: 'text-warning',
        description: 'Wir warten auf benötigte Ersatzteile oder Ihre Freigabe für den Kostenvoranschlag.',
      },
      IN_REPARATUR: {
        icon: Wrench,
        color: 'text-info',
        description: 'Die Reparatur ist in vollem Gange.',
      },
      FERTIG_ZUR_ABHOLUNG: {
        icon: CheckCircle2,
        color: 'text-success',
        description: 'Ihr Gerät ist fertig und wartet auf Sie!',
      },
      ABGEHOLT: {
        icon: CheckCircle2,
        color: 'text-success',
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
      <div className="max-w-lg mx-auto">
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
            <CardTitle>Ticket suchen</CardTitle>
            <CardDescription>
              Geben Sie Ihre Ticketnummer und Telefonnummer ein, um den Status zu prüfen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket">Ticketnummer</Label>
                <Input
                  id="ticket"
                  placeholder="TELYA-20241210-0001"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  placeholder="Ihre Telefonnummer"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
          <Card className="shadow-xl border-0 animate-slide-up">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-mono">{ticket.ticket_number}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <div className="text-center py-6 rounded-lg bg-muted/50">
                {(() => {
                  const statusInfo = getStatusInfo(ticket.status as TicketStatus);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <>
                      <StatusIcon className={`h-12 w-12 mx-auto mb-3 ${statusInfo.color}`} />
                      <h3 className="text-xl font-semibold mb-2">
                        {STATUS_LABELS[ticket.status as TicketStatus]}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {statusInfo.description}
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Device Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{ticket.device?.brand} {ticket.device?.model}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{ticket.location?.name}</p>
                  <p className="text-sm text-muted-foreground">Abholstandort</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          © 2024 Telya GmbH. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}
