-- Create app_settings table for system-wide configuration
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Employees can view settings" 
ON public.app_settings 
FOR SELECT 
USING (is_employee(auth.uid()));

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings" 
ON public.app_settings 
FOR ALL 
USING (has_role(auth.uid(), 'ADMIN'));

-- Insert default session timeout (15 minutes)
INSERT INTO public.app_settings (key, value) 
VALUES ('session_timeout_minutes', '15'::jsonb);