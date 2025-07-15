import { Input } from '../ui/input';

interface NumberFieldProps {
  column: any;
  value: any;
  setValue: (val: any) => void;
  isGenerated: boolean;
}

export function NumberField({ column, value, setValue, isGenerated }: NumberFieldProps) {
  return (
    <Input
      type="number"
      value={value ?? ''}
      onChange={e => setValue(e.target.value === '' ? undefined : Number(e.target.value))}
      placeholder={`Enter ${column.displayName.toLowerCase()}...`}
      readOnly={isGenerated}
    />
  );
}
