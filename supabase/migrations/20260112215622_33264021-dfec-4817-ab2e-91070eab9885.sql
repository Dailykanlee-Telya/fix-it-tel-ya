
-- Funktion für Teilebuchung mit Approval-Logik
CREATE OR REPLACE FUNCTION public.book_part_usage(
  _ticket_id UUID,
  _part_id UUID,
  _quantity INTEGER,
  _reason public.part_usage_reason,
  _note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _user_role TEXT;
  _usage_id UUID;
  _requires_approval BOOLEAN;
  _stock_location_id UUID;
  _movement_id UUID;
BEGIN
  _user_id := auth.uid();
  
  SELECT CASE
    WHEN public.has_role(_user_id, 'ADMIN') THEN 'ADMIN'
    WHEN public.has_role(_user_id, 'TECHNIKER') THEN 'TECHNIKER'
    WHEN public.has_role(_user_id, 'THEKE') THEN 'THEKE'
    ELSE NULL
  END INTO _user_role;
  
  IF _user_role IS NULL THEN
    RAISE EXCEPTION 'Keine Berechtigung für Teilebuchung';
  END IF;
  
  IF _user_role = 'THEKE' AND (_note IS NULL OR _note = '') THEN
    RAISE EXCEPTION 'THEKE muss einen Grund angeben';
  END IF;
  
  _requires_approval := (_reason = 'SELBSTVERSCHULDEN' AND _user_role != 'ADMIN');
  
  SELECT stock_location_id INTO _stock_location_id FROM public.parts WHERE id = _part_id;
  
  IF _stock_location_id IS NULL THEN
    RAISE EXCEPTION 'Teil hat keinen Lagerort zugewiesen';
  END IF;
  
  INSERT INTO public.ticket_part_usage (
    repair_ticket_id,
    part_id,
    quantity,
    used_by_user_id,
    used_by_role,
    reason,
    note,
    requires_admin_approval,
    approval_status,
    reserved_at
  ) VALUES (
    _ticket_id,
    _part_id,
    _quantity,
    _user_id,
    _user_role,
    _reason,
    _note,
    _requires_approval,
    CASE WHEN _requires_approval THEN 'PENDING'::approval_status ELSE NULL END,
    CASE WHEN _requires_approval THEN now() ELSE NULL END
  )
  RETURNING id INTO _usage_id;
  
  IF NOT _requires_approval THEN
    _movement_id := public.create_stock_movement(
      'CONSUME'::stock_movement_type,
      _part_id,
      _stock_location_id,
      -_quantity,
      NULL,
      _ticket_id,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      _reason::TEXT,
      _note,
      false
    );
    
    UPDATE public.ticket_part_usage 
    SET stock_movement_id = _movement_id
    WHERE id = _usage_id;
  END IF;
  
  RETURN _usage_id;
END;
$$;

-- Funktion für Admin-Approval
CREATE OR REPLACE FUNCTION public.approve_part_usage(
  _usage_id UUID,
  _approved BOOLEAN,
  _note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _usage RECORD;
  _stock_location_id UUID;
  _movement_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Nur ADMIN kann Freigaben erteilen';
  END IF;
  
  SELECT * INTO _usage FROM public.ticket_part_usage WHERE id = _usage_id;
  
  IF _usage IS NULL THEN
    RAISE EXCEPTION 'Buchung nicht gefunden';
  END IF;
  
  IF _usage.approval_status != 'PENDING' THEN
    RAISE EXCEPTION 'Buchung wurde bereits bearbeitet';
  END IF;
  
  IF _approved THEN
    SELECT stock_location_id INTO _stock_location_id FROM public.parts WHERE id = _usage.part_id;
    
    _movement_id := public.create_stock_movement(
      'CONSUME'::stock_movement_type,
      _usage.part_id,
      _stock_location_id,
      -_usage.quantity,
      NULL,
      _usage.repair_ticket_id,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      _usage.reason::TEXT,
      COALESCE(_note, _usage.note),
      false
    );
    
    UPDATE public.ticket_part_usage SET
      approval_status = 'APPROVED',
      approved_by = auth.uid(),
      approved_at = now(),
      approval_note = _note,
      stock_movement_id = _movement_id,
      updated_at = now()
    WHERE id = _usage_id;
  ELSE
    UPDATE public.ticket_part_usage SET
      approval_status = 'REJECTED',
      approved_by = auth.uid(),
      approved_at = now(),
      approval_note = _note,
      updated_at = now()
    WHERE id = _usage_id;
  END IF;
  
  RETURN _approved;
END;
$$;
