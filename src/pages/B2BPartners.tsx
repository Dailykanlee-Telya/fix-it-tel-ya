import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Building2, Users, Edit, UserPlus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface B2BPartner {
  id: string;
  name: string;
  customer_number: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  is_active: boolean;
  created_at: string;
}

interface PartnerUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  b2b_partner_id: string | null;
}

export default function B2BPartners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignUserOpen, setIsAssignUserOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<B2BPartner | null>(null);
  const [newPartner, setNewPartner] = useState({
    name: '',
    customer_number: '',
    street: '',
    zip: '',
    city: '',
    country: 'Deutschland',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    billing_email: '',
  });

  // Fetch B2B partners
  const { data: partners, isLoading: isLoadingPartners } = useQuery({
    queryKey: ['b2b-partners-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_partners')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as B2BPartner[];
    },
  });

  // Fetch users for assignment
  const { data: allUsers } = useQuery({
    queryKey: ['users-for-b2b'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, is_active, b2b_partner_id')
        .order('name');
      if (error) throw error;
      return data as PartnerUser[];
    },
  });

  // Create partner mutation
  const createPartnerMutation = useMutation({
    mutationFn: async (partner: typeof newPartner) => {
      const { data, error } = await supabase
        .from('b2b_partners')
        .insert({
          name: partner.name,
          customer_number: partner.customer_number || null,
          street: partner.street || null,
          zip: partner.zip || null,
          city: partner.city || null,
          country: partner.country || 'Deutschland',
          contact_name: partner.contact_name || null,
          contact_email: partner.contact_email || null,
          contact_phone: partner.contact_phone || null,
          billing_email: partner.billing_email || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Partner erstellt', description: 'Der B2B-Partner wurde erfolgreich angelegt.' });
      queryClient.invalidateQueries({ queryKey: ['b2b-partners-admin'] });
      setIsCreateOpen(false);
      setNewPartner({
        name: '', customer_number: '', street: '', zip: '', city: '', country: 'Deutschland',
        contact_name: '', contact_email: '', contact_phone: '', billing_email: '',
      });
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Partner konnte nicht erstellt werden.', variant: 'destructive' });
    },
  });

  // Update partner mutation
  const updatePartnerMutation = useMutation({
    mutationFn: async (partner: B2BPartner) => {
      const { error } = await supabase
        .from('b2b_partners')
        .update({
          name: partner.name,
          customer_number: partner.customer_number,
          street: partner.street,
          zip: partner.zip,
          city: partner.city,
          country: partner.country,
          contact_name: partner.contact_name,
          contact_email: partner.contact_email,
          contact_phone: partner.contact_phone,
          billing_email: partner.billing_email,
          is_active: partner.is_active,
        })
        .eq('id', partner.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Partner aktualisiert' });
      queryClient.invalidateQueries({ queryKey: ['b2b-partners-admin'] });
      setIsEditOpen(false);
      setSelectedPartner(null);
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Partner konnte nicht aktualisiert werden.', variant: 'destructive' });
    },
  });

  // Assign user to partner mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, partnerId }: { userId: string; partnerId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ b2b_partner_id: partnerId })
        .eq('id', userId);
      if (error) throw error;

      // If assigning to a partner, add B2B_USER role
      if (partnerId) {
        // Check if user already has B2B role
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .in('role', ['B2B_ADMIN', 'B2B_USER'])
          .maybeSingle();

        if (!existingRole) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: 'B2B_USER' });
          if (roleError) throw roleError;
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Benutzer zugeordnet' });
      queryClient.invalidateQueries({ queryKey: ['users-for-b2b'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-partners-admin'] });
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Zuordnung fehlgeschlagen.', variant: 'destructive' });
    },
  });

  const filteredPartners = partners?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.customer_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  );

  const partnerUsers = allUsers?.filter(u => u.b2b_partner_id === selectedPartner?.id) || [];
  const availableUsers = allUsers?.filter(u => !u.b2b_partner_id) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            B2B-Partner Verwaltung
          </h1>
          <p className="text-muted-foreground">
            Partner anlegen und Benutzer zuordnen
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neuen B2B-Partner anlegen</DialogTitle>
              <DialogDescription>Erstellen Sie einen neuen Händler-Partner</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Firmenname *</Label>
                  <Input
                    id="name"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    placeholder="Musterfirma GmbH"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_number">Kundennummer</Label>
                  <Input
                    id="customer_number"
                    value={newPartner.customer_number}
                    onChange={(e) => setNewPartner({ ...newPartner, customer_number: e.target.value })}
                    placeholder="K-12345"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={newPartner.street}
                  onChange={(e) => setNewPartner({ ...newPartner, street: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">PLZ</Label>
                  <Input
                    id="zip"
                    value={newPartner.zip}
                    onChange={(e) => setNewPartner({ ...newPartner, zip: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="city">Stadt</Label>
                  <Input
                    id="city"
                    value={newPartner.city}
                    onChange={(e) => setNewPartner({ ...newPartner, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Ansprechpartner</Label>
                  <Input
                    id="contact_name"
                    value={newPartner.contact_name}
                    onChange={(e) => setNewPartner({ ...newPartner, contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telefon</Label>
                  <Input
                    id="contact_phone"
                    value={newPartner.contact_phone}
                    onChange={(e) => setNewPartner({ ...newPartner, contact_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">E-Mail</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={newPartner.contact_email}
                    onChange={(e) => setNewPartner({ ...newPartner, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_email">Rechnungs-E-Mail</Label>
                  <Input
                    id="billing_email"
                    type="email"
                    value={newPartner.billing_email}
                    onChange={(e) => setNewPartner({ ...newPartner, billing_email: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Abbrechen</Button>
              <Button 
                onClick={() => createPartnerMutation.mutate(newPartner)}
                disabled={!newPartner.name || createPartnerMutation.isPending}
              >
                {createPartnerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Name, Kundennummer, Stadt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partner ({filteredPartners?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPartners ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredPartners?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Keine Partner gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kundennr.</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead>Ansprechpartner</TableHead>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners?.map((partner) => {
                  const userCount = allUsers?.filter(u => u.b2b_partner_id === partner.id).length || 0;
                  return (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {partner.customer_number || '-'}
                      </TableCell>
                      <TableCell>{partner.city || '-'}</TableCell>
                      <TableCell>
                        {partner.contact_name && (
                          <div className="text-sm">
                            <div>{partner.contact_name}</div>
                            {partner.contact_email && (
                              <div className="text-muted-foreground">{partner.contact_email}</div>
                            )}
                          </div>
                        )}
                        {!partner.contact_name && '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{userCount} Benutzer</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.is_active ? 'default' : 'secondary'}>
                          {partner.is_active ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPartner(partner);
                              setIsEditOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPartner(partner);
                              setIsAssignUserOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Partner Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Partner bearbeiten</DialogTitle>
          </DialogHeader>
          {selectedPartner && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="users">Benutzer ({partnerUsers.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Firmenname *</Label>
                    <Input
                      value={selectedPartner.name}
                      onChange={(e) => setSelectedPartner({ ...selectedPartner, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kundennummer</Label>
                    <Input
                      value={selectedPartner.customer_number || ''}
                      onChange={(e) => setSelectedPartner({ ...selectedPartner, customer_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Straße</Label>
                  <Input
                    value={selectedPartner.street || ''}
                    onChange={(e) => setSelectedPartner({ ...selectedPartner, street: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>PLZ</Label>
                    <Input
                      value={selectedPartner.zip || ''}
                      onChange={(e) => setSelectedPartner({ ...selectedPartner, zip: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Stadt</Label>
                    <Input
                      value={selectedPartner.city || ''}
                      onChange={(e) => setSelectedPartner({ ...selectedPartner, city: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ansprechpartner</Label>
                    <Input
                      value={selectedPartner.contact_name || ''}
                      onChange={(e) => setSelectedPartner({ ...selectedPartner, contact_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={selectedPartner.contact_phone || ''}
                      onChange={(e) => setSelectedPartner({ ...selectedPartner, contact_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input
                      value={selectedPartner.contact_email || ''}
                      onChange={(e) => setSelectedPartner({ ...selectedPartner, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rechnungs-E-Mail</Label>
                    <Input
                      value={selectedPartner.billing_email || ''}
                      onChange={(e) => setSelectedPartner({ ...selectedPartner, billing_email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedPartner.is_active}
                    onCheckedChange={(checked) => setSelectedPartner({ ...selectedPartner, is_active: checked })}
                  />
                  <Label>Partner aktiv</Label>
                </div>
              </TabsContent>
              <TabsContent value="users" className="py-4">
                {partnerUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Benutzer zugeordnet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>E-Mail</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partnerUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                              {user.is_active ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => assignUserMutation.mutate({ userId: user.id, partnerId: null })}
                            >
                              Entfernen
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Abbrechen</Button>
            <Button
              onClick={() => selectedPartner && updatePartnerMutation.mutate(selectedPartner)}
              disabled={updatePartnerMutation.isPending}
            >
              {updatePartnerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={isAssignUserOpen} onOpenChange={setIsAssignUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer zu {selectedPartner?.name} zuordnen</DialogTitle>
            <DialogDescription>
              Wählen Sie einen Benutzer aus, der diesem Partner zugeordnet werden soll.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {availableUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Keine verfügbaren Benutzer. Erstellen Sie zuerst neue Benutzer.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedPartner) {
                          assignUserMutation.mutate({ userId: user.id, partnerId: selectedPartner.id });
                        }
                      }}
                      disabled={assignUserMutation.isPending}
                    >
                      Zuordnen
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignUserOpen(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
