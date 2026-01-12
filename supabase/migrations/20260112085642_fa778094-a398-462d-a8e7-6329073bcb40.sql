-- Add FREIGEGEBEN status to ticket_status enum
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'FREIGEGEBEN' AFTER 'WARTET_AUF_TEIL_ODER_FREIGABE';

-- Add KVA_B2B_APPROVED notification trigger if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'KVA_B2B_APPROVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_trigger')) THEN
    ALTER TYPE public.notification_trigger ADD VALUE 'KVA_B2B_APPROVED';
  END IF;
END $$;