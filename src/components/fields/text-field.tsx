import { Input } from '../ui/input';

interface TextFieldProps {
  column: any;
  value: any;
  setValue: (val: any) => void;
  isGenerated: boolean;
}

export function TextField({ column, value, setValue, isGenerated }: TextFieldProps) {
  return (
    <Input
      value={value || ''}
      onChange={e => setValue(e.target.value)}
      placeholder={`Enter ${column.displayName.toLowerCase()}...`}
      readOnly={isGenerated}
    />
  );
}
