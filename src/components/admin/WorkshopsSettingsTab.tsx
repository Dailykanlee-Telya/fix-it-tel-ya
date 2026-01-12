import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Plus, Factory, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Workshop {
  id: string;
  name: string;
  code: string | null;
  address: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  } | null;
  is_active: boolean;
  created_at: string;
}

export default function WorkshopsSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [newWorkshop, setNewWorkshop] = useState({
    name: '',
    code: '',
    street: '',
    zip: '',
    city: '',
    country: 'Deutschland',
  });

  // Fetch workshops
  const { data: workshops, isLoading } = useQuery({
    queryKey: ['workshops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Workshop[];
    },
  });

  // Fetch B2B partners count per workshop
  const { data: partnerCounts } = useQuery({
    queryKey: ['workshop-partner-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_partners')
        .select('workshop_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((p: any) => {
        if (p.workshop_id) {
          counts[p.workshop_id] = (counts[p.workshop_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Generate code from name if not provided
  const generateCode = (name: string): string => {
    if (!name) return '';
    // Take first 3 characters of the first word, uppercase
    return name.trim().substring(0, 3).toUpperCase();
  };

  // Create workshop mutation
  const createMutation = useMutation({
    mutationFn: async (workshop: typeof newWorkshop) => {
      const code = workshop.code?.trim() 
        ? workshop.code.toUpperCase().substring(0, 3) 
        : generateCode(workshop.name);
      
      const { data, error } = await supabase
        .from('workshops')
        .insert({
          name: workshop.name,
          code: code || null,
          address: {
            street: workshop.street || null,
            zip: workshop.zip || null,
            city: workshop.city || null,
            country: workshop.country || 'Deutschland',
          },
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Werkstatt erstellt', description: 'Die Werkstatt wurde erfolgreich angelegt.' });
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      setIsCreateOpen(false);
      setNewWorkshop({ name: '', code: '', street: '', zip: '', city: '', country: 'Deutschland' });
    },
    onError: (error: any) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  // Update workshop mutation
  const updateMutation = useMutation({
    mutationFn: async (workshop: Workshop) => {
      const { error } = await supabase
        .from('workshops')
        .update({
          name: workshop.name,
          code: (workshop as any).code?.toUpperCase().substring(0, 3) || null,
          address: workshop.address,
          is_active: workshop.is_active,
        })
        .eq('id', workshop.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Werkstatt aktualisiert' });
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      setIsEditOpen(false);
      setSelectedWorkshop(null);
    },
    onError: (error: any) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  // Delete workshop mutation
  const deleteMutation = useMutation({
    mutationFn: async (workshopId: string) => {
      // Check if workshop has partners
      const count = partnerCounts?.[workshopId] || 0;
      if (count > 0) {
        throw new Error('Diese Werkstatt hat noch zugeordnete B2B-Partner und kann nicht gelöscht werden.');
      }
      
      const { error } = await supabase
        .from('workshops')
        .delete()
        .eq('id', workshopId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Werkstatt gelöscht' });
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
    },
    onError: (error: any) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Werkstätten
          </CardTitle>
          <CardDescription>
            Zentrale Werkstätten für B2B-Partner verwalten
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Neue Werkstatt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Werkstatt anlegen</DialogTitle>
              <DialogDescription>
                Werkstätten verarbeiten B2B-Aufträge zentral
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="ws-name">Name *</Label>
                  <Input
                    id="ws-name"
                    value={newWorkshop.name}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, name: e.target.value })}
                    placeholder="Zentrale Werkstatt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-code">Kürzel</Label>
                  <Input
                    id="ws-code"
                    value={newWorkshop.code}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, code: e.target.value.toUpperCase().substring(0, 3) })}
                    placeholder={newWorkshop.name ? generateCode(newWorkshop.name) : 'Auto'}
                    maxLength={3}
                    className="uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-street">Straße</Label>
                <Input
                  id="ws-street"
                  value={newWorkshop.street}
                  onChange={(e) => setNewWorkshop({ ...newWorkshop, street: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ws-zip">PLZ</Label>
                  <Input
                    id="ws-zip"
                    value={newWorkshop.zip}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, zip: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="ws-city">Stadt</Label>
                  <Input
                    id="ws-city"
                    value={newWorkshop.city}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, city: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Abbrechen</Button>
              <Button 
                onClick={() => createMutation.mutate(newWorkshop)}
                disabled={!newWorkshop.name.trim() || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : workshops?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Factory className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Keine Werkstätten angelegt</p>
            <p className="text-sm">Erstellen Sie eine Werkstatt, um B2B-Partner zuordnen zu können.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kürzel</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>B2B-Partner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workshops?.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell className="font-medium">{ws.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ws.code || '-'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ws.address ? (
                      <>
                        {ws.address.street && <span>{ws.address.street}, </span>}
                        {ws.address.zip} {ws.address.city}
                      </>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {partnerCounts?.[ws.id] || 0} Partner
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ws.is_active ? 'default' : 'secondary'}>
                      {ws.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedWorkshop(ws);
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Werkstatt wirklich löschen?')) {
                            deleteMutation.mutate(ws.id);
                          }
                        }}
                        disabled={(partnerCounts?.[ws.id] || 0) > 0}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Werkstatt bearbeiten</DialogTitle>
          </DialogHeader>
          {selectedWorkshop && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Name</Label>
                  <Input
                    value={selectedWorkshop.name}
                    onChange={(e) => setSelectedWorkshop({ ...selectedWorkshop, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kürzel</Label>
                  <Input
                    value={(selectedWorkshop as any).code || ''}
                    onChange={(e) => setSelectedWorkshop({ ...selectedWorkshop, code: e.target.value.toUpperCase().substring(0, 3) } as Workshop)}
                    maxLength={3}
                    className="uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Straße</Label>
                <Input
                  value={selectedWorkshop.address?.street || ''}
                  onChange={(e) => setSelectedWorkshop({ 
                    ...selectedWorkshop, 
                    address: { ...selectedWorkshop.address, street: e.target.value }
                  })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>PLZ</Label>
                  <Input
                    value={selectedWorkshop.address?.zip || ''}
                    onChange={(e) => setSelectedWorkshop({ 
                      ...selectedWorkshop, 
                      address: { ...selectedWorkshop.address, zip: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Stadt</Label>
                  <Input
                    value={selectedWorkshop.address?.city || ''}
                    onChange={(e) => setSelectedWorkshop({ 
                      ...selectedWorkshop, 
                      address: { ...selectedWorkshop.address, city: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ws-active">Aktiv</Label>
                <Switch
                  id="ws-active"
                  checked={selectedWorkshop.is_active}
                  onCheckedChange={(checked) => setSelectedWorkshop({ ...selectedWorkshop, is_active: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Abbrechen</Button>
            <Button 
              onClick={() => selectedWorkshop && updateMutation.mutate(selectedWorkshop)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
