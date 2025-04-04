import { Fragment, useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { TableColumn } from '@/stores/database';

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
  errors: Record<string, string>;
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
    errors: {},
  });

  // Reset form when record changes
  useEffect(() => {
    if (record) {
      setFormState({
        values: { ...record },
        isDirty: false,
        errors: {},
      });
    }
  }, [record]);

  if (!record) return null;

  const handleInputChange = (columnName: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      values: { ...prev.values, [columnName]: value },
      isDirty: true,
      errors: {
        ...prev.errors,
        [columnName]: validateField(columnName, value, columns),
      },
    }));
  };

  const handleSetNull = (columnName: string) => {
    handleInputChange(columnName, null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;

    // Validate all fields
    const errors = columns.reduce((acc, column) => {
      const error = validateField(
        column.column_name,
        formState.values[column.column_name],
        columns
      );
      if (error) acc[column.column_name] = error;
      return acc;
    }, {} as Record<string, string>);

    if (Object.keys(errors).length > 0) {
      setFormState((prev) => ({ ...prev, errors }));
      return;
    }

    try {
      await onSave(formState.values);
      setFormState((prev) => ({ ...prev, isDirty: false }));
    } catch (error) {
      // Handle save error
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
      <div className="fixed overflow-hidden inset-y-0 right-0 w-96 bg-white shadow-xl grid grid-rows-[auto_1fr_auto]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Edit Record</h2>
          <div className="flex h-full items-center space-x-2">
            <button
              onClick={onPin}
              className={`p-2 rounded-md hover:bg-gray-100 ${
                isPinned ? 'text-blue-700' : 'text-gray-500'
              }`}
              title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              <StarIcon className="h-5 w-5" />
            </button>
            <button
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
          className="grid grid-rows-[1fr_auto] overflow-hidden"
        >
          <div className="p-4 space-y-4 overflow-y-auto">
            {columns.map((column) => (
              <div key={column.column_name}>
                <label className="block">
                  <span className="text-sm font-medium text-gray-900">
                    {column.column_name}
                    {column.is_nullable === 'NO' && (
                      <span className="text-red-600 ml-1">*</span>
                    )}
                  </span>
                  <div className="mt-1 flex space-x-2">
                    <RenderInput
                      column={column}
                      value={formState.values[column.column_name]}
                      onChange={(value) =>
                        handleInputChange(column.column_name, value)
                      }
                      error={formState.errors[column.column_name]}
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
                {formState.errors[column.column_name] && (
                  <p className="mt-1 text-xs text-red-600">
                    {formState.errors[column.column_name]}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-600">{column.data_type}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex-initial h-auto border-t border-gray-200 px-4 py-3 bg-gray-50">
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
                  disabled={
                    !formState.isDirty ||
                    Object.keys(formState.errors).length > 0
                  }
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
  error,
}: {
  column: TableColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const inputClassName = `block w-full rounded-md sm:text-sm ${
    error
      ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500'
  }`;

  const stringValue = value === null ? '' : String(value);

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

function validateField(
  columnName: string,
  value: unknown,
  columns: TableColumn[]
): string {
  const column = columns.find((c) => c.column_name === columnName);
  if (!column) return '';

  if (column.is_nullable === 'NO' && value === null) {
    return 'This field is required';
  }

  if (value === null) return '';

  switch (column.data_type.toLowerCase()) {
    case 'integer':
    case 'bigint':
    case 'smallint':
      if (!Number.isInteger(Number(value))) {
        return 'Must be a whole number';
      }
      break;

    case 'numeric':
    case 'decimal':
    case 'real':
    case 'double precision':
      if (isNaN(Number(value))) {
        return 'Must be a number';
      }
      break;

    case 'json':
    case 'jsonb':
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        }
      } catch {
        return 'Must be valid JSON';
      }
      break;
  }

  return '';
}

function formatDateForInput(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm
  } catch {
    return '';
  }
}
