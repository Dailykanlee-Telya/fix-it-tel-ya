import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Phone, User, MapPin, FileText, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { ReCaptcha, ReCaptchaRef, RECAPTCHA_ERRORS } from '@/components/ReCaptcha';
import { isRecaptchaConfigured } from '@/lib/recaptcha';

const b2bRegisterSchema = z
  .object({
    companyName: z.string().min(2, 'Firmenname muss mindestens 2 Zeichen haben'),
    contactName: z.string().min(2, 'Ansprechpartner muss mindestens 2 Zeichen haben'),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    phone: z.string().min(6, 'Telefonnummer muss mindestens 6 Zeichen haben'),
    street: z.string().min(3, 'Straße muss mindestens 3 Zeichen haben'),
    zip: z.string().min(4, 'PLZ muss mindestens 4 Zeichen haben'),
    city: z.string().min(2, 'Stadt muss mindestens 2 Zeichen haben'),
    customerNumber: z.string().optional(),
    notes: z.string().optional(),
    password: z
      .string()
      .min(8, 'Passwort muss mindestens 8 Zeichen haben'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwörter stimmen nicht überein',
  });

export default function B2BRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // reCAPTCHA
  const recaptchaRef = useRef<ReCaptchaRef>(null);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setRecaptchaError(null);

    // Verify reCAPTCHA if configured
    if (isRecaptchaConfigured()) {
      const recaptchaToken = recaptchaRef.current?.getToken();
      if (!recaptchaToken) {
        setRecaptchaError(RECAPTCHA_ERRORS.NOT_SOLVED);
        return;
      }
    }

    setLoading(true);
    setLoading(true);

    try {
      const validated = b2bRegisterSchema.parse({
        companyName,
        contactName,
        email,
        phone,
        street,
        zip,
        city,
        customerNumber,
        notes,
        password,
        confirmPassword,
      });

      const { password: pw, confirmPassword: _cpw, ...partnerPayload } = validated;

      // Schritt 1: Auth-User anlegen, damit der Partner später ein Login hat
      const redirectUrl = `${window.location.origin}/auth`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: validated.email,
        password: pw,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: validated.contactName,
            registration_type: 'B2B',
          },
        },
      });

      if (signUpError) {
        console.error('B2B signup error:', signUpError);
        toast({
          variant: 'destructive',
          title: 'Fehler bei der Kontoerstellung',
          description:
            signUpError.message || 'Das Benutzerkonto konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
        });
        return;
      }

      console.log('B2B signup created user:', signUpData?.user?.id);

      // Schritt 2: B2B-Partner über Edge Function registrieren (bypasst RLS)
      const recaptchaToken = recaptchaRef.current?.getToken() || undefined;
      const { data, error } = await supabase.functions.invoke('b2b-register', {
        body: { ...partnerPayload, recaptcha_token: recaptchaToken },
      });

      if (error || data?.error) {
        console.error('B2B registration error:', error || data?.error);
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description:
            data?.error || 'Die Registrierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
        });
      } else {
        setSubmitted(true);
        toast({
          title: 'Anfrage gesendet',
          description:
            'Ihre B2B-Partner-Anfrage wurde erfolgreich übermittelt. Ihr Zugang wird nach Freigabe aktiviert.',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl" />
        </div>

        <Card className="relative z-10 w-full max-w-md border-0 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Anfrage erfolgreich!</h2>
            <p className="text-muted-foreground mb-6">
              Vielen Dank für Ihre B2B-Partner-Anfrage. Unser Team wird Ihre Anfrage prüfen und sich 
              innerhalb von 1-2 Werktagen bei Ihnen melden.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/auth')} className="w-full">
                Zurück zur Anmeldung
              </Button>
              <p className="text-sm text-muted-foreground">
                Bei Fragen: <a href="mailto:service@telya.de" className="text-primary hover:underline">service@telya.de</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 py-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Back button */}
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate('/auth')}>
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Anmeldung
        </Button>

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">B2B-Partner werden</h1>
          <p className="text-muted-foreground mt-1 text-center">
            Registrieren Sie sich als Telya B2B-Partner für Großkunden-Konditionen
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Partner-Registrierung</CardTitle>
            <CardDescription>
              Füllen Sie das Formular aus. Nach Prüfung erhalten Sie Ihre Zugangsdaten per E-Mail.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Firmenname *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                    placeholder="Musterfirma GmbH"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
                {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
              </div>

              {/* Contact Name */}
              <div className="space-y-2">
                <Label htmlFor="contactName">Ansprechpartner *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contactName"
                    placeholder="Max Mustermann"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
                {errors.contactName && <p className="text-sm text-destructive">{errors.contactName}</p>}
              </div>

              {/* Email and Phone in grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="partner@firma.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+49 123 456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="street">Straße & Hausnummer *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="street"
                    placeholder="Musterstraße 123"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
                {errors.street && <p className="text-sm text-destructive">{errors.street}</p>}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">PLZ *</Label>
                  <Input
                    id="zip"
                    placeholder="12345"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    disabled={loading}
                  />
                  {errors.zip && <p className="text-sm text-destructive">{errors.zip}</p>}
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="city">Stadt *</Label>
                  <Input
                    id="city"
                    placeholder="Musterstadt"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={loading}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
              </div>

              {/* Optional Customer Number */}
              <div className="space-y-2">
                <Label htmlFor="customerNumber">Kundennummer (falls vorhanden)</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="customerNumber"
                    placeholder="K-123456"
                    value={customerNumber}
                    onChange={(e) => setCustomerNumber(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort wiederholen *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Anmerkungen</Label>
                <Textarea
                  id="notes"
                  placeholder="Geschäftsbereich, erwartetes Reparaturvolumen, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                  disabled={loading}
                />
              </div>

              {/* reCAPTCHA */}
              <div className="flex flex-col items-center">
                <ReCaptcha 
                  ref={recaptchaRef}
                  onChange={() => setRecaptchaError(null)}
                  onExpired={() => setRecaptchaError(RECAPTCHA_ERRORS.EXPIRED)}
                  className="my-2"
                />
                {recaptchaError && (
                  <p className="text-sm text-destructive mt-1">{recaptchaError}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Partner-Anfrage senden
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Mit dem Absenden stimmen Sie unserer{' '}
              <Link to="/datenschutz" className="text-primary hover:underline">
                Datenschutzerklärung
              </Link>{' '}
              zu.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} Telya GmbH. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}
