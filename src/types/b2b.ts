// B2B Portal Types for Telya Repair Management System

export type B2BShipmentStatus = 
  | 'ANGELEGT' 
  | 'GERAETE_UNTERWEGS' 
  | 'BEI_TELYA_EINGEGANGEN' 
  | 'ABGESCHLOSSEN'
  | 'RETOUR_ANGELEGT'
  | 'RETOUR_UNTERWEGS'
  | 'RETOUR_ZUGESTELLT';

export type B2BShipmentType = 'INBOUND' | 'OUTBOUND';

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
  shipment_type: B2BShipmentType;
  created_by: string | null;
  dhl_tracking_number: string | null;
  dhl_label_url: string | null;
  sender_address: ReturnAddress | null;
  recipient_address: ReturnAddress | null;
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
  'RETOUR_ANGELEGT': 'Rücksendung angelegt',
  'RETOUR_UNTERWEGS': 'Rücksendung unterwegs',
  'RETOUR_ZUGESTELLT': 'Rücksendung zugestellt',
};

export const B2B_SHIPMENT_STATUS_COLORS: Record<B2BShipmentStatus, string> = {
  'ANGELEGT': 'bg-gray-100 text-gray-800',
  'GERAETE_UNTERWEGS': 'bg-blue-100 text-blue-800',
  'BEI_TELYA_EINGEGANGEN': 'bg-amber-100 text-amber-800',
  'ABGESCHLOSSEN': 'bg-green-100 text-green-800',
  'RETOUR_ANGELEGT': 'bg-purple-100 text-purple-800',
  'RETOUR_UNTERWEGS': 'bg-indigo-100 text-indigo-800',
  'RETOUR_ZUGESTELLT': 'bg-emerald-100 text-emerald-800',
};

export const B2B_SHIPMENT_TYPE_LABELS: Record<B2BShipmentType, string> = {
  'INBOUND': 'Eingang (Partner → Telya)',
  'OUTBOUND': 'Rücksendung (Telya → Partner)',
};

// Company address for shipping labels
export const TELYA_ADDRESS = {
  name: 'Telya GmbH',
  street: 'Schalker Str. 59',
  zip: '45881',
  city: 'Gelsenkirchen',
  country: 'Deutschland',
  phone: '0209 88307161',
  email: 'service@telya.de',
  vatId: 'DE331142364',
  hrb: 'HRB 15717',
  managingDirector: 'Serkan Genc',
  bank: 'Volksbank Bochum Witten',
  iban: 'DE59430601290118905200',
};
