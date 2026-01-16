import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_PASSWORD = "Demo!2026#";

const DEMO_USERS = [
  {
    email: "demo_admin@telya-demo.de",
    name: "Demo Admin",
    role: "ADMIN",
  },
  {
    email: "demo_staff@telya-demo.de", 
    name: "Demo Mitarbeiter",
    role: "THEKE",
  },
  {
    email: "demo_b2b@telya-demo.de",
    name: "Demo B2B Partner",
    role: "B2B_INHABER",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for setup secret (simple protection)
    const { secret } = await req.json().catch(() => ({}));
    const expectedSecret = Deno.env.get("DEMO_SETUP_SECRET") || "telya-demo-setup-2026";
    
    if (secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Invalid setup secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const demoUser of DEMO_USERS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email);

        let userId: string;

        if (existingUser) {
          // User exists - update password
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { 
              password: DEMO_PASSWORD,
              email_confirm: true,
            }
          );
          
          if (updateError) {
            results.push({ email: demoUser.email, status: "error", error: updateError.message });
            continue;
          }
          
          userId = existingUser.id;
          results.push({ email: demoUser.email, status: "updated" });
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: demoUser.email,
            password: DEMO_PASSWORD,
            email_confirm: true,
            user_metadata: { name: demoUser.name },
          });

          if (createError || !newUser.user) {
            results.push({ email: demoUser.email, status: "error", error: createError?.message || "Failed to create user" });
            continue;
          }

          userId = newUser.user.id;
          results.push({ email: demoUser.email, status: "created" });
        }

        // Ensure profile exists and is active
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: userId,
            email: demoUser.email,
            name: demoUser.name,
            is_active: true,
          }, { onConflict: "id" });

        if (profileError) {
          console.error(`Profile error for ${demoUser.email}:`, profileError);
        }

        // Ensure role is assigned
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({
            user_id: userId,
            role: demoUser.role,
          }, { onConflict: "user_id,role" });

        if (roleError) {
          console.error(`Role error for ${demoUser.email}:`, roleError);
        }

        // For B2B user, we need to create/link a B2B partner
        if (demoUser.role === "B2B_INHABER") {
          // Check if demo B2B partner exists
          const { data: existingPartner } = await supabaseAdmin
            .from("b2b_partners")
            .select("id")
            .eq("code", "DEMO")
            .maybeSingle();

          let partnerId: string;

          if (existingPartner) {
            partnerId = existingPartner.id;
          } else {
            // Create demo B2B partner
            const { data: newPartner, error: partnerError } = await supabaseAdmin
              .from("b2b_partners")
              .insert({
                name: "Demo Partner GmbH",
                code: "DEMO",
                contact_name: demoUser.name,
                contact_email: demoUser.email,
                is_active: true,
              })
              .select("id")
              .single();

            if (partnerError || !newPartner) {
              console.error("B2B partner creation error:", partnerError);
              continue;
            }
            partnerId = newPartner.id;
          }

          // Link profile to B2B partner
          await supabaseAdmin
            .from("profiles")
            .update({ b2b_partner_id: partnerId })
            .eq("id", userId);
        }

      } catch (userError) {
        console.error(`Error processing ${demoUser.email}:`, userError);
        results.push({ 
          email: demoUser.email, 
          status: "error", 
          error: userError instanceof Error ? userError.message : "Unknown error" 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo users setup complete",
        password: DEMO_PASSWORD,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Setup error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
