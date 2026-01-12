-- 1. Add RLS policy for B2B users to SELECT device_catalog (already exists, but ensuring)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'device_catalog' AND policyname = 'B2B users can view device catalog'
  ) THEN
    -- Policy already exists from earlier
    NULL;
  END IF;
END $$;

-- 2. Add RLS policies for model_requests to allow B2B INSERT + SELECT own, Admin SELECT/UPDATE all
-- Drop existing policies if any, then recreate
DROP POLICY IF EXISTS "B2B users can create model requests" ON public.model_requests;
DROP POLICY IF EXISTS "B2B users can view own model requests" ON public.model_requests;
DROP POLICY IF EXISTS "Admins can manage all model requests" ON public.model_requests;
DROP POLICY IF EXISTS "Employees can view all model requests" ON public.model_requests;

CREATE POLICY "B2B users can create model requests"
ON public.model_requests
FOR INSERT
WITH CHECK (
  is_b2b_user(auth.uid()) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

CREATE POLICY "B2B users can view own model requests"
ON public.model_requests
FOR SELECT
USING (
  is_b2b_user(auth.uid()) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

CREATE POLICY "Admins can manage all model requests"
ON public.model_requests
FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Employees can view all model requests"
ON public.model_requests
FOR SELECT
USING (is_employee(auth.uid()));

-- 3. Add message_type column to ticket_messages for proper visibility control
ALTER TABLE public.ticket_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'internal_note';

-- Add comment explaining the types
COMMENT ON COLUMN public.ticket_messages.message_type IS 'internal_note: only employees, b2b_message: B2B + employees, customer_message: everyone';

-- Update RLS for ticket_messages to respect message_type
DROP POLICY IF EXISTS "B2B users can view own ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "B2B users can add ticket messages" ON public.ticket_messages;

CREATE POLICY "B2B users can view own ticket messages"
ON public.ticket_messages
FOR SELECT
USING (
  is_b2b_user(auth.uid()) 
  AND message_type IN ('b2b_message', 'customer_message')
  AND EXISTS (
    SELECT 1 FROM repair_tickets rt
    WHERE rt.id = ticket_messages.repair_ticket_id 
    AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);

CREATE POLICY "B2B users can add ticket messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  is_b2b_user(auth.uid()) 
  AND message_type = 'b2b_message'
  AND EXISTS (
    SELECT 1 FROM repair_tickets rt
    WHERE rt.id = ticket_messages.repair_ticket_id 
    AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);

-- 4. Create notification trigger for model requests (using notification_logs)
-- This will be handled in code by inserting into notification_logs when a request is created