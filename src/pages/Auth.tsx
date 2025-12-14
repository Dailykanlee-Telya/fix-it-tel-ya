import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Mail, Lock, User, Loader2, Search, ShieldAlert, Building2, Users, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useRateLimiter, AUTH_RATE_LIMIT_CONFIG } from '@/hooks/useRateLimiter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginType, setLoginType] = useState<'employee' | 'b2b'>('employee');
  
  // Rate limiting for login attempts
  const loginRateLimiter = useRateLimiter('auth_login', AUTH_RATE_LIMIT_CONFIG);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Check rate limit
    if (loginRateLimiter.isLocked) {
      toast({
        variant: 'destructive',
        title: 'Zu viele Anmeldeversuche',
        description: `Bitte warten Sie ${loginRateLimiter.lockoutSeconds} Sekunden.`,
      });
      return;
    }
    
    setLoading(true);

    try {
      const validated = loginSchema.parse({
        email: loginEmail,
        password: loginPassword,
      });

      const { error } = await signIn(validated.email, validated.password);
      
      if (error) {
        // Record failed attempt
        loginRateLimiter.recordAttempt(false);
        
        if (error.message.includes('Invalid login credentials')) {
          toast({
            variant: 'destructive',
            title: 'Anmeldung fehlgeschlagen',
            description: loginRateLimiter.attemptsRemaining <= 2 
              ? `Ungültige E-Mail oder Passwort. Noch ${loginRateLimiter.attemptsRemaining} Versuche.`
              : 'Ungültige E-Mail oder Passwort.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Fehler',
            description: error.message,
          });
        }
      } else {
        // Record successful attempt (resets counter)
        loginRateLimiter.recordAttempt(true);
        toast({
          title: 'Willkommen!',
          description: 'Sie wurden erfolgreich angemeldet.',
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/telya-logo.png" 
            alt="Telya Logo" 
            className="h-16 w-16 rounded-2xl shadow-lg shadow-primary/25 mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Telya Reparatur</h1>
          <p className="text-muted-foreground mt-1">Management System</p>
        </div>

        {/* Login Type Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setLoginType('employee')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
              loginType === 'employee'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card hover:border-muted-foreground/50'
            }`}
          >
            <Users className="h-6 w-6" />
            <span className="text-sm font-medium">Mitarbeiter</span>
          </button>
          <button
            type="button"
            onClick={() => setLoginType('b2b')}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
              loginType === 'b2b'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card hover:border-muted-foreground/50'
            }`}
          >
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
              {loginType === 'employee' 
                ? 'Melden Sie sich mit Ihren Mitarbeiter-Zugangsdaten an.' 
                : 'Melden Sie sich mit Ihren B2B-Partner-Zugangsdaten an.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loginRateLimiter.isLocked && (
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  Zu viele fehlgeschlagene Anmeldeversuche. Bitte warten Sie{' '}
                  <strong>{Math.floor(loginRateLimiter.lockoutSeconds / 60)}:{String(loginRateLimiter.lockoutSeconds % 60).padStart(2, '0')}</strong>{' '}
                  Minuten.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ihre@email.de"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Passwort</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading || loginRateLimiter.isLocked}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Anmelden...
                  </>
                ) : loginRateLimiter.isLocked ? (
                  'Gesperrt'
                ) : (
                  'Anmelden'
                )}
              </Button>
            </form>

            {loginType === 'b2b' && (
              <>
                <Separator className="my-6" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Noch kein B2B-Partner?
                  </p>
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <a href="mailto:service@telya.de?subject=B2B-Partner%20Anfrage">
                      <Building2 className="h-4 w-4" />
                      B2B-Partner werden
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </>
            )}
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
            <Link 
              to="/track" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4"
            >
              Tracking
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} Telya GmbH. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}