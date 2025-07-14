'use client';

import { cn } from '@/lib/utils';
import { getTableRecords } from '@/app/api/tables';
import { useQuery } from '@tanstack/react-query';
import { KeyIcon, LinkIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { title } from 'radash';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface EnhancedColumnEditorProps {
  column: any;
  connectionId: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isGenerated?: boolean;
}

export function EnhancedColumnEditor({
  column,
  connectionId,
  isPrimaryKey,
  isForeignKey,
  isNullable,
  isGenerated = false,
}: EnhancedColumnEditorProps) {
  const { register, setValue, watch } = useFormContext();
  const [fkSearchOpen, setFkSearchOpen] = useState(false);
  const [fkSearchValue, setFkSearchValue] = useState('');
  const [isDirectInput, setIsDirectInput] = useState(false);

  const fieldType = getFieldType(column);
  const value = watch(column.name);

  // For foreign keys, fetch related records
  const fkRecordsQuery = useQuery({
    queryKey: ['fk-records', connectionId, column.foreignKey?.targetTable, fkSearchValue],
    queryFn: () =>
      column.foreignKey
        ? getTableRecords(connectionId, column.foreignKey.targetTable, {
            page: 1,
            pageSize: 50,
          })
        : null,
    enabled: isForeignKey && !!column.foreignKey && fkSearchOpen,
  });

  const handleFkSelect = (recordId: string) => {
    setValue(column.name, recordId);
    setFkSearchOpen(false);
    setFkSearchValue('');
  };

  const handleClearValue = () => {
    setValue(column.name, null);
  };

  const renderField = () => {
    if (isPrimaryKey) {
      return (
        <Input
          {...register(column.name)}
          className="bg-gray-50"
          readOnly
          disabled
        />
      );
    }

    if (isForeignKey && !isDirectInput) {
      return (
        <div className="flex gap-2">
          <Popover open={fkSearchOpen} onOpenChange={setFkSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={fkSearchOpen}
                className="flex-1 justify-between"
                disabled={isGenerated}
              >
                {value ? `ID: ${value}` : 'Select record...'}
                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput
                  placeholder={`Search ${column.foreignKey?.targetTable}...`}
                  value={fkSearchValue}
                  onValueChange={setFkSearchValue}
                />
                <CommandEmpty>No records found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {fkRecordsQuery.data?.records?.map((record: any) => (
                    <CommandItem
                      key={record.id}
                      onSelect={() => handleFkSelect(record.id)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {getRecordDisplayValue(record)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ID: {record.id}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDirectInput(!isDirectInput)}
            title="Enter ID directly"
            disabled={isGenerated}
          >
            ID
          </Button>
        </div>
      );
    }

    if (isForeignKey && isDirectInput) {
      return (
        <div className="flex gap-2">
          <Input
            {...register(column.name)}
            placeholder="Enter ID directly..."
            className="flex-1"
            readOnly={isGenerated}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDirectInput(!isDirectInput)}
            title="Use dropdown search"
            disabled={isGenerated}
          >
            Search
          </Button>
        </div>
      );
    }

    switch (fieldType) {
      case 'longtext':
        return (
          <Textarea
            {...register(column.name)}
            className="min-h-[100px]"
            placeholder={`Enter ${column.displayName.toLowerCase()}...`}
            readOnly={isGenerated}
          />
        );

      case 'text':
        return (
          <Input
            {...register(column.name)}
            placeholder={`Enter ${column.displayName.toLowerCase()}...`}
            readOnly={isGenerated}
          />
        );

      case 'number':
        return (
          <Input
            {...register(column.name, { valueAsNumber: true })}
            type="number"
            placeholder={`Enter ${column.displayName.toLowerCase()}...`}
            readOnly={isGenerated}
          />
        );

      case 'datetime':
        return (
          <Input
            {...register(column.name)}
            type="datetime-local"
            value={value ? formatDateTimeLocal(value) : ''}
            onChange={(e) => setValue(column.name, e.target.value)}
            readOnly={isGenerated}
          />
        );

      case 'date':
        return (
          <Input
            {...register(column.name)}
            type="date"
            value={value ? formatDate(value) : ''}
            onChange={(e) => setValue(column.name, e.target.value)}
            readOnly={isGenerated}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={column.name}
              checked={value || false}
              onCheckedChange={(checked: boolean) => setValue(column.name, checked)}
              disabled={isGenerated}
            />
            <Label htmlFor={column.name}>Yes</Label>
          </div>
        );

      case 'enum':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => setValue(column.name, val)}
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

      case 'json':
        return (
          <Textarea
            value={value ? JSON.stringify(value, null, 2) : ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setValue(column.name, parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
            className="font-mono text-sm min-h-[120px]"
            placeholder="Enter valid JSON..."
            readOnly={isGenerated}
          />
        );

      default:
        return (
          <Input
            {...register(column.name)}
            placeholder={`Enter ${column.displayName.toLowerCase()}...`}
            readOnly={isGenerated}
          />
        );
    }
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
        {isGenerated && <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">GENERATED</span>}
        {isNullable && (
          <span className="text-xs text-muted-foreground">(optional)</span>
        )}
      </Label>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          {renderField()}
        </div>
        {isNullable && value !== null && value !== undefined && value !== '' && (
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
            <span> → {column.foreignKey.targetTable}.{column.foreignKey.targetColumn}</span>
          )}
        </div>
      )}
    </div>
  );
}

function getFieldType(column: any): string {
  if (column.enumOptions?.length) return 'enum';
  
  const type = column.type?.toLowerCase();
  
  if (type?.includes('timestamp') || type?.includes('datetime')) return 'datetime';
  if (type?.includes('date')) return 'date';
  if (type?.includes('bool')) return 'boolean';
  if (type?.includes('int') || type?.includes('numeric') || type?.includes('decimal') || type?.includes('float')) return 'number';
  if (type?.includes('json')) return 'json';
  if (type?.includes('text') && type !== 'text') return 'longtext'; // varchar, etc. stay as text
  
  return 'text';
}

function getRecordDisplayValue(record: any): string {
  // Try to find a meaningful display value
  const displayFields = ['name', 'title', 'email', 'firstName', 'first_name'];
  
  for (const field of displayFields) {
    if (record[field]) {
      return String(record[field]);
    }
  }
  
  // Fallback to first non-id, non-timestamp field
  const keys = Object.keys(record).filter(key => 
    !key.toLowerCase().includes('id') && 
    !key.toLowerCase().includes('created') && 
    !key.toLowerCase().includes('updated')
  );
  
  if (keys.length > 0 && record[keys[0]]) {
    return String(record[keys[0]]);
  }
  
  return `Record ${record.id}`;
}

function formatDateTimeLocal(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function formatDate(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}