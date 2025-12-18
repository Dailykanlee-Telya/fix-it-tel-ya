import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  token: string;
  action?: string;
}

interface GoogleRecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  "error-codes"?: string[];
}

/**
 * Verify reCAPTCHA token with Google's verification API
 */
async function verifyRecaptchaToken(
  token: string,
  remoteIp?: string | null
): Promise<{ success: boolean; score?: number; errorCodes?: string[] }> {
  const secretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");

  // If no secret key configured, fail open in development (log warning)
  if (!secretKey) {
    console.warn("RECAPTCHA_SECRET_KEY not configured. Skipping verification.");
    return { success: true };
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteIp) {
      params.append("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      console.error("Google reCAPTCHA API returned non-OK status:", response.status);
      return { success: false, errorCodes: ["api-error"] };
    }

    const data: GoogleRecaptchaResponse = await response.json();
    console.log("reCAPTCHA verification result:", {
      success: data.success,
      score: data.score,
      hostname: data.hostname,
      errorCodes: data["error-codes"],
    });

    return {
      success: data.success,
      score: data.score,
      errorCodes: data["error-codes"],
    };
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return { success: false, errorCodes: ["network-error"] };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action }: VerifyRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Token fehlt. Bitte bestätigen Sie, dass Sie kein Roboter sind.",
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get client IP from headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const result = await verifyRecaptchaToken(token, clientIp);

    if (!result.success) {
      console.log("reCAPTCHA verification failed:", result.errorCodes);
      return new Response(
        JSON.stringify({
          error: "Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
          success: false,
          errorCodes: result.errorCodes,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For v3 reCAPTCHA, you might want to check the score
    // Default threshold is 0.5, but you can adjust as needed
    if (result.score !== undefined && result.score < 0.3) {
      console.log("reCAPTCHA score too low:", result.score);
      return new Response(
        JSON.stringify({
          error: "Verdächtige Aktivität erkannt. Bitte versuchen Sie es erneut.",
          success: false,
          score: result.score,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("reCAPTCHA verification successful for action:", action);
    return new Response(
      JSON.stringify({
        success: true,
        score: result.score,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in verify-recaptcha function:", error);
    return new Response(
      JSON.stringify({
        error: "Ein unerwarteter Fehler ist aufgetreten.",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
