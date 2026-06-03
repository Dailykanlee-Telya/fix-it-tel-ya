
-- 1) New ticket_passcodes table
CREATE TABLE public.ticket_passcodes (
  repair_ticket_id uuid PRIMARY KEY REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  passcode_type text,
  passcode_pin text,
  passcode_pattern jsonb,
  passcode_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_passcodes TO authenticated;
GRANT ALL ON public.ticket_passcodes TO service_role;

ALTER TABLE public.ticket_passcodes ENABLE ROW LEVEL SECURITY;

-- SELECT: only ADMIN, TECHNIKER, THEKE (employees) - and B2B users for their own tickets
CREATE POLICY "Privileged employees can view passcodes"
  ON public.ticket_passcodes
  FOR SELECT
  USING (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'TECHNIKER'::app_role)
    OR has_role(auth.uid(), 'THEKE'::app_role)
  );

CREATE POLICY "B2B users can view own passcodes"
  ON public.ticket_passcodes
  FOR SELECT
  USING (
    is_b2b_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_passcodes.repair_ticket_id
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

-- INSERT/UPDATE: employees who can take in tickets + B2B users for own tickets
CREATE POLICY "Privileged employees can insert passcodes"
  ON public.ticket_passcodes
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'TECHNIKER'::app_role)
    OR has_role(auth.uid(), 'THEKE'::app_role)
  );

CREATE POLICY "Privileged employees can update passcodes"
  ON public.ticket_passcodes
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'TECHNIKER'::app_role)
    OR has_role(auth.uid(), 'THEKE'::app_role)
  );

CREATE POLICY "B2B users can insert own passcodes"
  ON public.ticket_passcodes
  FOR INSERT
  WITH CHECK (
    is_b2b_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_passcodes.repair_ticket_id
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

CREATE POLICY "B2B users can update own passcodes"
  ON public.ticket_passcodes
  FOR UPDATE
  USING (
    is_b2b_user(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_passcodes.repair_ticket_id
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

CREATE POLICY "Admins can delete passcodes"
  ON public.ticket_passcodes
  FOR DELETE
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE TRIGGER trg_ticket_passcodes_updated_at
  BEFORE UPDATE ON public.ticket_passcodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Migrate existing data
INSERT INTO public.ticket_passcodes (repair_ticket_id, passcode_type, passcode_pin, passcode_pattern, passcode_info)
SELECT id, passcode_type, passcode_pin, passcode_pattern, passcode_info
FROM public.repair_tickets
WHERE passcode_type IS NOT NULL OR passcode_pin IS NOT NULL OR passcode_pattern IS NOT NULL OR passcode_info IS NOT NULL
ON CONFLICT (repair_ticket_id) DO NOTHING;

-- 3) Drop sensitive columns from repair_tickets
ALTER TABLE public.repair_tickets
  DROP COLUMN IF EXISTS passcode_type,
  DROP COLUMN IF EXISTS passcode_pin,
  DROP COLUMN IF EXISTS passcode_pattern,
  DROP COLUMN IF EXISTS passcode_info;
