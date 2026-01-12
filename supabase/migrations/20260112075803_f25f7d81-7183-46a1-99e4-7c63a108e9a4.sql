-- 1) RLS for device_catalog: B2B users can SELECT (already has policy, but let's ensure it works)
-- Check existing policies first and add if missing

-- 2) RLS for locations: B2B can only see their assigned location
DROP POLICY IF EXISTS "B2B users can view assigned location" ON locations;
CREATE POLICY "B2B users can view assigned location" 
ON locations FOR SELECT 
USING (
  is_b2b_user(auth.uid()) AND 
  id = (SELECT location_id FROM b2b_partners WHERE id = get_b2b_partner_id(auth.uid()))
);

-- 3) For B2B orders, we'll use a fixed placeholder customer per partner
-- Add a placeholder_customer_id column to b2b_partners
ALTER TABLE b2b_partners ADD COLUMN IF NOT EXISTS placeholder_customer_id uuid REFERENCES customers(id);

-- 4) RLS for b2b_customers: B2B can only manage their own customers
DROP POLICY IF EXISTS "B2B users can view own customers" ON b2b_customers;
CREATE POLICY "B2B users can view own customers" 
ON b2b_customers FOR SELECT 
USING (
  is_b2b_user(auth.uid()) AND 
  b2b_partner_id = get_b2b_partner_id(auth.uid())
);

DROP POLICY IF EXISTS "B2B users can insert own customers" ON b2b_customers;
CREATE POLICY "B2B users can insert own customers" 
ON b2b_customers FOR INSERT 
WITH CHECK (
  is_b2b_user(auth.uid()) AND 
  b2b_partner_id = get_b2b_partner_id(auth.uid())
);

DROP POLICY IF EXISTS "B2B users can update own customers" ON b2b_customers;
CREATE POLICY "B2B users can update own customers" 
ON b2b_customers FOR UPDATE 
USING (
  is_b2b_user(auth.uid()) AND 
  b2b_partner_id = get_b2b_partner_id(auth.uid())
);

-- Employees can view all b2b_customers
DROP POLICY IF EXISTS "Employees can view all b2b_customers" ON b2b_customers;
CREATE POLICY "Employees can view all b2b_customers" 
ON b2b_customers FOR SELECT 
USING (is_employee(auth.uid()));

-- Employees can manage b2b_customers
DROP POLICY IF EXISTS "Employees can manage b2b_customers" ON b2b_customers;
CREATE POLICY "Employees can manage b2b_customers" 
ON b2b_customers FOR ALL 
USING (is_employee(auth.uid()));

-- 5) Create helper function to get or create placeholder customer for B2B partner
CREATE OR REPLACE FUNCTION get_or_create_b2b_placeholder_customer(partner_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_partner record;
BEGIN
  -- Check if partner already has a placeholder customer
  SELECT placeholder_customer_id INTO v_customer_id
  FROM b2b_partners 
  WHERE id = partner_id;
  
  IF v_customer_id IS NOT NULL THEN
    RETURN v_customer_id;
  END IF;
  
  -- Get partner info
  SELECT * INTO v_partner FROM b2b_partners WHERE id = partner_id;
  
  IF v_partner IS NULL THEN
    RAISE EXCEPTION 'B2B Partner not found';
  END IF;
  
  -- Create placeholder customer
  INSERT INTO customers (first_name, last_name, phone, email, address)
  VALUES (
    v_partner.name,
    'B2B Partner',
    COALESCE(v_partner.contact_phone, '0000000000'),
    v_partner.contact_email,
    CONCAT_WS(', ', v_partner.street, CONCAT(v_partner.zip, ' ', v_partner.city))
  )
  RETURNING id INTO v_customer_id;
  
  -- Store in partner record
  UPDATE b2b_partners SET placeholder_customer_id = v_customer_id WHERE id = partner_id;
  
  RETURN v_customer_id;
END;
$$;