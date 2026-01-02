import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2, Search, ShieldAlert, Building2, Users, KeyRound, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useRateLimiter, AUTH_RATE_LIMIT_CONFIG } from '@/hooks/useRateLimiter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben')
});

const passwordSchema = z.object({
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  confirmPassword: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user,
    signIn,
    loading: authLoading
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginType, setLoginType] = useState<'employee' | 'b2b'>('employee');

  // Password reset state
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  // Forgot password state
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  // Rate limiting for login attempts
  const loginRateLimiter = useRateLimiter('auth_login', AUTH_RATE_LIMIT_CONFIG);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  

  // Check URL params and hash for recovery flow
  useEffect(() => {
    const type = searchParams.get('type');
    const tokenHash = searchParams.get('token_hash');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle error from Supabase redirect
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: errorDescription || 'Ein Fehler ist aufgetreten.',
      });
      return;
    }

    // Check hash fragment for access_token (Supabase redirects with hash)
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const hashType = hashParams.get('type');
      
      if (accessToken && hashType === 'recovery') {
        console.log('Recovery session detected in hash');
        setIsPasswordResetMode(true);
        return;
      }
    }

    // Check if this is a recovery/invite flow from query params
    if (type === 'recovery' || tokenHash) {
      setIsPasswordResetMode(true);
    }
  }, [searchParams, toast]);

  // Check auth state for recovery sessions
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordResetMode(true);
      }
      
      // Only redirect if NOT in password reset mode and user is signed in
      if (event === 'SIGNED_IN' && !isPasswordResetMode && session?.user) {
        // Check if this is a recovery session - don't redirect
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
          setIsPasswordResetMode(true);
          return;
        }
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isPasswordResetMode]);

  useEffect(() => {
    if (user && !authLoading && !isPasswordResetMode) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, isPasswordResetMode]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    

    // Check rate limit
    if (loginRateLimiter.isLocked) {
      toast({
        variant: 'destructive',
        title: 'Zu viele Anmeldeversuche',
        description: `Bitte warten Sie ${loginRateLimiter.lockoutSeconds} Sekunden.`
      });
      return;
    }


    setLoading(true);
    try {
      const validated = loginSchema.parse({
        email: loginEmail,
        password: loginPassword
      });
      const {
        error
      } = await signIn(validated.email, validated.password);
      if (error) {
        // Record failed attempt
        loginRateLimiter.recordAttempt(false);
        if (error.message.includes('Invalid login credentials')) {
          toast({
            variant: 'destructive',
            title: 'Anmeldung fehlgeschlagen',
            description: loginRateLimiter.attemptsRemaining <= 2 ? `Ungültige E-Mail oder Passwort. Noch ${loginRateLimiter.attemptsRemaining} Versuche.` : 'Ungültige E-Mail oder Passwort.'
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Fehler',
            description: error.message
          });
        }
      } else {
        // Record successful attempt (resets counter)
        loginRateLimiter.recordAttempt(true);
        toast({
          title: 'Willkommen!',
          description: 'Sie wurden erfolgreich angemeldet.'
        });
        // Navigate based on login type
        if (loginType === 'b2b') {
          navigate('/b2b/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validated = passwordSchema.parse({
        password: newPassword,
        confirmPassword: confirmPassword,
      });

      const { error } = await supabase.auth.updateUser({
        password: validated.password,
      });

      if (error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          toast({
            variant: 'destructive',
            title: 'Link abgelaufen',
            description: 'Der Einladungslink ist abgelaufen oder ungültig. Bitte wenden Sie sich an Ihren Administrator.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Fehler',
            description: error.message,
          });
        }
        return;
      }

      setPasswordResetSuccess(true);
      toast({
        title: 'Passwort gesetzt',
        description: 'Ihr Passwort wurde erfolgreich gespeichert.',
      });

      // After 2 seconds, redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!forgotPasswordEmail || !z.string().email().safeParse(forgotPasswordEmail).success) {
      setErrors({ email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.message,
        });
        return;
      }

      setForgotPasswordSent(true);
      toast({
        title: 'E-Mail gesendet',
        description: 'Wenn ein Konto mit dieser E-Mail existiert, erhalten Sie einen Link zum Zurücksetzen.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }

  // Forgot Password Mode
  if (isForgotPasswordMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Telya Reparatur</h1>
            <p className="text-muted-foreground mt-1">Management System</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Passwort zurücksetzen</CardTitle>
              </div>
              <CardDescription>
                Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {forgotPasswordSent ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">E-Mail gesendet!</p>
                  <p className="text-muted-foreground mb-4">
                    Wenn ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie in Kürze eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsForgotPasswordMode(false);
                      setForgotPasswordSent(false);
                      setForgotPasswordEmail('');
                    }}
                  >
                    Zurück zur Anmeldung
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">E-Mail-Adresse</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="ihre@email.de"
                        value={forgotPasswordEmail}
                        onChange={e => setForgotPasswordEmail(e.target.value)}
                        className="pl-9"
                        disabled={loading}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wird gesendet...
                      </>
                    ) : (
                      'Link zum Zurücksetzen senden'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setIsForgotPasswordMode(false);
                      setForgotPasswordEmail('');
                      setErrors({});
                    }}
                  >
                    Zurück zur Anmeldung
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            © {new Date().getFullYear()} Telya GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    );
  }

  // Password Reset Mode (for invited users)
  if (isPasswordResetMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Telya Reparatur</h1>
            <p className="text-muted-foreground mt-1">Management System</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Passwort setzen</CardTitle>
              </div>
              <CardDescription>
                Willkommen! Bitte legen Sie jetzt Ihr Passwort fest, um sich anzumelden.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {passwordResetSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">Passwort erfolgreich gesetzt!</p>
                  <p className="text-muted-foreground">Sie werden jetzt weitergeleitet...</p>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Neues Passwort</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="pl-9"
                        disabled={loading}
                        minLength={6}
                      />
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="pl-9"
                        disabled={loading}
                        minLength={6}
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Das Passwort muss mindestens 6 Zeichen lang sein.
                  </p>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wird gespeichert...
                      </>
                    ) : (
                      'Passwort speichern'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            © {new Date().getFullYear()} Telya GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    );
  }
  return <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 py-[4px] bg-primary text-destructive">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          
          <h1 className="text-2xl font-bold text-foreground">Telya Reparatur</h1>
          <p className="text-muted-foreground mt-1">Management System</p>
        </div>

        {/* Login Type Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button type="button" onClick={() => setLoginType('employee')} className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${loginType === 'employee' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card hover:border-muted-foreground/50'}`}>
            <Users className="h-6 w-6" />
            <span className="text-sm font-medium">Mitarbeiter</span>
          </button>
          <button type="button" onClick={() => setLoginType('b2b')} className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${loginType === 'b2b' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card hover:border-muted-foreground/50'}`}>
            <Building2 className="h-6 w-6" />
            <span className="text-sm font-medium">B2B-Partner</span>
          </button>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {loginType === 'employee' ? 'Telya Mitarbeiter Login' : 'B2B-Partner Login'}
            </CardTitle>
            <CardDescription>
              {loginType === 'employee' ? 'Melden Sie sich mit Ihren Mitarbeiter-Zugangsdaten an.' : 'Melden Sie sich mit Ihren B2B-Partner-Zugangsdaten an.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loginRateLimiter.isLocked && <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  Zu viele fehlgeschlagene Anmeldeversuche. Bitte warten Sie{' '}
                  <strong>{Math.floor(loginRateLimiter.lockoutSeconds / 60)}:{String(loginRateLimiter.lockoutSeconds % 60).padStart(2, '0')}</strong>{' '}
                  Minuten.
                </AlertDescription>
              </Alert>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="login-email" type="email" placeholder="ihre@email.de" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="pl-9" disabled={loading} />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Passwort</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="pl-9" disabled={loading} />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordMode(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Passwort vergessen?
                </button>
              </div>


              <Button type="submit" className="w-full" disabled={loading || loginRateLimiter.isLocked}>
                {loading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Anmelden...
                  </> : loginRateLimiter.isLocked ? 'Gesperrt' : 'Anmelden'}
              </Button>
            </form>

            {loginType === 'b2b' && <>
                <Separator className="my-6" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Noch kein B2B-Partner?
                  </p>
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <Link to="/b2b-register">
                      <Building2 className="h-4 w-4" />
                      B2B-Partner werden
                    </Link>
                  </Button>
                </div>
              </>}
          </CardContent>
        </Card>

        {/* Customer Tracking Link */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Reparatur-Status prüfen?</p>
              <p className="text-xs text-muted-foreground">Verfolgen Sie Ihren Auftrag als Kunde</p>
            </div>
            <Link to="/track" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4">
              Tracking
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} Telya GmbH. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>;
}