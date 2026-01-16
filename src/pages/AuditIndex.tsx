import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Wrench, 
  Ticket, 
  Package, 
  Warehouse, 
  Users, 
  MapPin, 
  BarChart3, 
  Settings, 
  UserCog, 
  Shield, 
  FileText, 
  Building2, 
  Truck,
  LogIn,
  Search,
  Lock
} from 'lucide-react';

interface RouteInfo {
  path: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  status: 'ok' | 'partial' | 'blocked';
  description: string;
  category: 'public' | 'internal' | 'b2b' | 'admin';
}

const routes: RouteInfo[] = [
  // Public Routes
  { path: '/auth', label: 'Login', icon: LogIn, status: 'ok', description: 'Anmeldeseite für alle Nutzer', category: 'public' },
  { path: '/track', label: 'Ticket-Tracking', icon: Search, status: 'ok', description: 'Öffentliche Reparaturstatus-Abfrage', category: 'public' },
  { path: '/datenschutz', label: 'Datenschutz', icon: Lock, status: 'ok', description: 'Datenschutzerklärung', category: 'public' },
  { path: '/b2b-register', label: 'B2B-Registrierung', icon: Building2, status: 'ok', description: 'B2B-Partner Registrierung', category: 'public' },
  
  // Internal Routes
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'VIEW_DASHBOARD', status: 'ok', description: 'Hauptübersicht mit Statistiken', category: 'internal' },
  { path: '/intake', label: 'Annahme', icon: ClipboardList, permission: 'VIEW_INTAKE', status: 'ok', description: 'Geräte-Annahme und Ticket-Erstellung', category: 'internal' },
  { path: '/workshop', label: 'Werkstatt', icon: Wrench, permission: 'VIEW_WORKSHOP', status: 'ok', description: 'Werkstatt-Übersicht für Techniker', category: 'internal' },
  { path: '/tickets', label: 'Tickets', icon: Ticket, permission: 'VIEW_TICKET_DETAILS', status: 'ok', description: 'Alle Reparatur-Tickets', category: 'internal' },
  { path: '/parts', label: 'Ersatzteile', icon: Package, permission: 'VIEW_PARTS', status: 'ok', description: 'Ersatzteil-Katalog', category: 'internal' },
  { path: '/inventory', label: 'Lager', icon: Warehouse, permission: 'VIEW_PARTS', status: 'ok', description: 'Lagerverwaltung und Bestand', category: 'internal' },
  { path: '/customers', label: 'Kunden', icon: Users, permission: 'VIEW_CUSTOMERS', status: 'ok', description: 'Kundenverwaltung', category: 'internal' },
  { path: '/reports', label: 'Berichte', icon: BarChart3, permission: 'VIEW_REPORTS', status: 'ok', description: 'Auswertungen und Reports', category: 'internal' },
  
  // Admin Routes
  { path: '/locations', label: 'Filialen', icon: MapPin, permission: 'MANAGE_SETTINGS', status: 'ok', description: 'Standort-Verwaltung', category: 'admin' },
  { path: '/settings', label: 'Einstellungen', icon: Settings, permission: 'MANAGE_SETTINGS', status: 'ok', description: 'System-Einstellungen', category: 'admin' },
  { path: '/users', label: 'Benutzerverwaltung', icon: UserCog, permission: 'MANAGE_USERS', status: 'ok', description: 'Benutzer und Rollen verwalten', category: 'admin' },
  { path: '/permissions', label: 'Berechtigungen', icon: Shield, permission: 'MANAGE_PERMISSIONS', status: 'ok', description: 'Rollen-Berechtigungen', category: 'admin' },
  { path: '/document-templates', label: 'Dokumentvorlagen', icon: FileText, permission: 'MANAGE_SETTINGS', status: 'ok', description: 'Vorlagen für Belege', category: 'admin' },
  { path: '/b2b-partners', label: 'B2B-Partner', icon: Building2, permission: 'MANAGE_B2B_PARTNERS', status: 'ok', description: 'B2B-Partner verwalten', category: 'admin' },
  { path: '/b2b-return-shipments', label: 'B2B-Rücksendungen', icon: Truck, permission: 'MANAGE_B2B_PARTNERS', status: 'ok', description: 'Rücksendungen an B2B', category: 'admin' },
  { path: '/model-requests', label: 'Modell-Anfragen', icon: ClipboardList, permission: 'MANAGE_SETTINGS', status: 'ok', description: 'Gerätemodell-Anfragen', category: 'admin' },
  
  // B2B Portal Routes
  { path: '/b2b/dashboard', label: 'B2B Dashboard', icon: LayoutDashboard, status: 'ok', description: 'B2B-Partner Übersicht', category: 'b2b' },
  { path: '/b2b/orders', label: 'B2B Aufträge', icon: Ticket, status: 'ok', description: 'Aufträge des Partners', category: 'b2b' },
  { path: '/b2b/orders/new', label: 'Neuer B2B-Auftrag', icon: ClipboardList, status: 'ok', description: 'Neuen Auftrag anlegen', category: 'b2b' },
  { path: '/b2b/shipments', label: 'B2B Sendungen', icon: Truck, status: 'ok', description: 'Versand-Übersicht', category: 'b2b' },
  { path: '/b2b/customers', label: 'B2B Endkunden', icon: Users, status: 'ok', description: 'Endkunden des Partners', category: 'b2b' },
  { path: '/b2b/settings', label: 'B2B Einstellungen', icon: Settings, status: 'ok', description: 'Partner-Einstellungen', category: 'b2b' },
];

const statusColors = {
  ok: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels = {
  ok: 'OK',
  partial: 'Teilweise',
  blocked: 'Blockiert',
};

const categoryLabels = {
  public: 'Öffentliche Seiten',
  internal: 'Interne Seiten (Mitarbeiter)',
  admin: 'Admin-Bereich',
  b2b: 'B2B-Portal',
};

const categoryColors = {
  public: 'border-blue-200 dark:border-blue-800',
  internal: 'border-green-200 dark:border-green-800',
  admin: 'border-purple-200 dark:border-purple-800',
  b2b: 'border-orange-200 dark:border-orange-800',
};

export default function AuditIndex() {
  const groupedRoutes = routes.reduce((acc, route) => {
    if (!acc[route.category]) {
      acc[route.category] = [];
    }
    acc[route.category].push(route);
    return acc;
  }, {} as Record<string, RouteInfo[]>);

  const categoryOrder: Array<RouteInfo['category']> = ['public', 'internal', 'admin', 'b2b'];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Audit-Index</h1>
        <p className="text-muted-foreground">
          Übersicht aller Routen und Seiten für das System-Review. Diese Seite ist nur für Administratoren sichtbar.
        </p>
      </div>

      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h2 className="font-semibold mb-2">Demo-Zugangsdaten</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex gap-4">
            <span className="font-medium w-32">Admin:</span>
            <code className="bg-background px-2 py-0.5 rounded">demo_admin@telya-demo.de</code>
          </div>
          <div className="flex gap-4">
            <span className="font-medium w-32">Mitarbeiter:</span>
            <code className="bg-background px-2 py-0.5 rounded">demo_staff@telya-demo.de</code>
          </div>
          <div className="flex gap-4">
            <span className="font-medium w-32">B2B-Partner:</span>
            <code className="bg-background px-2 py-0.5 rounded">demo_b2b@telya-demo.de</code>
          </div>
          <div className="flex gap-4">
            <span className="font-medium w-32">Passwort:</span>
            <code className="bg-background px-2 py-0.5 rounded">Demo!2026#</code>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {categoryOrder.map((category) => {
          const categoryRoutes = groupedRoutes[category];
          if (!categoryRoutes) return null;
          
          return (
            <Card key={category} className={`${categoryColors[category]}`}>
              <CardHeader>
                <CardTitle>{categoryLabels[category]}</CardTitle>
                <CardDescription>
                  {category === 'public' && 'Ohne Login erreichbar'}
                  {category === 'internal' && 'Für Mitarbeiter mit entsprechenden Berechtigungen'}
                  {category === 'admin' && 'Nur für Administratoren und Filialleiter'}
                  {category === 'b2b' && 'B2B-Portal für externe Partner'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {categoryRoutes.map((route) => {
                    const Icon = route.icon;
                    return (
                      <Link
                        key={route.path}
                        to={route.path}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                      >
                        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{route.label}</span>
                            <Badge variant="secondary" className={`text-xs ${statusColors[route.status]}`}>
                              {statusLabels[route.status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {route.description}
                          </p>
                          <code className="text-xs text-muted-foreground mt-1 block">
                            {route.path}
                          </code>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Hinweise zum Audit</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Interner Bereich:</strong> Login als demo_admin@telya-demo.de für vollen Zugriff</li>
          <li>• <strong>B2B-Portal:</strong> Login als demo_b2b@telya-demo.de für B2B-Sicht</li>
          <li>• <strong>Tracking:</strong> Ticket-Nummer + E-Mail oder Tracking-Code eingeben</li>
          <li>• <strong>Dummy-Daten:</strong> Alle Kundendaten sind fiktiv (Max Mustermann etc.)</li>
        </ul>
      </div>
    </div>
  );
}
