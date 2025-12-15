import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Server-side validation schema with sanitization
const b2bRegisterSchema = z.object({
  companyName: z.string()
    .trim()
    .min(2, 'Firmenname muss mindestens 2 Zeichen haben')
    .max(200, 'Firmenname darf maximal 200 Zeichen haben'),
  contactName: z.string()
    .trim()
    .min(2, 'Kontaktname muss mindestens 2 Zeichen haben')
    .max(100, 'Kontaktname darf maximal 100 Zeichen haben'),
  email: z.string()
    .trim()
    .email('Ungültige E-Mail-Adresse')
    .max(255, 'E-Mail darf maximal 255 Zeichen haben'),
  phone: z.string()
    .trim()
    .min(6, 'Telefonnummer muss mindestens 6 Zeichen haben')
    .max(30, 'Telefonnummer darf maximal 30 Zeichen haben')
    .regex(/^[+\d\s()\-/]+$/, 'Telefonnummer enthält ungültige Zeichen'),
  street: z.string()
    .trim()
    .min(3, 'Straße muss mindestens 3 Zeichen haben')
    .max(200, 'Straße darf maximal 200 Zeichen haben'),
  zip: z.string()
    .trim()
    .min(4, 'PLZ muss mindestens 4 Zeichen haben')
    .max(10, 'PLZ darf maximal 10 Zeichen haben')
    .regex(/^[0-9A-Za-z\s\-]+$/, 'PLZ enthält ungültige Zeichen'),
  city: z.string()
    .trim()
    .min(2, 'Stadt muss mindestens 2 Zeichen haben')
    .max(100, 'Stadt darf maximal 100 Zeichen haben'),
  customerNumber: z.string()
    .trim()
    .max(50, 'Kundennummer darf maximal 50 Zeichen haben')
    .optional()
    .nullable(),
  notes: z.string()
    .trim()
    .max(1000, 'Bemerkungen dürfen maximal 1000 Zeichen haben')
    .optional()
    .nullable(),
});

type B2BRegisterRequest = z.infer<typeof b2bRegisterSchema>;

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

    // Parse JSON body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      console.error('Invalid JSON in request body');
      return new Response(
        JSON.stringify({ error: 'Ungültiges Anfrage-Format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize input using Zod schema
    const validationResult = b2bRegisterSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map(err => err.message)
        .join(', ');
      console.error('Validation failed:', errorMessages);
      return new Response(
        JSON.stringify({ error: errorMessages }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: B2BRegisterRequest = validationResult.data;
    
    console.log('B2B registration request:', { 
      company: body.companyName, 
      email: body.email 
    });

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
    // All values are already sanitized/trimmed by Zod
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.';
    console.error('Error in b2b-register function:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Ein unerwarteter Fehler ist aufgetreten.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
