import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveRequest {
  partnerId: string;
  locationId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const publicAppUrl = Deno.env.get('PUBLIC_APP_URL') || '';

    // Authenticate caller
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is ADMIN
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id);

    const isAdmin = callerRoles?.some(r => r.role === 'ADMIN');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ApproveRequest = await req.json();
    const { partnerId, locationId } = body;

    if (!partnerId || !locationId) {
      return new Response(
        JSON.stringify({ error: 'Partner-ID und Filiale erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get partner details
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('b2b_partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: 'Partner nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (partner.is_active) {
      return new Response(
        JSON.stringify({ error: 'Partner ist bereits aktiv' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify location exists
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('id, name')
      .eq('id', locationId)
      .single();

    if (locationError || !location) {
      return new Response(
        JSON.stringify({ error: 'Filiale nicht gefunden' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = partner.contact_email;
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Partner hat keine E-Mail-Adresse' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if auth user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log('User already exists:', userId);
    } else {
      // Create auth user with temp password
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: partner.contact_name || partner.name,
        },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: `Fehler beim Erstellen des Benutzers: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log('Created new user:', userId);
    }

    // Create/update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        name: partner.contact_name || partner.name,
        email: email,
        default_location_id: locationId,
        b2b_partner_id: partnerId,
        is_active: true,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return new Response(
        JSON.stringify({ error: `Fehler beim Erstellen des Profils: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete existing roles and add B2B_INHABER role
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'B2B_INHABER' });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return new Response(
        JSON.stringify({ error: `Fehler beim Zuweisen der Rolle: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update partner: set active and link to location
    const { error: updateError } = await supabaseAdmin
      .from('b2b_partners')
      .update({
        is_active: true,
        location_id: locationId,
      })
      .eq('id', partnerId);

    if (updateError) {
      console.error('Error updating partner:', updateError);
      return new Response(
        JSON.stringify({ error: `Fehler beim Aktivieren des Partners: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate password reset link
    const baseUrl = publicAppUrl || req.headers.get('origin') || '';
    const redirectUrl = `${baseUrl}/auth`;
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: { redirectTo: redirectUrl },
    });

    if (linkError) {
      console.error('Error generating recovery link:', linkError);
      return new Response(
        JSON.stringify({ error: `Fehler beim Generieren des Links: ${linkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resetUrl = linkData?.properties?.action_link || '';
    const loginUrl = `${baseUrl}/auth`;

    // Send approval email with password reset link
    const { error: emailError } = await resend.emails.send({
      from: 'Telya B2B <noreply@telya.repariert.de>',
      to: [email],
      subject: 'Dein Telya B2B Zugang ist aktiv – Passwort setzen',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .success-box { background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #c3e6cb; }
            .success-box h2 { color: #155724; margin: 0 0 10px 0; }
            .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #1e3a5f; }
            .btn { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-weight: bold; }
            .btn-secondary { background: #6b7280; }
            .steps { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .steps ol { margin: 10px 0; padding-left: 20px; }
            .footer { font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Telya B2B-Partner</h1>
          </div>
          <div class="content">
            <div class="success-box">
              <h2>✓ Dein Zugang ist freigeschaltet!</h2>
              <p>Willkommen als B2B-Partner bei Telya.</p>
            </div>
            
            <p>Hallo ${partner.contact_name || 'Partner'},</p>
            
            <p>Deine B2B-Registrierung wurde geprüft und freigegeben. Du kannst jetzt sofort loslegen!</p>
            
            <div class="info-box">
              <strong>Deine Zugangsdaten:</strong><br>
              <strong>E-Mail:</strong> ${email}<br>
              <strong>Firma:</strong> ${partner.name}<br>
              <strong>Filiale:</strong> ${location.name}
            </div>
            
            <div class="steps">
              <strong>So geht's weiter:</strong>
              <ol>
                <li>Klicke auf "Passwort setzen" und wähle dein Passwort</li>
                <li>Melde dich mit deiner E-Mail und dem neuen Passwort an</li>
                <li>Lege sofort deinen ersten Reparaturauftrag an!</li>
              </ol>
            </div>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="btn">Passwort setzen</a>
              <a href="${loginUrl}" class="btn btn-secondary">Zum Login</a>
            </p>
            
            <p style="font-size: 12px; color: #666;">
              Falls die Buttons nicht funktionieren, kopiere diesen Link:<br>
              ${resetUrl}
            </p>
            
            <p>Nach dem Passwort setzen kannst du sofort Aufträge anlegen.</p>
            
            <p>Bei Fragen: <a href="mailto:service@telya.de">service@telya.de</a></p>
            
            <p>Mit freundlichen Grüßen,<br>Dein Telya Team</p>
          </div>
          <div class="footer">
            <p>Telya GmbH | Schalker Str. 59, 45881 Gelsenkirchen</p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Error sending approval email:', emailError);
    } else {
      console.log('Approval email sent to:', email);
    }

    // Log to audit
    await supabaseAdmin.from('audit_logs').insert({
      action: 'b2b_partner_approved',
      user_id: callerUser.id,
      entity_type: 'b2b_partner',
      entity_id: partnerId,
      meta: { 
        partner_name: partner.name, 
        location_id: locationId,
        created_user_id: userId,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: 'Partner wurde freigegeben und Zugangsdaten versendet.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in b2b-approve-partner:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
