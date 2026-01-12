
-- Phase 4: THEKE-erweiterte Rechte und neue Permissions

-- 1. Neue Permissions für THEKE
INSERT INTO public.permissions (key, description, category) VALUES
  ('BOOK_PARTS', 'Teile auf Auftrag buchen', 'inventory'),
  ('CREATE_INTERNAL_NOTE', 'Interne Notizen erstellen', 'tickets'),
  ('CREATE_B2B_MESSAGE', 'B2B-Nachrichten erstellen', 'tickets'),
  ('CREATE_CUSTOMER_MESSAGE', 'Kundennachrichten erstellen', 'tickets'),
  ('VIEW_PENDING_APPROVALS', 'Ausstehende Freigaben anzeigen', 'admin'),
  ('APPROVE_PART_USAGE', 'Teileverbrauch freigeben (Selbstverschulden)', 'inventory')
ON CONFLICT (key) DO NOTHING;

-- 2. THEKE-Berechtigungen zuweisen
INSERT INTO public.role_permissions (role, permission_key) VALUES
  -- Bestehende THEKE-Rechte erweitern
  ('THEKE', 'CREATE_KVA'),
  ('THEKE', 'EDIT_KVA_PRICE'),
  ('THEKE', 'VIEW_KVA'),
  ('THEKE', 'BOOK_PARTS'),
  ('THEKE', 'CREATE_CONSUMPTION'),
  ('THEKE', 'RECEIVE_GOODS'),
  ('THEKE', 'VIEW_INVENTORY'),
  ('THEKE', 'VIEW_STOCK_MOVEMENTS'),
  ('THEKE', 'CHANGE_TICKET_STATUS'),
  ('THEKE', 'CREATE_INTERNAL_NOTE'),
  ('THEKE', 'CREATE_B2B_MESSAGE'),
  ('THEKE', 'CREATE_CUSTOMER_MESSAGE'),
  ('THEKE', 'VIEW_TICKET_DETAILS'),
  ('THEKE', 'EDIT_TICKET_BASIC'),
  ('THEKE', 'CREATE_TICKET'),
  ('THEKE', 'VIEW_INTAKE'),
  ('THEKE', 'VIEW_DASHBOARD'),
  ('THEKE', 'VIEW_CUSTOMERS'),
  ('THEKE', 'EDIT_CUSTOMERS'),
  ('THEKE', 'HANDOVER_TICKET'),
  -- ADMIN bekommt alle neuen Rechte
  ('ADMIN', 'BOOK_PARTS'),
  ('ADMIN', 'CREATE_INTERNAL_NOTE'),
  ('ADMIN', 'CREATE_B2B_MESSAGE'),
  ('ADMIN', 'CREATE_CUSTOMER_MESSAGE'),
  ('ADMIN', 'VIEW_PENDING_APPROVALS'),
  ('ADMIN', 'APPROVE_PART_USAGE'),
  -- TECHNIKER bekommt Teil-Rechte
  ('TECHNIKER', 'BOOK_PARTS'),
  ('TECHNIKER', 'CREATE_CONSUMPTION'),
  ('TECHNIKER', 'CREATE_INTERNAL_NOTE'),
  ('TECHNIKER', 'VIEW_INVENTORY'),
  ('TECHNIKER', 'VIEW_STOCK_MOVEMENTS')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 3. THEKE darf NICHT: Tickets löschen, Inventur freigeben, Selbstverschulden ohne Admin
-- Diese Rechte bleiben bei ADMIN: APPROVE_INVENTORY, APPROVE_WRITE_OFF, APPROVE_PART_USAGE

-- 4. Sicherstellen dass B2B-Rollen ihre Rechte haben
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('B2B_INHABER', 'B2B_CREATE_ORDERS'),
  ('B2B_INHABER', 'B2B_KVA_DECISION'),
  ('B2B_INHABER', 'B2B_MANAGE_CUSTOMERS'),
  ('B2B_INHABER', 'B2B_MANAGE_PRICES'),
  ('B2B_INHABER', 'B2B_MANAGE_SHIPMENTS'),
  ('B2B_INHABER', 'B2B_MANAGE_TEMPLATES'),
  ('B2B_INHABER', 'B2B_MANAGE_USERS'),
  ('B2B_INHABER', 'B2B_RELEASE_ENDCUSTOMER_PRICE'),
  ('B2B_INHABER', 'B2B_VIEW_ORDERS'),
  ('B2B_ADMIN', 'B2B_CREATE_ORDERS'),
  ('B2B_ADMIN', 'B2B_KVA_DECISION'),
  ('B2B_ADMIN', 'B2B_MANAGE_CUSTOMERS'),
  ('B2B_ADMIN', 'B2B_MANAGE_PRICES'),
  ('B2B_ADMIN', 'B2B_MANAGE_SHIPMENTS'),
  ('B2B_ADMIN', 'B2B_RELEASE_ENDCUSTOMER_PRICE'),
  ('B2B_ADMIN', 'B2B_VIEW_ORDERS'),
  ('B2B_USER', 'B2B_CREATE_ORDERS'),
  ('B2B_USER', 'B2B_VIEW_ORDERS'),
  ('B2B_USER', 'B2B_MANAGE_CUSTOMERS')
ON CONFLICT (role, permission_key) DO NOTHING;
