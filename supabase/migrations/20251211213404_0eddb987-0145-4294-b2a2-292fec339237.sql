-- 1. Extend notification_logs table for proper notification system
ALTER TABLE public.notification_logs 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS message text,
ADD COLUMN IF NOT EXISTS related_ticket_id uuid REFERENCES public.repair_tickets(id);

-- 2. Create ticket_messages table for customer communication
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'employee')),
  sender_user_id uuid REFERENCES auth.users(id),
  message_text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_messages
CREATE POLICY "Employees can view all messages" ON public.ticket_messages
FOR SELECT USING (is_employee(auth.uid()));

CREATE POLICY "Employees can insert messages" ON public.ticket_messages
FOR INSERT WITH CHECK (is_employee(auth.uid()));

-- 3. Create storage bucket for ticket photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-photos', 'ticket-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ticket photos
CREATE POLICY "Anyone can view ticket photos" ON storage.objects
FOR SELECT USING (bucket_id = 'ticket-photos');

CREATE POLICY "Employees can upload ticket photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'ticket-photos' AND is_employee(auth.uid()));

CREATE POLICY "Employees can delete ticket photos" ON storage.objects
FOR DELETE USING (bucket_id = 'ticket-photos' AND is_employee(auth.uid()));

-- 4. Add more device catalog entries (tablets, laptops, smartwatches)
INSERT INTO public.device_catalog (brand, model, device_type) VALUES
-- Tablets - Apple
('Apple', 'iPad 10', 'TABLET'),
('Apple', 'iPad Air 5', 'TABLET'),
('Apple', 'iPad Air 4', 'TABLET'),
('Apple', 'iPad Pro 11" (4. Gen)', 'TABLET'),
('Apple', 'iPad Pro 12.9" (6. Gen)', 'TABLET'),
('Apple', 'iPad Pro 11" (3. Gen)', 'TABLET'),
('Apple', 'iPad Pro 12.9" (5. Gen)', 'TABLET'),
('Apple', 'iPad mini 6', 'TABLET'),
('Apple', 'iPad 9', 'TABLET'),
('Apple', 'iPad 8', 'TABLET'),
-- Tablets - Samsung
('Samsung', 'Galaxy Tab S9 Ultra', 'TABLET'),
('Samsung', 'Galaxy Tab S9+', 'TABLET'),
('Samsung', 'Galaxy Tab S9', 'TABLET'),
('Samsung', 'Galaxy Tab S8 Ultra', 'TABLET'),
('Samsung', 'Galaxy Tab S8+', 'TABLET'),
('Samsung', 'Galaxy Tab S8', 'TABLET'),
('Samsung', 'Galaxy Tab A9+', 'TABLET'),
('Samsung', 'Galaxy Tab A9', 'TABLET'),
('Samsung', 'Galaxy Tab A8', 'TABLET'),
-- Laptops - Apple
('Apple', 'MacBook Air M3 13"', 'LAPTOP'),
('Apple', 'MacBook Air M3 15"', 'LAPTOP'),
('Apple', 'MacBook Air M2 13"', 'LAPTOP'),
('Apple', 'MacBook Air M2 15"', 'LAPTOP'),
('Apple', 'MacBook Air M1', 'LAPTOP'),
('Apple', 'MacBook Pro 14" M3', 'LAPTOP'),
('Apple', 'MacBook Pro 16" M3', 'LAPTOP'),
('Apple', 'MacBook Pro 14" M3 Pro', 'LAPTOP'),
('Apple', 'MacBook Pro 16" M3 Max', 'LAPTOP'),
('Apple', 'MacBook Pro 13" M2', 'LAPTOP'),
-- Laptops - Other brands
('Lenovo', 'ThinkPad X1 Carbon', 'LAPTOP'),
('Lenovo', 'ThinkPad T14', 'LAPTOP'),
('Lenovo', 'IdeaPad 5', 'LAPTOP'),
('Dell', 'XPS 13', 'LAPTOP'),
('Dell', 'XPS 15', 'LAPTOP'),
('Dell', 'Latitude 5540', 'LAPTOP'),
('HP', 'Spectre x360', 'LAPTOP'),
('HP', 'EliteBook 840', 'LAPTOP'),
('HP', 'Pavilion 15', 'LAPTOP'),
('ASUS', 'ZenBook 14', 'LAPTOP'),
('ASUS', 'ROG Zephyrus G14', 'LAPTOP'),
('Acer', 'Swift 3', 'LAPTOP'),
('Microsoft', 'Surface Laptop 5', 'LAPTOP'),
('Microsoft', 'Surface Pro 9', 'LAPTOP'),
-- Smartwatches - Apple
('Apple', 'Apple Watch Ultra 2', 'SMARTWATCH'),
('Apple', 'Apple Watch Series 9', 'SMARTWATCH'),
('Apple', 'Apple Watch Series 8', 'SMARTWATCH'),
('Apple', 'Apple Watch SE (2. Gen)', 'SMARTWATCH'),
('Apple', 'Apple Watch Series 7', 'SMARTWATCH'),
('Apple', 'Apple Watch Series 6', 'SMARTWATCH'),
-- Smartwatches - Samsung
('Samsung', 'Galaxy Watch 6 Classic', 'SMARTWATCH'),
('Samsung', 'Galaxy Watch 6', 'SMARTWATCH'),
('Samsung', 'Galaxy Watch 5 Pro', 'SMARTWATCH'),
('Samsung', 'Galaxy Watch 5', 'SMARTWATCH'),
('Samsung', 'Galaxy Watch 4 Classic', 'SMARTWATCH'),
('Samsung', 'Galaxy Watch 4', 'SMARTWATCH'),
-- Smartwatches - Other
('Garmin', 'Fenix 7', 'SMARTWATCH'),
('Garmin', 'Venu 3', 'SMARTWATCH'),
('Huawei', 'Watch GT 4', 'SMARTWATCH'),
('Huawei', 'Watch 4 Pro', 'SMARTWATCH'),
('Xiaomi', 'Watch 2 Pro', 'SMARTWATCH'),
('Google', 'Pixel Watch 2', 'SMARTWATCH'),
('Google', 'Pixel Watch', 'SMARTWATCH')
ON CONFLICT DO NOTHING;

-- 5. Update RLS policy for notification_logs to allow user-specific reads
DROP POLICY IF EXISTS "Employees can view logs" ON public.notification_logs;

CREATE POLICY "Users can view their notifications" ON public.notification_logs
FOR SELECT USING (
  is_employee(auth.uid()) OR user_id = auth.uid()
);

CREATE POLICY "Users can update their notifications" ON public.notification_logs
FOR UPDATE USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'ADMIN'::app_role)
);