import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserLocation {
  id: string;
  location_id: string;
  is_default: boolean;
  can_view: boolean;
  location?: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface UseUserLocationsResult {
  userLocations: UserLocation[];
  defaultLocationId: string | null;
  canViewAllLocations: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useUserLocations(): UseUserLocationsResult {
  const { user, profile } = useAuth();
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserLocations = useCallback(async () => {
    if (!user) {
      setUserLocations([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select(`
          id,
          location_id,
          is_default,
          can_view,
          location:locations (
            id,
            name,
            code
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user locations:', error);
        setUserLocations([]);
      } else {
        setUserLocations(data || []);
      }
    } catch (error) {
      console.error('Error in fetchUserLocations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserLocations();
  }, [fetchUserLocations]);

  const defaultLocationId = userLocations.find(ul => ul.is_default)?.location_id 
    || profile?.default_location_id 
    || null;

  const canViewAllLocations = profile?.can_view_all_locations ?? false;

  return {
    userLocations,
    defaultLocationId,
    canViewAllLocations,
    loading,
    refetch: fetchUserLocations,
  };
}
