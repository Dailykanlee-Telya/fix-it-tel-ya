import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorCode, ERROR_CODE_LABELS } from '@/types/database';

interface B2BErrorCodeSelectProps {
  value: ErrorCode | '';
  onChange: (value: ErrorCode | '') => void;
  deviceType?: string;
}

/**
 * B2B-specific error code select using the central Telya error catalog
 */
export default function B2BErrorCodeSelect({ value, onChange, deviceType }: B2BErrorCodeSelectProps) {
  // Define available error codes per device type
  const getAvailableErrorCodes = (): ErrorCode[] => {
    const baseErrors: ErrorCode[] = ['DISPLAYBRUCH', 'WASSERSCHADEN', 'AKKU_SCHWACH', 'SONSTIGES'];
    
    if (deviceType === 'HANDY' || deviceType === 'TABLET') {
      return [...baseErrors, 'LADEBUCHSE', 'KAMERA', 'MIKROFON', 'LAUTSPRECHER'];
    }
    
    if (deviceType === 'LAPTOP') {
      return [...baseErrors, 'TASTATUR', 'LADEBUCHSE'];
    }
    
    if (deviceType === 'SMARTWATCH') {
      return [...baseErrors, 'LADEBUCHSE'];
    }
    
    return baseErrors;
  };

  const availableCodes = getAvailableErrorCodes();

  return (
    <div className="space-y-2">
      <Label>Fehlerart</Label>
      <Select
        value={value || ''}
        onValueChange={(v) => onChange(v as ErrorCode | '')}
      >
        <SelectTrigger>
          <SelectValue placeholder="Fehlerart auswählen..." />
        </SelectTrigger>
        <SelectContent>
          {availableCodes.map((code) => (
            <SelectItem key={code} value={code}>
              {ERROR_CODE_LABELS[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Wählen Sie die passende Fehlerkategorie für eine schnellere Diagnose.
      </p>
    </div>
  );
}
