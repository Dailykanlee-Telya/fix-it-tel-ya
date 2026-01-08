import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { AppRole, ROLE_LABELS, INTERNAL_ROLES, B2B_ROLES } from '@/types/database';
import { Loader2, Building2 } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  code: string | null;
}

interface UserLocation {
  location_id: string;
  is_default: boolean;
  can_view: boolean;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  default_location_id: string | null;
  can_view_all_locations: boolean;
  role: AppRole;
  user_locations: UserLocation[];
  b2b_partner_id?: string | null;
}

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  locations: Location[];
}

export function UserEditDialog({ open, onOpenChange, user, locations }: UserEditDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  const [role, setRole] = useState<AppRole>('THEKE');
  const [defaultLocationId, setDefaultLocationId] = useState<string>('');
  const [canViewAllLocations, setCanViewAllLocations] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [b2bPartnerId, setB2bPartnerId] = useState<string>('');

  // Fetch B2B partners for B2B role assignment
  const { data: b2bPartners } = useQuery({
    queryKey: ['b2b-partners-for-user-edit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_partners')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const isB2BRole = B2B_ROLES.includes(role);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setDefaultLocationId(user.default_location_id || '');
      setCanViewAllLocations(user.can_view_all_locations);
      setSelectedLocations(user.user_locations.map(ul => ul.location_id));
      setB2bPartnerId(user.b2b_partner_id || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    // Validate B2B role requires partner
    if (isB2BRole && !b2bPartnerId) {
      toast.error('Bitte wählen Sie einen B2B-Partner für B2B-Rollen');
      return;
    }
    
    setSaving(true);
    try {
      // Update profile
      const profileUpdate: Record<string, any> = {
        can_view_all_locations: isB2BRole ? false : canViewAllLocations,
        b2b_partner_id: isB2BRole ? b2bPartnerId : null,
      };
      
      // Only set location for internal users
      if (!isB2BRole) {
        profileUpdate.default_location_id = defaultLocationId || null;
      } else {
        profileUpdate.default_location_id = null;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update role in user_roles table
      const { error: deleteRoleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (deleteRoleError) throw deleteRoleError;

      const { error: insertRoleError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role });

      if (insertRoleError) throw insertRoleError;

      // Update user_locations (only for internal users)
      // First delete all existing
      const { error: deleteLocError } = await supabase
        .from('user_locations')
        .delete()
        .eq('user_id', user.id);

      if (deleteLocError) throw deleteLocError;

      // Then insert new ones (only for internal users)
      if (!isB2BRole && selectedLocations.length > 0) {
        const locationsToInsert = selectedLocations.map(locId => ({
          user_id: user.id,
          location_id: locId,
          is_default: locId === defaultLocationId,
          can_view: true,
        }));

        const { error: insertLocError } = await supabase
          .from('user_locations')
          .insert(locationsToInsert);

        if (insertLocError) throw insertLocError;
      }

      toast.success('Benutzer erfolgreich aktualisiert');
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Fehler beim Speichern des Benutzers');
    } finally {
      setSaving(false);
    }
  };

  const handleLocationToggle = (locationId: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations(prev => [...prev, locationId]);
    } else {
      setSelectedLocations(prev => prev.filter(id => id !== locationId));
      // If this was the default location, clear it
      if (defaultLocationId === locationId) {
        setDefaultLocationId('');
      }
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Benutzer bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Name</Label>
            <p className="font-medium">{user.name}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">E-Mail</Label>
            <p className="font-medium">{user.email}</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Rolle</Label>
            <Select value={role} onValueChange={(v) => {
              setRole(v as AppRole);
              // Reset B2B partner if switching to internal role
              if (INTERNAL_ROLES.includes(v as AppRole)) {
                setB2bPartnerId('');
              }
            }}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Interne Rollen</div>
                {INTERNAL_ROLES.map((roleKey) => (
                  <SelectItem key={roleKey} value={roleKey}>
                    {ROLE_LABELS[roleKey]}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium border-t mt-1 pt-1">B2B-Rollen</div>
                {B2B_ROLES.map((roleKey) => (
                  <SelectItem key={roleKey} value={roleKey}>
                    {ROLE_LABELS[roleKey]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* B2B Partner Selection - only for B2B roles */}
          {isB2BRole && (
            <div className="space-y-2">
              <Label htmlFor="b2b-partner" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                B2B-Partner
              </Label>
              <Select value={b2bPartnerId} onValueChange={setB2bPartnerId}>
                <SelectTrigger id="b2b-partner">
                  <SelectValue placeholder="Partner auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {b2bPartners?.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name} {partner.code && `(${partner.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                B2B-Benutzer werden diesem Partner zugeordnet
              </p>
            </div>
          )}

          {/* View All Locations Toggle - only for internal users */}
          {!isB2BRole && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="view-all">Zugriff auf alle Filialen</Label>
                <p className="text-sm text-muted-foreground">
                  Kann Aufträge aller Standorte sehen
                </p>
              </div>
              <Switch
                id="view-all"
                checked={canViewAllLocations}
                onCheckedChange={setCanViewAllLocations}
              />
            </div>
          )}

          {/* Default Location - only for internal users */}
          {!isB2BRole && (
            <div className="space-y-2">
              <Label htmlFor="default-location">Standard-Filiale</Label>
              <Select 
                value={defaultLocationId} 
                onValueChange={(v) => {
                  setDefaultLocationId(v);
                  // Also ensure it's in selectedLocations
                  if (v && !selectedLocations.includes(v)) {
                    setSelectedLocations(prev => [...prev, v]);
                  }
                }}
              >
                <SelectTrigger id="default-location">
                  <SelectValue placeholder="Keine Standard-Filiale" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} {loc.code && `(${loc.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Additional Locations - only for internal users */}
          {!isB2BRole && !canViewAllLocations && (
            <div className="space-y-2">
              <Label>Zusätzliche Filialen (Aufträge sichtbar)</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {locations.map((loc) => (
                  <div key={loc.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`loc-${loc.id}`}
                      checked={selectedLocations.includes(loc.id)}
                      onCheckedChange={(checked) => handleLocationToggle(loc.id, checked as boolean)}
                    />
                    <label
                      htmlFor={`loc-${loc.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {loc.name} {loc.code && `(${loc.code})`}
                      {loc.id === defaultLocationId && (
                        <span className="ml-2 text-xs text-muted-foreground">(Standard)</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
