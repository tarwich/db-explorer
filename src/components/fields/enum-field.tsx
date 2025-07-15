import { title } from 'radash';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EnumFieldProps {
  column: any;
  value: any;
  setValue: (val: any) => void;
  isGenerated: boolean;
}

export function EnumField({ column, value, setValue, isGenerated }: EnumFieldProps) {
  return (
    <Select
      value={value || ''}
      onValueChange={val => setValue(val)}
      disabled={isGenerated}
    >
      <SelectTrigger>
        <SelectValue placeholder={`Select ${column.displayName.toLowerCase()}...`} />
      </SelectTrigger>
      <SelectContent>
        {column.enumOptions?.map((option: string) => (
          <SelectItem key={option} value={option}>
            {title(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
