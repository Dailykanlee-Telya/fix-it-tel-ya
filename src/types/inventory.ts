// Inventory Management Types

export type StockMovementType =
  | 'PURCHASE'
  | 'CONSUMPTION'
  | 'MANUAL_OUT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'COMPLAINT_OUT'
  | 'COMPLAINT_CREDIT'
  | 'COMPLAINT_REPLACE'
  | 'WRITE_OFF'
  | 'INVENTORY_PLUS'
  | 'INVENTORY_MINUS'
  | 'INITIAL_STOCK';

export type ComplaintStatus =
  | 'OPEN'
  | 'SENT_BACK'
  | 'CREDIT_RECEIVED'
  | 'REPLACEMENT_RECEIVED'
  | 'CLOSED';

export type InventoryStatus =
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockLocation {
  id: string;
  location_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  location?: {
    id: string;
    name: string;
  };
}

export interface StockMovement {
  id: string;
  movement_type: StockMovementType;
  part_id: string;
  stock_location_id: string;
  quantity: number;
  unit_price?: number;
  total_value?: number;
  repair_ticket_id?: string;
  supplier_id?: string;
  purchase_order_id?: string;
  complaint_id?: string;
  transfer_movement_id?: string;
  inventory_session_id?: string;
  reason?: string;
  notes?: string;
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  stock_before: number;
  stock_after: number;
  created_by: string;
  created_at: string;
  // Joined data
  part?: {
    id: string;
    name: string;
    sku?: string;
  };
  stock_location?: StockLocation;
  supplier?: Supplier;
  repair_ticket?: {
    id: string;
    ticket_number: string;
  };
  created_by_profile?: {
    id: string;
    name: string;
  };
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  stock_location_id: string;
  status: PurchaseOrderStatus;
  order_date?: string;
  expected_delivery?: string;
  invoice_number?: string;
  invoice_date?: string;
  notes?: string;
  total_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  supplier?: Supplier;
  stock_location?: StockLocation;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  part_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  received_at?: string;
  created_at: string;
  // Joined data
  part?: {
    id: string;
    name: string;
    sku?: string;
  };
}

export interface Complaint {
  id: string;
  complaint_number: string;
  part_id: string;
  supplier_id: string;
  stock_location_id: string;
  repair_ticket_id?: string;
  quantity: number;
  status: ComplaintStatus;
  reason: string;
  resolution_type?: 'CREDIT' | 'REPLACEMENT' | 'REJECTED';
  credit_amount?: number;
  replacement_quantity?: number;
  sent_back_at?: string;
  resolved_at?: string;
  tracking_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  part?: {
    id: string;
    name: string;
    sku?: string;
  };
  supplier?: Supplier;
  stock_location?: StockLocation;
}

export interface InventorySession {
  id: string;
  session_number: string;
  stock_location_id: string;
  status: InventoryStatus;
  started_at: string;
  completed_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  notes?: string;
  total_items_counted: number;
  total_discrepancies: number;
  total_value_difference: number;
  created_by: string;
  created_at: string;
  // Joined data
  stock_location?: StockLocation;
  counts?: InventoryCount[];
}

export interface InventoryCount {
  id: string;
  inventory_session_id: string;
  part_id: string;
  expected_quantity: number;
  counted_quantity: number;
  difference: number;
  unit_value: number;
  value_difference: number;
  discrepancy_reason?: string;
  counted_by: string;
  counted_at: string;
  // Joined data
  part?: {
    id: string;
    name: string;
    sku?: string;
  };
}

// Labels for UI display
export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  PURCHASE: 'Wareneingang',
  CONSUMPTION: 'Verbrauch (Auftrag)',
  MANUAL_OUT: 'Manuelle Entnahme',
  TRANSFER_OUT: 'Umlagerung Ausgang',
  TRANSFER_IN: 'Umlagerung Eingang',
  COMPLAINT_OUT: 'Reklamation Rücksendung',
  COMPLAINT_CREDIT: 'Reklamation Gutschrift',
  COMPLAINT_REPLACE: 'Reklamation Ersatzlieferung',
  WRITE_OFF: 'Abschreibung',
  INVENTORY_PLUS: 'Inventurkorrektur +',
  INVENTORY_MINUS: 'Inventurkorrektur -',
  INITIAL_STOCK: 'Anfangsbestand',
};

export const MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  PURCHASE: 'bg-success/10 text-success',
  CONSUMPTION: 'bg-info/10 text-info',
  MANUAL_OUT: 'bg-warning/10 text-warning',
  TRANSFER_OUT: 'bg-muted text-muted-foreground',
  TRANSFER_IN: 'bg-muted text-muted-foreground',
  COMPLAINT_OUT: 'bg-destructive/10 text-destructive',
  COMPLAINT_CREDIT: 'bg-success/10 text-success',
  COMPLAINT_REPLACE: 'bg-success/10 text-success',
  WRITE_OFF: 'bg-destructive/10 text-destructive',
  INVENTORY_PLUS: 'bg-success/10 text-success',
  INVENTORY_MINUS: 'bg-destructive/10 text-destructive',
  INITIAL_STOCK: 'bg-muted text-muted-foreground',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: 'Offen',
  SENT_BACK: 'Zurückgesendet',
  CREDIT_RECEIVED: 'Gutschrift erhalten',
  REPLACEMENT_RECEIVED: 'Ersatz erhalten',
  CLOSED: 'Abgeschlossen',
};

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  IN_PROGRESS: 'In Bearbeitung',
  PENDING_APPROVAL: 'Wartet auf Freigabe',
  APPROVED: 'Freigegeben',
  REJECTED: 'Abgelehnt',
};

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Entwurf',
  ORDERED: 'Bestellt',
  PARTIALLY_RECEIVED: 'Teilweise geliefert',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
};
