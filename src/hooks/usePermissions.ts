import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type PermissionKey =
  // Tickets / Orders
  | 'VIEW_DASHBOARD'
  | 'VIEW_INTAKE'
  | 'CREATE_TICKET'
  | 'VIEW_TICKET_DETAILS'
  | 'EDIT_TICKET_BASIC'
  | 'EDIT_TICKET_SENSITIVE'
  | 'CHANGE_TICKET_STATUS'
  | 'HANDOVER_TICKET'
  | 'CANCEL_TICKET'
  // KVA / Pricing
  | 'VIEW_KVA'
  | 'CREATE_KVA'
  | 'EDIT_KVA_PRICE'
  | 'APPROVE_KVA'
  | 'REJECT_KVA'
  | 'CHANGE_FINAL_PRICE'
  | 'GRANT_DISCOUNT'
  // Workshop / Parts
  | 'VIEW_WORKSHOP'
  | 'VIEW_PARTS'
  | 'MANAGE_PARTS'
  | 'USE_PARTS'
  | 'COMPLETE_QC_CHECK'
  // B2B
  | 'VIEW_B2B_PORTAL'
  | 'CREATE_B2B_TICKET'
  | 'EDIT_B2B_PRICES'
  | 'FORWARD_KVA_TO_ENDCUSTOMER'
  // Admin / Organization
  | 'VIEW_REPORTS'
  | 'VIEW_FINANCIAL_REPORTS'
  | 'MANAGE_USERS'
  | 'MANAGE_PERMISSIONS'
  | 'MANAGE_DOCUMENT_TEMPLATES'
  | 'MANAGE_B2B_PARTNERS'
  | 'VIEW_ALL_LOCATIONS'
  | 'MANAGE_SETTINGS'
  | 'VIEW_CUSTOMERS'
  | 'EDIT_CUSTOMERS';

interface Permission {
  key: string;
  description: string;
  category: string;
}

interface UsePermissionsResult {
  permissions: string[];
  allPermissions: Permission[];
  loading: boolean;
  can: (permission: PermissionKey) => boolean;
  canAny: (permissions: PermissionKey[]) => boolean;
  canAll: (permissions: PermissionKey[]) => boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsResult {
  const { user, roles, hasRole } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user || roles.length === 0) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch user's permissions based on their roles
      const { data: rolePerms, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('permission_key')
        .in('role', roles);

      if (rolePermsError) {
        console.error('Error fetching role permissions:', rolePermsError);
        setPermissions([]);
      } else {
        const uniquePerms = [...new Set(rolePerms?.map(rp => rp.permission_key) || [])];
        setPermissions(uniquePerms);
      }

      // Fetch all available permissions for admin UI
      const { data: allPerms, error: allPermsError } = await supabase
        .from('permissions')
        .select('key, description, category')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (!allPermsError && allPerms) {
        setAllPermissions(allPerms);
      }
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, roles]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const can = useCallback((permission: PermissionKey): boolean => {
    // Admins always have all permissions
    if (hasRole('ADMIN')) {
      return true;
    }
    return permissions.includes(permission);
  }, [permissions, hasRole]);

  const canAny = useCallback((perms: PermissionKey[]): boolean => {
    return perms.some(p => can(p));
  }, [can]);

  const canAll = useCallback((perms: PermissionKey[]): boolean => {
    return perms.every(p => can(p));
  }, [can]);

  return {
    permissions,
    allPermissions,
    loading,
    can,
    canAny,
    canAll,
    refetch: fetchPermissions,
  };
}
