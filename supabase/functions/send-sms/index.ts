import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsRequest {
  to: string;
  message: string;
  ticketNumber?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, ticketNumber }: SmsRequest = await req.json();

    // Validate input
    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check for SMS API configuration
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER");

    if (!smsApiKey || !smsSender) {
      console.log("SMS API not configured. Skipping SMS send.");
      console.log(`[SMS PLACEHOLDER] Would send to: ${to}`);
      console.log(`[SMS PLACEHOLDER] Message: ${message}`);
      console.log(`[SMS PLACEHOLDER] Ticket: ${ticketNumber || "N/A"}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          placeholder: true,
          message: "SMS API not configured - message logged but not sent" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // TODO: Implement actual SMS provider integration here
    // Example for common providers:
    // - Twilio: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
    // - MessageBird: https://rest.messagebird.com/messages
    // - Vonage/Nexmo: https://rest.nexmo.com/sms/json
    
    console.log(`[SMS] Sending to: ${to}`);
    console.log(`[SMS] From: ${smsSender}`);
    console.log(`[SMS] Message: ${message}`);
    console.log(`[SMS] Ticket: ${ticketNumber || "N/A"}`);

    // Placeholder response - replace with actual API call when configured
    return new Response(
      JSON.stringify({ 
        success: true,
        placeholder: true,
        message: "SMS would be sent (API integration pending)"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-sms function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
