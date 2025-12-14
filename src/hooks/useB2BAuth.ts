import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { B2BPartner } from '@/types/b2b';

export function useB2BAuth() {
  const { user, profile, roles, hasAnyRole } = useAuth();

  const isB2BUser = hasAnyRole(['B2B_ADMIN', 'B2B_USER']);
  const isB2BAdmin = hasAnyRole(['B2B_ADMIN']);
  const isInternalUser = hasAnyRole(['ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER']);

  // Fetch B2B partner data if user is a B2B user
  const { data: b2bPartner, isLoading: isLoadingPartner } = useQuery({
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

  return {
    user,
    profile,
    roles,
    isB2BUser,
    isB2BAdmin,
    isInternalUser,
    b2bPartner,
    b2bPartnerId: profile?.b2b_partner_id ?? null,
    isLoadingPartner,
  };
}
