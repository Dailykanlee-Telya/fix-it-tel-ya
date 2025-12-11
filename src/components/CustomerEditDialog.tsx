import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  marketing_consent?: boolean;
  marketing_consent_at?: string | null;
}

interface CustomerEditDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerEditDialog({
  customer,
  open,
  onOpenChange,
}: CustomerEditDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    marketing_consent: false,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        marketing_consent: customer.marketing_consent || false,
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!customer) return;
      const previousConsent = customer.marketing_consent || false;
      const newConsent = data.marketing_consent;
      
      const { error } = await supabase
        .from('customers')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null,
          marketing_consent: data.marketing_consent,
          // Update timestamp only if consent changed from false to true
          ...(newConsent && !previousConsent ? { marketing_consent_at: new Date().toISOString() } : {}),
        })
        .eq('id', customer.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Kunde erfolgreich aktualisiert');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Fehler beim Aktualisieren des Kunden');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.phone) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kunde bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Vorname *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nachname *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(value) => setFormData({ ...formData, address: value })}
              placeholder="Adresse eingeben..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit_marketing_consent"
              checked={formData.marketing_consent}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, marketing_consent: checked === true })
              }
            />
            <Label htmlFor="edit_marketing_consent" className="text-sm font-normal cursor-pointer">
              Kunde stimmt Marketing- und Werbemitteilungen zu
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
