import { Fragment, useEffect, useState, useRef } from 'react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableColumn, ForeignKeyInfo } from '@/stores/database';
import { getTableData } from '@/app/actions';
import { useDatabaseStore } from '@/stores/database';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Option {
  id: string | number;
  label: string;
}

interface ForeignKeyComboboxProps {
  column: TableColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  className?: string;
}

export function ForeignKeyCombobox({
  column,
  value,
  onChange,
  className = '',
}: ForeignKeyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState(
    value === null ? '' : String(value)
  );
  const { activeConnection } = useDatabaseStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 100;

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value === null ? '' : String(value));
  }, [value]);

  // Load initial page and get total count
  useEffect(() => {
    if (!activeConnection || !column.foreignKey) return;
    setIsLoading(true);

    const loadInitialPage = async () => {
      try {
        const result = await getTableData({
          connection: activeConnection,
          schema: column.foreignKey!.targetSchema,
          table: column.foreignKey!.targetTable,
          page: 1,
          pageSize: PAGE_SIZE,
        });

        if (result.success && result.rows && result.columns) {
          const initialOptions = result.rows.map((row) => ({
            id: String(row[column.foreignKey!.targetColumn]),
            label: formatForeignKeyLabel(
              row,
              result.columns,
              column.foreignKey
            ),
          }));

          // If we have a value but no matching option, add it as a custom option
          if (
            value !== null &&
            !initialOptions.find((opt) => String(opt.id) === String(value))
          ) {
            initialOptions.push({
              id: String(value),
              label: `Custom: ${value}`,
            });
          }

          setOptions(initialOptions);
          setTotalRows(result.totalRows);
        }
      } catch (error) {
        console.error('Error loading initial options:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialPage();
  }, [activeConnection, column.foreignKey, value]);

  // Load more items when scrolling
  const loadMoreItems = async () => {
    if (isLoading || options.length >= totalRows) return;

    const nextPage = Math.floor(options.length / PAGE_SIZE) + 1;
    if (nextPage === currentPage) return;

    setIsLoading(true);
    setCurrentPage(nextPage);

    try {
      const result = await getTableData({
        connection: activeConnection!,
        schema: column.foreignKey!.targetSchema,
        table: column.foreignKey!.targetTable,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      if (result.success && result.rows && result.columns) {
        const newOptions = result.rows.map((row) => ({
          id: String(row[column.foreignKey!.targetColumn]),
          label: formatForeignKeyLabel(row, result.columns, column.foreignKey),
        }));

        setOptions((prev) => [...prev, ...newOptions]);
      }
    } catch (error) {
      console.error('Error loading more options:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter options based on search query
  const filteredOptions =
    query === ''
      ? options
      : options.filter(
          (option) =>
            option.label.toLowerCase().includes(query.toLowerCase()) ||
            String(option.id).toLowerCase().includes(query.toLowerCase())
        );

  // Virtual list configuration with infinite loading
  const rowVirtualizer = useVirtualizer({
    count: query === '' ? totalRows : filteredOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 5,
    onChange: (instance) => {
      const lastItem = instance.getVirtualItems().at(-1);
      if (!lastItem) return;

      // If we're close to the end and not filtering, load more
      if (
        !query &&
        lastItem.index >= options.length - 20 && // Start loading when 20 items from the end
        options.length < totalRows &&
        !isLoading
      ) {
        loadMoreItems();
      }
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value
            ? options.find((option) => String(option.id) === String(value))
                ?.label || String(value)
            : 'Select value...'}
          <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <div ref={parentRef} className="max-h-[200px] overflow-y-auto">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or enter value..."
              value={query}
              onValueChange={(search) => {
                setQuery(search);
                if (search === '') {
                  onChange(null);
                }
              }}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const option = filteredOptions[virtualRow.index];

                    if (!option && !query) {
                      return (
                        <div
                          key={virtualRow.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className="px-2 py-1.5 text-sm text-gray-500"
                        >
                          Loading...
                        </div>
                      );
                    }

                    if (!option) return null;

                    return (
                      <CommandItem
                        key={virtualRow.key}
                        value={String(option.id)}
                        onSelect={(currentValue) => {
                          onChange(
                            currentValue === value ? null : currentValue
                          );
                          setOpen(false);
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {option.label}
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatForeignKeyLabel(
  row: Record<string, unknown>,
  columns?: TableColumn[],
  foreignKey?: ForeignKeyInfo
): string {
  if (foreignKey?.displayColumns?.length) {
    // If we have display columns, use them
    const displayValues = foreignKey.displayColumns
      .map((col) => {
        const value = row[col];
        // If the value is null, show "NULL" instead of empty string
        return value === null ? 'NULL' : String(value);
      })
      .filter(Boolean); // Remove any empty strings

    if (displayValues.length > 0) {
      // Always include the ID if it's not already in display columns
      const idCol = foreignKey.targetColumn;
      const idValue = row[idCol];
      if (!foreignKey.displayColumns.includes(idCol)) {
        return `${displayValues.join(' ')} (${idValue})`;
      }
      return displayValues.join(' ');
    }
  }

  // Fallback: Show ID with table name for context
  const idValue = row[foreignKey?.targetColumn || 'id'];
  return `${foreignKey?.targetTable || 'Unknown'} #${idValue}`;
}
