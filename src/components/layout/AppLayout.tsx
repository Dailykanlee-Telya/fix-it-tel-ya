import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, PermissionKey } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Ticket, Wrench, Package, Users, MapPin, BarChart3, Settings, LogOut, Menu, X, ChevronDown, UserCog, Building2, Truck, ShieldCheck, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ROLE_LABELS } from '@/types/database';
import GlobalSearch from '@/components/GlobalSearch';
import NotificationBell from '@/components/NotificationBell';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionKey;
}

const navigation: NavItem[] = [{
  name: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard,
  permission: 'VIEW_DASHBOARD'
}, {
  name: 'Neue Annahme',
  href: '/intake',
  icon: Ticket,
  permission: 'VIEW_INTAKE'
}, {
  name: 'Werkstatt',
  href: '/workshop',
  icon: Wrench,
  permission: 'VIEW_WORKSHOP'
}, {
  name: 'Aufträge',
  href: '/tickets',
  icon: Ticket,
  permission: 'VIEW_TICKET_DETAILS'
}, {
  name: 'Ersatzteile',
  href: '/parts',
  icon: Package,
  permission: 'VIEW_PARTS'
}, {
  name: 'Lagerverwaltung',
  href: '/inventory',
  icon: Warehouse,
  permission: 'VIEW_PARTS'
}, {
  name: 'Kunden',
  href: '/customers',
  icon: Users,
  permission: 'VIEW_CUSTOMERS'
}, {
  name: 'Standorte',
  href: '/locations',
  icon: MapPin,
  permission: 'MANAGE_SETTINGS'
}, {
  name: 'Reports',
  href: '/reports',
  icon: BarChart3,
  permission: 'VIEW_REPORTS'
}, {
  name: 'Einstellungen',
  href: '/settings',
  icon: Settings,
  permission: 'MANAGE_SETTINGS'
}];

const adminNavigation: NavItem[] = [{
  name: 'Benutzerverwaltung',
  href: '/users',
  icon: UserCog,
  permission: 'MANAGE_USERS'
}, {
  name: 'Berechtigungen',
  href: '/permissions',
  icon: ShieldCheck,
  permission: 'MANAGE_PERMISSIONS'
}, {
  name: 'B2B-Partner',
  href: '/b2b-partners',
  icon: Building2,
  permission: 'MANAGE_B2B_PARTNERS'
}, {
  name: 'B2B-Rücksendungen',
  href: '/b2b-return-shipments',
  icon: Truck,
  permission: 'MANAGE_B2B_PARTNERS'
}];

export default function AppLayout() {
  const {
    profile,
    roles,
    signOut,
    hasRole
  } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = hasRole('ADMIN');
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => 
    !item.permission || can(item.permission)
  );
  
  const filteredAdminNavigation = adminNavigation.filter(item => 
    !item.permission || can(item.permission)
  );
  
  const showAdminSection = isAdmin || filteredAdminNavigation.length > 0;
  return <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar transition-transform duration-200 ease-in-out lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <img src="/telya-logo.png" alt="Telya" className="h-8" />
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 bg-primary-foreground">
            <ul className="space-y-1 px-3">
              {filteredNavigation.map(item => <li key={item.name}>
                  <NavLink to={item.href} className={({
                isActive
              }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')} onClick={() => setSidebarOpen(false)}>
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                </li>)}
              
              {/* Admin Navigation */}
              {showAdminSection && <>
                  <li className="pt-4 pb-2">
                    <span className="px-3 text-xs font-semibold uppercase text-sidebar-foreground/50">
                      Administration
                    </span>
                  </li>
                  {filteredAdminNavigation.map(item => <li key={item.name}>
                      <NavLink to={item.href} className={({
                  isActive
                }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')} onClick={() => setSidebarOpen(false)}>
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </NavLink>
                    </li>)}
                </>}
            </ul>
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4 bg-primary-foreground">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  {profile ? getInitials(profile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.name || 'Benutzer'}
                </p>
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {roles.length > 0 ? ROLE_LABELS[roles[0]] : 'Keine Rolle'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Global Search */}
          <GlobalSearch />

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationBell />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {profile ? getInitials(profile.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Einstellungen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>;
}
