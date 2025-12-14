import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface B2BRegisterRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  customerNumber?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: B2BRegisterRequest = await req.json();
    
    console.log('B2B registration request:', { 
      company: body.companyName, 
      email: body.email 
    });

    // Validate required fields
    if (!body.companyName || !body.contactName || !body.email || !body.phone || 
        !body.street || !body.zip || !body.city) {
      return new Response(
        JSON.stringify({ error: 'Alle Pflichtfelder müssen ausgefüllt sein.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if partner with same email already exists
    const { data: existing } = await supabase
      .from('b2b_partners')
      .select('id')
      .eq('contact_email', body.email)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Ein Partner mit dieser E-Mail-Adresse existiert bereits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new B2B partner with is_active = false (pending approval)
    const { data: partner, error } = await supabase
      .from('b2b_partners')
      .insert({
        name: body.companyName,
        contact_name: body.contactName,
        contact_email: body.email,
        contact_phone: body.phone,
        street: body.street,
        zip: body.zip,
        city: body.city,
        customer_number: body.customerNumber || null,
        is_active: false, // Needs admin approval
        billing_email: body.email,
        default_return_address: {
          name: body.companyName,
          street: body.street,
          zip: body.zip,
          city: body.city,
          country: 'Deutschland',
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting B2B partner:', error);
      return new Response(
        JSON.stringify({ error: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('B2B partner registered successfully:', partner.id);

    return new Response(
      JSON.stringify({ success: true, partnerId: partner.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in b2b-register function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Ein unerwarteter Fehler ist aufgetreten.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
