import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KvaReminderData {
  ticket_number: string;
  customer_name: string;
  customer_email: string;
  device_info: string;
  estimated_price: string;
  valid_until: string;
  tracking_url: string;
  kva_id: string;
  ticket_id: string;
}

const getBaseUrl = () => {
  return Deno.env.get('PUBLIC_APP_URL') || '';
};

const generateTrackingUrl = (ticketNumber: string, kvaToken: string) => {
  const urlBase = (getBaseUrl() || '').replace(/\/+$/, '');
  return `${urlBase}/track?ticket=${encodeURIComponent(ticketNumber)}&token=${encodeURIComponent(kvaToken)}`;
};

// Replace placeholders in template
const replacePlaceholders = (template: string, data: KvaReminderData): string => {
  return template
    .replace(/\{\{ticket_number\}\}/g, data.ticket_number)
    .replace(/\{\{customer_name\}\}/g, data.customer_name)
    .replace(/\{\{device_info\}\}/g, data.device_info)
    .replace(/\{\{estimated_price\}\}/g, data.estimated_price)
    .replace(/\{\{valid_until\}\}/g, data.valid_until)
    .replace(/\{\{tracking_url\}\}/g, data.tracking_url);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('KVA Reminder job started');

    // Get reminder template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('subject, body')
      .eq('trigger', 'KVA_REMINDER')
      .eq('channel', 'EMAIL')
      .eq('active', true)
      .single();

    if (templateError || !template) {
      console.error('No active KVA reminder template found:', templateError);
      return new Response(
        JSON.stringify({ error: 'No active reminder template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find KVAs that:
    // - Have status GESENDET or WARTET_AUF_ANTWORT
    // - Have valid_until within next 3 days
    // - Haven't had a reminder sent yet (reminder_sent_at is null)
    // - Are current version
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: kvas, error: kvaError } = await supabase
      .from('kva_estimates')
      .select(`
        id,
        valid_until,
        total_cost,
        repair_ticket_id,
        repair_tickets!inner (
          id,
          ticket_number,
          kva_token,
          email_opt_in,
          customers!inner (
            id,
            first_name,
            last_name,
            email
          ),
          devices!inner (
            brand,
            model
          )
        )
      `)
      .in('status', ['GESENDET', 'WARTET_AUF_ANTWORT'])
      .eq('is_current', true)
      .is('reminder_sent_at', null)
      .not('valid_until', 'is', null)
      .lte('valid_until', threeDaysFromNow.toISOString())
      .gt('valid_until', new Date().toISOString());

    if (kvaError) {
      console.error('Error fetching KVAs:', kvaError);
      throw kvaError;
    }

    console.log(`Found ${kvas?.length || 0} KVAs requiring reminder`);

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const kva of kvas || []) {
      const ticket = kva.repair_tickets as any;
      const customer = ticket?.customers;
      const device = ticket?.devices;

      // Skip if customer has no email or opted out
      if (!customer?.email || !ticket?.email_opt_in) {
        console.log(`Skipping KVA ${kva.id}: no email or opted out`);
        skippedCount++;
        continue;
      }

      const validUntilDate = new Date(kva.valid_until);
      const formattedDate = validUntilDate.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const reminderData: KvaReminderData = {
        ticket_number: ticket.ticket_number,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        customer_email: customer.email,
        device_info: `${device?.brand || ''} ${device?.model || ''}`.trim() || 'Unbekannt',
        estimated_price: (kva.total_cost || 0).toFixed(2),
        valid_until: formattedDate,
        tracking_url: generateTrackingUrl(ticket.ticket_number, ticket.kva_token || ''),
        kva_id: kva.id,
        ticket_id: ticket.id,
      };

      try {
        const subject = replacePlaceholders(template.subject, reminderData);
        const html = replacePlaceholders(template.body, reminderData);

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'Telya Reparatur <noreply@telya.repariert.de>',
          to: [reminderData.customer_email],
          subject,
          html,
        });

        if (emailError) {
          console.error(`Error sending reminder for KVA ${kva.id}:`, emailError);
          errors.push(`KVA ${kva.id}: ${emailError.message}`);
          continue;
        }

        // Mark reminder as sent
        await supabase
          .from('kva_estimates')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', kva.id);

        // Log notification
        await supabase.from('notification_logs').insert({
          repair_ticket_id: ticket.id,
          customer_id: customer.id,
          channel: 'EMAIL',
          trigger: 'KVA_REMINDER',
          status: 'SENT',
          payload: { 
            email_id: emailResult?.id, 
            to: reminderData.customer_email,
            kva_id: kva.id,
            valid_until: kva.valid_until
          },
        });

        console.log(`Reminder sent for KVA ${kva.id} to ${reminderData.customer_email}`);
        sentCount++;
      } catch (err: any) {
        console.error(`Error processing KVA ${kva.id}:`, err);
        errors.push(`KVA ${kva.id}: ${err.message}`);
      }
    }

    const result = {
      success: true,
      sent: sentCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('KVA Reminder job completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('KVA Reminder error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
