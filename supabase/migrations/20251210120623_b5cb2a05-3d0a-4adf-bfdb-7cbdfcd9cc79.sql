-- Drop the restrictive admin-only policy
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;

-- Create more permissive policies for locations management
-- Any employee can create locations (needed for initial setup)
CREATE POLICY "Employees can create locations" ON public.locations 
FOR INSERT TO authenticated 
WITH CHECK (public.is_employee(auth.uid()));

-- Employees can update locations
CREATE POLICY "Employees can update locations" ON public.locations 
FOR UPDATE TO authenticated 
USING (public.is_employee(auth.uid()));

-- Only admins can delete locations
CREATE POLICY "Admins can delete locations" ON public.locations 
FOR DELETE TO authenticated 
USING (public.has_role(auth.uid(), 'ADMIN'));

-- Also, we need to ensure new users get a role
-- Let's create a trigger to automatically assign THEKE role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  
  -- Assign default role (THEKE for counter staff)
  -- First user gets ADMIN role
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'ADMIN');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'THEKE');
  END IF;
  
  RETURN NEW;
END;
$$;