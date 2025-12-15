import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'THEKE' | 'TECHNIKER' | 'BUCHHALTUNG' | 'FILIALLEITER';
  locationId: string;
  b2bPartnerId?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
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

    const { data: { user: callerUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !callerUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert - Ungültiger Token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated caller:', callerUser.id);

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Verify caller has ADMIN role
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id);

    if (rolesError) {
      console.error('Error fetching caller roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Prüfen der Berechtigung' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = callerRoles?.some(r => r.role === 'ADMIN');
    if (!isAdmin) {
      console.error('Non-admin user attempted to invite:', callerUser.id);
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung - Nur Administratoren können Benutzer einladen' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: InviteRequest = await req.json();
    const { email, firstName, lastName, role, locationId, b2bPartnerId } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !locationId) {
      return new Response(
        JSON.stringify({ error: 'Alle Pflichtfelder müssen ausgefüllt sein' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige E-Mail-Adresse' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Rolle' }),
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
        JSON.stringify({ error: 'Ungültige Filiale' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating/inviting user:', email, 'with role:', role);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;
      
      // Check if profile already exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new auth user with a temporary random password
      // User will set their own password via the recovery link
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
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
      isNewUser = true;
      console.log('Created new user:', userId);
    }

    // Create or update profile
    const fullName = `${firstName} ${lastName}`;
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        name: fullName,
        email: email,
        default_location_id: locationId,
        b2b_partner_id: b2bPartnerId || null,
        is_active: true,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // If we created a new user but failed to create profile, try to clean up
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      return new Response(
        JSON.stringify({ error: `Fehler beim Erstellen des Profils: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete any existing roles and add the new role
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return new Response(
        JSON.stringify({ error: `Fehler beim Zuweisen der Rolle: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate password reset link with redirect to our app
    const baseUrl = publicAppUrl || req.headers.get('origin') || '';
    const redirectUrl = `${baseUrl}/auth`;
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (linkError) {
      console.error('Error generating recovery link:', linkError);
      return new Response(
        JSON.stringify({ error: `Fehler beim Generieren des Einladungslinks: ${linkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the Supabase verification link directly - it will redirect to our app with session
    const frontendUrl = linkData?.properties?.action_link || '';
    console.log('Invitation URL (Supabase verify link):', frontendUrl);

    // Send invitation email
    const roleLabels: Record<string, string> = {
      ADMIN: 'Administrator',
      THEKE: 'Theke',
      TECHNIKER: 'Techniker',
      BUCHHALTUNG: 'Buchhaltung',
      FILIALLEITER: 'Filialleiter',
    };

    const { error: emailError } = await resend.emails.send({
      from: 'Telya Reparatur <noreply@telya.repariert.de>',
      to: [email],
      subject: 'Einladung zum Telya Repair Management System',
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
            .btn { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
            .footer { font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Telya Reparaturservice</h1>
          </div>
          <div class="content">
            <p>Hallo ${firstName} ${lastName},</p>
            <p>Sie wurden als Benutzer im <strong>Telya Repair Management System</strong> angelegt.</p>
            
            <div class="info-box">
              <strong>Ihre Zugangsdaten:</strong><br>
              E-Mail: ${email}<br>
              Rolle: ${roleLabels[role] || role}<br>
              Filiale: ${location.name}
            </div>
            
            <p>Bitte setzen Sie jetzt Ihr Passwort, um sich anzumelden:</p>
            
            <p style="text-align: center;">
              <a href="${frontendUrl}" class="btn">Passwort setzen und anmelden</a>
            </p>
            
            <p style="font-size: 12px; color: #666;">
              Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
              ${frontendUrl}
            </p>
            
            <p>Bei Fragen wenden Sie sich bitte an Ihren Administrator.</p>
            <p>Mit freundlichen Grüßen,<br>Ihr Telya Team</p>
          </div>
          <div class="footer">
            <p>Telya GmbH | Diese E-Mail wurde automatisch generiert.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Error sending invitation email:', emailError);
      // User was created, but email failed - log but don't fail the request
      console.warn('User created but invitation email failed to send');
    } else {
      console.log('Invitation email sent successfully to:', email);
    }

    // Log the invitation in audit_logs
    await supabaseAdmin.from('audit_logs').insert({
      action: 'user_invited',
      user_id: callerUser.id,
      entity_type: 'user',
      entity_id: userId,
      meta: { invited_email: email, role, location_id: locationId },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: 'Benutzer wurde eingeladen. Eine E-Mail mit Anweisungen wurde versendet.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in admin-invite-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
