import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasscodeInputProps {
  passcodeType: 'pin' | 'pattern' | 'none' | 'unknown' | '';
  passcodePin: string;
  passcodePattern: number[];
  onChange: (type: 'pin' | 'pattern' | 'none' | 'unknown' | '', pin: string, pattern: number[]) => void;
  disabled?: boolean;
}

export default function PasscodeInput({
  passcodeType,
  passcodePin,
  passcodePattern,
  onChange,
  disabled = false,
}: PasscodeInputProps) {
  const [drawingPattern, setDrawingPattern] = useState(false);

  const handleTypeChange = (type: 'pin' | 'pattern' | 'none' | 'unknown') => {
    onChange(type, type === 'pin' ? passcodePin : '', type === 'pattern' ? passcodePattern : []);
  };

  const handlePinChange = (pin: string) => {
    // Only allow digits
    const cleanPin = pin.replace(/\D/g, '');
    onChange('pin', cleanPin, []);
  };

  const handlePatternDotClick = (index: number) => {
    if (disabled) return;
    
    if (passcodePattern.includes(index)) {
      // Remove this dot and all after it
      const idx = passcodePattern.indexOf(index);
      onChange('pattern', '', passcodePattern.slice(0, idx));
    } else {
      // Add this dot
      onChange('pattern', '', [...passcodePattern, index]);
    }
  };

  const clearPattern = () => {
    onChange('pattern', '', []);
  };

  return (
    <div className="space-y-4">
      <RadioGroup
        value={passcodeType || ''}
        onValueChange={(val) => handleTypeChange(val as any)}
        disabled={disabled}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="pin" id="passcode-pin" />
          <Label htmlFor="passcode-pin" className="cursor-pointer">PIN</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="pattern" id="passcode-pattern" />
          <Label htmlFor="passcode-pattern" className="cursor-pointer">Muster</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="none" id="passcode-none" />
          <Label htmlFor="passcode-none" className="cursor-pointer">Kein Sperrcode</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="unknown" id="passcode-unknown" />
          <Label htmlFor="passcode-unknown" className="cursor-pointer">Unbekannt</Label>
        </div>
      </RadioGroup>

      {/* PIN Input */}
      {passcodeType === 'pin' && (
        <div className="space-y-2">
          <Label htmlFor="pin-input">PIN eingeben</Label>
          <Input
            id="pin-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="PIN eingeben..."
            value={passcodePin}
            onChange={(e) => handlePinChange(e.target.value)}
            maxLength={10}
            disabled={disabled}
            className="max-w-[200px] font-mono text-lg tracking-widest"
          />
          <p className="text-xs text-muted-foreground">
            Nur Ziffern, max. 10 Stellen
          </p>
        </div>
      )}

      {/* Pattern Grid */}
      {passcodeType === 'pattern' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Muster zeichnen</Label>
            {passcodePattern.length > 0 && (
              <button
                type="button"
                onClick={clearPattern}
                className="text-xs text-primary hover:underline"
                disabled={disabled}
              >
                Zurücksetzen
              </button>
            )}
          </div>
          
          <div className="inline-block p-4 bg-muted/30 rounded-xl">
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                const isActive = passcodePattern.includes(index);
                const order = passcodePattern.indexOf(index);
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePatternDotClick(index)}
                    disabled={disabled}
                    className={cn(
                      'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all',
                      isActive
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-background border-border hover:border-primary/50',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isActive && (
                      <span className="text-sm font-bold">{order + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Tippen Sie die Punkte in der richtigen Reihenfolge an. 
            {passcodePattern.length > 0 && ` (${passcodePattern.length} Punkte ausgewählt)`}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper to display pattern as text
export const patternToString = (pattern: number[]): string => {
  if (!pattern || pattern.length === 0) return '-';
  return pattern.map(p => p + 1).join(' → ');
};
