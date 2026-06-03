
-- Fix 1: is_b2b_user includes B2B_INHABER
CREATE OR REPLACE FUNCTION public.is_b2b_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id 
        AND role IN ('B2B_ADMIN', 'B2B_USER', 'B2B_INHABER')
    )
  END
$$;

-- Fix 2: restrict b2b invitation tokens to admins only
DROP POLICY IF EXISTS "Employees can view all invitations" ON public.b2b_user_invitations;
CREATE POLICY "Admins can view all invitations"
  ON public.b2b_user_invitations
  FOR SELECT
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Fix 3: feedback insert requires authentication + valid ticket
DROP POLICY IF EXISTS "Public can insert feedback with valid ticket" ON public.feedback;
CREATE POLICY "Authenticated users can insert feedback for valid tickets"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    repair_ticket_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.repair_tickets rt WHERE rt.id = feedback.repair_ticket_id)
  );
