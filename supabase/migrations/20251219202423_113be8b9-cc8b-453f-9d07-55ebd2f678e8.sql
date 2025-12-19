-- Update generate_order_number function to remove dashes
-- Old format: TE-BO-25-0105
-- New format: TEBO250105
CREATE OR REPLACE FUNCTION public.generate_order_number(_location_id uuid, _b2b_partner_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- NEW FORMAT without dashes: TE<CODE><YY><NNNN>
  -- Example: TEBO250105
  _order_number := 'TE' || _code || _year_str || LPAD(_seq_num::TEXT, 4, '0');
  
  RETURN _order_number;
END;
$function$;