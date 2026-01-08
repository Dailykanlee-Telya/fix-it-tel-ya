import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import * as ammonia from 'https://deno.land/x/ammonia@0.3.1/mod.ts';

await ammonia.init();

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize HTML to prevent XSS in emails using Ammonia (Rust-based, Deno-native)
const sanitizeHtml = (html: string): string => {
  return ammonia.clean(html);
};

interface EmailRequest {
  type: 'ticket_created' | 'kva_ready' | 'ready_for_pickup' | 'custom' | 'user_approved' | 'b2b_registration' | 'b2b_approved';
  ticket_id?: string;
  to_email?: string;
  subject?: string;
  body?: string;
  user_name?: string;
  partner_name?: string;
  password_link?: string;
}

interface TicketEmailData {
  ticket_number: string;
  kva_token: string;
  customer_name: string;
  customer_email: string;
  device_info: string;
  error_description: string;
  location_name: string;
  location_address?: string;
  location_phone?: string;
  estimated_price?: number;
  tracking_url: string;
  is_b2b?: boolean;
  partner_name?: string;
  partner_logo_url?: string;
}

const getBaseUrl = (req: Request) => {
  const explicit = Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('APP_BASE_URL'); 
  const candidate = explicit || req.headers.get('origin') || req.headers.get('referer') || '';
  try { return new URL(candidate).origin.replace(/\/+$/, ''); } catch {}
  // Fallback to empty string - PUBLIC_APP_URL must be configured
  return '';
};

const generateTrackingUrl = (baseUrl: string, ticketNumber: string, kvaToken: string) => {
  const urlBase = (baseUrl || '').replace(/\/+$/, '');
  return `${urlBase}/track?ticket=${encodeURIComponent(ticketNumber)}&token=${encodeURIComponent(kvaToken)}`;
};

// ============================================
// MASTER EMAIL TEMPLATE
// All emails use this unified template structure
// ============================================
interface MasterTemplateParams {
  headline: string;
  bodyContent: string;
  trackingInfo?: {
    email?: string;
    phone?: string;
    trackingCode?: string;
    trackingUrl?: string;
  };
  locationInfo?: {
    name: string;
    address?: string;
    phone?: string;
  };
  ctaButton?: {
    text: string;
    url: string;
  };
  isB2B?: boolean;
  partnerName?: string;
  partnerLogoUrl?: string;
}

const createMasterTemplate = (params: MasterTemplateParams): string => {
  const {
    headline,
    bodyContent,
    trackingInfo,
    locationInfo,
    ctaButton,
    isB2B,
    partnerName,
    partnerLogoUrl,
  } = params;

  const baseUrl = Deno.env.get('PUBLIC_APP_URL') || '';
  const privacyUrl = `${baseUrl}/datenschutz`;

  // Header: Telya logo or B2B partner branding
  const headerContent = isB2B && partnerLogoUrl
    ? `<img src="${partnerLogoUrl}" alt="${partnerName || 'Partner'}" style="max-height: 50px; max-width: 200px;">`
    : `<h1 style="margin: 0; font-size: 24px;">Telya Reparaturservice</h1>`;

  const subHeader = isB2B && partnerName
    ? `<p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Partner: ${partnerName}</p>`
    : '';

  // Tracking info box
  const trackingBox = trackingInfo ? `
    <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; color: #1e3a5f; font-weight: 600;">Ihre Tracking-Daten</p>
      ${trackingInfo.email ? `<p style="margin: 5px 0; font-size: 14px;"><strong>E-Mail:</strong> ${trackingInfo.email}</p>` : ''}
      ${trackingInfo.phone ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Telefon:</strong> ${trackingInfo.phone}</p>` : ''}
      ${trackingInfo.trackingCode ? `
        <p style="margin: 15px 0 5px 0; font-size: 14px;">Tracking-Code:</p>
        <div style="font-size: 28px; font-weight: bold; color: #1e3a5f; letter-spacing: 3px; margin: 10px 0; font-family: monospace;">${trackingInfo.trackingCode}</div>
      ` : ''}
      ${trackingInfo.trackingUrl ? `
        <a href="${trackingInfo.trackingUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: 600;">Status prüfen</a>
      ` : ''}
    </div>
  ` : '';

  // CTA Button
  const ctaButtonHtml = ctaButton ? `
    <p style="text-align: center; margin: 25px 0;">
      <a href="${ctaButton.url}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${ctaButton.text}</a>
    </p>
  ` : '';

  // Location info in footer
  const locationFooter = locationInfo ? `
    <div style="margin-bottom: 15px;">
      <p style="margin: 0; font-weight: 600;">${locationInfo.name}</p>
      ${locationInfo.address ? `<p style="margin: 3px 0;">${locationInfo.address}</p>` : ''}
      ${locationInfo.phone ? `<p style="margin: 3px 0;">Tel: ${locationInfo.phone}</p>` : ''}
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); color: white; padding: 25px 30px; text-align: center;">
              ${headerContent}
              ${subHeader}
            </td>
          </tr>
          
          <!-- Headline -->
          <tr>
            <td style="padding: 30px 30px 0 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 22px; font-weight: 600;">${headline}</h2>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 0 30px;">
              ${bodyContent}
            </td>
          </tr>
          
          <!-- Tracking Info -->
          <tr>
            <td style="padding: 0 30px;">
              ${trackingBox}
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px;">
              ${ctaButtonHtml}
            </td>
          </tr>
          
          <!-- Signature -->
          <tr>
            <td style="padding: 20px 30px 30px 30px;">
              <p style="margin: 0;">Mit freundlichen Grüßen,<br><strong>Ihr ${isB2B && partnerName ? partnerName : 'Telya'} Team</strong></p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e9ecef;">
              ${locationFooter}
              <div style="font-size: 12px; color: #6c757d;">
                <p style="margin: 0 0 8px 0;">Diese E-Mail wurde automatisch generiert.</p>
                <p style="margin: 0;">
                  <a href="${privacyUrl}" style="color: #6c757d; text-decoration: underline;">Datenschutz</a>
                </p>
                <p style="margin: 10px 0 0 0;">&copy; ${new Date().getFullYear()} Telya GmbH</p>
              </div>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// ============================================
// EMAIL CONTENT GENERATORS
// ============================================

const emailTemplates = {
  ticket_created: (data: TicketEmailData) => ({
    subject: `Reparaturauftrag ${data.ticket_number} - Bestätigung`,
    html: createMasterTemplate({
      headline: 'Vielen Dank für Ihren Reparaturauftrag',
      bodyContent: `
        <p>Sehr geehrte/r ${data.customer_name},</p>
        <p>wir haben Ihr Gerät entgegengenommen und werden uns schnellstmöglich um die Reparatur kümmern.</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; color: #6c757d;">Auftragsnummer:</td><td style="padding: 5px 0; font-weight: 600;">${data.ticket_number}</td></tr>
            <tr><td style="padding: 5px 0; color: #6c757d;">Gerät:</td><td style="padding: 5px 0;">${data.device_info}</td></tr>
            <tr><td style="padding: 5px 0; color: #6c757d;">Fehlerbeschreibung:</td><td style="padding: 5px 0;">${data.error_description || 'Nicht angegeben'}</td></tr>
            <tr><td style="padding: 5px 0; color: #6c757d;">Standort:</td><td style="padding: 5px 0;">${data.location_name}</td></tr>
          </table>
        </div>
        
        <p>Mit dem Tracking-Code können Sie jederzeit den Status Ihrer Reparatur verfolgen:</p>
      `,
      trackingInfo: {
        trackingCode: data.kva_token,
        trackingUrl: data.tracking_url,
      },
      locationInfo: {
        name: data.location_name,
        address: data.location_address,
        phone: data.location_phone,
      },
      isB2B: data.is_b2b,
      partnerName: data.partner_name,
      partnerLogoUrl: data.partner_logo_url,
    }),
  }),

  kva_ready: (data: TicketEmailData) => ({
    subject: `Kostenvoranschlag für Auftrag ${data.ticket_number}`,
    html: createMasterTemplate({
      headline: 'Ihr Kostenvoranschlag ist bereit',
      bodyContent: `
        <p>Sehr geehrte/r ${data.customer_name},</p>
        <p>wir haben Ihr Gerät (${data.device_info}) analysiert und einen Kostenvoranschlag erstellt.</p>
        
        <div style="background: #fef3cd; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #856404;">Geschätzte Reparaturkosten:</p>
          <div style="font-size: 36px; font-weight: bold; color: #856404;">${data.estimated_price?.toFixed(2) || '0.00'} €</div>
        </div>
        
        <p>Bitte bestätigen oder lehnen Sie den Kostenvoranschlag ab, damit wir fortfahren können:</p>
      `,
      ctaButton: {
        text: 'KVA bestätigen oder ablehnen',
        url: data.tracking_url,
      },
      locationInfo: {
        name: data.location_name,
        address: data.location_address,
        phone: data.location_phone,
      },
      isB2B: data.is_b2b,
      partnerName: data.partner_name,
      partnerLogoUrl: data.partner_logo_url,
    }),
  }),

  ready_for_pickup: (data: TicketEmailData) => ({
    subject: `Ihr Gerät ist fertig - Auftrag ${data.ticket_number}`,
    html: createMasterTemplate({
      headline: 'Ihr Gerät ist fertig!',
      bodyContent: `
        <p>Sehr geehrte/r ${data.customer_name},</p>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
          <p style="margin: 0; color: #155724; font-size: 18px; font-weight: 600;">Die Reparatur wurde erfolgreich abgeschlossen!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; color: #6c757d;">Auftragsnummer:</td><td style="padding: 5px 0; font-weight: 600;">${data.ticket_number}</td></tr>
            <tr><td style="padding: 5px 0; color: #6c757d;">Gerät:</td><td style="padding: 5px 0;">${data.device_info}</td></tr>
            <tr><td style="padding: 5px 0; color: #6c757d;">Abholstandort:</td><td style="padding: 5px 0;">${data.location_name}</td></tr>
          </table>
        </div>
        
        <p>Sie können Ihr Gerät ab sofort bei uns abholen. Bitte bringen Sie Ihre Auftragsnummer mit.</p>
      `,
      locationInfo: {
        name: data.location_name,
        address: data.location_address,
        phone: data.location_phone,
      },
      isB2B: data.is_b2b,
      partnerName: data.partner_name,
      partnerLogoUrl: data.partner_logo_url,
    }),
  }),
};

// ============================================
// MAIN HANDLER
// ============================================

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

    const emailBody: EmailRequest = await req.json();
    const { type, ticket_id, to_email, subject, body: customBody, user_name, partner_name, password_link } = emailBody;

    console.log('Email request received:', { type, ticket_id, to_email, user_id: user.id });
    
    const baseUrl = getBaseUrl(req);

    // ============================================
    // HANDLE: B2B Registration Received
    // ============================================
    if (type === 'b2b_registration' && to_email && partner_name) {
      const html = createMasterTemplate({
        headline: 'B2B-Registrierung eingegangen',
        bodyContent: `
          <p>Sehr geehrte/r ${partner_name},</p>
          <p>vielen Dank für Ihre Registrierung als B2B-Partner bei Telya.</p>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1e3a5f;"><strong>Status: Prüfung ausstehend</strong></p>
            <p style="margin: 10px 0 0 0;">Ihre Anfrage wird von unserem Team geprüft. Sie erhalten eine Benachrichtigung, sobald Ihr Konto freigeschaltet wurde.</p>
          </div>
          
          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        `,
      });

      const { data, error } = await resend.emails.send({
        from: 'Telya Reparatur <noreply@telya.repariert.de>',
        to: [to_email],
        subject: 'B2B-Registrierung eingegangen - Telya',
        html,
      });

      if (error) {
        console.error('Error sending B2B registration email:', error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // HANDLE: B2B Approved
    // ============================================
    if (type === 'b2b_approved' && to_email && partner_name) {
      const html = createMasterTemplate({
        headline: 'Ihr B2B-Konto wurde freigeschaltet',
        bodyContent: `
          <p>Sehr geehrte/r ${partner_name},</p>
          <p>Ihr B2B-Partnerkonto bei Telya wurde erfolgreich freigeschaltet!</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 10px;">✓</div>
            <p style="margin: 0; color: #155724; font-weight: 600;">Konto aktiv</p>
          </div>
          
          <p>Bitte setzen Sie jetzt Ihr Passwort, um Zugang zum B2B-Portal zu erhalten:</p>
        `,
        ctaButton: password_link ? {
          text: 'Passwort setzen',
          url: password_link,
        } : undefined,
      });

      const { data, error } = await resend.emails.send({
        from: 'Telya Reparatur <noreply@telya.repariert.de>',
        to: [to_email],
        subject: 'B2B-Konto freigeschaltet - Telya',
        html,
      });

      if (error) {
        console.error('Error sending B2B approved email:', error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // HANDLE: User Approved (Admin only)
    // ============================================
    if (type === 'user_approved' && to_email && user_name) {
      const hasAdmin = roles.some(r => r.role === 'ADMIN');
      if (!hasAdmin) {
        console.error('Non-admin tried to send user approval email:', user.id);
        return new Response(
          JSON.stringify({ error: 'Keine Berechtigung - Nur Admins können Benutzer-E-Mails senden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const html = createMasterTemplate({
        headline: 'Ihr Konto wurde freigeschaltet',
        bodyContent: `
          <p>Hallo ${user_name},</p>
          <p>Ihr Benutzerkonto wurde erfolgreich freigeschaltet. Sie können sich ab sofort im Telya Repair Management System anmelden.</p>
        `,
        ctaButton: {
          text: 'Jetzt anmelden',
          url: baseUrl,
        },
      });

      // Log for audit
      await supabase.from('audit_logs').insert({
        action: 'send_user_approved_email',
        user_id: user.id,
        entity_type: 'user',
        meta: { to_email, user_name }
      });

      const { data, error } = await resend.emails.send({
        from: 'Telya Reparatur <noreply@telya.repariert.de>',
        to: [to_email],
        subject: 'Ihr Telya-Konto wurde freigeschaltet',
        html,
      });

      if (error) {
        console.error('Error sending user approved email:', error);
        throw error;
      }

      console.log('User approved email sent:', data);
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // HANDLE: Custom Email (Admin only)
    // ============================================
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

      // Sanitize custom HTML to prevent XSS
      const sanitizedBody = sanitizeHtml(customBody);
      
      // Wrap in master template
      const html = createMasterTemplate({
        headline: subject,
        bodyContent: sanitizedBody,
      });
      
      const { data, error } = await resend.emails.send({
        from: 'Telya Reparatur <noreply@telya.repariert.de>',
        to: [to_email],
        subject,
        html,
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

    // ============================================
    // HANDLE: Ticket-based emails
    // ============================================
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
        location:locations(*),
        b2b_partner:b2b_partners(*)
      `)
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error('Error fetching ticket:', ticketError);
      throw new Error('Ticket nicht gefunden');
    }

    // For B2B users, verify they own this ticket
    const isB2BUser = roles.some(r => r.role === 'B2B_ADMIN' || r.role === 'B2B_USER' || r.role === 'B2B_INHABER');
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
      location_address: ticket.location?.address || undefined,
      location_phone: ticket.location?.phone || undefined,
      estimated_price: ticket.estimated_price,
      tracking_url: generateTrackingUrl(baseUrl, ticket.ticket_number, ticket.kva_token || ''),
      is_b2b: ticket.is_b2b,
      partner_name: ticket.b2b_partner?.name || undefined,
      partner_logo_url: ticket.b2b_partner?.company_logo_url || undefined,
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
      customer_id: ticket.customer_id,
      trigger: type === 'ticket_created' ? 'TICKET_CREATED' : 
               type === 'kva_ready' ? 'KVA_READY' : 
               type === 'ready_for_pickup' ? 'READY_FOR_PICKUP' : 'TICKET_CREATED',
      channel: 'EMAIL',
      status: 'sent',
      title: emailContent.subject,
      payload: { email: emailData.customer_email },
    });

    console.log('Email sent successfully:', data);
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in send-email function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
