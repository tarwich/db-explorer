import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface BooleanFieldProps {
  column: any;
  value: boolean;
  setValue: (val: boolean) => void;
  isGenerated: boolean;
}

export function BooleanField({ column, value, setValue, isGenerated }: BooleanFieldProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={column.name}
        checked={value || false}
        onCheckedChange={setValue}
        disabled={isGenerated}
      />
      <Label htmlFor={column.name}>Yes</Label>
    </div>
  );
}
