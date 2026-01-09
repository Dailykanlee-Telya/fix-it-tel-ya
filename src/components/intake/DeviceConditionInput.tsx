import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const CONDITION_OPTIONS = [
  { id: 'usage_light', label: 'Gebrauchsspuren (leicht)' },
  { id: 'usage_heavy', label: 'Stark gebraucht' },
  { id: 'scratches', label: 'Kratzer sichtbar' },
  { id: 'dents', label: 'Macken/Dellen sichtbar' },
  { id: 'display_cracks', label: 'Display: Risse/Bruch sichtbar' },
  { id: 'back_cracks', label: 'Rückseite: Risse sichtbar' },
  { id: 'frame_damage', label: 'Rahmen/Gehäuse: beschädigt' },
  { id: 'liquid_suspected', label: 'Verdacht auf Flüssigkeit / Indikator ausgelöst' },
];

interface DeviceConditionInputProps {
  value: string[];
  remarks: string;
  onChange: (conditions: string[], remarks: string) => void;
  disabled?: boolean;
}

export default function DeviceConditionInput({ 
  value, 
  remarks, 
  onChange, 
  disabled = false 
}: DeviceConditionInputProps) {
  const handleConditionChange = (conditionId: string, checked: boolean) => {
    const newConditions = checked
      ? [...value, conditionId]
      : value.filter(c => c !== conditionId);
    onChange(newConditions, remarks);
  };

  const handleRemarksChange = (newRemarks: string) => {
    onChange(value, newRemarks);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CONDITION_OPTIONS.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <Checkbox
              id={`condition-${option.id}`}
              checked={value.includes(option.id)}
              onCheckedChange={(checked) => handleConditionChange(option.id, !!checked)}
              disabled={disabled}
            />
            <Label 
              htmlFor={`condition-${option.id}`} 
              className={`text-sm cursor-pointer ${disabled ? 'text-muted-foreground' : ''}`}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="condition-remarks">Bemerkungen zum Zustand</Label>
        <Textarea
          id="condition-remarks"
          placeholder="Weitere Auffälligkeiten oder Details zum Zustand..."
          value={remarks}
          onChange={(e) => handleRemarksChange(e.target.value)}
          disabled={disabled}
          rows={2}
        />
      </div>
    </div>
  );
}

// Export labels for use in documents
export const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITION_OPTIONS.map(o => [o.id, o.label])
);
