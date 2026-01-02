import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackRequest {
  action: 'lookup' | 'kva_decision' | 'send_message';
  ticket_number: string;
  tracking_token: string;
  kva_approved?: boolean;
  disposal_option?: 'ZURUECKSENDEN' | 'KOSTENLOS_ENTSORGEN';
  message?: string;
}

// Simple in-memory rate limiting (per instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIP);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  entry.count++;
  return false;
}

// Clean up old entries periodically
function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';

  // Check rate limit
  if (isRateLimited(clientIP)) {
    console.log('Rate limit exceeded for IP:', clientIP);
    return new Response(
      JSON.stringify({ error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
    );
  }

  // Cleanup old entries occasionally
  if (Math.random() < 0.1) {
    cleanupRateLimitMap();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role key to bypass RLS for this specific public endpoint
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TrackRequest = await req.json();
    const { action, ticket_number, tracking_token, kva_approved, message } = body;

    // Validate required fields
    if (!ticket_number || !tracking_token) {
      console.log('Missing required fields:', { ticket_number: !!ticket_number, tracking_token: !!tracking_token, ip: clientIP });
      return new Response(
        JSON.stringify({ error: 'Auftragsnummer und Tracking-Token sind erforderlich.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean inputs
    const cleanTicketNumber = ticket_number.toUpperCase().trim();
    const cleanToken = tracking_token.trim();

    // Verify ticket exists and token matches
    const { data: ticket, error: ticketError } = await supabase
      .from('repair_tickets')
      .select('id, ticket_number, status, kva_token, kva_required, kva_approved, kva_approved_at, estimated_price, created_at, updated_at, error_description_text, device_id, location_id, is_b2b, endcustomer_price, endcustomer_price_released')
      .eq('ticket_number', cleanTicketNumber)
      .maybeSingle();

    if (ticketError) {
      console.error('Database error looking up ticket:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Datenbankfehler. Bitte versuchen Sie es später erneut.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ticket) {
      console.log('Ticket not found:', cleanTicketNumber, 'IP:', clientIP);
      return new Response(
        JSON.stringify({ error: 'Auftrag nicht gefunden.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify tracking token (kva_token field)
    if (!ticket.kva_token || ticket.kva_token !== cleanToken) {
      console.log('Invalid tracking token for ticket:', cleanTicketNumber, 'IP:', clientIP);
      return new Response(
        JSON.stringify({ error: 'Ungültiger Tracking-Token.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    if (action === 'lookup') {
      // Get device info (only brand/model, no IMEI)
      const { data: device } = await supabase
        .from('devices')
        .select('brand, model, device_type')
        .eq('id', ticket.device_id)
        .single();

      // Get location info (only name)
      const { data: location } = await supabase
        .from('locations')
        .select('name')
        .eq('id', ticket.location_id)
        .single();

      // Get status history (only status changes, no internal notes)
      const { data: statusHistory } = await supabase
        .from('status_history')
        .select('id, new_status, created_at, note')
        .eq('repair_ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      // Get current KVA estimate
      const { data: kvaEstimate } = await supabase
        .from('kva_estimates')
        .select(`
          id, version, kva_type, status,
          repair_cost, parts_cost, total_cost,
          min_cost, max_cost,
          kva_fee_amount, kva_fee_waived,
          valid_until, diagnosis, repair_description,
          decision_at, disposal_option,
          endcustomer_price, endcustomer_price_released
        `)
        .eq('repair_ticket_id', ticket.id)
        .eq('is_current', true)
        .maybeSingle();

      // Filter out internal notes - only show customer-relevant notes
      const filteredHistory = (statusHistory || []).map(entry => ({
        id: entry.id,
        new_status: entry.new_status,
        created_at: entry.created_at,
        note: entry.note?.startsWith('[Kundennachricht]') ? entry.note : 
              (entry.note?.includes('KVA') ? entry.note : null)
      }));

      // Return only minimal, non-sensitive information
      return new Response(
        JSON.stringify({
          ticket_number: ticket.ticket_number,
          status: ticket.status,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          error_description_text: ticket.error_description_text,
          kva_required: ticket.kva_required,
          kva_approved: ticket.kva_approved,
          kva_approved_at: ticket.kva_approved_at,
          estimated_price: ticket.is_b2b ? null : ticket.estimated_price,
          endcustomer_price: ticket.is_b2b && ticket.endcustomer_price_released ? ticket.endcustomer_price : null,
          endcustomer_price_released: ticket.endcustomer_price_released,
          is_b2b: ticket.is_b2b,
          device: device ? { brand: device.brand, model: device.model, device_type: device.device_type } : null,
          location: location ? { name: location.name } : null,
          status_history: filteredHistory,
          // Include KVA data for new system
          kva: kvaEstimate ? {
            id: kvaEstimate.id,
            version: kvaEstimate.version,
            kva_type: kvaEstimate.kva_type,
            status: kvaEstimate.status,
            repair_cost: ticket.is_b2b ? null : kvaEstimate.repair_cost,
            parts_cost: ticket.is_b2b ? null : kvaEstimate.parts_cost,
            total_cost: ticket.is_b2b && !kvaEstimate.endcustomer_price_released ? null : kvaEstimate.total_cost,
            min_cost: ticket.is_b2b ? null : kvaEstimate.min_cost,
            max_cost: ticket.is_b2b ? null : kvaEstimate.max_cost,
            kva_fee_amount: kvaEstimate.kva_fee_waived ? null : kvaEstimate.kva_fee_amount,
            kva_fee_waived: kvaEstimate.kva_fee_waived,
            valid_until: kvaEstimate.valid_until,
            diagnosis: kvaEstimate.diagnosis,
            repair_description: kvaEstimate.repair_description,
            decision_at: kvaEstimate.decision_at,
            disposal_option: kvaEstimate.disposal_option,
            endcustomer_price: kvaEstimate.endcustomer_price_released ? kvaEstimate.endcustomer_price : null,
            endcustomer_price_released: kvaEstimate.endcustomer_price_released
          } : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'kva_decision') {
      if (typeof kva_approved !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'KVA-Entscheidung fehlt.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current KVA estimate
      const { data: currentKva } = await supabase
        .from('kva_estimates')
        .select('id, status')
        .eq('repair_ticket_id', ticket.id)
        .eq('is_current', true)
        .maybeSingle();

      // Check if KVA is required and not already decided
      if (!ticket.kva_required && !currentKva) {
        return new Response(
          JSON.stringify({ error: 'Kein KVA für diesen Auftrag erforderlich.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already decided (in new system or legacy)
      if (currentKva && ['FREIGEGEBEN', 'ABGELEHNT', 'ENTSORGEN'].includes(currentKva.status)) {
        return new Response(
          JSON.stringify({ error: 'KVA wurde bereits entschieden.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (ticket.kva_approved !== null && !currentKva) {
        return new Response(
          JSON.stringify({ error: 'KVA wurde bereits entschieden.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const decisionTime = new Date().toISOString();
      const newKvaStatus = kva_approved ? 'FREIGEGEBEN' : (body.disposal_option === 'KOSTENLOS_ENTSORGEN' ? 'ENTSORGEN' : 'ABGELEHNT');

      // Update kva_estimates if exists
      if (currentKva) {
        const { error: kvaError } = await supabase
          .from('kva_estimates')
          .update({
            status: newKvaStatus,
            decision: newKvaStatus,
            decision_at: decisionTime,
            decision_by_customer: true,
            decision_channel: 'ONLINE',
            disposal_option: !kva_approved ? body.disposal_option : null,
          })
          .eq('id', currentKva.id);

        if (kvaError) {
          console.error('Error updating KVA estimate:', kvaError);
        }

        // Add KVA history entry
        await supabase.from('kva_history').insert({
          kva_estimate_id: currentKva.id,
          action: kva_approved ? 'KUNDE_FREIGEGEBEN' : 'KUNDE_ABGELEHNT',
          new_values: { 
            decision: newKvaStatus,
            disposal_option: body.disposal_option 
          },
          note: kva_approved ? 'KVA online vom Kunden freigegeben' : `KVA online vom Kunden abgelehnt${body.disposal_option === 'KOSTENLOS_ENTSORGEN' ? ' (Entsorgung)' : ''}`,
        });
      }

      // Update ticket with KVA decision and disposal option
      const updateData: Record<string, any> = {
        kva_approved: kva_approved,
        kva_approved_at: decisionTime,
      };
      
      // Store disposal option if rejecting
      if (!kva_approved && body.disposal_option) {
        updateData.disposal_option = body.disposal_option;
      }

      // Auto-transition to IN_REPARATUR if approved
      if (kva_approved) {
        updateData.status = 'IN_REPARATUR';
      }

      const { error: updateError } = await supabase
        .from('repair_tickets')
        .update(updateData)
        .eq('id', ticket.id);

      if (updateError) {
        console.error('Error updating KVA decision:', updateError);
        return new Response(
          JSON.stringify({ error: 'Fehler beim Speichern der Entscheidung.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add status history entry
      await supabase.from('status_history').insert({
        repair_ticket_id: ticket.id,
        old_status: ticket.status,
        new_status: kva_approved ? 'IN_REPARATUR' : ticket.status,
        note: kva_approved ? 'KVA vom Kunden angenommen - Reparatur startet' : `KVA vom Kunden abgelehnt${body.disposal_option === 'KOSTENLOS_ENTSORGEN' ? ' - Kostenlose Entsorgung gewählt' : ''}`,
      });

      // Create notifications for all employees with relevant roles (deduplicated)
      const { data: employees } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['ADMIN', 'THEKE', 'TECHNIKER']);

      if (employees && employees.length > 0) {
        // Deduplicate user_ids (users may have multiple roles)
        const uniqueUserIds = [...new Set(employees.map(emp => emp.user_id))];
        
        const notifications = uniqueUserIds.map(userId => ({
          channel: 'EMAIL' as const,
          trigger: kva_approved ? 'KVA_APPROVED' as const : 'KVA_REJECTED' as const,
          repair_ticket_id: ticket.id,
          related_ticket_id: ticket.id,
          user_id: userId,
          type: 'KVA_DECISION',
          title: kva_approved ? 'KVA angenommen' : 'KVA abgelehnt',
          message: `Kunde hat KVA für ${cleanTicketNumber} ${kva_approved ? 'angenommen' : 'abgelehnt'}.`,
          is_read: false,
        }));

        await supabase.from('notification_logs').insert(notifications);
      }

      console.log('KVA decision recorded:', { ticket_number: cleanTicketNumber, approved: kva_approved });

      return new Response(
        JSON.stringify({ 
          success: true, 
          kva_approved: kva_approved,
          kva_approved_at: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send_message') {
      if (!message || message.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nachricht darf nicht leer sein.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Limit message length
      const cleanMessage = message.trim().slice(0, 1000);

      // Insert into ticket_messages table
      const { error: messageError } = await supabase.from('ticket_messages').insert({
        repair_ticket_id: ticket.id,
        sender_type: 'customer',
        message_text: cleanMessage,
      });

      if (messageError) {
        console.error('Error inserting customer message:', messageError);
        // Fallback to status_history
        await supabase.from('status_history').insert({
          repair_ticket_id: ticket.id,
          old_status: ticket.status,
          new_status: ticket.status,
          note: `[Kundennachricht] ${cleanMessage}`,
        });
      }

      // Create notifications for all employees with relevant roles (deduplicated)
      const { data: employees } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['ADMIN', 'THEKE', 'TECHNIKER']);

      if (employees && employees.length > 0) {
        // Deduplicate user_ids (users may have multiple roles)
        const uniqueUserIds = [...new Set(employees.map(emp => emp.user_id))];
        
        const notifications = uniqueUserIds.map(userId => ({
          channel: 'EMAIL' as const,
          trigger: 'TICKET_CREATED' as const,
          repair_ticket_id: ticket.id,
          related_ticket_id: ticket.id,
          user_id: userId,
          type: 'NEW_CUSTOMER_MESSAGE',
          title: 'Neue Kundennachricht',
          message: `Neue Nachricht vom Kunden für ${cleanTicketNumber}: ${cleanMessage.substring(0, 100)}${cleanMessage.length > 100 ? '...' : ''}`,
          is_read: false,
        }));

        await supabase.from('notification_logs').insert(notifications);
      }

      console.log('Customer message sent:', { ticket_number: cleanTicketNumber, message_length: cleanMessage.length });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ungültige Aktion.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-ticket function:', error);
    return new Response(
      JSON.stringify({ error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
