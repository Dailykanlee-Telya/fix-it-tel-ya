import { ReactNode } from 'react';
import { usePermissions, PermissionKey } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: PermissionKey;
  requiredPermissions?: PermissionKey[];
  requireAll?: boolean; // If true, all permissions required; if false, any permission is enough
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
  fallback
}: ProtectedRouteProps) {
  const { loading: authLoading, user } = useAuth();
  const { can, canAny, canAll, loading: permLoading } = usePermissions();
  const navigate = useNavigate();

  // Still loading
  if (authLoading || permLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return fallback || (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-destructive" />
              Nicht angemeldet
            </CardTitle>
            <CardDescription>
              Sie müssen angemeldet sein, um auf diese Seite zuzugreifen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')}>
              Zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check permissions
  const permsToCheck = requiredPermission 
    ? [requiredPermission] 
    : requiredPermissions;

  if (permsToCheck.length > 0) {
    const hasAccess = requireAll 
      ? canAll(permsToCheck) 
      : canAny(permsToCheck);

    if (!hasAccess) {
      return fallback || (
        <div className="flex items-center justify-center h-64">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldX className="h-5 w-5 text-destructive" />
                Kein Zugriff
              </CardTitle>
              <CardDescription>
                Sie haben keine Berechtigung, diese Seite zu sehen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Zurück
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
