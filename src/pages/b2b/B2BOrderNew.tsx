import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Upload } from 'lucide-react';
import DeviceModelSelect from '@/components/DeviceModelSelect';
import { validateIMEI } from '@/lib/imei-validation';
import { DeviceType } from '@/types/database';

interface DeviceData {
  device_type: DeviceType;
  brand: string;
  model: string;
  imei_or_serial: string;
  imei_unreadable: boolean;
  serial_unreadable: boolean;
  color: string;
}

export default function B2BOrderNew() {
  const { b2bPartnerId, b2bPartner, user } = useB2BAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [endcustomerReference, setEndcustomerReference] = useState('');
  const [device, setDevice] = useState<DeviceData>({
    device_type: 'HANDY',
    brand: '',
    model: '',
    imei_or_serial: '',
    imei_unreadable: false,
    serial_unreadable: false,
    color: '',
  });
  const [errorDescription, setErrorDescription] = useState('');
  const [kvaOnly, setKvaOnly] = useState(false);
  const [autoApproveLimit, setAutoApproveLimit] = useState('');
  const [notes, setNotes] = useState('');
  const [imeiError, setImeiError] = useState('');

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  const defaultLocationId = locations?.[0]?.id;

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!b2bPartnerId || !defaultLocationId) {
        throw new Error('Fehlende Konfiguration');
      }

      // Validate IMEI if provided and device is phone
      if (device.device_type === 'HANDY' && device.imei_or_serial && !device.imei_unreadable) {
        const validation = validateIMEI(device.imei_or_serial);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Ungültige IMEI');
        }
      }

      // 1. Create a placeholder customer for B2B orders
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: b2bPartner?.name || 'B2B',
          last_name: 'Partner',
          phone: b2bPartner?.contact_phone || '0000000000',
          email: b2bPartner?.contact_email,
          address: `${b2bPartner?.street || ''}, ${b2bPartner?.zip || ''} ${b2bPartner?.city || ''}`.trim(),
        })
        .select('id')
        .single();

      if (customerError) throw customerError;

      // 2. Create device
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .insert({
          customer_id: customer.id,
          device_type: device.device_type,
          brand: device.brand,
          model: device.model,
          imei_or_serial: device.imei_or_serial || null,
          imei_unreadable: device.imei_unreadable,
          serial_unreadable: device.serial_unreadable,
          color: device.color || null,
        })
        .select('id')
        .single();

      if (deviceError) throw deviceError;

      // 3. Generate ticket number
      const { data: ticketNumberData, error: ticketNumberError } = await supabase
        .rpc('generate_ticket_number');

      if (ticketNumberError) throw ticketNumberError;

      // 4. Create repair ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('repair_tickets')
        .insert({
          ticket_number: ticketNumberData,
          customer_id: customer.id,
          device_id: deviceData.id,
          location_id: defaultLocationId,
          b2b_partner_id: b2bPartnerId,
          is_b2b: true,
          endcustomer_reference: endcustomerReference || null,
          error_description_text: errorDescription,
          kva_required: kvaOnly,
          auto_approved_limit: autoApproveLimit ? parseFloat(autoApproveLimit) : null,
          internal_notes: notes || null,
          status: 'NEU_EINGEGANGEN',
          price_mode: 'KVA',
          legal_notes_ack: true,
        })
        .select('id, ticket_number')
        .single();

      if (ticketError) throw ticketError;

      return ticket;
    },
    onSuccess: (ticket) => {
      toast({
        title: 'Auftrag erstellt',
        description: `Auftrag ${ticket.ticket_number} wurde erfolgreich angelegt.`,
      });
      queryClient.invalidateQueries({ queryKey: ['b2b-orders'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-dashboard-stats'] });
      navigate(`/b2b/orders/${ticket.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Auftrag konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    },
  });

  const handleImeiChange = (value: string) => {
    setDevice({ ...device, imei_or_serial: value });
    if (device.device_type === 'HANDY' && value && !device.imei_unreadable) {
      const validation = validateIMEI(value);
      setImeiError(validation.isValid ? '' : (validation.error || ''));
    } else {
      setImeiError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!device.brand || !device.model) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie Marke und Modell aus.',
        variant: 'destructive',
      });
      return;
    }

    if (!errorDescription.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine Fehlerbeschreibung ein.',
        variant: 'destructive',
      });
      return;
    }

    if (imeiError) {
      toast({
        title: 'Fehler',
        description: 'Bitte korrigieren Sie die IMEI.',
        variant: 'destructive',
      });
      return;
    }

    createOrderMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/b2b/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Neuer Auftrag</h1>
          <p className="text-muted-foreground">Reparaturauftrag anlegen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Referenz</CardTitle>
            <CardDescription>
              Ihre interne Referenz für diesen Auftrag
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="reference">Endkunden-Referenz (optional)</Label>
              <Input
                id="reference"
                placeholder="z.B. Kundenname, Auftragsnummer, etc."
                value={endcustomerReference}
                onChange={(e) => setEndcustomerReference(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Device Info */}
        <Card>
          <CardHeader>
            <CardTitle>Gerätedaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Gerätetyp</Label>
              <Select
                value={device.device_type}
                onValueChange={(value) => setDevice({ ...device, device_type: value as DeviceType, brand: '', model: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HANDY">Handy</SelectItem>
                  <SelectItem value="TABLET">Tablet</SelectItem>
                  <SelectItem value="LAPTOP">Laptop</SelectItem>
                  <SelectItem value="SMARTWATCH">Smartwatch</SelectItem>
                  <SelectItem value="SONSTIGES">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DeviceModelSelect
              deviceType={device.device_type}
              brand={device.brand}
              model={device.model}
              onBrandChange={(brand) => setDevice({ ...device, brand, model: '' })}
              onModelChange={(model) => setDevice({ ...device, model })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imei">
                  {device.device_type === 'HANDY' ? 'IMEI' : 'Seriennummer'}
                </Label>
                <Input
                  id="imei"
                  placeholder={device.device_type === 'HANDY' ? '15-stellige IMEI' : 'Seriennummer'}
                  value={device.imei_or_serial}
                  onChange={(e) => handleImeiChange(e.target.value)}
                  disabled={device.imei_unreadable || device.serial_unreadable}
                  className={imeiError ? 'border-destructive' : ''}
                />
                {imeiError && (
                  <p className="text-sm text-destructive">{imeiError}</p>
                )}
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="imei-unreadable"
                    checked={device.imei_unreadable || device.serial_unreadable}
                    onCheckedChange={(checked) => {
                      setDevice({
                        ...device,
                        imei_unreadable: !!checked,
                        serial_unreadable: !!checked,
                        imei_or_serial: '',
                      });
                      setImeiError('');
                    }}
                  />
                  <Label htmlFor="imei-unreadable" className="text-sm text-muted-foreground">
                    Nicht lesbar
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Farbe (optional)</Label>
                <Input
                  id="color"
                  placeholder="z.B. Schwarz, Silber"
                  value={device.color}
                  onChange={(e) => setDevice({ ...device, color: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Description */}
        <Card>
          <CardHeader>
            <CardTitle>Fehlerbeschreibung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="error">Beschreibung des Fehlers *</Label>
              <Textarea
                id="error"
                placeholder="Beschreiben Sie den Fehler so genau wie möglich..."
                value={errorDescription}
                onChange={(e) => setErrorDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Zusätzliche Hinweise (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Weitere Hinweise für die Reparatur..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Repair Options */}
        <Card>
          <CardHeader>
            <CardTitle>Reparaturoptionen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="kva-only"
                checked={kvaOnly}
                onCheckedChange={(checked) => setKvaOnly(!!checked)}
              />
              <Label htmlFor="kva-only">
                Nur Kostenvoranschlag (KVA) erstellen
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto-approve">
                Bis Betrag X ohne Rückfrage reparieren (€)
              </Label>
              <Input
                id="auto-approve"
                type="number"
                min="0"
                step="0.01"
                placeholder="z.B. 150.00"
                value={autoApproveLimit}
                onChange={(e) => setAutoApproveLimit(e.target.value)}
                className="max-w-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                Wenn leer, wird immer ein KVA erstellt.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/b2b/orders')}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={createOrderMutation.isPending}>
            {createOrderMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Auftrag erstellen
          </Button>
        </div>
      </form>
    </div>
  );
}
