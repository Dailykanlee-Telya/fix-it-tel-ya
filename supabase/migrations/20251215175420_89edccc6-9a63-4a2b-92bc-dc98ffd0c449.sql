
-- =============================================
-- CLEAR AND RESEED PERMISSIONS
-- =============================================

-- Clear existing role_permissions and permissions
DELETE FROM public.role_permissions;
DELETE FROM public.permissions;

-- =============================================
-- SEED NEW PERMISSIONS
-- =============================================

-- Tickets / Orders
INSERT INTO public.permissions (key, description, category) VALUES
  ('VIEW_DASHBOARD', 'Dashboard anzeigen', 'tickets'),
  ('VIEW_INTAKE', 'Auftragsannahme anzeigen', 'tickets'),
  ('CREATE_TICKET', 'Aufträge erstellen', 'tickets'),
  ('VIEW_TICKET_DETAILS', 'Auftragsdetails anzeigen', 'tickets'),
  ('EDIT_TICKET_BASIC', 'Auftrag bearbeiten (Basisdaten)', 'tickets'),
  ('EDIT_TICKET_SENSITIVE', 'Auftrag bearbeiten (sensible Daten)', 'tickets'),
  ('CHANGE_TICKET_STATUS', 'Auftragsstatus ändern', 'tickets'),
  ('HANDOVER_TICKET', 'Auftrag übergeben', 'tickets'),
  ('CANCEL_TICKET', 'Auftrag stornieren', 'tickets');

-- KVA / Pricing
INSERT INTO public.permissions (key, description, category) VALUES
  ('VIEW_KVA', 'Kostenvoranschlag anzeigen', 'kva'),
  ('CREATE_KVA', 'Kostenvoranschlag erstellen', 'kva'),
  ('EDIT_KVA_PRICE', 'KVA-Preis bearbeiten', 'kva'),
  ('APPROVE_KVA', 'KVA genehmigen', 'kva'),
  ('REJECT_KVA', 'KVA ablehnen', 'kva'),
  ('CHANGE_FINAL_PRICE', 'Endpreis ändern', 'kva'),
  ('GRANT_DISCOUNT', 'Rabatt gewähren', 'kva');

-- Workshop / Parts
INSERT INTO public.permissions (key, description, category) VALUES
  ('VIEW_WORKSHOP', 'Werkstatt-Board anzeigen', 'workshop'),
  ('VIEW_PARTS', 'Ersatzteile anzeigen', 'workshop'),
  ('MANAGE_PARTS', 'Ersatzteile verwalten', 'workshop'),
  ('USE_PARTS', 'Ersatzteile verwenden', 'workshop'),
  ('COMPLETE_QC_CHECK', 'Qualitätsprüfung abschließen', 'workshop');

-- B2B
INSERT INTO public.permissions (key, description, category) VALUES
  ('VIEW_B2B_PORTAL', 'B2B-Portal anzeigen', 'b2b'),
  ('CREATE_B2B_TICKET', 'B2B-Auftrag erstellen', 'b2b'),
  ('EDIT_B2B_PRICES', 'B2B-Preise bearbeiten', 'b2b'),
  ('FORWARD_KVA_TO_ENDCUSTOMER', 'KVA an Endkunden weiterleiten', 'b2b');

-- Admin / Organization
INSERT INTO public.permissions (key, description, category) VALUES
  ('VIEW_REPORTS', 'Reports anzeigen', 'admin'),
  ('VIEW_FINANCIAL_REPORTS', 'Finanzreports anzeigen', 'admin'),
  ('MANAGE_USERS', 'Benutzer verwalten', 'admin'),
  ('MANAGE_PERMISSIONS', 'Berechtigungen verwalten', 'admin'),
  ('MANAGE_B2B_PARTNERS', 'B2B-Partner verwalten', 'admin'),
  ('VIEW_ALL_LOCATIONS', 'Alle Standorte anzeigen', 'admin'),
  ('MANAGE_SETTINGS', 'Einstellungen verwalten', 'admin'),
  ('VIEW_CUSTOMERS', 'Kunden anzeigen', 'admin'),
  ('EDIT_CUSTOMERS', 'Kunden bearbeiten', 'admin');

-- =============================================
-- SEED ROLE PERMISSIONS
-- =============================================

-- ADMIN: all permissions
INSERT INTO public.role_permissions (role, permission_key)
SELECT 'ADMIN'::app_role, key FROM public.permissions;

-- THEKE
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('THEKE', 'VIEW_DASHBOARD'),
  ('THEKE', 'VIEW_INTAKE'),
  ('THEKE', 'CREATE_TICKET'),
  ('THEKE', 'VIEW_TICKET_DETAILS'),
  ('THEKE', 'EDIT_TICKET_BASIC'),
  ('THEKE', 'CHANGE_TICKET_STATUS'),
  ('THEKE', 'HANDOVER_TICKET'),
  ('THEKE', 'VIEW_KVA'),
  ('THEKE', 'VIEW_CUSTOMERS'),
  ('THEKE', 'EDIT_CUSTOMERS');

-- TECHNIKER
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('TECHNIKER', 'VIEW_WORKSHOP'),
  ('TECHNIKER', 'VIEW_TICKET_DETAILS'),
  ('TECHNIKER', 'EDIT_TICKET_BASIC'),
  ('TECHNIKER', 'CHANGE_TICKET_STATUS'),
  ('TECHNIKER', 'VIEW_KVA'),
  ('TECHNIKER', 'CREATE_KVA'),
  ('TECHNIKER', 'USE_PARTS'),
  ('TECHNIKER', 'VIEW_PARTS'),
  ('TECHNIKER', 'COMPLETE_QC_CHECK');

-- FILIALLEITER
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('FILIALLEITER', 'VIEW_DASHBOARD'),
  ('FILIALLEITER', 'VIEW_TICKET_DETAILS'),
  ('FILIALLEITER', 'VIEW_WORKSHOP'),
  ('FILIALLEITER', 'VIEW_REPORTS'),
  ('FILIALLEITER', 'VIEW_FINANCIAL_REPORTS'),
  ('FILIALLEITER', 'CANCEL_TICKET'),
  ('FILIALLEITER', 'EDIT_KVA_PRICE'),
  ('FILIALLEITER', 'APPROVE_KVA'),
  ('FILIALLEITER', 'REJECT_KVA'),
  ('FILIALLEITER', 'CHANGE_FINAL_PRICE'),
  ('FILIALLEITER', 'GRANT_DISCOUNT'),
  ('FILIALLEITER', 'MANAGE_PARTS'),
  ('FILIALLEITER', 'VIEW_PARTS'),
  ('FILIALLEITER', 'MANAGE_USERS'),
  ('FILIALLEITER', 'VIEW_CUSTOMERS');

-- BUCHHALTUNG
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('BUCHHALTUNG', 'VIEW_REPORTS'),
  ('BUCHHALTUNG', 'VIEW_FINANCIAL_REPORTS'),
  ('BUCHHALTUNG', 'VIEW_TICKET_DETAILS'),
  ('BUCHHALTUNG', 'VIEW_DASHBOARD');

-- B2B_USER
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('B2B_USER', 'VIEW_B2B_PORTAL'),
  ('B2B_USER', 'CREATE_B2B_TICKET'),
  ('B2B_USER', 'VIEW_TICKET_DETAILS'),
  ('B2B_USER', 'VIEW_KVA'),
  ('B2B_USER', 'FORWARD_KVA_TO_ENDCUSTOMER'),
  ('B2B_USER', 'EDIT_B2B_PRICES');

-- B2B_ADMIN (same as B2B_USER plus manage capabilities)
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('B2B_ADMIN', 'VIEW_B2B_PORTAL'),
  ('B2B_ADMIN', 'CREATE_B2B_TICKET'),
  ('B2B_ADMIN', 'VIEW_TICKET_DETAILS'),
  ('B2B_ADMIN', 'VIEW_KVA'),
  ('B2B_ADMIN', 'FORWARD_KVA_TO_ENDCUSTOMER'),
  ('B2B_ADMIN', 'EDIT_B2B_PRICES'),
  ('B2B_ADMIN', 'VIEW_DASHBOARD');
