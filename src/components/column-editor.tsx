import { cn } from '@/lib/utils';
import { KeyIcon, LinkIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Fragment, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import ReactJson from 'react-json-view';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from './ui/dialog';
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
  const [isJsonModalOpen, setJsonModalOpen] = useState(false);

  const type =
    TYPE_MAP[column.type] || (column.enumOptions?.length ? 'enum' : 'text');
  const value = getValues(column.name);

  const handleJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const jsonValue = JSON.parse(event.target.value);
      setValue(column.name, jsonValue);
    } catch (error) {
      // Handle JSON parse error
    }
  };

  return (
    <Fragment>
      <label
        htmlFor={column.name}
        className={cn(
          'text-sm text-muted-foreground flex flex-row gap-2 items-center',
          isPrimaryKey && 'text-red-500',
          isForeignKey && 'text-blue-500',
          isNullable && 'text-gray-500'
        )}
      >
        {column.name}
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
                {value}
              </option>
            ))}
          </select>
        )}
        {type === 'json' && (
          <div className="flex flex-col gap-2">
            <textarea
              id={column.name}
              value={JSON.stringify(value, null, 2)}
              onChange={handleJsonChange}
              className="flex-grow"
              rows={5}
            />
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="btn btn-primary">
                  Edit JSON
                </button>
              </DialogTrigger>
              <DialogContent style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <ReactJson
                  src={value || {}}
                  onEdit={(edit: { updated_src: any }) =>
                    setValue(column.name, edit.updated_src)
                  }
                  onAdd={(add: { updated_src: any }) =>
                    setValue(column.name, add.updated_src)
                  }
                  onDelete={(del: { updated_src: any }) =>
                    setValue(column.name, del.updated_src)
                  }
                  theme="monokai"
                  style={{ width: '100%' }}
                />
                <DialogClose asChild>
                  <button className="btn btn-secondary">Close</button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </div>
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
