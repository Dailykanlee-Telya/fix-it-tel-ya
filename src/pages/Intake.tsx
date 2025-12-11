import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  Mail,
  Smartphone,
  AlertCircle,
  Package,
  FileText,
  Euro,
  Camera,
  Loader2,
  Search,
  Plus,
  Check,
} from 'lucide-react';
import {
  DeviceType,
  ErrorCode,
  PriceMode,
  DEVICE_TYPE_LABELS,
  ERROR_CODE_LABELS,
  Customer,
} from '@/types/database';
import DeviceModelSelect from '@/components/DeviceModelSelect';

const ACCESSORIES = [
  { id: 'case', label: 'Hülle' },
  { id: 'charger', label: 'Ladegerät' },
  { id: 'sim', label: 'SIM-Karte' },
  { id: 'memory', label: 'Speicherkarte' },
  { id: 'other', label: 'Sonstiges' },
];

export default function Intake() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  // Customer state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
  });

  // Device state
  const [device, setDevice] = useState({
    device_type: 'HANDY' as DeviceType,
    brand: '',
    model: '',
    imei_or_serial: '',
    color: '',
  });

  // Repair state
  const [repair, setRepair] = useState({
    error_code: 'SONSTIGES' as ErrorCode,
    error_description_text: '',
    passcode_info: '',
    price_mode: 'KVA' as PriceMode,
    estimated_price: '',
    priority: 'normal',
  });

  // Accessories
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [accessoriesNote, setAccessoriesNote] = useState('');

  // Legal
  const [legalAck, setLegalAck] = useState(false);

  // Location
  const [locationId, setLocationId] = useState('');

  // Search customers
  const { data: customers, isLoading: searchLoading } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: async () => {
      if (customerSearch.length < 2) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`first_name.ilike.%${customerSearch}%,last_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%`)
        .limit(10);
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: customerSearch.length >= 2,
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async () => {
      let customerId = selectedCustomer?.id;

      // Create new customer if needed
      if (showNewCustomer) {
        const { data: newCustomerData, error: customerError } = await supabase
          .from('customers')
          .insert({
            first_name: newCustomer.first_name,
            last_name: newCustomer.last_name,
            phone: newCustomer.phone,
            email: newCustomer.email || null,
            address: newCustomer.address || null,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomerData.id;
      }

      if (!customerId) throw new Error('Kein Kunde ausgewählt');

      // Create device
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .insert({
          customer_id: customerId,
          device_type: device.device_type,
          brand: device.brand,
          model: device.model,
          imei_or_serial: device.imei_or_serial || null,
          color: device.color || null,
        })
        .select()
        .single();

      if (deviceError) throw deviceError;

      // Generate ticket number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const { count } = await supabase
        .from('repair_tickets')
        .select('*', { count: 'exact', head: true })
        .like('ticket_number', `TELYA-${dateStr}-%`);
      
      const ticketNumber = `TELYA-${dateStr}-${String((count || 0) + 1).padStart(4, '0')}`;

      // Build accessories string
      const accessoriesStr = [
        ...selectedAccessories.map(id => ACCESSORIES.find(a => a.id === id)?.label),
        accessoriesNote,
      ].filter(Boolean).join(', ');

      // Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('repair_tickets')
        .insert({
          ticket_number: ticketNumber,
          customer_id: customerId,
          device_id: deviceData.id,
          location_id: locationId,
          status: 'NEU_EINGEGANGEN',
          error_code: repair.error_code,
          error_description_text: repair.error_description_text || null,
          passcode_info: repair.passcode_info || null,
          price_mode: repair.price_mode,
          estimated_price: repair.estimated_price ? parseFloat(repair.estimated_price) : null,
          priority: repair.priority,
          accessories: accessoriesStr || null,
          legal_notes_ack: legalAck,
          kva_required: repair.price_mode === 'KVA',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create status history entry
      await supabase.from('status_history').insert({
        repair_ticket_id: ticketData.id,
        new_status: 'NEU_EINGEGANGEN',
        changed_by_user_id: profile?.id,
        note: 'Ticket erstellt',
      });

      return ticketData;
    },
    onSuccess: (data) => {
      toast({
        title: 'Ticket erstellt',
        description: `Ticketnummer: ${data.ticket_number}`,
      });
      navigate(`/tickets/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Ticket konnte nicht erstellt werden',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer && !showNewCustomer) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Kunden aus oder erstellen Sie einen neuen.',
      });
      return;
    }

    if (!locationId) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Standort aus.',
      });
      return;
    }

    if (!device.brand || !device.model) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte geben Sie Marke und Modell des Geräts an.',
      });
      return;
    }

    if (!legalAck) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte bestätigen Sie die rechtlichen Hinweise.',
      });
      return;
    }

    createTicketMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Geräteannahme</h1>
        <p className="text-muted-foreground">Neues Reparaturticket erstellen</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Section */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Kunde
            </CardTitle>
            <CardDescription>Bestehenden Kunden suchen oder neuen anlegen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showNewCustomer && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Kunde suchen (Name, Telefon, E-Mail)..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {searchLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Suche...
                  </div>
                )}

                {customers && customers.length > 0 && (
                  <div className="border rounded-lg divide-y">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedCustomer?.id === customer.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        }`}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone} • {customer.email}</p>
                          </div>
                          {selectedCustomer?.id === customer.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCustomer(true)}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Neuen Kunden anlegen
                </Button>
              </>
            )}

            {showNewCustomer && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Neuer Kunde</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCustomer(false)}
                  >
                    Abbrechen
                  </Button>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vorname *</Label>
                    <Input
                      value={newCustomer.first_name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nachname *</Label>
                    <Input
                      value={newCustomer.last_name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Telefon *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Section */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Gerät
            </CardTitle>
            <CardDescription>Geräteinformationen erfassen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gerätetyp *</Label>
                <Select
                  value={device.device_type}
                  onValueChange={(value) => setDevice({ ...device, device_type: value as DeviceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Standort *</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Standort wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc: any) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Device Catalog Selection */}
            <DeviceModelSelect
              brand={device.brand}
              model={device.model}
              onBrandChange={(brand) => setDevice({ ...device, brand, model: '' })}
              onModelChange={(model) => setDevice({ ...device, model })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>IMEI / Seriennummer</Label>
                <Input
                  value={device.imei_or_serial}
                  onChange={(e) => setDevice({ ...device, imei_or_serial: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Farbe</Label>
                <Input
                  value={device.color}
                  onChange={(e) => setDevice({ ...device, color: e.target.value })}
                  placeholder="z.B. Schwarz, Space Grau"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Description */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Fehlerbeschreibung
            </CardTitle>
            <CardDescription>Schaden und Problem dokumentieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fehlerart</Label>
                <Select
                  value={repair.error_code}
                  onValueChange={(value) => setRepair({ ...repair, error_code: value as ErrorCode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ERROR_CODE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select
                  value={repair.priority}
                  onValueChange={(value) => setRepair({ ...repair, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Detaillierte Fehlerbeschreibung</Label>
              <Textarea
                value={repair.error_description_text}
                onChange={(e) => setRepair({ ...repair, error_description_text: e.target.value })}
                placeholder="Beschreiben Sie das Problem genau..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Passcode / Entsperrung</Label>
              <Input
                value={repair.passcode_info}
                onChange={(e) => setRepair({ ...repair, passcode_info: e.target.value })}
                placeholder="z.B. Code erhalten: 1234 / Kein Code"
              />
            </div>
          </CardContent>
        </Card>

        {/* Accessories */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Zubehör
            </CardTitle>
            <CardDescription>Mitgebrachtes Zubehör dokumentieren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {ACCESSORIES.map((acc) => (
                <div key={acc.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={acc.id}
                    checked={selectedAccessories.includes(acc.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAccessories([...selectedAccessories, acc.id]);
                      } else {
                        setSelectedAccessories(selectedAccessories.filter((a) => a !== acc.id));
                      }
                    }}
                  />
                  <Label htmlFor={acc.id} className="cursor-pointer">{acc.label}</Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Zusätzliche Anmerkungen</Label>
              <Input
                value={accessoriesNote}
                onChange={(e) => setAccessoriesNote(e.target.value)}
                placeholder="Weitere Details zum Zubehör..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Euro className="h-5 w-5 text-success" />
              Preisgestaltung
            </CardTitle>
            <CardDescription>Preismodus und geschätzten Preis festlegen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Preismodus</Label>
                <Select
                  value={repair.price_mode}
                  onValueChange={(value) => setRepair({ ...repair, price_mode: value as PriceMode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXPREIS">Fixpreis</SelectItem>
                    <SelectItem value="KVA">Kostenvoranschlag (KVA)</SelectItem>
                    <SelectItem value="NACH_AUFWAND">Nach Aufwand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Geschätzter Preis (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={repair.estimated_price}
                  onChange={(e) => setRepair({ ...repair, estimated_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Rechtliche Hinweise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Wichtige Hinweise:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Bitte sichern Sie Ihre Daten vor der Abgabe. Wir übernehmen keine Haftung für Datenverlust.</li>
                <li>Face ID / Touch ID muss vor der Reparatur deaktiviert werden.</li>
                <li>Bei wasserbeschädigten Geräten besteht ein erhöhtes Risiko für Folgeschäden.</li>
                <li>Die Reparatur erfolgt nach bestem Wissen und Gewissen.</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="legal-ack"
                checked={legalAck}
                onCheckedChange={(checked) => setLegalAck(checked as boolean)}
              />
              <Label htmlFor="legal-ack" className="cursor-pointer">
                Der Kunde bestätigt, die AGB und Haftungshinweise zur Kenntnis genommen zu haben *
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1 sm:flex-none"
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={createTicketMutation.isPending}
            className="flex-1 sm:flex-none gap-2"
          >
            {createTicketMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Erstelle...
              </>
            ) : (
              'Ticket erstellen'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
