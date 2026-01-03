import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Save, Loader2, MapPin, Phone, Mail, FileText } from 'lucide-react';

interface CompanyData {
  name: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  vat_id: string;
  managing_director: string;
  commercial_register: string;
  bank_name: string;
  iban: string;
}

const DEFAULT_COMPANY_DATA: CompanyData = {
  name: 'Telya GmbH',
  street: 'Schalker Str. 59',
  zip: '45881',
  city: 'Gelsenkirchen',
  country: 'Deutschland',
  phone: '0209 88307161',
  email: 'service@telya.de',
  vat_id: 'DE331142364',
  managing_director: 'Serkan Genc',
  commercial_register: 'HRB 15717',
  bank_name: 'Volksbank Bochum Witten',
  iban: 'DE59430601290118905200',
};

export default function CompanySettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState<CompanyData>(DEFAULT_COMPANY_DATA);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'company_data')
        .maybeSingle();
      
      if (error) throw error;
      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        return data.value as unknown as CompanyData;
      }
      return null;
    },
  });

  useEffect(() => {
    if (settings && typeof settings === 'object') {
      setFormData({ ...DEFAULT_COMPANY_DATA, ...(settings as unknown as CompanyData) });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'company_data',
          value: formData as any,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        });

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert([{
        user_id: user?.id,
        action: 'UPDATE',
        entity_type: 'company_settings',
        entity_id: 'company_data',
        meta: { changes: formData } as any,
      }]);

      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast({
        title: 'Firmendaten gespeichert',
        description: 'Die Änderungen wurden erfolgreich übernommen.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof CompanyData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Firmendaten
          </CardTitle>
          <CardDescription>
            Diese Daten werden auf allen Dokumenten und in der Kommunikation verwendet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Firmenname</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Geschäftsführer</Label>
              <Input
                value={formData.managing_director}
                onChange={(e) => updateField('managing_director', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Adresse
            </Label>
            <Input
              value={formData.street}
              onChange={(e) => updateField('street', e.target.value)}
              placeholder="Straße und Hausnummer"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                value={formData.zip}
                onChange={(e) => updateField('zip', e.target.value)}
                placeholder="PLZ"
              />
              <Input
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Stadt"
                className="sm:col-span-2"
              />
            </div>
            <Input
              value={formData.country}
              onChange={(e) => updateField('country', e.target.value)}
              placeholder="Land"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefon
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-Mail
              </Label>
              <Input
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal & Bank Info */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rechtliche Angaben & Bankdaten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>USt-IdNr.</Label>
              <Input
                value={formData.vat_id}
                onChange={(e) => updateField('vat_id', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Handelsregister</Label>
              <Input
                value={formData.commercial_register}
                onChange={(e) => updateField('commercial_register', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Bank</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => updateField('bank_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input
                value={formData.iban}
                onChange={(e) => updateField('iban', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Änderungen speichern
        </Button>
      </div>
    </div>
  );
}
