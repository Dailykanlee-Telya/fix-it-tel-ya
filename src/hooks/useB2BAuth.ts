import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { B2BPartner, B2BRole } from '@/types/b2b';
import { AppRole } from '@/types/database';

export function useB2BAuth() {
  const { user, profile, roles, hasAnyRole, hasRole } = useAuth();

  // Cast B2B_INHABER since it was added via migration but types.ts is auto-generated
  const isB2BUser = hasAnyRole(['B2B_INHABER' as AppRole, 'B2B_ADMIN', 'B2B_USER']);
  const isB2BInhaber = hasRole('B2B_INHABER' as AppRole);
  const isB2BAdmin = hasAnyRole(['B2B_INHABER' as AppRole, 'B2B_ADMIN']);
  const isInternalUser = hasAnyRole(['ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER']);

  // Get the highest B2B role
  const getB2BRole = (): B2BRole | null => {
    if (hasRole('B2B_INHABER' as AppRole)) return 'B2B_INHABER';
    if (hasRole('B2B_ADMIN')) return 'B2B_ADMIN';
    if (hasRole('B2B_USER')) return 'B2B_USER';
    return null;
  };

  // Fetch B2B partner data if user is a B2B user
  const { data: b2bPartner, isLoading: isLoadingPartner, refetch: refetchPartner } = useQuery({
    queryKey: ['b2b-partner', profile?.b2b_partner_id],
    queryFn: async () => {
      if (!profile?.b2b_partner_id) return null;
      
      const { data, error } = await supabase
        .from('b2b_partners')
        .select('*')
        .eq('id', profile.b2b_partner_id)
        .single();
      
      if (error) throw error;
      return data as B2BPartner;
    },
    enabled: !!profile?.b2b_partner_id && isB2BUser,
  });

  // Permission helpers based on role hierarchy
  const canManageB2BUsers = isB2BInhaber;
  const canManagePrices = isB2BAdmin;
  const canReleaseEndcustomerPrice = isB2BAdmin;
  const canManageTemplates = isB2BInhaber;

  return {
    user,
    profile,
    roles,
    isB2BUser,
    isB2BInhaber,
    isB2BAdmin,
    isInternalUser,
    b2bPartner,
    b2bPartnerId: profile?.b2b_partner_id ?? null,
    b2bRole: getB2BRole(),
    isLoadingPartner,
    refetchPartner,
    canManageB2BUsers,
    canManagePrices,
    canReleaseEndcustomerPrice,
    canManageTemplates,
  };
}
