import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface B2BCustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  house_number: string;
  zip: string;
  city: string;
  country: string;
  notes: string;
}

interface B2BCustomerFormProps {
  data: B2BCustomerData;
  onChange: (data: B2BCustomerData) => void;
  disabled?: boolean;
}

export const emptyB2BCustomer: B2BCustomerData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  street: '',
  house_number: '',
  zip: '',
  city: '',
  country: 'Deutschland',
  notes: '',
};

export default function B2BCustomerForm({ data, onChange, disabled = false }: B2BCustomerFormProps) {
  const update = (field: keyof B2BCustomerData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Vorname</Label>
          <Input
            id="first_name"
            value={data.first_name}
            onChange={(e) => update('first_name', e.target.value)}
            placeholder="Vorname"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nachname</Label>
          <Input
            id="last_name"
            value={data.last_name}
            onChange={(e) => update('last_name', e.target.value)}
            placeholder="Nachname"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="email@beispiel.de"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+49 123 456789"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Street Address */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 space-y-2">
          <Label htmlFor="street">Straße</Label>
          <Input
            id="street"
            value={data.street}
            onChange={(e) => update('street', e.target.value)}
            placeholder="Musterstraße"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="house_number">Nr.</Label>
          <Input
            id="house_number"
            value={data.house_number}
            onChange={(e) => update('house_number', e.target.value)}
            placeholder="42a"
            disabled={disabled}
          />
        </div>
      </div>

      {/* City */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zip">PLZ</Label>
          <Input
            id="zip"
            value={data.zip}
            onChange={(e) => update('zip', e.target.value)}
            placeholder="12345"
            disabled={disabled}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="city">Stadt</Label>
          <Input
            id="city"
            value={data.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="Musterstadt"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Country */}
      <div className="space-y-2">
        <Label htmlFor="country">Land</Label>
        <Input
          id="country"
          value={data.country}
          onChange={(e) => update('country', e.target.value)}
          placeholder="Deutschland"
          disabled={disabled}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea
          id="notes"
          value={data.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Zusätzliche Hinweise..."
          rows={2}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
