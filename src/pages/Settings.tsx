import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  User,
  Shield,
  Settings as SettingsIcon,
  Users,
  Plus,
  Edit,
  Loader2,
  Database,
  AlertTriangle,
  Clock,
  Save,
  Mail,
} from 'lucide-react';
import { AppRole, ROLE_LABELS, Profile } from '@/types/database';
import { DataResetDialog } from '@/components/admin/DataResetDialog';
import { NotificationTemplatesSettings } from '@/components/admin/NotificationTemplatesSettings';

function SessionTimeoutSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeoutValue, setTimeoutValue] = useState<string>('15');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current setting
  const { data: setting, isLoading } = useQuery({
    queryKey: ['session-timeout-setting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'session_timeout_minutes')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (setting?.value) {
      const val = typeof setting.value === 'number' ? setting.value : parseInt(String(setting.value), 10);
      setTimeoutValue(String(val));
    }
  }, [setting]);

  const handleSave = async () => {
    const minutes = parseInt(timeoutValue, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 480) {
      toast({
        variant: 'destructive',
        title: 'Ungültiger Wert',
        description: 'Bitte geben Sie einen Wert zwischen 1 und 480 Minuten ein.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'session_timeout_minutes',
          value: minutes,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['session-timeout-setting'] });
      toast({
        title: 'Einstellung gespeichert',
        description: `Session-Timeout wurde auf ${minutes} Minuten gesetzt.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Session-Timeout
        </CardTitle>
        <CardDescription>
          Automatische Abmeldung nach Inaktivität konfigurieren
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label htmlFor="timeout">Timeout (Minuten)</Label>
            <Input
              id="timeout"
              type="number"
              min={1}
              max={480}
              value={timeoutValue}
              onChange={(e) => setTimeoutValue(e.target.value)}
              disabled={isLoading || isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Benutzer werden nach dieser Zeit der Inaktivität automatisch abgemeldet (1-480 Minuten).
            </p>
          </div>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = hasRole('ADMIN');

  // Fetch users with roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      return profiles.map((p: any) => ({
        ...p,
        roles: roles.filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      }));
    },
    enabled: isAdmin,
  });

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('THEKE');

  const addRoleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role: selectedRole,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      setRoleDialogOpen(false);
      toast({
        title: 'Rolle zugewiesen',
        description: `${ROLE_LABELS[selectedRole]} wurde ${selectedUser.name} zugewiesen.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message.includes('duplicate') 
          ? 'Diese Rolle ist bereits zugewiesen.' 
          : error.message,
      });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground">System- und Benutzerverwaltung</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Mein Profil</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Benutzer</TabsTrigger>}
          {isAdmin && <TabsTrigger value="notifications">E-Mail-Vorlagen</TabsTrigger>}
          {isAdmin && <TabsTrigger value="system">System</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profilinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={profile?.name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input value={profile?.email || ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div>
                  <Badge variant={profile?.is_active ? 'default' : 'destructive'}>
                    {profile?.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="space-y-4">
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Benutzerverwaltung
                  </CardTitle>
                  <CardDescription>Benutzer und Rollen verwalten</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Benutzer</TableHead>
                        <TableHead>E-Mail</TableHead>
                        <TableHead>Rollen</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      )}
                      {users?.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.length === 0 && (
                                <span className="text-sm text-muted-foreground">Keine Rollen</span>
                              )}
                              {user.roles.map((role: AppRole) => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {ROLE_LABELS[role]}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                              {user.is_active ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog open={roleDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                              setRoleDialogOpen(open);
                              if (!open) setSelectedUser(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                  className="gap-1"
                                >
                                  <Shield className="h-4 w-4" />
                                  Rolle
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Rolle zuweisen</DialogTitle>
                                  <DialogDescription>
                                    Weisen Sie {user.name} eine Rolle zu.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <Label>Rolle</Label>
                                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                                    <SelectTrigger className="mt-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                                    Abbrechen
                                  </Button>
                                  <Button onClick={() => addRoleMutation.mutate()} disabled={addRoleMutation.isPending}>
                                    {addRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Zuweisen
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="notifications" className="space-y-4">
            <NotificationTemplatesSettings />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="system" className="space-y-4">
            <SessionTimeoutSettings />
            
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Datenverwaltung
                </CardTitle>
                <CardDescription>
                  Systemdaten verwalten und zurücksetzen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-destructive">Testdaten löschen</h4>
                      <p className="text-sm text-muted-foreground">
                        Löscht alle Kunden, B2B-Partner und Aufträge. Nutzen Sie diese Funktion
                        nur in Test- oder Demo-Umgebungen. Diese Aktion kann nicht rückgängig gemacht werden.
                      </p>
                      <div className="pt-2">
                        <DataResetDialog />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
