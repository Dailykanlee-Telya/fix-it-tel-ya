// B2B Portal Types for Telya Repair Management System

export type B2BShipmentStatus = 
  | 'ANGELEGT' 
  | 'GERAETE_UNTERWEGS' 
  | 'BEI_TELYA_EINGEGANGEN' 
  | 'ABGESCHLOSSEN';

export interface B2BPartner {
  id: string;
  name: string;
  customer_number: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  default_return_address: ReturnAddress | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReturnAddress {
  name?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
}

export interface B2BShipment {
  id: string;
  b2b_partner_id: string;
  shipment_number: string;
  status: B2BShipmentStatus;
  created_by: string | null;
  dhl_tracking_number: string | null;
  dhl_label_url: string | null;
  sender_address: ReturnAddress | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  b2b_partner?: B2BPartner;
  creator?: { name: string };
  tickets?: B2BTicketSummary[];
}

export interface B2BTicketSummary {
  id: string;
  ticket_number: string;
  endcustomer_reference: string | null;
  status: string;
  device?: {
    device_type: string;
    brand: string;
    model: string;
  };
}

export const B2B_SHIPMENT_STATUS_LABELS: Record<B2BShipmentStatus, string> = {
  'ANGELEGT': 'Angelegt',
  'GERAETE_UNTERWEGS': 'Geräte unterwegs',
  'BEI_TELYA_EINGEGANGEN': 'Bei Telya eingegangen',
  'ABGESCHLOSSEN': 'Abgeschlossen',
};

export const B2B_SHIPMENT_STATUS_COLORS: Record<B2BShipmentStatus, string> = {
  'ANGELEGT': 'bg-gray-100 text-gray-800',
  'GERAETE_UNTERWEGS': 'bg-blue-100 text-blue-800',
  'BEI_TELYA_EINGEGANGEN': 'bg-amber-100 text-amber-800',
  'ABGESCHLOSSEN': 'bg-green-100 text-green-800',
};

// Company address for shipping labels
export const TELYA_ADDRESS = {
  name: 'Telya GmbH',
  street: 'Musterstraße 123',
  zip: '12345',
  city: 'Berlin',
  country: 'Deutschland',
  phone: '+49 30 123456789',
  email: 'reparatur@telya.de',
};
