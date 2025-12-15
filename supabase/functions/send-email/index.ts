import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'ticket_created' | 'kva_ready' | 'ready_for_pickup' | 'custom';
  ticket_id?: string;
  to_email?: string;
  subject?: string;
  body?: string;
}

interface TicketEmailData {
  ticket_number: string;
  kva_token: string;
  customer_name: string;
  customer_email: string;
  device_info: string;
  error_description: string;
  location_name: string;
  estimated_price?: number;
}

const getBaseUrl = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const match = supabaseUrl.match(/https:\/\/([^.]+)/);
  const projectId = match ? match[1] : '';
  return `https://${projectId}.lovableproject.com`;
};

const generateTrackingUrl = (ticketNumber: string, kvaToken: string) => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/track?ticket=${encodeURIComponent(ticketNumber)}&token=${encodeURIComponent(kvaToken)}`;
};

const emailTemplates = {
  ticket_created: (data: TicketEmailData) => ({
    subject: `Reparaturauftrag ${data.ticket_number} - Bestätigung`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .tracking-box { background: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .tracking-code { font-size: 24px; font-weight: bold; color: #1e3a5f; letter-spacing: 2px; margin: 10px 0; }
          .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Telya Reparaturservice</h1>
        </div>
        <div class="content">
          <p>Sehr geehrte/r ${data.customer_name},</p>
          <p>vielen Dank für Ihren Reparaturauftrag. Wir haben Ihr Gerät entgegengenommen und werden uns schnellstmöglich um die Reparatur kümmern.</p>
          
          <div class="info-box">
            <strong>Auftragsnummer:</strong> ${data.ticket_number}<br>
            <strong>Gerät:</strong> ${data.device_info}<br>
            <strong>Fehlerbeschreibung:</strong> ${data.error_description || 'Nicht angegeben'}<br>
            <strong>Standort:</strong> ${data.location_name}
          </div>
          
          <div class="tracking-box">
            <p><strong>Ihr Tracking-Code:</strong></p>
            <div class="tracking-code">${data.kva_token}</div>
            <p>Mit diesem Code können Sie jederzeit den Status Ihrer Reparatur verfolgen.</p>
            <a href="${generateTrackingUrl(data.ticket_number, data.kva_token)}" class="btn">Status prüfen</a>
          </div>
          
          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          <p>Mit freundlichen Grüßen,<br>Ihr Telya Team</p>
        </div>
        <div class="footer">
          <p>Telya GmbH | Diese E-Mail wurde automatisch generiert.</p>
        </div>
      </body>
      </html>
    `
  }),

  kva_ready: (data: TicketEmailData) => ({
    subject: `Kostenvoranschlag für Auftrag ${data.ticket_number}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .price-box { background: #fef3cd; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .price { font-size: 32px; font-weight: bold; color: #856404; }
          .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Telya Reparaturservice</h1>
        </div>
        <div class="content">
          <p>Sehr geehrte/r ${data.customer_name},</p>
          <p>wir haben Ihr Gerät (${data.device_info}) analysiert und einen Kostenvoranschlag erstellt.</p>
          
          <div class="price-box">
            <p>Geschätzte Reparaturkosten:</p>
            <div class="price">${data.estimated_price?.toFixed(2) || '0.00'} €</div>
          </div>
          
          <p>Bitte bestätigen Sie den Kostenvoranschlag, damit wir mit der Reparatur beginnen können:</p>
          <p style="text-align: center;">
            <a href="${generateTrackingUrl(data.ticket_number, data.kva_token)}" class="btn">KVA bestätigen oder ablehnen</a>
          </p>
          
          <p>Mit freundlichen Grüßen,<br>Ihr Telya Team</p>
        </div>
        <div class="footer">
          <p>Telya GmbH | Diese E-Mail wurde automatisch generiert.</p>
        </div>
      </body>
      </html>
    `
  }),

  ready_for_pickup: (data: TicketEmailData) => ({
    subject: `Ihr Gerät ist fertig - Auftrag ${data.ticket_number}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .success-box { background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; color: #155724; }
          .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Telya Reparaturservice</h1>
        </div>
        <div class="content">
          <p>Sehr geehrte/r ${data.customer_name},</p>
          
          <div class="success-box">
            <h2>✓ Ihr Gerät ist fertig!</h2>
            <p>Die Reparatur wurde erfolgreich abgeschlossen.</p>
          </div>
          
          <div class="info-box">
            <strong>Auftragsnummer:</strong> ${data.ticket_number}<br>
            <strong>Gerät:</strong> ${data.device_info}<br>
            <strong>Abholstandort:</strong> ${data.location_name}
          </div>
          
          <p>Sie können Ihr Gerät ab sofort bei uns abholen. Bitte bringen Sie Ihre Auftragsnummer mit.</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihr Telya Team</p>
        </div>
        <div class="footer">
          <p>Telya GmbH | Diese E-Mail wurde automatisch generiert.</p>
        </div>
      </body>
      </html>
    `
  }),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // === AUTHENTICATION CHECK ===
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert - Authorization Header fehlt' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert - Ungültiger Token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has employee or B2B role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Abrufen der Benutzerrolle' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roles || roles.length === 0) {
      console.error('User has no roles:', user.id);
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung - Keine Rolle zugewiesen' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: EmailRequest = await req.json();
    const { type, ticket_id, to_email, subject, body: customBody } = body;

    console.log('Email request received:', { type, ticket_id, to_email, user_id: user.id });

    // Handle custom email - ADMIN only
    if (type === 'custom' && to_email && subject && customBody) {
      const hasAdmin = roles.some(r => r.role === 'ADMIN');
      if (!hasAdmin) {
        console.error('Non-admin tried to send custom email:', user.id);
        return new Response(
          JSON.stringify({ error: 'Keine Berechtigung - Nur Admins können benutzerdefinierte E-Mails senden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log custom email for audit
      await supabase.from('audit_logs').insert({
        action: 'send_custom_email',
        user_id: user.id,
        entity_type: 'email',
        meta: { to_email, subject }
      });

      const { data, error } = await resend.emails.send({
        from: 'Telya Reparatur <noreply@telya.repariert.de>',
        to: [to_email],
        subject,
        html: customBody,
      });

      if (error) {
        console.error('Error sending custom email:', error);
        throw error;
      }

      console.log('Custom email sent:', data);
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle ticket-based emails
    if (!ticket_id) {
      throw new Error('ticket_id ist erforderlich für diesen E-Mail-Typ');
    }

    // Fetch ticket with related data
    const { data: ticket, error: ticketError } = await supabase
      .from('repair_tickets')
      .select(`
        *,
        customer:customers(*),
        device:devices(*),
        location:locations(*)
      `)
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error('Error fetching ticket:', ticketError);
      throw new Error('Ticket nicht gefunden');
    }

    // For B2B users, verify they own this ticket
    const isB2BUser = roles.some(r => r.role === 'B2B_ADMIN' || r.role === 'B2B_USER');
    if (isB2BUser) {
      // Get user's B2B partner ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('b2b_partner_id')
        .eq('id', user.id)
        .single();

      if (!profile?.b2b_partner_id || ticket.b2b_partner_id !== profile.b2b_partner_id) {
        console.error('B2B user tried to send email for ticket they do not own:', user.id, ticket_id);
        return new Response(
          JSON.stringify({ error: 'Keine Berechtigung für diesen Auftrag' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!ticket.customer?.email) {
      console.log('No customer email, skipping email send');
      return new Response(JSON.stringify({ success: false, reason: 'no_email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailData: TicketEmailData = {
      ticket_number: ticket.ticket_number,
      kva_token: ticket.kva_token || '',
      customer_name: `${ticket.customer.first_name} ${ticket.customer.last_name}`,
      customer_email: ticket.customer.email,
      device_info: `${ticket.device?.brand || ''} ${ticket.device?.model || ''}`.trim(),
      error_description: ticket.error_description_text || '',
      location_name: ticket.location?.name || '',
      estimated_price: ticket.estimated_price,
    };

    const template = emailTemplates[type as keyof typeof emailTemplates];
    if (!template) {
      throw new Error(`Unbekannter E-Mail-Typ: ${type}`);
    }

    const emailContent = template(emailData);

    const { data, error } = await resend.emails.send({
      from: 'Telya Reparatur <noreply@telya.repariert.de>',
      to: [emailData.customer_email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    // Log notification
    await supabase.from('notification_logs').insert({
      repair_ticket_id: ticket_id,
      customer_id: ticket.customer.id,
      channel: 'EMAIL',
      trigger: type === 'ticket_created' ? 'TICKET_CREATED' : 
               type === 'kva_ready' ? 'KVA_READY' : 
               'READY_FOR_PICKUP',
      status: 'SENT',
      payload: { email_id: data?.id, to: emailData.customer_email },
    });

    console.log('Email sent successfully:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
