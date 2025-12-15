-- PART 1: Add code columns to locations and b2b_partners
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS code VARCHAR(3);
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS code VARCHAR(3);

-- Set default codes for existing locations (based on first 2-3 letters of name)
UPDATE public.locations SET code = UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 1, 2)) WHERE code IS NULL;

-- PART 2: Create sequence table for yearly order numbers
CREATE TABLE IF NOT EXISTS public.ticket_number_sequence (
  year SMALLINT PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 100
);

-- Enable RLS
ALTER TABLE public.ticket_number_sequence ENABLE ROW LEVEL SECURITY;

-- RLS policy - only employees can access
CREATE POLICY "Employees can manage sequence" ON public.ticket_number_sequence
FOR ALL USING (is_employee(auth.uid()));

-- PART 3: Create the order number generation function
CREATE OR REPLACE FUNCTION public.generate_order_number(
  _location_id UUID,
  _b2b_partner_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year SMALLINT;
  _year_str TEXT;
  _code TEXT;
  _seq_num INTEGER;
  _order_number TEXT;
BEGIN
  -- Get 2-digit year
  _year := (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER % 100)::SMALLINT;
  _year_str := LPAD(_year::TEXT, 2, '0');
  
  -- Determine code based on B2B partner or location
  IF _b2b_partner_id IS NOT NULL THEN
    SELECT code INTO _code FROM public.b2b_partners WHERE id = _b2b_partner_id;
  ELSE
    SELECT code INTO _code FROM public.locations WHERE id = _location_id;
  END IF;
  
  -- Default code if not set
  IF _code IS NULL OR _code = '' THEN
    _code := 'XX';
  END IF;
  
  -- Ensure uppercase and max 3 chars
  _code := UPPER(SUBSTRING(_code, 1, 3));
  
  -- Lock and get the next sequence number (concurrent-safe)
  LOOP
    -- Try to get existing row with lock
    SELECT next_number INTO _seq_num
    FROM public.ticket_number_sequence
    WHERE year = _year
    FOR UPDATE;
    
    IF FOUND THEN
      -- Update the sequence for next use
      UPDATE public.ticket_number_sequence 
      SET next_number = next_number + 1 
      WHERE year = _year;
      EXIT;
    ELSE
      -- Try to insert a new row for this year
      BEGIN
        INSERT INTO public.ticket_number_sequence (year, next_number)
        VALUES (_year, 101);
        _seq_num := 100;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Another transaction inserted the row, retry
        NULL;
      END;
    END IF;
  END LOOP;
  
  -- Format the order number: TE-<CODE>-<YY>-<NNNN>
  _order_number := 'TE-' || _code || '-' || _year_str || '-' || LPAD(_seq_num::TEXT, 4, '0');
  
  RETURN _order_number;
END;
$$;

-- PART 4: Create admin-only data reset function
CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Only admins can reset data';
  END IF;
  
  -- Delete in order respecting foreign keys
  DELETE FROM public.ticket_internal_notes;
  DELETE FROM public.ticket_messages;
  DELETE FROM public.status_history;
  DELETE FROM public.ticket_checklist_items;
  DELETE FROM public.ticket_part_usage;
  DELETE FROM public.ticket_photos;
  DELETE FROM public.feedback;
  DELETE FROM public.notification_logs;
  DELETE FROM public.b2b_shipments;
  DELETE FROM public.repair_tickets;
  DELETE FROM public.devices;
  DELETE FROM public.customers;
  DELETE FROM public.b2b_partners;
  
  -- Reset sequence table for fresh start
  DELETE FROM public.ticket_number_sequence;
END;
$$;