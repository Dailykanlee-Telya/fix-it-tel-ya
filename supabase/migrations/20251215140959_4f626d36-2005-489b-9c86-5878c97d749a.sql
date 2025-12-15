CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Only admins can reset data';
  END IF;

  -- Delete in order respecting foreign keys (explicit WHERE required)
  DELETE FROM public.ticket_internal_notes WHERE TRUE;
  DELETE FROM public.ticket_messages WHERE TRUE;
  DELETE FROM public.status_history WHERE TRUE;
  DELETE FROM public.ticket_checklist_items WHERE TRUE;
  DELETE FROM public.ticket_part_usage WHERE TRUE;
  DELETE FROM public.ticket_photos WHERE TRUE;
  DELETE FROM public.feedback WHERE TRUE;
  DELETE FROM public.notification_logs WHERE TRUE;

  -- Tickets first, then shipments (tickets reference shipment_id)
  DELETE FROM public.repair_tickets WHERE TRUE;
  DELETE FROM public.b2b_shipments WHERE TRUE;

  -- Devices reference customers
  DELETE FROM public.devices WHERE TRUE;

  -- Partners / customers last
  DELETE FROM public.b2b_partners WHERE TRUE;
  DELETE FROM public.customers WHERE TRUE;

  -- Reset sequence table for fresh start
  DELETE FROM public.ticket_number_sequence WHERE TRUE;
END;
$$;