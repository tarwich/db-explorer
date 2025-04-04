import { Fragment, useEffect, useState, useRef } from 'react';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  Transition,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableColumn, ForeignKeyInfo } from '@/stores/database';
import { getTableData } from '@/app/actions';
import { useDatabaseStore } from '@/stores/database';

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
        const result = await getTableData(
          activeConnection,
          column.foreignKey!.targetSchema,
          column.foreignKey!.targetTable,
          1,
          PAGE_SIZE
        );

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
      const result = await getTableData(
        activeConnection!,
        column.foreignKey!.targetSchema,
        column.foreignKey!.targetTable,
        nextPage,
        PAGE_SIZE
      );

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

  // Handle direct input value changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setQuery(newValue);

    if (newValue === '') {
      onChange(null);
      return;
    }

    const matchingOption = options.find((opt) => String(opt.id) === newValue);
    if (matchingOption) {
      onChange(matchingOption.id);
    } else {
      onChange(newValue);
    }
  };

  return (
    <Combobox
      value={value === null ? '' : String(value)}
      onChange={(newValue) => {
        onChange(newValue === '' ? null : newValue);
        setInputValue(String(newValue || ''));
      }}
    >
      <div className="relative">
        <div className={`relative w-full ${className}`}>
          <ComboboxInput
            className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            onChange={handleInputChange}
            value={inputValue}
            placeholder="Search or enter value..."
            displayValue={(val: string) => {
              const option = options.find((opt) => String(opt.id) === val);
              return option ? option.label : val;
            }}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </ComboboxButton>
        </div>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <ComboboxOptions
            ref={parentRef}
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            {filteredOptions.length === 0 ? (
              <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                {query === '' ? 'No options available.' : 'No matches found.'}
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const option = filteredOptions[virtualRow.index];

                  // Show loading placeholder for items not yet loaded
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
                        className="flex items-center py-2 pl-3 pr-9 text-gray-400"
                      >
                        Loading...
                      </div>
                    );
                  }

                  if (!option) return null;

                  return (
                    <ComboboxOption
                      key={virtualRow.key}
                      value={String(option.id)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {({ selected, active }) => (
                        <div
                          className={`h-full flex items-center py-2 pl-3 pr-9 cursor-default select-none ${
                            active ? 'bg-blue-600 text-white' : 'text-gray-900'
                          }`}
                        >
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {option.label}
                          </span>
                          {selected && (
                            <span
                              className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                                active ? 'text-white' : 'text-blue-600'
                              }`}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      )}
                    </ComboboxOption>
                  );
                })}
              </div>
            )}
          </ComboboxOptions>
        </Transition>
      </div>
    </Combobox>
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
