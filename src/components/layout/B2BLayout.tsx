import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  LogOut, 
  Settings,
  Building2,
  Menu,
  X,
  Users,
  Euro,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { B2B_ROLE_LABELS } from '@/types/b2b';

const getNavigation = () => {
  // Removed prices link - prices are only shown in KVA/orders, not as separate list
  return [
    { name: 'Dashboard', href: '/b2b/dashboard', icon: LayoutDashboard },
    { name: 'Aufträge', href: '/b2b/orders', icon: FileText },
    { name: 'Sendungen', href: '/b2b/shipments', icon: Package },
    { name: 'Kunden', href: '/b2b/customers', icon: Users },
  ];
};

export default function B2BLayout() {
  const { b2bPartner, isB2BUser, isB2BInhaber, isB2BAdmin, b2bRole } = useB2BAuth();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = getNavigation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Redirect non-B2B users
  if (!isB2BUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Kein B2B-Zugang</h1>
        <p className="text-muted-foreground mb-6">
          Sie haben keinen Zugang zum B2B-Portal.
        </p>
        <Button onClick={() => navigate('/')}>
          Zur Startseite
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Left: Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/b2b/dashboard')}
            >
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg hidden sm:inline">
                Telya B2B-Portal
              </span>
              <span className="font-bold text-lg sm:hidden">B2B</span>
            </div>
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Button
                  key={item.name}
                  variant={isActive ? 'secondary' : 'ghost'}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    'gap-2',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              );
            })}
          </nav>

          {/* Right: User Menu */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden lg:inline">
              {b2bPartner?.name}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(profile?.name || 'B2B')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  {b2bRole && (
                    <p className="text-xs text-primary mt-1">{B2B_ROLE_LABELS[b2bRole]}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/b2b/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Einstellungen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <nav className="container py-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-2',
                      isActive && 'bg-primary/10 text-primary'
                    )}
                    onClick={() => {
                      navigate(item.href);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  );
}
