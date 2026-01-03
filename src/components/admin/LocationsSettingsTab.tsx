import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MapPin, Plus, Edit, Loader2, Save } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  code: string | null;
}

export default function LocationsSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    code: '',
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Location[];
    },
  });

  const resetForm = () => {
    setEditingLocation(null);
    setFormData({ name: '', address: '', phone: '', code: '' });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) throw new Error('Name ist erforderlich');

      const locationData = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        code: formData.code.trim().toUpperCase() || null,
      };

      if (editingLocation) {
        const { error } = await supabase
          .from('locations')
          .update(locationData)
          .eq('id', editingLocation.id);
        if (error) throw error;

        // Audit log
        await supabase.from('audit_logs').insert([{
          user_id: user?.id,
          action: 'UPDATE',
          entity_type: 'location',
          entity_id: editingLocation.id,
          meta: { changes: locationData } as any,
        }]);
      } else {
        const { error } = await supabase
          .from('locations')
          .insert(locationData);
        if (error) throw error;

        // Audit log
        await supabase.from('audit_logs').insert([{
          user_id: user?.id,
          action: 'CREATE',
          entity_type: 'location',
          meta: { data: locationData } as any,
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations-settings'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: editingLocation ? 'Standort aktualisiert' : 'Standort erstellt',
        description: 'Die Änderungen wurden gespeichert.',
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

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
      phone: location.phone || '',
      code: location.code || '',
    });
    setDialogOpen(true);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Standorte / Filialen
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihre Standorte und Filialen
          </CardDescription>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Standort
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kürzel</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Keine Standorte vorhanden
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-mono font-medium">
                      {location.code || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.address || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Standort bearbeiten' : 'Neuer Standort'}
            </DialogTitle>
            <DialogDescription>
              Geben Sie die Standortdaten ein.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="z.B. Filiale Bochum"
                />
              </div>
              <div className="space-y-2">
                <Label>Kürzel (2-3 Zeichen)</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.slice(0, 3) }))}
                  placeholder="z.B. BO"
                  className="uppercase"
                  maxLength={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                placeholder="Straße, PLZ Ort"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="0209 12345678"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
