
-- 1. Fix is_employee() to exclude B2B roles (privilege escalation fix)
CREATE OR REPLACE FUNCTION public.is_employee(_user_id uuid)
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
        AND role IN ('ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER')
    )
  END
$$;

-- 2. Fix model_requests INSERT policy: replace tautological p.b2b_partner_id = p.b2b_partner_id
DROP POLICY IF EXISTS "model_requests_b2b_insert" ON public.model_requests;

CREATE POLICY "model_requests_b2b_insert"
ON public.model_requests
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND ur.role IN ('B2B_INHABER', 'B2B_ADMIN', 'B2B_USER')
      AND model_requests.b2b_partner_id = p.b2b_partner_id
  ))
  AND requested_by = auth.uid()
);
