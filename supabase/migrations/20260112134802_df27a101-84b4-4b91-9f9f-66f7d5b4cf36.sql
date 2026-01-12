-- CLEANUP: Remove all duplicate RLS policies for model_requests
DROP POLICY IF EXISTS "Admins can manage all model requests" ON model_requests;
DROP POLICY IF EXISTS "Admins can manage model requests" ON model_requests;
DROP POLICY IF EXISTS "B2B users can create model requests" ON model_requests;
DROP POLICY IF EXISTS "B2B users can request models" ON model_requests;
DROP POLICY IF EXISTS "B2B users can view own model requests" ON model_requests;
DROP POLICY IF EXISTS "B2B users can view own requests" ON model_requests;
DROP POLICY IF EXISTS "Employees can update model requests" ON model_requests;
DROP POLICY IF EXISTS "Employees can view all model requests" ON model_requests;
DROP POLICY IF EXISTS "Admin can manage all model requests" ON model_requests;
DROP POLICY IF EXISTS "B2B can insert own model requests" ON model_requests;
DROP POLICY IF EXISTS "B2B can view own model requests" ON model_requests;
DROP POLICY IF EXISTS "Employees can view model requests" ON model_requests;

-- Re-create clean policies for model_requests
CREATE POLICY "model_requests_admin_all"
ON model_requests FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "model_requests_b2b_insert"
ON model_requests FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND ur.role IN ('B2B_INHABER', 'B2B_ADMIN', 'B2B_USER')
      AND p.b2b_partner_id = b2b_partner_id
  )
  AND requested_by = auth.uid()
);

CREATE POLICY "model_requests_b2b_select"
ON model_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.b2b_partner_id = model_requests.b2b_partner_id
  )
);

CREATE POLICY "model_requests_employees_select"
ON model_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER')
  )
);