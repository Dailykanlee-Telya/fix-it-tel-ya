import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { escapeLikePattern } from '@/lib/utils';
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
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DeviceType,
  ErrorCode,
  PriceMode,
  DEVICE_TYPE_LABELS,
  ERROR_CODE_LABELS,
  Customer,
} from '@/types/database';
import DeviceModelSelect from '@/components/DeviceModelSelect';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { validateIMEI } from '@/lib/imei-validation';
import PhotoUpload, { UploadedPhoto, usePhotoUpload } from '@/components/intake/PhotoUpload';

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
    marketing_consent: false,
  });

  // Device state
  const [device, setDevice] = useState({
    device_type: 'HANDY' as DeviceType,
    brand: '',
    model: '',
    imei_or_serial: '',
    color: '',
    imei_unreadable: false,
    serial_number: '',
    serial_unreadable: false,
  });
  const [imeiError, setImeiError] = useState<string | null>(null);

  // Photo upload hook
  const { photos, setPhotos, uploadPhotos, savePhotoRecords } = usePhotoUpload();

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
      
      const escapedSearch = escapeLikePattern(customerSearch);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`first_name.ilike.%${escapedSearch}%,last_name.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`)
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
            marketing_consent: newCustomer.marketing_consent,
            marketing_consent_at: newCustomer.marketing_consent ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomerData.id;
      }

      if (!customerId) throw new Error('Kein Kunde ausgewählt');

      // Create device with IMEI/Serial fields
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .insert({
          customer_id: customerId,
          device_type: device.device_type,
          brand: device.brand,
          model: device.model,
          imei_or_serial: device.device_type === 'HANDY' ? (device.imei_or_serial || null) : null,
          color: device.color || null,
          imei_unreadable: device.device_type === 'HANDY' ? device.imei_unreadable : false,
          serial_number: device.device_type !== 'HANDY' ? (device.serial_number || null) : null,
          serial_unreadable: device.device_type !== 'HANDY' ? device.serial_unreadable : false,
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

      // Generate tracking token (kva_token)
      const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let token = '';
        for (let i = 0; i < 8; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };
      const kvaToken = generateToken();

      // Build accessories string
      const accessoriesStr = [
        ...selectedAccessories.map(id => ACCESSORIES.find(a => a.id === id)?.label),
        accessoriesNote,
      ].filter(Boolean).join(', ');

      // Create ticket with tracking token
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
          kva_token: kvaToken,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create status history entry
      await supabase.from('status_history').insert({
        repair_ticket_id: ticketData.id,
        new_status: 'NEU_EINGEGANGEN',
        changed_by_user_id: profile?.id,
        note: 'Auftrag erstellt',
      });

      // Upload photos if any
      if (photos.length > 0) {
        try {
          const uploadedUrls = await uploadPhotos(ticketData.id);
          await savePhotoRecords(ticketData.id, uploadedUrls);
        } catch (photoError) {
          console.error('Error uploading photos:', photoError);
          // Don't fail the whole ticket creation if photo upload fails
        }
      }

      // TODO: Email-Versand vorübergehend deaktiviert bis Domain bei Resend verifiziert ist
      // Reaktivieren nach Domain-Verifizierung unter resend.com/domains

      return ticketData;
    },
    onSuccess: (data) => {
      toast({
        title: 'Auftrag erstellt',
        description: `Auftragsnummer: ${data.ticket_number}`,
      });
      navigate(`/tickets/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Auftrag konnte nicht erstellt werden',
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

    // IMEI Validation for HANDY only (if not marked as unreadable)
    if (device.device_type === 'HANDY' && !device.imei_unreadable) {
      if (!device.imei_or_serial) {
        toast({
          variant: 'destructive',
          title: 'IMEI erforderlich',
          description: 'Bitte geben Sie die IMEI ein oder markieren Sie "IMEI nicht lesbar".',
        });
        return;
      }
      const imeiResult = validateIMEI(device.imei_or_serial);
      if (!imeiResult.isValid) {
        toast({
          variant: 'destructive',
          title: 'Ungültige IMEI',
          description: imeiResult.error,
        });
        setImeiError(imeiResult.error || null);
        return;
      }
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
        <p className="text-muted-foreground">Neuen Reparaturauftrag erstellen</p>
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
                  <AddressAutocomplete
                    value={newCustomer.address}
                    onChange={(address) => setNewCustomer({ ...newCustomer, address })}
                    placeholder="Straße, PLZ Ort eingeben..."
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="marketing_consent"
                    checked={newCustomer.marketing_consent}
                    onCheckedChange={(checked) => 
                      setNewCustomer({ ...newCustomer, marketing_consent: checked === true })
                    }
                    className="mt-0.5"
                  />
                  <Label htmlFor="marketing_consent" className="text-sm font-normal cursor-pointer leading-relaxed">
                    Kunde stimmt zu, Marketing- und Werbemitteilungen per E-Mail, SMS, WhatsApp und Telefon zu erhalten. 
                    Diese Einwilligung kann jederzeit widerrufen werden.
                  </Label>
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
                  onValueChange={(value) => setDevice({ 
                    ...device, 
                    device_type: value as DeviceType,
                    brand: '',
                    model: ''
                  })}
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
              deviceType={device.device_type}
              brand={device.brand}
              model={device.model}
              onBrandChange={(brand) => setDevice(prev => ({ ...prev, brand, model: '' }))}
              onModelChange={(model) => setDevice(prev => ({ ...prev, model }))}
            />

            {/* IMEI for HANDY */}
            {device.device_type === 'HANDY' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>IMEI {!device.imei_unreadable && '*'}</Label>
                    <Input
                      value={device.imei_or_serial}
                      onChange={(e) => {
                        setDevice({ ...device, imei_or_serial: e.target.value });
                        // Live validation
                        if (e.target.value && !device.imei_unreadable) {
                          const result = validateIMEI(e.target.value);
                          setImeiError(result.isValid ? null : (result.error || null));
                        } else {
                          setImeiError(null);
                        }
                      }}
                      placeholder={device.imei_unreadable ? 'Nicht lesbar' : '15-stellige IMEI'}
                      disabled={device.imei_unreadable}
                      className={imeiError && !device.imei_unreadable ? 'border-destructive' : ''}
                    />
                    {imeiError && !device.imei_unreadable && (
                      <p className="text-sm text-destructive">{imeiError}</p>
                    )}
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="imei_unreadable"
                    checked={device.imei_unreadable}
                    onCheckedChange={(checked) => {
                      setDevice({ 
                        ...device, 
                        imei_unreadable: checked === true,
                        imei_or_serial: checked ? '' : device.imei_or_serial
                      });
                      if (checked) setImeiError(null);
                    }}
                  />
                  <Label htmlFor="imei_unreadable" className="text-sm font-normal cursor-pointer">
                    IMEI nicht lesbar
                  </Label>
                </div>
              </div>
            )}

            {/* Serial number for non-HANDY devices */}
            {device.device_type !== 'HANDY' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Seriennummer</Label>
                    <Input
                      value={device.serial_number}
                      onChange={(e) => setDevice({ ...device, serial_number: e.target.value })}
                      placeholder={device.serial_unreadable ? 'Nicht lesbar' : 'Optional'}
                      disabled={device.serial_unreadable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Farbe</Label>
                    <Input
                      value={device.color}
                      onChange={(e) => setDevice({ ...device, color: e.target.value })}
                      placeholder="z.B. Schwarz, Silber"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="serial_unreadable"
                    checked={device.serial_unreadable}
                    onCheckedChange={(checked) => {
                      setDevice({ 
                        ...device, 
                        serial_unreadable: checked === true,
                        serial_number: checked ? '' : device.serial_number
                      });
                    }}
                  />
                  <Label htmlFor="serial_unreadable" className="text-sm font-normal cursor-pointer">
                    Seriennummer nicht lesbar
                  </Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Upload Section */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Fotos
            </CardTitle>
            <CardDescription>Fotos hinzufügen (z.B. Zustand bei Abgabe)</CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoUpload 
              onPhotosChange={setPhotos}
              maxPhotos={5}
            />
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
                <li>
                  Informationen zur Verarbeitung Ihrer Daten finden Sie in unserer{' '}
                  <Link to="/datenschutz" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                    Datenschutzerklärung <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="legal-ack"
                checked={legalAck}
                onCheckedChange={(checked) => setLegalAck(checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="legal-ack" className="cursor-pointer leading-relaxed">
                Der Kunde bestätigt, die AGB, Haftungshinweise und{' '}
                <Link to="/datenschutz" target="_blank" className="text-primary hover:underline">
                  Datenschutzerklärung
                </Link>{' '}
                zur Kenntnis genommen zu haben *
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
