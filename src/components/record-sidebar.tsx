import { Fragment, useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { TableColumn } from '@/stores/database';
import { getTableData } from '@/app/actions';
import { useDatabaseStore } from '@/stores/database';
import { capitalCase, noCase } from 'change-case';

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
                      {capitalCase(column.column_name).replace(
                        /\bid\b/gi,
                        'ID'
                      )}
                      {column.foreignKey && (
                        <span className="ml-1 text-xs text-gray-600">
                          ({column.foreignKey.targetTable})
                        </span>
                      )}
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
    Array<{
      id: string | number;
      label: string;
    }>
  >([]);
  const { activeConnection } = useDatabaseStore();
  const inputClassName =
    'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6';

  const stringValue = value === null ? '' : String(value);

  // Update the foreign key check
  if (column.foreignKey) {
    useEffect(() => {
      if (!activeConnection) return;

      const loadForeignKeyOptions = async () => {
        const result = await getTableData(
          activeConnection,
          column.foreignKey!.targetSchema,
          column.foreignKey!.targetTable,
          1,
          1000
        );

        if (result.success && result.rows && result.columns) {
          setForeignKeyOptions(
            result.rows.map((row) => ({
              id: String(row[column.foreignKey!.targetColumn]),
              label: formatForeignKeyLabel(row, result.columns),
            }))
          );
        }
      };

      loadForeignKeyOptions();
    }, [
      activeConnection,
      column.foreignKey.targetSchema,
      column.foreignKey.targetTable,
      column.foreignKey.targetColumn,
    ]);

    return (
      <div>
        <select
          value={value === null ? '' : String(value)}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : e.target.value)
          }
          className={`${inputClassName} ${
            column.foreignKey.isGuessed ? 'border-orange-300' : ''
          }`}
        >
          <option value="">Select...</option>
          {foreignKeyOptions.map((option) => (
            <option key={String(option.id)} value={String(option.id)}>
              {option.label}
            </option>
          ))}
        </select>
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

function formatForeignKeyLabel(
  row: Record<string, unknown>,
  columns?: TableColumn[]
): string {
  // Try common meaningful column names first
  const commonColumns = ['name', 'title', 'label', 'description'];

  for (const colName of commonColumns) {
    if (row[colName] != null) return String(row[colName]);
  }

  const firstNameColumn = columns?.find(
    (c) => noCase(c.column_name) === 'first name'
  );
  const lastNameColumn = columns?.find(
    (c) => noCase(c.column_name) === 'last name'
  );
  const emailColumn = columns?.find((c) =>
    noCase(c.column_name).startsWith('email')
  );

  if (firstNameColumn && lastNameColumn) {
    return `${String(row[firstNameColumn.column_name])} ${String(
      row[lastNameColumn.column_name]
    )}`;
  }

  if (emailColumn) {
    return String(row[emailColumn.column_name]);
  }

  // If we have columns info, look for the first text-type column that has a value
  if (columns) {
    const textTypes = [
      'character varying',
      'varchar',
      'text',
      'char',
      'character',
    ];
    const textColumn = columns.find(
      (col) =>
        textTypes.includes(col.data_type.toLowerCase()) &&
        col.column_name !== 'id'
    );

    if (textColumn) {
      return String(row[textColumn.column_name]);
    }
  }

  // Fallback to ID if nothing else works
  return String(row.id);
}
