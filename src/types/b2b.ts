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

export type B2BRole = 'B2B_INHABER' | 'B2B_ADMIN' | 'B2B_USER';

export type KvaDecisionType = 'REPARATUR' | 'RUECKVERSAND' | 'ENTSORGUNG_KOSTENLOS' | 'ENTSORGUNG_KOSTENPFLICHTIG';

export type KvaDecisionBy = 'B2B' | 'ENDKUNDE';

export interface B2BPartner {
  id: string;
  name: string;
  customer_number: string | null;
  location_id: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  default_return_address: ReturnAddress | null;
  // Branding
  company_logo_url: string | null;
  company_slogan: string | null;
  legal_footer: string | null;
  terms_and_conditions: string | null;
  privacy_policy_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
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

export interface B2BCustomer {
  id: string;
  b2b_partner_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface B2BDocumentTemplate {
  id: string;
  b2b_partner_id: string;
  template_type: 'LIEFERSCHEIN' | 'REPARATURBERICHT' | 'KVA_SCHRIFTLICH';
  title: string;
  intro: string | null;
  conditions: string | null;
  footer: string | null;
  legal_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface B2BPrice {
  id: string;
  b2b_partner_id: string;
  device_type: string;
  repair_type: string;
  brand: string | null;
  model: string | null;
  b2b_price: number;
  endcustomer_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface B2BUserInvitation {
  id: string;
  b2b_partner_id: string;
  email: string;
  role: B2BRole;
  invited_by: string | null;
  invitation_token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
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
  return_to_endcustomer: boolean;
  endcustomer_address: ReturnAddress | null;
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

export const B2B_ROLE_LABELS: Record<B2BRole, string> = {
  'B2B_INHABER': 'Inhaber',
  'B2B_ADMIN': 'Administrator',
  'B2B_USER': 'Mitarbeiter',
};

export const KVA_DECISION_LABELS: Record<KvaDecisionType, string> = {
  'REPARATUR': 'Reparatur durchführen',
  'RUECKVERSAND': 'Unrepariert zurücksenden',
  'ENTSORGUNG_KOSTENLOS': 'Kostenlose Entsorgung',
  'ENTSORGUNG_KOSTENPFLICHTIG': 'Kostenpflichtige Entsorgung',
};

export const B2B_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'LIEFERSCHEIN': 'Lieferschein',
  'REPARATURBERICHT': 'Reparaturbericht',
  'KVA_SCHRIFTLICH': 'Schriftliche KVA',
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
