-- Fix: Restrict public feedback insertion to require a valid ticket reference
-- This prevents spam by requiring knowledge of an existing ticket

-- Drop the overly permissive public insert policy
DROP POLICY IF EXISTS "Public can insert feedback" ON public.feedback;

-- Create a more secure policy that requires a valid ticket_id reference
-- The ticket must exist for the feedback to be accepted
CREATE POLICY "Public can insert feedback with valid ticket" ON public.feedback 
FOR INSERT 
WITH CHECK (
  -- Must provide a repair_ticket_id
  repair_ticket_id IS NOT NULL 
  -- And the ticket must actually exist
  AND EXISTS (
    SELECT 1 FROM public.repair_tickets rt 
    WHERE rt.id = repair_ticket_id
  )
);