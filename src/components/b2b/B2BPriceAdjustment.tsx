import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Euro, Send, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface B2BPriceAdjustmentProps {
  ticketId: string;
  internalPrice: number | null;
  endcustomerPrice: number | null;
  endcustomerPriceReleased: boolean;
  onUpdate: () => void;
}

export function B2BPriceAdjustment({ 
  ticketId, 
  internalPrice,
  endcustomerPrice,
  endcustomerPriceReleased,
  onUpdate 
}: B2BPriceAdjustmentProps) {
  const [customerPrice, setCustomerPrice] = useState<string>(
    endcustomerPrice !== null ? endcustomerPrice.toString() : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  useEffect(() => {
    setCustomerPrice(endcustomerPrice !== null ? endcustomerPrice.toString() : '');
  }, [endcustomerPrice]);

  const handleSavePrice = async () => {
    setIsSaving(true);
    try {
      const parsedPrice = customerPrice ? parseFloat(customerPrice) : null;
      
      const { error } = await supabase
        .from('repair_tickets')
        .update({
          endcustomer_price: parsedPrice
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Endkundenpreis gespeichert');
      onUpdate();
    } catch (error: any) {
      console.error('Error saving price:', error);
      toast.error('Fehler beim Speichern des Preises');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReleasePrice = async () => {
    if (!customerPrice || parseFloat(customerPrice) <= 0) {
      toast.error('Bitte zuerst einen gültigen Endkundenpreis eingeben');
      return;
    }

    setIsReleasing(true);
    try {
      const { error } = await supabase
        .from('repair_tickets')
        .update({
          endcustomer_price: parseFloat(customerPrice),
          endcustomer_price_released: true
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Endkundenpreis für Kunden freigegeben');
      onUpdate();
    } catch (error: any) {
      console.error('Error releasing price:', error);
      toast.error('Fehler beim Freigeben des Preises');
    } finally {
      setIsReleasing(false);
    }
  };

  const suggestedPrice = internalPrice ? (internalPrice * 1.2).toFixed(2) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Preisgestaltung
            </CardTitle>
            <CardDescription className="mt-1">
              Endkundenpreis anpassen und freigeben
            </CardDescription>
          </div>
          {endcustomerPriceReleased && (
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 mr-1" />
              Freigegeben
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Internal Price Display */}
        <div className="p-3 bg-muted rounded-lg">
          <Label className="text-xs text-muted-foreground">Telya-Preis (Ihr Einkaufspreis)</Label>
          <p className="text-lg font-semibold">
            {internalPrice !== null ? `${internalPrice.toFixed(2)} €` : 'Noch nicht festgelegt'}
          </p>
        </div>

        {/* Customer Price Input */}
        <div className="space-y-2">
          <Label htmlFor="customer-price">Endkundenpreis (€)</Label>
          <Input
            id="customer-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Preis für Ihren Endkunden"
            value={customerPrice}
            onChange={(e) => setCustomerPrice(e.target.value)}
            disabled={endcustomerPriceReleased}
          />
          {suggestedPrice && !customerPrice && (
            <p className="text-xs text-muted-foreground">
              Vorschlag (+20%): {suggestedPrice} €
            </p>
          )}
        </div>

        {!endcustomerPriceReleased && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Der Endkunde sieht den Preis erst, wenn Sie ihn freigeben.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {!endcustomerPriceReleased && (
            <>
              <Button 
                onClick={handleSavePrice} 
                disabled={isSaving}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </Button>
              <Button 
                onClick={handleReleasePrice} 
                disabled={isReleasing || !customerPrice}
                className="flex-1"
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {isReleasing ? 'Freigeben...' : 'Freigeben'}
              </Button>
            </>
          )}
          {endcustomerPriceReleased && (
            <p className="text-sm text-muted-foreground">
              Der Preis von <strong>{endcustomerPrice?.toFixed(2)} €</strong> ist für den Endkunden sichtbar.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
