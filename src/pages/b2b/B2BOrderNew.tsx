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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ArrowLeft, ChevronDown, User } from 'lucide-react';
import B2BDeviceModelSelect from '@/components/b2b/B2BDeviceModelSelect';
import DeviceConditionInput from '@/components/intake/DeviceConditionInput';
import PasscodeInput from '@/components/intake/PasscodeInput';
import B2BCustomerForm, { B2BCustomerData, emptyB2BCustomer } from '@/components/b2b/B2BCustomerForm';
import B2BErrorCodeSelect from '@/components/b2b/B2BErrorCodeSelect';
import { validateIMEI } from '@/lib/imei-validation';
import { DeviceType, ErrorCode } from '@/types/database';

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
  const [errorCode, setErrorCode] = useState<ErrorCode | ''>('');
  const [errorDescription, setErrorDescription] = useState('');
  const [kvaOnly, setKvaOnly] = useState(false);
  const [autoApproveLimit, setAutoApproveLimit] = useState('');
  const [notes, setNotes] = useState('');
  const [imeiError, setImeiError] = useState('');

  // NEW: Device condition at intake
  const [deviceConditions, setDeviceConditions] = useState<string[]>([]);
  const [deviceConditionRemarks, setDeviceConditionRemarks] = useState('');

  // NEW: Passcode/Pattern
  const [passcodeType, setPasscodeType] = useState<'pin' | 'pattern' | 'none' | 'unknown' | ''>('');
  const [passcodePin, setPasscodePin] = useState('');
  const [passcodePattern, setPasscodePattern] = useState<number[]>([]);

  // NEW: Optional customer
  const [includeCustomer, setIncludeCustomer] = useState(false);
  const [customerData, setCustomerData] = useState<B2BCustomerData>(emptyB2BCustomer);

  // Get workshop from b2b_partner (B2B is decoupled from locations)
  const workshopId = b2bPartner?.workshop_id;

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!b2bPartnerId || !workshopId) {
        throw new Error('Fehlende Werkstatt-Konfiguration. Bitte wenden Sie sich an den Support.');
      }

      // Validate IMEI for HANDY only: required unless unreadable
      if (device.device_type === 'HANDY') {
        if (!device.imei_or_serial && !device.imei_unreadable) {
          throw new Error('IMEI ist erforderlich oder markieren Sie "IMEI nicht lesbar"');
        }
        if (device.imei_or_serial && !device.imei_unreadable) {
          const validation = validateIMEI(device.imei_or_serial);
          if (!validation.isValid) {
            throw new Error(validation.error || 'Ungültige IMEI');
          }
        }
      }

      let b2bCustomerId: string | null = null;

      // Create B2B customer if included
      if (includeCustomer && (customerData.first_name || customerData.last_name)) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('b2b_customers')
          .insert({
            b2b_partner_id: b2bPartnerId,
            first_name: customerData.first_name || 'Unbekannt',
            last_name: customerData.last_name || '',
            email: customerData.email || null,
            phone: customerData.phone || null,
            street: customerData.street || null,
            house_number: customerData.house_number || null,
            zip: customerData.zip || null,
            city: customerData.city || null,
            country: customerData.country || 'Deutschland',
            notes: customerData.notes || null,
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        b2bCustomerId = newCustomer.id;
      }

      // 1. Use reusable placeholder customer for this B2B partner (via DB function)
      const { data: customerId, error: customerError } = await supabase
        .rpc('get_or_create_b2b_placeholder_customer', { partner_id: b2bPartnerId });

      if (customerError) throw customerError;

      // 2. Create device
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .insert({
          customer_id: customerId,
          device_type: device.device_type,
          brand: device.brand,
          model: device.model,
          imei_or_serial: device.imei_or_serial || null,
          imei_unreadable: device.device_type === 'HANDY' ? device.imei_unreadable : false,
          serial_unreadable: device.device_type !== 'HANDY' ? device.serial_unreadable : false,
          color: device.color || null,
        })
        .select('id')
        .single();

      if (deviceError) throw deviceError;

      // 3. Generate order number (use workshop_id for B2B)
      const { data: ticketNumberData, error: ticketNumberError } = await supabase
        .rpc('generate_order_number', {
          _location_id: null,
          _b2b_partner_id: b2bPartnerId,
          _workshop_id: workshopId,
        });

      if (ticketNumberError) throw ticketNumberError;

      // 4. Create repair ticket (B2B uses workshop_id, NOT location_id)
      const { data: ticket, error: ticketError } = await supabase
        .from('repair_tickets')
        .insert({
          ticket_number: ticketNumberData,
          customer_id: customerId,
          device_id: deviceData.id,
          location_id: null, // B2B tickets have no location
          workshop_id: workshopId, // B2B tickets use workshop
          b2b_partner_id: b2bPartnerId,
          b2b_customer_id: b2bCustomerId,
          is_b2b: true,
          endcustomer_reference: endcustomerReference || null,
          error_code: errorCode || null,
          error_description_text: errorDescription,
          kva_required: kvaOnly,
          auto_approved_limit: autoApproveLimit ? parseFloat(autoApproveLimit) : null,
          internal_notes: notes || null,
          status: 'NEU_EINGEGANGEN',
          price_mode: 'KVA',
          legal_notes_ack: true,
          device_condition_at_intake: deviceConditions,
          device_condition_remarks: deviceConditionRemarks || null,
          passcode_type: passcodeType || null,
          passcode_pin: passcodeType === 'pin' ? passcodePin : null,
          passcode_pattern: passcodeType === 'pattern' ? passcodePattern : null,
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
    // Only validate IMEI for HANDY devices
    if (device.device_type === 'HANDY' && value && !device.imei_unreadable) {
      const validation = validateIMEI(value);
      setImeiError(validation.isValid ? '' : (validation.error || ''));
    } else {
      setImeiError('');
    }
  };

  const isHandy = device.device_type === 'HANDY';
  const isOtherDevice = device.device_type === 'OTHER';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!device.brand || !device.model) {
      toast({
        title: 'Fehler',
        description: isOtherDevice 
          ? 'Bitte geben Sie Marke und Modell ein.'
          : 'Bitte wählen Sie Marke und Modell aus.',
        variant: 'destructive',
      });
      return;
    }

    // IMEI required for HANDY unless marked as unreadable
    if (isHandy && !device.imei_or_serial && !device.imei_unreadable) {
      toast({
        title: 'Fehler',
        description: 'IMEI ist erforderlich. Markieren Sie "IMEI nicht lesbar" falls nicht vorhanden.',
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

        {/* Optional: End Customer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Endkunde (optional)
                </CardTitle>
                <CardDescription>
                  Kundendaten für Rückversand oder Kommunikation
                </CardDescription>
              </div>
              <Checkbox
                id="include-customer"
                checked={includeCustomer}
                onCheckedChange={(checked) => setIncludeCustomer(!!checked)}
              />
            </div>
          </CardHeader>
          {includeCustomer && (
            <CardContent>
              <B2BCustomerForm
                data={customerData}
                onChange={setCustomerData}
              />
            </CardContent>
          )}
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
                  <SelectItem value="OTHER">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* B2BDeviceModelSelect is hidden for OTHER, uses free text */}
            {!isOtherDevice && (
              <B2BDeviceModelSelect
                deviceType={device.device_type}
                brand={device.brand}
                model={device.model}
                onBrandChange={(brand) =>
                  setDevice((prev) => ({ ...prev, brand, model: '' }))
                }
                onModelChange={(model) =>
                  setDevice((prev) => ({ ...prev, model }))
                }
              />
            )}

            {/* Free text brand/model for OTHER device type */}
            {isOtherDevice && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marke *</Label>
                  <Input
                    id="brand"
                    placeholder="Hersteller/Marke eingeben..."
                    value={device.brand}
                    onChange={(e) => setDevice({ ...device, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Gerätemodell / Bezeichnung *</Label>
                  <Input
                    id="model"
                    placeholder="Modell oder Bezeichnung eingeben..."
                    value={device.model}
                    onChange={(e) => setDevice({ ...device, model: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IMEI for HANDY, optional Serial for others */}
              <div className="space-y-2">
                <Label htmlFor="imei">
                  {isHandy ? 'IMEI *' : 'Seriennummer (optional)'}
                </Label>
                <Input
                  id="imei"
                  placeholder={isHandy ? '15-stellige IMEI' : 'Seriennummer (falls vorhanden)'}
                  value={device.imei_or_serial}
                  onChange={(e) => handleImeiChange(e.target.value)}
                  disabled={isHandy ? device.imei_unreadable : device.serial_unreadable}
                  className={imeiError ? 'border-destructive' : ''}
                />
                {imeiError && (
                  <p className="text-sm text-destructive">{imeiError}</p>
                )}
                {isHandy && (
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="imei-unreadable"
                      checked={device.imei_unreadable}
                      onCheckedChange={(checked) => {
                        setDevice({
                          ...device,
                          imei_unreadable: !!checked,
                          imei_or_serial: '',
                        });
                        setImeiError('');
                      }}
                    />
                    <Label htmlFor="imei-unreadable" className="text-sm text-muted-foreground">
                      IMEI nicht lesbar
                    </Label>
                  </div>
                )}
                {!isHandy && (
                  <p className="text-xs text-muted-foreground">
                    Seriennummer ist optional für diesen Gerätetyp.
                  </p>
                )}
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

        {/* Device Condition at Intake */}
        <Card>
          <CardHeader>
            <CardTitle>Gerätezustand bei Annahme</CardTitle>
            <CardDescription>
              Vorhandene Schäden dokumentieren (nicht nachträglich änderbar)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeviceConditionInput
              value={deviceConditions}
              remarks={deviceConditionRemarks}
              onChange={(conditions, remarks) => {
                setDeviceConditions(conditions);
                setDeviceConditionRemarks(remarks);
              }}
            />
          </CardContent>
        </Card>

        {/* Passcode / Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>Sperrcode / Entsperrung</CardTitle>
            <CardDescription>
              PIN oder Muster für Zugang zum Gerät
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasscodeInput
              passcodeType={passcodeType}
              passcodePin={passcodePin}
              passcodePattern={passcodePattern}
              onChange={(type, pin, pattern) => {
                setPasscodeType(type);
                setPasscodePin(pin);
                setPasscodePattern(pattern);
              }}
            />
          </CardContent>
        </Card>

        {/* Error Description */}
        <Card>
          <CardHeader>
            <CardTitle>Fehlerbeschreibung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Code Select */}
            <B2BErrorCodeSelect
              value={errorCode}
              onChange={setErrorCode}
              deviceType={device.device_type}
            />

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
