import { cn } from '@/lib/utils';
import { getRecordDisplayValue } from '@/utils/column-utils';
import { ChevronDownIcon, LinkIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface ForeignKeyFieldProps {
  column: any;
  connectionId: string;
  isGenerated: boolean;
  value: any;
  setValue: (name: string, value: any) => void;
  fkSearchOpen: boolean;
  setFkSearchOpen: (open: boolean) => void;
  fkSearchValue: string;
  setFkSearchValue: (val: string) => void;
  isDirectInput: boolean;
  setIsDirectInput: (val: boolean) => void;
  onNavigateToRecord?: (targetConnectionId: string, targetTableName: string, targetRecordId: any, displayValue?: string) => void;
  fkRecordsQuery: any;
  fkTableInfoQuery: any;
  fkCurrentRecordQuery: any;
}

export function ForeignKeyField({
  column,
  connectionId,
  isGenerated,
  value,
  setValue,
  fkSearchOpen,
  setFkSearchOpen,
  fkSearchValue,
  setFkSearchValue,
  isDirectInput,
  setIsDirectInput,
  onNavigateToRecord,
  fkRecordsQuery,
  fkTableInfoQuery,
  fkCurrentRecordQuery,
}: ForeignKeyFieldProps) {
  const handleFkSelect = (recordId: string) => {
    setValue(column.name, recordId);
    setFkSearchOpen(false);
    setFkSearchValue('');
  };

  const tableInfo = fkTableInfoQuery.data;
  const currentRecord = fkCurrentRecordQuery.data;

  // Inline getFkDisplayValue logic (could be moved to utils)
  const getFkDisplayValue = (record: any, tableInfo: any) => {
    if (!record || !tableInfo) return null;
    const displayField = tableInfo.details?.displayField;
    if (displayField && record[displayField]) {
      return record[displayField];
    }
    const inlineViewColumns = tableInfo.details?.inlineView?.columns;
    if (inlineViewColumns) {
      const visibleColumns = Object.entries(inlineViewColumns)
        .filter(([_, config]: [string, any]) => !config.hidden)
        .sort(([_, a]: [string, any], [__, b]: [string, any]) => a.order - b.order)
        .map(([columnName]) => columnName);
      if (visibleColumns.length > 0) {
        const nonTimestampColumns = visibleColumns.filter((colName: string) => {
          const value = record[colName];
          if (!value) return false;
          const isTimestampField = colName.toLowerCase().includes('created') ||
                                   colName.toLowerCase().includes('updated') ||
                                   colName.toLowerCase().includes('date') ||
                                   colName.toLowerCase().includes('time');
          const isTimestampValue = typeof value === 'string' &&
                                   (value.includes('GMT') || value.includes('UTC') ||
                                    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value));
          return !isTimestampField && !isTimestampValue;
        });
        const fieldsToUse = nonTimestampColumns.length > 0 ? nonTimestampColumns : visibleColumns;
        const displayValues = fieldsToUse
          .slice(0, 2)
          .map((colName: string) => record[colName])
          .filter(Boolean);
        if (displayValues.length > 0) {
          return displayValues.join(' ');
        }
      }
    }
    // Fallback
    return null;
  };

  const displayValue = getFkDisplayValue(currentRecord, tableInfo);

  if (!isDirectInput) {
    return (
      <div className="flex gap-2 w-full">
        {value && (
          <div className="flex-1 min-w-0 max-w-[200px]">
            {onNavigateToRecord ? (
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 w-full justify-start text-left h-auto min-h-[32px] max-w-full"
                onClick={() => onNavigateToRecord(connectionId, column.foreignKey?.targetTable, value)}
              >
                <LinkIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {displayValue || `ID: ${value}`}
                </span>
              </Button>
            ) : (
              <div className="px-2 py-1 text-sm text-gray-600 bg-gray-50 rounded max-w-full overflow-hidden">
                <span className="truncate block overflow-hidden text-ellipsis whitespace-nowrap">
                  {displayValue || `ID: ${value}`}
                </span>
              </div>
            )}
          </div>
        )}
        <Popover open={fkSearchOpen} onOpenChange={setFkSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={fkSearchOpen}
              className={cn("justify-between", value ? "flex-shrink-0" : "flex-1")}
              disabled={isGenerated}
            >
              {value ? 'Change...' : 'Select record...'}
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
          className="flex-shrink-0"
        >
          ID
        </Button>
      </div>
    );
  }

  // Direct input mode
  return (
    <div className="flex gap-2">
      <Input
        value={value || ''}
        onChange={e => setValue(column.name, e.target.value)}
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
