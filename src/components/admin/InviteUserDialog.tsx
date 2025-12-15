import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';
import { AppRole, ROLE_LABELS } from '@/types/database';
import { z } from 'zod';

const INTERNAL_ROLES = ['ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER'] as const;
type InternalRole = typeof INTERNAL_ROLES[number];

const inviteSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  role: z.enum(INTERNAL_ROLES),
  locationId: z.string().min(1, 'Filiale ist erforderlich'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InviteFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const { data: result, error } = await supabase.functions.invoke('admin-invite-user', {
        body: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          locationId: data.locationId,
        },
      });

      if (error) {
        throw new Error(error.message || 'Fehler beim Einladen des Benutzers');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      toast({
        title: 'Einladung verschickt',
        description: 'Der Benutzer hat eine E-Mail zum Setzen seines Passworts erhalten.',
      });
      setOpen(false);
      setFormData({});
      setErrors({});
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = inviteSchema.parse(formData);
      inviteMutation.mutate(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormData({});
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Benutzer einladen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Benutzer einladen</DialogTitle>
          <DialogDescription>
            Der Benutzer erhält eine E-Mail mit einem Link zum Setzen seines Passworts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname *</Label>
              <Input
                id="firstName"
                value={formData.firstName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Max"
                disabled={inviteMutation.isPending}
              />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname *</Label>
              <Input
                id="lastName"
                value={formData.lastName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Mustermann"
                disabled={inviteMutation.isPending}
              />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="benutzer@example.de"
              disabled={inviteMutation.isPending}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rolle *</Label>
            <Select
              value={formData.role || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as InternalRole }))}
              disabled={inviteMutation.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Rolle auswählen" />
              </SelectTrigger>
              <SelectContent>
                {INTERNAL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Standard-Filiale *</Label>
            <Select
              value={formData.locationId || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, locationId: value }))}
              disabled={inviteMutation.isPending}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder="Filiale auswählen" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.locationId && <p className="text-sm text-destructive">{errors.locationId}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={inviteMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird eingeladen...
                </>
              ) : (
                'Einladung senden'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
