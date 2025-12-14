import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Euro, Save } from 'lucide-react';

interface KvaFeeInputProps {
  ticketId: string;
  currentFeeAmount: number | null;
  currentFeeApplicable: boolean | null;
  onUpdate: () => void;
}

export function KvaFeeInput({ 
  ticketId, 
  currentFeeAmount, 
  currentFeeApplicable,
  onUpdate 
}: KvaFeeInputProps) {
  const [feeAmount, setFeeAmount] = useState<string>(
    currentFeeAmount !== null ? currentFeeAmount.toString() : ''
  );
  const [feeApplicable, setFeeApplicable] = useState<boolean>(
    currentFeeApplicable ?? false
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFeeAmount(currentFeeAmount !== null ? currentFeeAmount.toString() : '');
    setFeeApplicable(currentFeeApplicable ?? false);
  }, [currentFeeAmount, currentFeeApplicable]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedAmount = feeAmount ? parseFloat(feeAmount) : null;
      
      const { error } = await supabase
        .from('repair_tickets')
        .update({
          kva_fee_amount: parsedAmount,
          kva_fee_applicable: feeApplicable
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('KVA-Gebühr gespeichert');
      onUpdate();
    } catch (error: any) {
      console.error('Error saving KVA fee:', error);
      toast.error('Fehler beim Speichern der KVA-Gebühr');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Euro className="h-4 w-4" />
          KVA-Gebühr
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kva-fee">Gebühr bei Nicht-Reparatur (€)</Label>
          <Input
            id="kva-fee"
            type="number"
            step="0.01"
            min="0"
            placeholder="z.B. 19.90"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="fee-applicable"
            checked={feeApplicable}
            onCheckedChange={(checked) => setFeeApplicable(checked === true)}
          />
          <Label htmlFor="fee-applicable" className="text-sm font-normal cursor-pointer">
            KVA-Gebühr nur bei Nicht-Reparatur berechnen
          </Label>
        </div>

        <p className="text-xs text-muted-foreground">
          Wenn aktiviert, wird die Gebühr nur berechnet, wenn der Kunde die Reparatur ablehnt.
        </p>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Speichern...' : 'Speichern'}
        </Button>
      </CardContent>
    </Card>
  );
}
