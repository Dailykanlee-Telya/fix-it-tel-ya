import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { TELYA_ADDRESS } from '@/types/b2b';

export default function Datenschutz() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Datenschutzerklärung
            </h1>
            <p className="text-muted-foreground">Informationen zum Datenschutz gemäß DSGVO</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Verantwortlicher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>{TELYA_ADDRESS.name}</strong></p>
            <p>{TELYA_ADDRESS.street}</p>
            <p>{TELYA_ADDRESS.zip} {TELYA_ADDRESS.city}</p>
            <p>{TELYA_ADDRESS.country}</p>
            <Separator className="my-4" />
            <p>Geschäftsführer: {TELYA_ADDRESS.managingDirector}</p>
            <p>Telefon: {TELYA_ADDRESS.phone}</p>
            <p>E-Mail: {TELYA_ADDRESS.email}</p>
            <p>Handelsregister: {TELYA_ADDRESS.hrb}</p>
            <p>USt-IdNr.: {TELYA_ADDRESS.vatId}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Erhobene Daten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Im Rahmen unserer Reparaturdienstleistungen erheben und verarbeiten wir folgende personenbezogene Daten:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Name (Vorname, Nachname)</li>
              <li>Kontaktdaten (Telefonnummer, E-Mail-Adresse, Anschrift)</li>
              <li>Gerätedaten (Marke, Modell, IMEI/Seriennummer, Farbe)</li>
              <li>Reparaturdaten (Fehlerbeschreibung, Zubehör, Zustand)</li>
              <li>Zahlungsinformationen (bei Rechnungsstellung)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Zweck der Verarbeitung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Wir verarbeiten Ihre Daten für folgende Zwecke:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Durchführung von Reparaturaufträgen und zugehörigen Dienstleistungen</li>
              <li>Kommunikation bezüglich des Reparaturstatus</li>
              <li>Erstellung von Kostenvoranschlägen und Rechnungen</li>
              <li>Qualitätssicherung und Garantieabwicklung</li>
              <li>Bei erteilter Einwilligung: Zusendung von Marketing- und Werbemitteilungen per E-Mail, SMS, WhatsApp und Telefon</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Rechtsgrundlagen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Grundlage von:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Erfüllung des Reparaturvertrags</li>
              <li><strong>Art. 6 Abs. 1 lit. a DSGVO:</strong> Einwilligung (für Marketingkommunikation)</li>
              <li><strong>Art. 6 Abs. 1 lit. c DSGVO:</strong> Rechtliche Verpflichtungen (z.B. steuerliche Aufbewahrungspflichten)</li>
              <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Berechtigte Interessen (z.B. Qualitätssicherung)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Kommunikationskanäle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Sofern Sie uns Ihre ausdrückliche Einwilligung erteilt haben, kontaktieren wir Sie über folgende Kanäle für Marketing- und Werbezwecke:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>E-Mail:</strong> Newsletter, Sonderangebote, Serviceinformationen</li>
              <li><strong>SMS:</strong> Kurznachrichten zu Aktionen und Angeboten</li>
              <li><strong>WhatsApp:</strong> Werbemitteilungen und Serviceinformationen</li>
              <li><strong>Telefon:</strong> Telefonische Kontaktaufnahme zu Werbezwecken</li>
            </ul>
            <p className="mt-4">
              <strong>Hinweis:</strong> Diese Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden. 
              Der Widerruf kann formlos erfolgen, z.B. per E-Mail an {TELYA_ADDRESS.email} oder telefonisch unter {TELYA_ADDRESS.phone}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Speicherdauer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die Erfüllung der Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Reparaturdaten: Mindestens 2 Jahre (Gewährleistungsfrist)</li>
              <li>Rechnungs- und Geschäftsdaten: 10 Jahre (gemäß HGB und AO)</li>
              <li>Marketingeinwilligungen: Bis zum Widerruf</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Ihre Rechte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Nach der DSGVO stehen Ihnen folgende Rechte zu:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Auskunftsrecht (Art. 15 DSGVO):</strong> Sie können Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten verlangen.</li>
              <li><strong>Berichtigungsrecht (Art. 16 DSGVO):</strong> Sie können die Berichtigung unrichtiger Daten verlangen.</li>
              <li><strong>Löschungsrecht (Art. 17 DSGVO):</strong> Sie können die Löschung Ihrer Daten verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</li>
              <li><strong>Einschränkung der Verarbeitung (Art. 18 DSGVO):</strong> Sie können die Einschränkung der Verarbeitung Ihrer Daten verlangen.</li>
              <li><strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> Sie können Ihre Daten in einem strukturierten, gängigen Format erhalten.</li>
              <li><strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Sie können der Verarbeitung Ihrer Daten widersprechen.</li>
              <li><strong>Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO):</strong> Erteilte Einwilligungen können Sie jederzeit widerrufen.</li>
            </ul>
            <p className="mt-4">
              Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: {TELYA_ADDRESS.email}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Beschwerderecht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten zu beschweren.
              Die für uns zuständige Aufsichtsbehörde ist:
            </p>
            <p className="mt-2">
              Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen<br />
              Kavalleriestraße 2-4<br />
              40213 Düsseldorf<br />
              Telefon: 0211 38424-0<br />
              E-Mail: poststelle@ldi.nrw.de
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Datensicherheit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten gegen zufällige oder vorsätzliche Manipulation, 
              Verlust, Zerstörung oder gegen den Zugriff unberechtigter Personen zu schützen. Unsere Sicherheitsmaßnahmen werden entsprechend 
              der technologischen Entwicklung fortlaufend verbessert.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground pb-8">
          <p>Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</p>
          <p className="mt-2">{TELYA_ADDRESS.name} • {TELYA_ADDRESS.street} • {TELYA_ADDRESS.zip} {TELYA_ADDRESS.city}</p>
        </div>
      </div>
    </div>
  );
}
