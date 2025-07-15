'use client';

import { useForeignKeyCurrentRecord } from '@/hooks/use-foreign-key-current-record';
import { useForeignKeyRecords } from '@/hooks/use-foreign-key-records';
import { useForeignKeyTableInfo } from '@/hooks/use-foreign-key-table-info';
import { cn } from '@/lib/utils';
import { KeyIcon, LinkIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { BooleanField } from './fields/boolean-field';
import { DateField } from './fields/date-field';
import { DateTimeField } from './fields/date-time-field';
import { EnumField } from './fields/enum-field';
import { ForeignKeyField } from './fields/foreign-key-field';
import { JsonField } from './fields/json-field';
import { LongTextField } from './fields/long-text-field';
import { NumberField } from './fields/number-field';
import { PrimaryKeyField } from './fields/primary-key-field';
import { TextField } from './fields/text-field';
import { Button } from './ui/button';
import { Label } from './ui/label';

interface EnhancedColumnEditorProps {
  column: any;
  connectionId: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isGenerated?: boolean;
  onNavigateToRecord?: (
    targetConnectionId: string,
    targetTableName: string,
    targetRecordId: any,
    displayValue?: string
  ) => void;
}

export function EnhancedColumnEditor({
  column,
  connectionId,
  isPrimaryKey,
  isForeignKey,
  isNullable,
  isGenerated = false,
  onNavigateToRecord,
}: EnhancedColumnEditorProps) {
  const { register, setValue, watch } = useFormContext();
  const [fkSearchOpen, setFkSearchOpen] = useState(false);
  const [fkSearchValue, setFkSearchValue] = useState('');
  const [isDirectInput, setIsDirectInput] = useState(false);

  const fieldType = getFieldType(column);
  const value = watch(column.name);

  // For foreign keys, fetch related records
  const fkRecordsQuery = useForeignKeyRecords({
    connectionId,
    targetTable: column.foreignKey?.targetTable,
    fkSearchValue,
    isForeignKey,
    foreignKey: column.foreignKey,
    fkSearchOpen,
  });

  // For foreign keys, fetch the target table info for inline view configuration
  const fkTableInfoQuery = useForeignKeyTableInfo({
    connectionId,
    targetTable: column.foreignKey?.targetTable,
    isForeignKey,
    foreignKey: column.foreignKey,
    value,
  });

  // For foreign keys, fetch the current FK record to display its inline view
  const fkCurrentRecordQuery = useForeignKeyCurrentRecord({
    connectionId,
    targetTable: column.foreignKey?.targetTable,
    isForeignKey,
    foreignKey: column.foreignKey,
    value,
  });

  const handleClearValue = () => {
    setValue(column.name, null);
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor={column.name}
        className={cn(
          'flex items-center gap-2 text-sm font-medium',
          isPrimaryKey && 'text-red-600',
          isForeignKey && 'text-blue-600',
          isGenerated && 'text-amber-600'
        )}
      >
        {column.displayName}
        {isPrimaryKey && <KeyIcon className="w-4 h-4" title="Primary Key" />}
        {isForeignKey && <LinkIcon className="w-4 h-4" title="Foreign Key" />}
        {isGenerated && (
          <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">
            GENERATED
          </span>
        )}
        {isNullable && (
          <span className="text-xs text-muted-foreground">(optional)</span>
        )}
      </Label>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {isPrimaryKey ? (
            <PrimaryKeyField column={column} register={register} />
          ) : isForeignKey ? (
            <ForeignKeyField
              column={column}
              connectionId={connectionId}
              isGenerated={isGenerated}
              value={value}
              setValue={setValue}
              fkSearchOpen={fkSearchOpen}
              setFkSearchOpen={setFkSearchOpen}
              fkSearchValue={fkSearchValue}
              setFkSearchValue={setFkSearchValue}
              isDirectInput={isDirectInput}
              setIsDirectInput={setIsDirectInput}
              onNavigateToRecord={onNavigateToRecord}
              fkRecordsQuery={fkRecordsQuery}
              fkTableInfoQuery={fkTableInfoQuery}
              fkCurrentRecordQuery={fkCurrentRecordQuery}
            />
          ) : fieldType === 'longtext' ? (
            <LongTextField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          ) : fieldType === 'text' ? (
            <TextField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          ) : fieldType === 'number' ? (
            <NumberField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          ) : fieldType === 'datetime' ? (
            <DateTimeField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          ) : fieldType === 'date' ? (
            <DateField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          ) : fieldType === 'boolean' ? (
            <BooleanField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          ) : fieldType === 'enum' ? (
            <EnumField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          ) : fieldType === 'json' ? (
            <JsonField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          ) : (
            <TextField
              column={column}
              value={value}
              setValue={(val) => setValue(column.name, val)}
              isGenerated={isGenerated}
            />
          )}
        </div>
        {isNullable &&
          value !== null &&
          value !== undefined &&
          value !== '' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearValue}
              className="h-8 w-8 p-0"
              title="Clear value"
            >
              <XCircleIcon className="w-4 h-4" />
            </Button>
          )}
      </div>

      {column.type && (
        <div className="text-xs text-muted-foreground">
          Type: {column.type}
          {isForeignKey && column.foreignKey && (
            <span>
              {' '}
              → {column.foreignKey.targetTable}.{column.foreignKey.targetColumn}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function getFieldType(column: any): string {
  if (column.enumOptions?.length) return 'enum';

  const type = column.type?.toLowerCase();

  if (type?.includes('timestamp') || type?.includes('datetime'))
    return 'datetime';
  if (type?.includes('date')) return 'date';
  if (type?.includes('bool')) return 'boolean';
  if (
    type?.includes('int') ||
    type?.includes('numeric') ||
    type?.includes('decimal') ||
    type?.includes('float')
  )
    return 'number';
  if (type?.includes('json')) return 'json';
  if (type?.includes('text') && type !== 'text') return 'longtext'; // varchar, etc. stay as text

  return 'text';
}
