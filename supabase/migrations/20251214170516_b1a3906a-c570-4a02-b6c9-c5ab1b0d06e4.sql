-- Insert test B2B partner using gen_random_uuid for proper UUIDs
DO $$
DECLARE
  partner_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  customer_id uuid := gen_random_uuid();
  device1_id uuid := gen_random_uuid();
  device2_id uuid := gen_random_uuid();
  device3_id uuid := gen_random_uuid();
  loc_id uuid;
BEGIN
  -- Insert B2B partner if not exists
  INSERT INTO public.b2b_partners (
    id, name, customer_number, street, zip, city, country,
    contact_name, contact_email, contact_phone, billing_email, 
    default_return_address, is_active
  ) VALUES (
    partner_id,
    'TechFix Hamburg GmbH',
    'B2B-001',
    'Mönckebergstraße 7',
    '20095',
    'Hamburg',
    'Deutschland',
    'Max Müller',
    'max.mueller@techfix-hamburg.de',
    '040 12345678',
    'buchhaltung@techfix-hamburg.de',
    '{"name": "TechFix Hamburg GmbH", "street": "Mönckebergstraße 7", "zip": "20095", "city": "Hamburg", "country": "Deutschland"}',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert test customer
  INSERT INTO public.customers (id, first_name, last_name, phone, email)
  VALUES (customer_id, 'B2B', 'Endkunde', '0800 1234567', 'endkunde@example.com');

  -- Insert test devices
  INSERT INTO public.devices (id, customer_id, device_type, brand, model, imei_or_serial, color)
  VALUES 
    (device1_id, customer_id, 'HANDY', 'Apple', 'iPhone 14 Pro', '353456789012345', 'Space Black'),
    (device2_id, customer_id, 'HANDY', 'Samsung', 'Galaxy S23 Ultra', '353456789012346', 'Phantom Black'),
    (device3_id, customer_id, 'TABLET', 'Apple', 'iPad Pro 12.9 (2022)', '353456789012347', 'Silver');

  -- Get first location
  SELECT id INTO loc_id FROM public.locations LIMIT 1;
  IF loc_id IS NULL THEN
    INSERT INTO public.locations (name, address, phone)
    VALUES ('Hauptfiliale', 'Schalker Str. 59, 45881 Gelsenkirchen', '0209 88307161')
    RETURNING id INTO loc_id;
  END IF;

  -- Insert B2B tickets
  INSERT INTO public.repair_tickets (
    ticket_number, customer_id, device_id, location_id, status, error_code,
    error_description_text, is_b2b, b2b_partner_id, endcustomer_reference, final_price, legal_notes_ack
  ) VALUES 
    ('TELYA-B2B-TEST-0001', customer_id, device1_id, loc_id, 'FERTIG_ZUR_ABHOLUNG', 'DISPLAYBRUCH', 
     'Display gebrochen, Austausch durchgeführt', true, partner_id, 'TF-2024-1234', 189.00, true),
    ('TELYA-B2B-TEST-0002', customer_id, device2_id, loc_id, 'FERTIG_ZUR_ABHOLUNG', 'AKKU_SCHWACH', 
     'Akku defekt, neuer Akku eingebaut', true, partner_id, 'TF-2024-1235', 79.00, true),
    ('TELYA-B2B-TEST-0003', customer_id, device3_id, loc_id, 'FERTIG_ZUR_ABHOLUNG', 'LADEBUCHSE', 
     'Ladebuchse gereinigt und repariert', true, partner_id, 'TF-2024-1236', 49.00, true);
END $$;