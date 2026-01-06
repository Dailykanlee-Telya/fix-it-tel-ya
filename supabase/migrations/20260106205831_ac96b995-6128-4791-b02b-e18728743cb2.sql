-- Harden reset_all_data by removing SECURITY DEFINER (RLS no longer bypassed)
-- and granting admins explicit DELETE permissions needed for data reset.

-- 1) Admin-only DELETE policies required for reset
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Admins can delete devices" ON public.devices;
CREATE POLICY "Admins can delete devices"
ON public.devices
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Admins can delete repair tickets" ON public.repair_tickets;
CREATE POLICY "Admins can delete repair tickets"
ON public.repair_tickets
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Admins can delete ticket messages" ON public.ticket_messages;
CREATE POLICY "Admins can delete ticket messages"
ON public.ticket_messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Admins can delete ticket internal notes" ON public.ticket_internal_notes;
CREATE POLICY "Admins can delete ticket internal notes"
ON public.ticket_internal_notes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Admins can delete status history" ON public.status_history;
CREATE POLICY "Admins can delete status history"
ON public.status_history
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Admins can delete ticket photos" ON public.ticket_photos;
CREATE POLICY "Admins can delete ticket photos"
ON public.ticket_photos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Admins can delete feedback" ON public.feedback;
CREATE POLICY "Admins can delete feedback"
ON public.feedback
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));

DROP POLICY IF EXISTS "Admins can delete notification logs" ON public.notification_logs;
CREATE POLICY "Admins can delete notification logs"
ON public.notification_logs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'ADMIN'::app_role));


-- 2) Replace reset_all_data() without SECURITY DEFINER (SECURITY INVOKER is default)
CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Only admins can reset data';
  END IF;

  -- Audit start
  INSERT INTO public.audit_logs (action, user_id, entity_type, meta)
  VALUES (
    'reset_all_data_initiated',
    auth.uid(),
    'system',
    jsonb_build_object('timestamp', now())
  );

  -- Delete in order respecting foreign keys
  DELETE FROM public.ticket_internal_notes;
  DELETE FROM public.ticket_messages;
  DELETE FROM public.status_history;
  DELETE FROM public.ticket_checklist_items;
  DELETE FROM public.ticket_part_usage;
  DELETE FROM public.ticket_photos;
  DELETE FROM public.feedback;
  DELETE FROM public.notification_logs;
  DELETE FROM public.b2b_shipments;
  DELETE FROM public.repair_tickets;
  DELETE FROM public.devices;
  DELETE FROM public.customers;
  DELETE FROM public.b2b_partners;

  -- Reset sequence table for fresh start
  DELETE FROM public.ticket_number_sequence;

  -- Audit completion
  INSERT INTO public.audit_logs (action, user_id, entity_type, meta)
  VALUES (
    'reset_all_data_completed',
    auth.uid(),
    'system',
    jsonb_build_object('timestamp', now())
  );
END;
$$;

-- 3) Ensure the function can't be executed by anonymous users
REVOKE ALL ON FUNCTION public.reset_all_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_all_data() TO authenticated;
