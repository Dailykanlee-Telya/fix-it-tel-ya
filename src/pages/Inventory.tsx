import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInventoryPermissions } from '@/hooks/useInventoryPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Truck,
  ClipboardCheck,
  ArrowLeftRight,
  FileWarning,
  Loader2,
  Plus,
} from 'lucide-react';
import StockMovementsTable from '@/components/inventory/StockMovementsTable';
import PurchaseOrdersTab from '@/components/inventory/PurchaseOrdersTab';
import TransfersTab from '@/components/inventory/TransfersTab';
import ComplaintsTab from '@/components/inventory/ComplaintsTab';
import InventoryTab from '@/components/inventory/InventoryTab';
import SuppliersTab from '@/components/inventory/SuppliersTab';
import GoodsReceiptDialog from '@/components/inventory/GoodsReceiptDialog';
import ManualOutDialog from '@/components/inventory/ManualOutDialog';

export default function Inventory() {
  const { profile } = useAuth();
  const permissions = useInventoryPermissions();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [goodsReceiptOpen, setGoodsReceiptOpen] = useState(false);
  const [manualOutOpen, setManualOutOpen] = useState(false);

  // Fetch stock locations
  const { data: stockLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_locations')
        .select(`
          *,
          location:locations(id, name)
        `)
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

  // Fetch summary statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['inventory-stats', selectedLocation],
    queryFn: async () => {
      // Get total parts count and value
      let partsQuery = supabase
        .from('parts')
        .select('id, stock_quantity, purchase_price, stock_location_id');
      
      if (selectedLocation !== 'all') {
        partsQuery = partsQuery.eq('stock_location_id', selectedLocation);
      }

      const { data: parts, error: partsError } = await partsQuery;
      if (partsError) throw partsError;

      const totalParts = parts?.length || 0;
      const totalStock = parts?.reduce((sum, p) => sum + (p.stock_quantity || 0), 0) || 0;
      const totalValue = parts?.reduce((sum, p) => sum + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0) || 0;
      const lowStockCount = parts?.filter(p => (p.stock_quantity || 0) <= 5).length || 0;

      // Get today's movements
      const today = new Date().toISOString().split('T')[0];
      let movementsQuery = supabase
        .from('stock_movements')
        .select('id, movement_type, quantity')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (selectedLocation !== 'all') {
        movementsQuery = movementsQuery.eq('stock_location_id', selectedLocation);
      }

      const { data: movements, error: movError } = await movementsQuery;
      if (movError) throw movError;

      const todayIn = movements?.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0) || 0;
      const todayOut = movements?.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0) || 0;

      // Get open complaints
      const { count: openComplaints } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .in('status', ['OPEN', 'SENT_BACK']);

      return {
        totalParts,
        totalStock,
        totalValue,
        lowStockCount,
        todayIn,
        todayOut,
        openComplaints: openComplaints || 0,
      };
    },
  });

  if (!permissions.canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Keine Berechtigung</h2>
          <p className="text-muted-foreground mt-2">
            Sie haben keine Berechtigung, die Lagerverwaltung anzuzeigen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lagerverwaltung</h1>
          <p className="text-muted-foreground">
            Revisionssichere Verwaltung von Lagerbeständen und Warenbewegungen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Lagerort wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Lagerorte</SelectItem>
              {stockLocations.map((loc: any) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.location?.name} - {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {permissions.canReceiveGoods && (
            <Button onClick={() => setGoodsReceiptOpen(true)} className="gap-2">
              <ArrowDownRight className="h-4 w-4" />
              Wareneingang
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Artikel</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {statsLoading ? '-' : stats?.totalParts}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Bestand</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {statsLoading ? '-' : stats?.totalStock.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Lagerwert</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {statsLoading ? '-' : `${stats?.totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Niedrig</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-warning">
              {statsLoading ? '-' : stats?.lowStockCount}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Heute +</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-success">
              {statsLoading ? '-' : `+${stats?.todayIn}`}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Heute -</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">
              {statsLoading ? '-' : `-${stats?.todayOut}`}
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Rekla.</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">
              {statsLoading ? '-' : stats?.openComplaints}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="movements" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Bewegungen
          </TabsTrigger>
          {permissions.canCreatePurchaseOrder && (
            <TabsTrigger value="purchases" className="gap-2">
              <Truck className="h-4 w-4" />
              Bestellungen
            </TabsTrigger>
          )}
          {permissions.canCreateTransfer && (
            <TabsTrigger value="transfers" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Umlagerungen
            </TabsTrigger>
          )}
          {permissions.canManageComplaints && (
            <TabsTrigger value="complaints" className="gap-2">
              <FileWarning className="h-4 w-4" />
              Reklamationen
              {(stats?.openComplaints ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats?.openComplaints}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {permissions.canConductInventory && (
            <TabsTrigger value="inventory" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Inventur
            </TabsTrigger>
          )}
          {permissions.canManageSuppliers && (
            <TabsTrigger value="suppliers" className="gap-2">
              <Truck className="h-4 w-4" />
              Lieferanten
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="movements">
          <StockMovementsTable 
            selectedLocation={selectedLocation}
            canCreateManualOut={permissions.canCreateManualOut}
            onOpenManualOut={() => setManualOutOpen(true)}
          />
        </TabsContent>

        <TabsContent value="purchases">
          <PurchaseOrdersTab selectedLocation={selectedLocation} />
        </TabsContent>

        <TabsContent value="transfers">
          <TransfersTab selectedLocation={selectedLocation} stockLocations={stockLocations} />
        </TabsContent>

        <TabsContent value="complaints">
          <ComplaintsTab selectedLocation={selectedLocation} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryTab selectedLocation={selectedLocation} stockLocations={stockLocations} />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GoodsReceiptDialog
        open={goodsReceiptOpen}
        onOpenChange={setGoodsReceiptOpen}
        stockLocations={stockLocations}
      />

      <ManualOutDialog
        open={manualOutOpen}
        onOpenChange={setManualOutOpen}
        stockLocations={stockLocations}
      />
    </div>
  );
}
