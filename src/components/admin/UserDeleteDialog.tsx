import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface UserDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userEmail: string;
  onConfirm: () => Promise<void>;
  isPending: boolean;
}

export function UserDeleteDialog({
  open,
  onOpenChange,
  userName,
  userEmail,
  onConfirm,
  isPending,
}: UserDeleteDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState('');
  
  const isConfirmValid = confirmEmail.toLowerCase().trim() === userEmail.toLowerCase().trim();

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    await onConfirm();
    setConfirmEmail('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmEmail('');
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Benutzer endgültig löschen
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Sie sind dabei, den Benutzer <strong>{userName}</strong> ({userEmail}) 
                <span className="text-destructive font-semibold"> vollständig und unwiderruflich</span> zu löschen.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
                <p className="font-medium text-destructive mb-1">Achtung:</p>
                <ul className="list-disc list-inside space-y-1 text-foreground">
                  <li>Der Benutzer kann sich nicht mehr anmelden</li>
                  <li>Alle Benutzer-Daten werden gelöscht</li>
                  <li>Verknüpfte Daten (Benachrichtigungen, Standort-Zuweisungen) werden entfernt</li>
                  <li>Diese Aktion kann nicht rückgängig gemacht werden</li>
                </ul>
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-email" className="text-foreground">
                  Zum Bestätigen bitte die E-Mail-Adresse des Benutzers eingeben:
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={userEmail}
                  className={confirmEmail && !isConfirmValid ? 'border-destructive' : ''}
                  disabled={isPending}
                />
                {confirmEmail && !isConfirmValid && (
                  <p className="text-xs text-destructive">
                    Die E-Mail-Adresse stimmt nicht überein.
                  </p>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmValid || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Benutzer endgültig löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
