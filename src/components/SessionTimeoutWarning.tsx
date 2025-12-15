import React from 'react';
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
import { Clock, LogOut } from 'lucide-react';

interface SessionTimeoutWarningProps {
  open: boolean;
  secondsRemaining: number;
  onExtendSession: () => void;
  onLogout: () => void;
}

export function SessionTimeoutWarning({
  open,
  secondsRemaining,
  onExtendSession,
  onLogout,
}: SessionTimeoutWarningProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            <AlertDialogTitle>Sitzung läuft ab</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Sie waren längere Zeit inaktiv. Aus Sicherheitsgründen werden Sie in{' '}
              <strong className="text-foreground">{secondsRemaining} Sekunden</strong>{' '}
              automatisch abgemeldet.
            </p>
            <p>
              Klicken Sie auf "Angemeldet bleiben", um Ihre Sitzung fortzusetzen.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Jetzt abmelden
          </AlertDialogCancel>
          <AlertDialogAction onClick={onExtendSession}>
            Angemeldet bleiben
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
