-- Update handle_new_user function to set is_active = false for new users (require admin approval)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user
  SELECT (COUNT(*) = 0) INTO is_first_user FROM public.user_roles;
  
  -- Create profile - first user is active, others need approval
  INSERT INTO public.profiles (id, name, email, is_active)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    NEW.email,
    is_first_user  -- First user is active, others are inactive
  );
  
  -- Assign default role
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'ADMIN');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'THEKE');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Generate tracking token function
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RETURN upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
END;
$$;