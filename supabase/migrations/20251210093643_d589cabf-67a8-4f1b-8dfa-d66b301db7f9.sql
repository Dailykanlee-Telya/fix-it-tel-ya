-- Fix function search_path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix function search_path for generate_ticket_number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  today_date TEXT;
  seq_num INTEGER;
BEGIN
  today_date := to_char(now(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq_num 
  FROM public.repair_tickets 
  WHERE ticket_number LIKE 'TELYA-' || today_date || '-%';
  RETURN 'TELYA-' || today_date || '-' || lpad(seq_num::TEXT, 4, '0');
END;
$$;