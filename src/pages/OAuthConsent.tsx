import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Ungültige oder fehlende Autorisierungsanfrage.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? null);
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) { setBusy(false); return setError(error.message); }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setBusy(false); return setError("Keine Weiterleitung vom Autorisierungsserver erhalten."); }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    }
  }

  const clientName = details?.client?.name ?? "Eine Anwendung";
  const scopes: string[] = String(details?.scope ?? "").split(" ").filter(Boolean);
  const scopeLabel = (s: string) =>
    s === "email" ? "E-Mail-Adresse teilen" : s === "profile" ? "Basisprofil teilen" : s === "openid" ? "Anmeldung bestätigen" : `Zusätzliche Berechtigung: ${s}`;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {error ? "Verbindung nicht möglich" : details ? `${clientName} mit Telya verbinden` : "Wird geladen…"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-destructive text-sm">{error}</p>}
          {details && !error && (
            <>
              <p className="text-sm">{clientName} kann die freigegebenen Funktionen dieser App in Ihrem Namen nutzen.</p>
              {email && <p className="text-sm text-muted-foreground">Angemeldet als {email}</p>}
              {details.redirect_uri && <p className="text-xs text-muted-foreground break-all">Weiterleitung: {details.redirect_uri}</p>}
              {scopes.length > 0 && (
                <ul className="text-sm list-disc pl-5">{scopes.map((s) => <li key={s}>{scopeLabel(s)}</li>)}</ul>
              )}
              <p className="text-xs text-muted-foreground">Ihre bestehenden Berechtigungen in der App gelten weiterhin.</p>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => decide(true)}>Zulassen</Button>
                <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Verbindung abbrechen</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
