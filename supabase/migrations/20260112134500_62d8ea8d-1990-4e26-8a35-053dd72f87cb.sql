-- B2B users can SELECT kva_estimates for their own tickets
DROP POLICY IF EXISTS "B2B can view kva estimates" ON kva_estimates;
CREATE POLICY "B2B can view kva estimates"
ON kva_estimates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM repair_tickets rt
    JOIN profiles p ON p.b2b_partner_id = rt.b2b_partner_id
    WHERE rt.id = kva_estimates.repair_ticket_id
      AND p.id = auth.uid()
  )
);

-- Ensure authenticated users can read device catalog
DROP POLICY IF EXISTS "Authenticated users can read device catalog" ON device_catalog;
CREATE POLICY "Authenticated users can read device catalog"
ON device_catalog FOR SELECT
TO authenticated
USING (true);