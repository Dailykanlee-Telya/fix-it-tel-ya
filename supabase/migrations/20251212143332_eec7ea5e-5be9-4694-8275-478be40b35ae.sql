-- 1. Härte die is_employee() Funktion mit explizitem NULL-Check
CREATE OR REPLACE FUNCTION public.is_employee(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
  END
$$;

-- 2. Verschärfe die notification_logs SELECT Policy
-- Erst die alte Policy löschen
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification_logs;

-- Neue, strengere Policy: Mitarbeiter sehen nur eigene Benachrichtigungen (außer Admins)
CREATE POLICY "Users can view their own notifications"
ON public.notification_logs
FOR SELECT
USING (
  (user_id = auth.uid()) OR 
  has_role(auth.uid(), 'ADMIN'::app_role)
);