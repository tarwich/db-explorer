import { formatDate } from '@/utils/column-utils';
import { Input } from '../ui/input';

interface DateFieldProps {
  column: any;
  value: any;
  setValue: (val: any) => void;
  isGenerated: boolean;
}

export function DateField({
  column,
  value,
  setValue,
  isGenerated,
}: DateFieldProps) {
  return (
    <Input
      type="date"
      value={value ? formatDate(value) : ''}
      onChange={(e) => setValue(e.target.value)}
      readOnly={isGenerated}
    />
  );
}
