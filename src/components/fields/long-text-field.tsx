import { Textarea } from '../ui/textarea';

interface LongTextFieldProps {
  column: any;
  value: any;
  setValue: (val: any) => void;
  isGenerated: boolean;
}

export function LongTextField({ column, value, setValue, isGenerated }: LongTextFieldProps) {
  return (
    <Textarea
      value={value || ''}
      onChange={e => setValue(e.target.value)}
      className="min-h-[100px]"
      placeholder={`Enter ${column.displayName.toLowerCase()}...`}
      readOnly={isGenerated}
    />
  );
}
