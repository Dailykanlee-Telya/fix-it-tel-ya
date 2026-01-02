import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { PURCHASE_ORDER_STATUS_LABELS, PurchaseOrderStatus } from '@/types/inventory';

interface PurchaseOrdersTabProps {
  selectedLocation: string;
}

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ORDERED: 'bg-info/10 text-info',
  PARTIALLY_RECEIVED: 'bg-warning/10 text-warning',
  COMPLETED: 'bg-success/10 text-success',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

export default function PurchaseOrdersTab({ selectedLocation }: PurchaseOrdersTabProps) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(id, name),
          stock_location:stock_locations(id, name, location:locations(id, name))
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedLocation !== 'all') {
        query = query.eq('stock_location_id', selectedLocation);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Bestellungen
        </CardTitle>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Neue Bestellung
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bestellnr.</TableHead>
                <TableHead>Lieferant</TableHead>
                <TableHead>Lagerort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bestelldatum</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Keine Bestellungen gefunden
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order: any) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.supplier?.name}</TableCell>
                    <TableCell>{order.stock_location?.location?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[order.status as PurchaseOrderStatus]}>
                        {PURCHASE_ORDER_STATUS_LABELS[order.status as PurchaseOrderStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.order_date
                        ? format(new Date(order.order_date), 'dd.MM.yyyy', { locale: de })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {order.total_amount?.toFixed(2)} €
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
