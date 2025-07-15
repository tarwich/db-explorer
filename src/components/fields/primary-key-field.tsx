import { Input } from '../ui/input';

interface PrimaryKeyFieldProps {
  column: any;
  register: any;
}

export function PrimaryKeyField({ column, register }: PrimaryKeyFieldProps) {
  return (
    <Input
      {...register(column.name)}
      className="bg-gray-50"
      readOnly
      disabled
    />
  );
}
