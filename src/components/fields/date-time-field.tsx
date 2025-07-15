import { formatDateTimeLocal } from '@/utils/column-utils';
import { Input } from '../ui/input';

interface DateTimeFieldProps {
  column: any;
  value: any;
  setValue: (val: any) => void;
  isGenerated: boolean;
}

export function DateTimeField({ column, value, setValue, isGenerated }: DateTimeFieldProps) {
  return (
    <Input
      type="datetime-local"
      value={value ? formatDateTimeLocal(value) : ''}
      onChange={e => setValue(e.target.value)}
      readOnly={isGenerated}
    />
  );
}
