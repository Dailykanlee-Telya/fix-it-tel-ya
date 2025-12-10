-- Drop restrictive policy for ticket_part_usage
DROP POLICY IF EXISTS "Technicians can manage part usage" ON public.ticket_part_usage;

-- Create more permissive policy - all employees can manage part usage
CREATE POLICY "Employees can manage part usage" ON public.ticket_part_usage 
FOR ALL TO authenticated 
USING (public.is_employee(auth.uid()))
WITH CHECK (public.is_employee(auth.uid()));

-- Also need to allow employees to update parts stock
DROP POLICY IF EXISTS "Admins and Buchhaltung can manage parts" ON public.parts;

-- Employees can update parts (for stock management)
CREATE POLICY "Employees can update parts" ON public.parts 
FOR UPDATE TO authenticated 
USING (public.is_employee(auth.uid()));

-- Admins and Buchhaltung can insert/delete parts
CREATE POLICY "Admins and Buchhaltung can insert parts" ON public.parts 
FOR INSERT TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'BUCHHALTUNG'));

CREATE POLICY "Admins and Buchhaltung can delete parts" ON public.parts 
FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'BUCHHALTUNG'));