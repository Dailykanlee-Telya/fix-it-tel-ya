import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

export function DataResetDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_all_data');
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-partners'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      setOpen(false);
      setConfirmText('');
      toast({
        title: 'Daten zurückgesetzt',
        description: 'Alle Kunden, B2B-Partner und Aufträge wurden gelöscht.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Daten konnten nicht gelöscht werden.',
      });
    },
  });

  const handleReset = () => {
    if (confirmText !== 'LÖSCHEN') {
      toast({
        variant: 'destructive',
        title: 'Bestätigung erforderlich',
        description: 'Bitte geben Sie "LÖSCHEN" ein, um fortzufahren.',
      });
      return;
    }
    resetMutation.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setConfirmText('');
    }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Daten zurücksetzen (Testdaten löschen)
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Daten zurücksetzen</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p className="font-semibold text-destructive">
              Achtung: Diese Aktion kann nicht rückgängig gemacht werden!
            </p>
            <p>
              Dadurch werden <strong>alle</strong> folgenden Daten unwiderruflich gelöscht:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Alle Kunden</li>
              <li>Alle B2B-Partner</li>
              <li>Alle Reparaturaufträge inkl. Historie</li>
              <li>Alle Geräte</li>
              <li>Alle Fotos und Dokumente</li>
              <li>Alle Nachrichten und Notizen</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Standorte, Benutzer, Gerätekatalog und Systemeinstellungen bleiben erhalten.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-2">
          <Label htmlFor="confirm-text">
            Geben Sie <strong>LÖSCHEN</strong> ein, um zu bestätigen:
          </Label>
          <Input
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="LÖSCHEN"
            className="font-mono"
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={resetMutation.isPending}
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={confirmText !== 'LÖSCHEN' || resetMutation.isPending}
          >
            {resetMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Endgültig löschen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
