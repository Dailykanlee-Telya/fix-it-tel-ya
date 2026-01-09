// Custom types for the repair management system

export type AppRole = 'ADMIN' | 'THEKE' | 'TECHNIKER' | 'BUCHHALTUNG' | 'FILIALLEITER' | 'B2B_INHABER' | 'B2B_ADMIN' | 'B2B_USER';

export type DeviceType = 'HANDY' | 'TABLET' | 'LAPTOP' | 'SMARTWATCH' | 'OTHER';

// TicketStatus is defined with STATUS_LABELS below for B2B logistics support

export type ErrorCode = 
  | 'DISPLAYBRUCH' 
  | 'WASSERSCHADEN' 
  | 'AKKU_SCHWACH' 
  | 'LADEBUCHSE' 
  | 'KAMERA' 
  | 'MIKROFON' 
  | 'LAUTSPRECHER' 
  | 'TASTATUR' 
  | 'SONSTIGES';

export type PriceMode = 'FIXPREIS' | 'KVA' | 'NACH_AUFWAND';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export type NotificationTrigger = 
  | 'TICKET_CREATED' 
  | 'KVA_READY' 
  | 'KVA_APPROVED' 
  | 'KVA_REJECTED' 
  | 'REPAIR_IN_PROGRESS' 
  | 'READY_FOR_PICKUP' 
  | 'REMINDER_NOT_PICKED';

export type ErrorCause = 'STURZ' | 'FEUCHTIGKEIT' | 'VERSCHLEISS' | 'HERSTELLERFEHLER' | 'UNKLAR';

export interface Location {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  location_id?: string;
  default_location_id?: string;
  b2b_partner_id?: string;
  is_active: boolean;
  can_view_all_locations?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  customer_id: string;
  device_type: DeviceType;
  brand: string;
  model: string;
  imei_or_serial?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface RepairTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  device_id: string;
  location_id: string;
  status: TicketStatus;
  error_description_text?: string;
  error_code?: ErrorCode;
  error_cause?: ErrorCause;
  accessories?: string;
  legal_notes_ack: boolean;
  passcode_info?: string;
  price_mode: PriceMode;
  estimated_price?: number;
  final_price?: number;
  kva_required: boolean;
  kva_approved?: boolean;
  kva_approved_at?: string;
  kva_token?: string;
  assigned_technician_id?: string;
  priority?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: Customer;
  device?: Device;
  location?: Location;
  assigned_technician?: Profile;
}

export interface Part {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  sku?: string;
  purchase_price: number;
  sales_price: number;
  stock_quantity: number;
  min_stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface TicketPartUsage {
  id: string;
  repair_ticket_id: string;
  part_id: string;
  quantity: number;
  unit_purchase_price?: number;
  unit_sales_price?: number;
  created_at: string;
  part?: Part;
}

export interface StatusHistory {
  id: string;
  repair_ticket_id: string;
  old_status?: TicketStatus;
  new_status: TicketStatus;
  changed_by_user_id?: string;
  note?: string;
  created_at: string;
  changed_by?: Profile;
}

export interface Feedback {
  id: string;
  repair_ticket_id?: string;
  customer_id?: string;
  rating: number;
  comment?: string;
  is_complaint: boolean;
  created_at: string;
}

export type TicketStatus = 
  | 'NEU_EINGEGANGEN' 
  | 'IN_DIAGNOSE' 
  | 'WARTET_AUF_TEIL_ODER_FREIGABE' 
  | 'IN_REPARATUR' 
  | 'FERTIG_ZUR_ABHOLUNG' 
  | 'ABGEHOLT' 
  | 'STORNIERT'
  | 'EINGESENDET'
  | 'RUECKVERSAND_AN_B2B'
  | 'RUECKVERSAND_AN_ENDKUNDE';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  NEU_EINGEGANGEN: 'Neu eingegangen',
  IN_DIAGNOSE: 'In Diagnose',
  WARTET_AUF_TEIL_ODER_FREIGABE: 'Wartet auf Teil/Freigabe',
  IN_REPARATUR: 'In Reparatur',
  FERTIG_ZUR_ABHOLUNG: 'Fertig zur Abholung',
  ABGEHOLT: 'Abgeholt',
  STORNIERT: 'Storniert',
  EINGESENDET: 'Eingesendet',
  RUECKVERSAND_AN_B2B: 'Rückversand an B2B',
  RUECKVERSAND_AN_ENDKUNDE: 'Rückversand an Endkunde',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  NEU_EINGEGANGEN: 'status-new',
  IN_DIAGNOSE: 'status-diagnosis',
  WARTET_AUF_TEIL_ODER_FREIGABE: 'status-waiting',
  IN_REPARATUR: 'status-repair',
  FERTIG_ZUR_ABHOLUNG: 'status-ready',
  ABGEHOLT: 'status-done',
  STORNIERT: 'status-cancelled',
  EINGESENDET: 'status-new',
  RUECKVERSAND_AN_B2B: 'status-ready',
  RUECKVERSAND_AN_ENDKUNDE: 'status-ready',
};

export const ERROR_CODE_LABELS: Record<ErrorCode, string> = {
  DISPLAYBRUCH: 'Displaybruch',
  WASSERSCHADEN: 'Wasserschaden',
  AKKU_SCHWACH: 'Akku schwach',
  LADEBUCHSE: 'Ladebuchse defekt',
  KAMERA: 'Kamera defekt',
  MIKROFON: 'Mikrofon defekt',
  LAUTSPRECHER: 'Lautsprecher defekt',
  TASTATUR: 'Tastatur defekt',
  SONSTIGES: 'Sonstiges',
};

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  HANDY: 'Handy',
  TABLET: 'Tablet',
  LAPTOP: 'Laptop',
  SMARTWATCH: 'Smartwatch',
  OTHER: 'Sonstiges',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrator',
  THEKE: 'Theke',
  TECHNIKER: 'Techniker',
  BUCHHALTUNG: 'Buchhaltung',
  FILIALLEITER: 'Filialleiter',
  B2B_INHABER: 'B2B-Inhaber',
  B2B_ADMIN: 'B2B-Administrator',
  B2B_USER: 'B2B-Benutzer',
};

// Internal employee roles (not B2B)
export const INTERNAL_ROLES: AppRole[] = ['ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER'];

// B2B roles
export const B2B_ROLES: AppRole[] = ['B2B_INHABER', 'B2B_ADMIN', 'B2B_USER'];
