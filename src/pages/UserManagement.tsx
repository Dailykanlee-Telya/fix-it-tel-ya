import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Pencil,
  MapPin,
  Globe,
  Trash2,
  UserX,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AppRole, ROLE_LABELS } from '@/types/database';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { UserEditDialog } from '@/components/admin/UserEditDialog';
import { UserDeleteDialog } from '@/components/admin/UserDeleteDialog';

interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  default_location_id: string | null;
  can_view_all_locations: boolean;
  created_at: string;
  roles: AppRole[];
  user_locations: {
    location_id: string;
    is_default: boolean;
    can_view: boolean;
  }[];
  default_location?: {
    name: string;
    code: string | null;
  };
}

interface Location {
  id: string;
  name: string;
  code: string | null;
}

export default function UserManagement() {
  const { hasRole, user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithDetails | null>(null);

  const isAdmin = hasRole('ADMIN');

  // Fetch all locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, code')
        .order('name');
      if (error) throw error;
      return data as Location[];
    },
    enabled: isAdmin,
  });

  // Fetch all users with roles and locations
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-management'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          default_location:locations!profiles_default_location_id_fkey (
            name,
            code
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles for all users
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      // Fetch user_locations for all users
      const { data: userLocations } = await supabase
        .from('user_locations')
        .select('*');

      // Combine profiles with roles and locations
      return profiles.map(profile => ({
        ...profile,
        can_view_all_locations: profile.can_view_all_locations ?? false,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
        user_locations: userLocations?.filter(ul => ul.user_id === profile.id) || [],
      })) as UserWithDetails[];
    },
    enabled: isAdmin,
  });

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, approve, userEmail, userName }: { userId: string; approve: boolean; userEmail?: string; userName?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: approve })
        .eq('id', userId);

      if (error) throw error;

      if (approve && userEmail && userName) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'user_approved',
              to_email: userEmail,
              user_name: userName,
            },
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
        }
      }
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      toast({
        title: approve ? 'Benutzer freigeschaltet' : 'Benutzer deaktiviert',
        description: approve 
          ? 'Der Benutzer wurde freigeschaltet und per E-Mail benachrichtigt.'
          : 'Der Benutzer wurde deaktiviert.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nicht angemeldet');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Fehler beim Löschen des Benutzers');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      toast({
        title: 'Benutzer gelöscht',
        description: 'Der Benutzer wurde vollständig entfernt.',
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  // Deactivate user mutation (fallback when deletion is not possible)
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      toast({
        title: 'Benutzer deaktiviert',
        description: 'Der Benutzer wurde deaktiviert und kann sich nicht mehr anmelden.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const handleEditUser = (user: UserWithDetails) => {
    setEditingUser({
      ...user,
      role: user.roles[0] || 'THEKE',
    } as any);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (user: UserWithDetails) => {
    // Don't allow self-deletion
    if (user.id === currentUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Nicht erlaubt',
        description: 'Sie können sich nicht selbst löschen.',
      });
      return;
    }
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    await deleteUserMutation.mutateAsync(userToDelete.id);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Sie haben keine Berechtigung für diese Seite.</p>
      </div>
    );
  }

  const pendingUsers = users?.filter(u => !u.is_active) || [];
  const activeUsers = users?.filter(u => u.is_active) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Benutzerverwaltung</h1>
          <p className="text-muted-foreground">Benutzer einladen, freischalten und Rollen verwalten</p>
        </div>
        <InviteUserDialog />
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
              <Clock className="h-5 w-5" />
              Ausstehende Freigaben ({pendingUsers.length})
            </CardTitle>
            <CardDescription>
              Diese Benutzer warten auf Freigabe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Registriert</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveUserMutation.mutate({ 
                            userId: user.id, 
                            approve: true, 
                            userEmail: user.email, 
                            userName: user.name 
                          })}
                          disabled={approveUserMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Freischalten
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          disabled={deleteUserMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Ablehnen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Aktive Benutzer ({activeUsers.length})
          </CardTitle>
          <CardDescription>
            Alle freigeschalteten Benutzer im System
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Standard-Filiale</TableHead>
                  <TableHead>Filialen</TableHead>
                  <TableHead>Alle Filialen</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role: AppRole) => (
                          <Badge key={role} variant="secondary">
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.default_location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {user.default_location.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.user_locations.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.can_view_all_locations ? (
                        <Globe className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>
                        {user.id !== currentUser?.id && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deactivateUserMutation.mutate(user.id)}
                              disabled={deactivateUserMutation.isPending}
                              title="Benutzer deaktivieren"
                            >
                              <UserX className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClick(user)}
                              disabled={deleteUserMutation.isPending}
                              title="Benutzer löschen"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={editingUser as any}
        locations={locations || []}
      />

      {/* Delete Confirmation Dialog */}
      <UserDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userName={userToDelete?.name || ''}
        userEmail={userToDelete?.email || ''}
        onConfirm={handleDeleteConfirm}
        isPending={deleteUserMutation.isPending}
      />
    </div>
  );
}
