
-- Phase 2: ticket_part_usage Tabelle

-- Alte Tabelle löschen falls vorhanden
DROP TABLE IF EXISTS public.ticket_part_usage CASCADE;

-- Neue Tabelle erstellen
CREATE TABLE public.ticket_part_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  used_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  used_by_role TEXT NOT NULL CHECK (used_by_role IN ('TECHNIKER', 'THEKE', 'ADMIN')),
  reason public.part_usage_reason NOT NULL DEFAULT 'REPARATUR',
  note TEXT,
  requires_admin_approval BOOLEAN NOT NULL DEFAULT false,
  approval_status public.approval_status,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approval_note TEXT,
  stock_movement_id UUID REFERENCES public.stock_movements(id),
  reserved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.ticket_part_usage 
ADD CONSTRAINT theke_requires_note 
CHECK (used_by_role != 'THEKE' OR (note IS NOT NULL AND note != ''));

ALTER TABLE public.ticket_part_usage 
ADD CONSTRAINT selbstverschulden_requires_approval 
CHECK (reason != 'SELBSTVERSCHULDEN' OR requires_admin_approval = true);

-- Trigger
CREATE TRIGGER update_ticket_part_usage_updated_at
BEFORE UPDATE ON public.ticket_part_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_ticket_part_usage_ticket ON public.ticket_part_usage(repair_ticket_id);
CREATE INDEX idx_ticket_part_usage_part ON public.ticket_part_usage(part_id);
CREATE INDEX idx_ticket_part_usage_user ON public.ticket_part_usage(used_by_user_id);
CREATE INDEX idx_ticket_part_usage_pending ON public.ticket_part_usage(approval_status) WHERE approval_status = 'PENDING';

-- RLS
ALTER TABLE public.ticket_part_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can create part usage"
ON public.ticket_part_usage FOR INSERT
WITH CHECK (public.is_employee(auth.uid()) AND used_by_user_id = auth.uid());

CREATE POLICY "Employees can view part usage"
ON public.ticket_part_usage FOR SELECT
USING (public.is_employee(auth.uid()));

CREATE POLICY "Admin can update for approval"
ON public.ticket_part_usage FOR UPDATE
USING (public.has_role(auth.uid(), 'ADMIN'));
