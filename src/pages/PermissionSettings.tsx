import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole, ROLE_LABELS } from '@/types/database';

interface Permission {
  key: string;
  description: string;
  category: string;
}

interface RolePermission {
  role: AppRole;
  permission_key: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  intake: 'Auftragsannahme',
  tickets: 'Aufträge',
  workshop: 'Werkstatt',
  parts: 'Lager / Teile',
  customers: 'Kunden',
  reports: 'Reports',
  b2b: 'B2B-Portal',
  admin: 'Administration',
  general: 'Allgemein',
};

const ROLES_TO_DISPLAY: AppRole[] = ['ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER'];

export default function PermissionSettings() {
  const { hasRole } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  // Fetch all permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category')
        .order('key');
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch all role_permissions
  const { data: rolePermissions, isLoading: rolePermsLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      if (error) throw error;
      return data as RolePermission[];
    },
  });

  // Mutation to toggle permission
  const toggleMutation = useMutation({
    mutationFn: async ({ role, permissionKey, hasPermission }: { 
      role: AppRole; 
      permissionKey: string; 
      hasPermission: boolean 
    }) => {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role)
          .eq('permission_key', permissionKey);
        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role, permission_key: permissionKey });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Berechtigung aktualisiert');
    },
    onError: (error) => {
      console.error('Error toggling permission:', error);
      toast.error('Fehler beim Aktualisieren der Berechtigung');
    },
  });

  // Check access
  if (!hasRole('ADMIN') && !can('MANAGE_PERMISSIONS')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Kein Zugriff auf diese Seite.</p>
      </div>
    );
  }

  if (permissionsLoading || rolePermsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group permissions by category
  const permissionsByCategory = permissions?.reduce((acc, perm) => {
    const cat = perm.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  const hasRolePermission = (role: AppRole, permKey: string): boolean => {
    return rolePermissions?.some(rp => rp.role === role && rp.permission_key === permKey) || false;
  };

  const handleToggle = (role: AppRole, permissionKey: string) => {
    // Don't allow changing ADMIN permissions
    if (role === 'ADMIN') {
      toast.error('Admin-Berechtigungen können nicht geändert werden');
      return;
    }
    
    const hasPermission = hasRolePermission(role, permissionKey);
    toggleMutation.mutate({ role, permissionKey, hasPermission });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Berechtigungen verwalten</h1>
          <p className="text-muted-foreground">
            Konfigurieren Sie die Zugriffsrechte für jede Rolle
          </p>
        </div>
      </div>

      {Object.entries(permissionsByCategory).map(([category, perms]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{CATEGORY_LABELS[category] || category}</CardTitle>
            <CardDescription>
              Berechtigungen für den Bereich {CATEGORY_LABELS[category] || category}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium min-w-[200px]">Berechtigung</th>
                    {ROLES_TO_DISPLAY.map(role => (
                      <th key={role} className="text-center py-2 px-2 font-medium min-w-[100px]">
                        {ROLE_LABELS[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perms.map(perm => (
                    <tr key={perm.key} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-sm">{perm.description}</div>
                        <div className="text-xs text-muted-foreground font-mono">{perm.key}</div>
                      </td>
                      {ROLES_TO_DISPLAY.map(role => (
                        <td key={role} className="text-center py-3 px-2">
                          <Checkbox
                            checked={hasRolePermission(role, perm.key)}
                            onCheckedChange={() => handleToggle(role, perm.key)}
                            disabled={role === 'ADMIN' || toggleMutation.isPending}
                            className="mx-auto"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
