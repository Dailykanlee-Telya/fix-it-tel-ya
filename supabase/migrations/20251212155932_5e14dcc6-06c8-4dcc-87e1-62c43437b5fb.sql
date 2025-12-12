-- 1. Add IMEI/Serial number fields to devices table
ALTER TABLE public.devices
ADD COLUMN IF NOT EXISTS imei_unreadable BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS serial_unreadable BOOLEAN NOT NULL DEFAULT false;

-- 2. Create ticket_internal_notes table for chronological notes with author
CREATE TABLE IF NOT EXISTS public.ticket_internal_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    repair_ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_internal_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_internal_notes (employees only)
CREATE POLICY "Employees can view internal notes"
ON public.ticket_internal_notes
FOR SELECT
USING (is_employee(auth.uid()));

CREATE POLICY "Employees can add internal notes"
ON public.ticket_internal_notes
FOR INSERT
WITH CHECK (is_employee(auth.uid()));

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ticket_internal_notes_ticket_id 
ON public.ticket_internal_notes(repair_ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_internal_notes_created_at 
ON public.ticket_internal_notes(created_at);

-- 3. Add user_id to notification_logs for better targeting (if not exists)
-- The user_id column already exists, so we just ensure proper indexing
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id 
ON public.notification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_is_read 
ON public.notification_logs(is_read);

-- 4. Create index on ticket_messages for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id 
ON public.ticket_messages(repair_ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at 
ON public.ticket_messages(created_at);