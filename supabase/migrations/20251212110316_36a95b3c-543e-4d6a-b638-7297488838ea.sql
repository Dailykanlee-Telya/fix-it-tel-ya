-- Fix: Ensure profiles table is only accessible to authenticated users
-- Drop existing permissive policies and recreate them with authentication requirement

-- For profiles table: Update existing policies to explicitly require authentication
DROP POLICY IF EXISTS "Employees can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate with explicit auth check (RESTRICTIVE policies already require the condition to be true)
CREATE POLICY "Employees can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_employee(auth.uid()));

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- For customers table: Update existing policies to explicitly require authentication
DROP POLICY IF EXISTS "Employees can view customers" ON public.customers;
DROP POLICY IF EXISTS "Employees can create customers" ON public.customers;
DROP POLICY IF EXISTS "Employees can update customers" ON public.customers;

-- Recreate with explicit auth check
CREATE POLICY "Employees can view customers" 
ON public.customers 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_employee(auth.uid()));

CREATE POLICY "Employees can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND is_employee(auth.uid()));

CREATE POLICY "Employees can update customers" 
ON public.customers 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND is_employee(auth.uid()));