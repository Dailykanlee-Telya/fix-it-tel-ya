import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  Loader2,
  Check,
  Minus
} from 'lucide-react';

const PART_CATEGORIES = [
  { value: 'DISPLAY', label: 'Display' },
  { value: 'AKKU', label: 'Akku' },
  { value: 'LADEBUCHSE', label: 'Ladebuchse' },
  { value: 'KAMERA_VORNE', label: 'Kamera vorne' },
  { value: 'KAMERA_HINTEN', label: 'Kamera hinten' },
  { value: 'LAUTSPRECHER', label: 'Lautsprecher' },
  { value: 'MIKROFON', label: 'Mikrofon' },
  { value: 'BACKCOVER', label: 'Backcover' },
  { value: 'RAHMEN', label: 'Rahmen' },
  { value: 'FLEXKABEL', label: 'Flexkabel' },
  { value: 'BUTTONS', label: 'Buttons' },
  { value: 'VIBRATIONSMOTOR', label: 'Vibrationsmotor' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
] as const;

interface TicketPartSelectorProps {
  ticketId: string;
  deviceBrand: string | null | undefined;
  deviceModel: string | null | undefined;
  deviceType: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNewPart?: () => void;
  manufacturerId?: string | null;
  modelId?: string | null;
}

interface Part {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  device_type: string | null;
  part_category: string | null;
  stock_quantity: number;
  sales_price: number;
  purchase_price: number;
  storage_location: string | null;
  manufacturer_id: string | null;
  model_id: string | null;
  stock_location_id: string | null;
}

export default function TicketPartSelector({
  ticketId,
  deviceBrand,
  deviceModel,
  deviceType,
  open,
  onOpenChange,
  onCreateNewPart,
}: TicketPartSelectorProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Check if we have the required device info
  const hasDeviceInfo = !!deviceBrand;

  // Get manufacturer_id from brand name
  const { data: manufacturer } = useQuery({
    queryKey: ['manufacturer-by-name', deviceBrand],
    queryFn: async () => {
      if (!deviceBrand) return null;
      const { data, error } = await supabase
        .from('manufacturers')
        .select('id, name')
        .ilike('name', deviceBrand)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!deviceBrand,
  });

  // Get model_id from device_catalog
  const { data: catalogModel } = useQuery({
    queryKey: ['catalog-model', deviceBrand, deviceModel],
    queryFn: async () => {
      if (!deviceBrand || !deviceModel) return null;
      const { data, error } = await supabase
        .from('device_catalog')
        .select('id, brand, model')
        .ilike('brand', deviceBrand)
        .ilike('model', deviceModel)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!deviceBrand && !!deviceModel,
  });

  // Fetch parts with STRICT context-based filtering (3-tier query)
  // CRITICAL: Model-specific parts must EXACTLY match the device's model_id
  const { data: contextParts, isLoading: partsLoading } = useQuery({
    queryKey: ['context-parts', manufacturer?.id, catalogModel?.id, deviceType],
    queryFn: async () => {
      if (!manufacturer?.id) return { modelSpecific: [], manufacturerSpecific: [], generic: [] };

      // 1. Model-specific parts - ONLY if we have a catalogModel
      // Must EXACTLY match manufacturer_id AND model_id
      let modelSpecific: Part[] = [];
      if (catalogModel?.id) {
        const { data, error } = await supabase
          .from('parts')
          .select('*')
          .eq('manufacturer_id', manufacturer.id)
          .eq('model_id', catalogModel.id)
          .eq('is_active', true);
        
        if (error) throw error;
        modelSpecific = data || [];
      }

      // 2. Manufacturer-specific universal parts (model_id IS NULL)
      // These parts work for ALL models of this manufacturer
      const { data: manufacturerSpecific, error: manuError } = await supabase
        .from('parts')
        .select('*')
        .eq('manufacturer_id', manufacturer.id)
        .is('model_id', null)
        .eq('is_active', true);
      if (manuError) throw manuError;

      // 3. Generic parts (manufacturer_id IS NULL AND model_id IS NULL)
      // These parts work for any device
      const { data: generic, error: genError } = await supabase
        .from('parts')
        .select('*')
        .is('manufacturer_id', null)
        .is('model_id', null)
        .eq('is_active', true);
      if (genError) throw genError;

      return {
        modelSpecific: modelSpecific,
        manufacturerSpecific: manufacturerSpecific || [],
        generic: generic || [],
      };
    },
    enabled: open && !!manufacturer?.id,
  });

  // Apply filters and search
  const filteredParts = useMemo(() => {
    if (!contextParts) return { modelSpecific: [], manufacturerSpecific: [], generic: [] };

    const filterGroup = (parts: Part[]) => {
      return parts.filter(part => {
        // Category filter
        if (categoryFilter !== 'all' && part.part_category !== categoryFilter) {
          return false;
        }
        // Availability filter
        if (onlyAvailable && part.stock_quantity <= 0) {
          return false;
        }
        // Search filter
        if (searchQuery) {
          const search = searchQuery.toLowerCase();
          const matchesName = part.name?.toLowerCase().includes(search);
          const matchesSku = part.sku?.toLowerCase().includes(search);
          if (!matchesName && !matchesSku) {
            return false;
          }
        }
        return true;
      });
    };

    return {
      modelSpecific: filterGroup(contextParts.modelSpecific),
      manufacturerSpecific: filterGroup(contextParts.manufacturerSpecific),
      generic: filterGroup(contextParts.generic),
    };
  }, [contextParts, categoryFilter, onlyAvailable, searchQuery]);

  const totalPartsCount = 
    filteredParts.modelSpecific.length + 
    filteredParts.manufacturerSpecific.length + 
    filteredParts.generic.length;

  // Get ticket details for location
  const { data: ticket } = useQuery({
    queryKey: ['ticket-location', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select('id, location_id')
        .eq('id', ticketId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Get default stock location for the ticket's location
  const { data: defaultStockLocation } = useQuery({
    queryKey: ['default-stock-location', ticket?.location_id],
    queryFn: async () => {
      if (!ticket?.location_id) return null;
      const { data, error } = await supabase
        .from('stock_locations')
        .select('id')
        .eq('location_id', ticket.location_id)
        .eq('is_default', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!ticket?.location_id,
  });

  // Add part mutation using stock_movement RPC for revision-proof tracking
  const addPartMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPart) throw new Error('Kein Teil ausgewählt');
      if (quantity <= 0) throw new Error('Ungültige Menge');
      if (quantity > selectedPart.stock_quantity) {
        throw new Error(`Nur ${selectedPart.stock_quantity} Stück verfügbar`);
      }

      // Determine stock location: use part's location or fallback to ticket's default location
      const stockLocationId = selectedPart.stock_location_id || defaultStockLocation?.id;
      
      if (!stockLocationId) {
        throw new Error('Kein Lagerort gefunden. Bitte dem Teil einen Lagerort zuweisen.');
      }

      // Use the book_part_usage RPC for proper stock tracking
      const { data: usageId, error: usageError } = await supabase
        .rpc('book_part_usage', {
          _ticket_id: ticketId,
          _part_id: selectedPart.id,
          _quantity: quantity,
          _reason: 'REPARATUR',
          _note: null,
        });

      if (usageError) throw usageError;
      
      return usageId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-parts', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['context-parts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      onOpenChange(false);
      setSelectedPart(null);
      setQuantity(1);
      setSearchQuery('');
      setCategoryFilter('all');
      toast({
        title: 'Teil hinzugefügt',
        description: `${selectedPart?.name} wurde zum Auftrag hinzugefügt.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const renderPartItem = (part: Part) => {
    const isSelected = selectedPart?.id === part.id;
    const outOfStock = part.stock_quantity <= 0;

    return (
      <button
        key={part.id}
        onClick={() => !outOfStock && setSelectedPart(isSelected ? null : part)}
        disabled={outOfStock}
        className={`w-full text-left p-3 rounded-lg border transition-colors ${
          isSelected 
            ? 'border-primary bg-primary/5' 
            : outOfStock 
            ? 'border-muted bg-muted/30 opacity-60 cursor-not-allowed'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{part.name}</span>
              {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {part.sku && <span className="font-mono">{part.sku}</span>}
              {part.part_category && (
                <Badge variant="outline" className="text-xs">
                  {PART_CATEGORIES.find(c => c.value === part.part_category)?.label || part.part_category}
                </Badge>
              )}
            </div>
            {part.storage_location && (
              <p className="text-xs text-muted-foreground mt-1">
                Lagerort: {part.storage_location}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-medium">{part.sales_price?.toFixed(2)} €</p>
            <p className={`text-xs ${outOfStock ? 'text-destructive' : 'text-muted-foreground'}`}>
              {outOfStock ? 'Nicht verfügbar' : `${part.stock_quantity} Stück`}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderPartGroup = (title: string, parts: Part[], variant: 'primary' | 'secondary' | 'muted') => {
    if (parts.length === 0) return null;
    
    const variantStyles = {
      primary: 'bg-success/10 text-success border-success/30',
      secondary: 'bg-info/10 text-info border-info/30',
      muted: 'bg-muted text-muted-foreground border-muted',
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={variantStyles[variant]}>
            {title}
          </Badge>
          <span className="text-xs text-muted-foreground">{parts.length} Teile</span>
        </div>
        <div className="space-y-2">
          {parts.map(renderPartItem)}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setSelectedPart(null);
        setQuantity(1);
        setSearchQuery('');
        setCategoryFilter('all');
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ersatzteil hinzufügen
          </DialogTitle>
          <DialogDescription>
            {deviceBrand} {deviceModel} • {deviceType}
          </DialogDescription>
        </DialogHeader>

        {/* Missing device info warning */}
        {!hasDeviceInfo && (
          <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning">Geräteinformationen fehlen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Bitte zuerst Hersteller und Modell im Auftrag festlegen, um passende Teile zu finden.
              </p>
            </div>
          </div>
        )}

        {hasDeviceInfo && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 py-2">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name oder SKU suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {PART_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  id="only-available"
                  checked={onlyAvailable}
                  onCheckedChange={setOnlyAvailable}
                />
                <Label htmlFor="only-available" className="text-sm whitespace-nowrap">
                  Nur verfügbar
                </Label>
              </div>
            </div>

            <Separator />

            {/* Parts list */}
            <div className="flex-1 overflow-y-auto space-y-4 py-2 min-h-[300px]">
              {partsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : totalPartsCount === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Keine passenden Teile gefunden
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || categoryFilter !== 'all' 
                      ? 'Versuche andere Filtereinstellungen'
                      : `Keine Teile für ${deviceBrand} ${deviceModel || ''} im Lager`}
                  </p>
                  {onCreateNewPart && (
                    <Button 
                      variant="outline" 
                      className="mt-4 gap-2"
                      onClick={() => {
                        onOpenChange(false);
                        onCreateNewPart();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Neues Teil für dieses Modell anlegen
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {renderPartGroup(
                    `Passend zu ${deviceModel || deviceBrand}`,
                    filteredParts.modelSpecific,
                    'primary'
                  )}
                  {renderPartGroup(
                    `${deviceBrand} Universal`,
                    filteredParts.manufacturerSpecific,
                    'secondary'
                  )}
                  {renderPartGroup(
                    'Generisch',
                    filteredParts.generic,
                    'muted'
                  )}
                </>
              )}
            </div>

            <Separator />

            {/* Selection and quantity */}
            {selectedPart && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedPart.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPart.sales_price?.toFixed(2)} € pro Stück
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={selectedPart.stock_quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(
                        selectedPart.stock_quantity,
                        Math.max(1, parseInt(e.target.value) || 1)
                      ))}
                      className="w-16 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.min(selectedPart.stock_quantity, quantity + 1))}
                      disabled={quantity >= selectedPart.stock_quantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gesamt:</span>
                  <span className="font-bold text-lg">
                    {(selectedPart.sales_price * quantity).toFixed(2)} €
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => addPartMutation.mutate()}
            disabled={!selectedPart || addPartMutation.isPending || !hasDeviceInfo}
          >
            {addPartMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
