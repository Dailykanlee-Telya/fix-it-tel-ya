import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ModelRequestButtonProps {
  deviceType: string;
  brand: string;
  onSuccess?: () => void;
}

export default function ModelRequestButton({ deviceType, brand, onSuccess }: ModelRequestButtonProps) {
  const { b2bPartnerId, user } = useB2BAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState('');

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!b2bPartnerId || !modelName.trim()) {
        throw new Error('Modellname erforderlich');
      }

      const { error } = await supabase.from('model_requests').insert({
        b2b_partner_id: b2bPartnerId,
        requested_by: user?.id,
        device_type: deviceType,
        brand: brand,
        model_name: modelName.trim(),
        status: 'PENDING',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Modellanfrage gesendet', {
        description: 'Telya wird das Modell prüfen und ggf. hinzufügen.',
      });
      setOpen(false);
      setModelName('');
      queryClient.invalidateQueries({ queryKey: ['model-requests'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error('Fehler', {
        description: error.message || 'Anfrage konnte nicht gesendet werden.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) {
      toast.error('Bitte geben Sie einen Modellnamen ein');
      return;
    }
    createRequest.mutate();
  };

  if (!brand) {
    return null; // Only show if brand is selected
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-primary"
      >
        <AlertCircle className="h-4 w-4 mr-1" />
        Modell fehlt?
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modellanfrage an Telya</DialogTitle>
            <DialogDescription>
              Das gewünschte Modell ist nicht im Katalog? Senden Sie eine Anfrage an Telya.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Hersteller</Label>
              <Input value={brand} disabled />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model-name">Modellname *</Label>
              <Input
                id="model-name"
                placeholder="z.B. iPhone 17 Pro Max"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Bitte geben Sie die genaue Modellbezeichnung an.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Anfrage senden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
