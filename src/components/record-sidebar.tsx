import { Fragment, useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { TableColumn } from '@/stores/database';
import { getTableData } from '@/app/actions';
import { useDatabaseStore } from '@/stores/database';

interface RecordSidebarProps {
  isOpen: boolean;
  isPinned: boolean;
  onClose: () => void;
  onPin: () => void;
  record: Record<string, unknown> | null;
  columns: TableColumn[];
  onSave?: (updatedRecord: Record<string, unknown>) => Promise<void>;
}

type FormState = {
  values: Record<string, unknown>;
  isDirty: boolean;
};

export function RecordSidebar({
  isOpen,
  isPinned,
  onClose,
  onPin,
  record,
  columns,
  onSave,
}: RecordSidebarProps) {
  const [formState, setFormState] = useState<FormState>({
    values: {},
    isDirty: false,
  });

  // Reset form when record changes
  useEffect(() => {
    if (record) {
      setFormState({
        values: { ...record },
        isDirty: false,
      });
    }
  }, [record]);

  if (!record) return null;

  const handleInputChange = (columnName: string, value: unknown) => {
    setFormState((prev) => {
      const newValues = { ...prev.values, [columnName]: value };
      // Compare all values with original record to determine if dirty
      const isDirty = Object.entries(newValues).some(
        ([key, val]) => record[key] !== val
      );

      return {
        values: newValues,
        isDirty,
      };
    });
  };

  const handleSetNull = (columnName: string) => {
    handleInputChange(columnName, null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;

    try {
      await onSave(formState.values);
      setFormState((prev) => ({ ...prev, isDirty: false }));
    } catch (error) {
      console.error('Failed to save record:', error);
    }
  };

  const handleClose = () => {
    if (formState.isDirty) {
      if (
        confirm('You have unsaved changes. Are you sure you want to close?')
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Transition
      show={isOpen}
      as={Fragment}
      enter="transform transition ease-in-out duration-300"
      enterFrom="translate-x-full"
      enterTo="translate-x-0"
      leave="transform transition ease-in-out duration-300"
      leaveFrom="translate-x-0"
      leaveTo="translate-x-full"
    >
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Edit Record</h2>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onPin}
              className={`p-2 rounded-md hover:bg-gray-100 ${
                isPinned ? 'text-blue-700' : 'text-gray-500'
              }`}
              title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              <StarIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
              title="Close sidebar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {columns.map((column) => (
                <div key={column.column_name} className="relative">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-900">
                      {column.column_name}
                    </span>
                    <div className="mt-1 flex space-x-2">
                      <RenderInput
                        column={column}
                        value={formState.values[column.column_name]}
                        onChange={(value) =>
                          handleInputChange(column.column_name, value)
                        }
                      />
                      {column.is_nullable === 'YES' && (
                        <button
                          type="button"
                          onClick={() => handleSetNull(column.column_name)}
                          className={`px-2 py-1 text-xs rounded ${
                            formState.values[column.column_name] === null
                              ? 'bg-gray-200 text-gray-900'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          NULL
                        </button>
                      )}
                    </div>
                  </label>
                  <p className="mt-1 text-xs text-gray-600">
                    {column.data_type}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-none border-t border-gray-200 px-4 py-3 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                {formState.isDirty ? 'Unsaved changes' : 'No changes'}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formState.isDirty}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 border border-transparent rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Transition>
  );
}

function RenderInput({
  column,
  value,
  onChange,
}: {
  column: TableColumn;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [foreignKeyOptions, setForeignKeyOptions] = useState<
    Array<{ id: unknown; label: string }>
  >([]);
  const { activeConnection } = useDatabaseStore();
  const inputClassName =
    'block w-full rounded-md border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm';
  const stringValue = value === null ? '' : String(value);

  console.log('Rendering input for column:', column);
  console.log('Column foreign key info:', {
    foreign_table_schema: column.foreign_table_schema,
    foreign_table_name: column.foreign_table_name,
    foreign_column_name: column.foreign_column_name,
    is_guessed_foreign_key: column.is_guessed_foreign_key,
    foreign_key_confidence: column.foreign_key_confidence,
  });

  useEffect(() => {
    async function loadForeignKeyOptions() {
      if (
        !column.foreign_table_schema ||
        !column.foreign_table_name ||
        !activeConnection
      )
        return;

      console.log('Loading foreign key options for:', {
        schema: column.foreign_table_schema,
        table: column.foreign_table_name,
        column: column.foreign_column_name,
      });

      try {
        const result = await getTableData(
          activeConnection,
          column.foreign_table_schema,
          column.foreign_table_name,
          1,
          1000 // Limit to 1000 options
        );

        if (result.success && result.rows) {
          const options = result.rows.map((row) => ({
            id: row[column.foreign_column_name || 'id'],
            // Try to find a suitable display column (name, title, etc.) or fall back to the ID
            label:
              row.name ||
              row.title ||
              row.label ||
              row.description ||
              String(row[column.foreign_column_name || 'id']),
          }));
          console.log('Loaded foreign key options:', options);
          setForeignKeyOptions(options);
        }
      } catch (error) {
        console.error('Error loading foreign key options:', error);
      }
    }

    loadForeignKeyOptions();
  }, [
    column.foreign_table_schema,
    column.foreign_table_name,
    column.foreign_column_name,
    activeConnection,
  ]);

  // If this is a foreign key column, render a dropdown
  if (column.foreign_table_name) {
    console.log(
      'Rendering foreign key dropdown with options:',
      foreignKeyOptions
    );
    return (
      <div className="relative">
        <select
          value={stringValue}
          onChange={(e) => {
            const val = e.target.value;
            // Convert to number if the foreign key is numeric
            const numericTypes = [
              'integer',
              'bigint',
              'smallint',
              'numeric',
              'decimal',
            ];
            const isNumeric = numericTypes.includes(
              column.data_type.toLowerCase()
            );
            onChange(val === '' ? null : isNumeric ? Number(val) : val);
          }}
          className={`${inputClassName} ${
            column.is_guessed_foreign_key ? 'border-orange-300' : ''
          }`}
        >
          <option value="">Select...</option>
          {foreignKeyOptions.map((option) => (
            <option key={String(option.id)} value={String(option.id)}>
              {option.label}
            </option>
          ))}
        </select>
        {column.is_guessed_foreign_key && (
          <div className="absolute right-0 top-0 -mt-4 text-xs text-orange-600">
            Guessed relation ({Math.round(column.foreign_key_confidence! * 100)}
            % confidence)
          </div>
        )}
      </div>
    );
  }

  switch (column.data_type.toLowerCase()) {
    case 'integer':
    case 'bigint':
    case 'smallint':
      return (
        <input
          type="number"
          value={stringValue}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Number(e.target.value))
          }
          className={inputClassName}
        />
      );

    case 'numeric':
    case 'decimal':
    case 'real':
    case 'double precision':
      return (
        <input
          type="number"
          step="any"
          value={stringValue}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Number(e.target.value))
          }
          className={inputClassName}
        />
      );

    case 'boolean':
      return (
        <select
          value={stringValue}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? null : val === 'true');
          }}
          className={inputClassName}
        >
          <option value="">Select...</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );

    case 'timestamp':
    case 'timestamp without time zone':
    case 'timestamp with time zone':
    case 'date':
      return (
        <input
          type="datetime-local"
          value={value === null ? '' : formatDateForInput(String(value))}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : e.target.value)
          }
          className={inputClassName}
        />
      );

    case 'time':
    case 'time without time zone':
    case 'time with time zone':
      return (
        <input
          type="time"
          value={stringValue}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : e.target.value)
          }
          className={inputClassName}
        />
      );

    case 'json':
    case 'jsonb':
      return (
        <textarea
          value={value === null ? '' : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed =
                e.target.value === '' ? null : JSON.parse(e.target.value);
              onChange(parsed);
            } catch {
              // Leave the current value unchanged if JSON is invalid
            }
          }}
          rows={4}
          className={inputClassName}
        />
      );

    default:
      return (
        <input
          type="text"
          value={stringValue}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : e.target.value)
          }
          className={inputClassName}
        />
      );
  }
}

function formatDateForInput(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm
  } catch {
    return '';
  }
}
