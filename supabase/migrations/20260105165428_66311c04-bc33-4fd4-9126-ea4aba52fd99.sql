-- 1. Create function to generate 7-char tracking code (no 0/O, 1/I)
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Create/update trigger to auto-generate kva_token on insert (using new format)
CREATE OR REPLACE FUNCTION public.set_tracking_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  IF NEW.kva_token IS NULL OR NEW.kva_token = '' THEN
    LOOP
      new_code := generate_tracking_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM repair_tickets WHERE kva_token = new_code);
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique tracking code after 10 attempts';
      END IF;
    END LOOP;
    NEW.kva_token := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_tracking_code ON repair_tickets;
CREATE TRIGGER trigger_set_tracking_code
  BEFORE INSERT ON repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_tracking_code();

-- 3. Backfill existing tickets without kva_token
UPDATE repair_tickets
SET kva_token = generate_tracking_code()
WHERE kva_token IS NULL OR kva_token = '';

-- 4. Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_repair_tickets_kva_token ON repair_tickets(kva_token);