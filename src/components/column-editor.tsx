import { cn } from '@/lib/utils';
import { KeyIcon, LinkIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { title } from 'radash';
import { Fragment, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from './ui/input';

interface ColumnEditorProps {
  column: any; // Define a proper type for your column
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
}

export function ColumnEditor({
  column,
  isPrimaryKey,
  isForeignKey,
  isNullable,
}: ColumnEditorProps) {
  const { register, setValue, getValues } = useFormContext();

  const type =
    TYPE_MAP[column.type] || (column.enumOptions?.length ? 'enum' : 'text');
  const value = getValues(column.name);
  const [jsonValue, setJsonValue] = useState<string | null>(null);

  useEffect(() => {
    if (jsonValue === null) {
      setJsonValue(JSON.stringify(value, null, 2));
    }
  }, [value]);

  useEffect(() => {
    try {
      if (jsonValue) {
        setValue(column.name, JSON.parse(jsonValue));
      }
    } catch {}
  }, [jsonValue]);

  return (
    <Fragment>
      <label
        htmlFor={column.name}
        className={cn(
          'text-sm text-muted-foreground flex flex-row gap-2 items-center capitalize',
          isPrimaryKey && 'text-red-500',
          isForeignKey && 'text-blue-500',
          isNullable && 'text-gray-500'
        )}
      >
        {column.normalizedName}
        {isPrimaryKey && <KeyIcon className="w-4 h-4" />}
        {isForeignKey && <LinkIcon className="w-4 h-4" />}
      </label>
      <div className="flex flex-row gap-2 items-center h-auto max-h-full">
        {type === 'text' && (
          <Input
            id={column.name}
            {...register(column.name)}
            className="flex-grow"
          />
        )}
        {type === 'number' && (
          <Input
            id={column.name}
            {...register(column.name)}
            className="flex-grow"
            type="number"
          />
        )}
        {type === 'datetime' && (
          <Input
            id={column.name}
            {...register(column.name)}
            className="flex-grow"
            type="datetime-local"
            value={
              value instanceof Date ? value.toISOString().slice(0, 16) : value
            }
          />
        )}
        {type === 'boolean' && (
          <div className="flex flex-row gap-2 items-center">
            <input
              type="checkbox"
              id={column.name}
              {...register(column.name)}
              className="flex-grow"
            />
          </div>
        )}
        {type === 'enum' && (
          <select
            id={column.name}
            {...register(column.name)}
            className="flex-grow"
          >
            {column.enumOptions.map((value: string) => (
              <option key={value} value={value}>
                {title(value)}
              </option>
            ))}
          </select>
        )}
        {type === 'json' && (
          <textarea
            id={column.name}
            value={jsonValue ?? ''}
            onChange={(e) => setJsonValue(e.target.value)}
            className="text-xs font-mono w-full"
            rows={5}
          />
        )}
        {isNullable && (
          <XCircleIcon
            className="w-4 h-4"
            onClick={() => {
              setValue(column.name, null);
            }}
          />
        )}
      </div>
    </Fragment>
  );
}

const TYPE_MAP: Record<
  string,
  'datetime' | 'number' | 'boolean' | 'text' | 'enum' | 'json'
> = {
  timestamptz: 'datetime',
  timestamp: 'datetime',
  bool: 'boolean',
  integer: 'number',
  text: 'text',
  json: 'json',
  jsonb: 'json',
};
