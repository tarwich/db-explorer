import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { DatabaseTable, TableColumn, ForeignKeyInfo } from '@/stores/database';
import { capitalCase } from 'change-case';

interface TablePropertiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    primaryKey?: string[];
    foreignKeys?: ForeignKeyInfo[];
    displayColumns?: string[];
  }) => void;
  table: DatabaseTable;
}

export function TablePropertiesDialog({
  isOpen,
  onClose,
  onSave,
  table,
}: TablePropertiesDialogProps) {
  const [primaryKey, setPrimaryKey] = useState<string[]>(
    table.primaryKey || []
  );
  const [foreignKeys, setForeignKeys] = useState<ForeignKeyInfo[]>(
    table.foreignKeys || []
  );
  const [displayColumns, setDisplayColumns] = useState<string[]>(
    table.displayColumns || []
  );

  // Reset state when table or its properties change
  useEffect(() => {
    setPrimaryKey(table.primaryKey || []);
    setForeignKeys(table.foreignKeys || []);
    setDisplayColumns(table.displayColumns || []);
  }, [table, table.primaryKey, table.foreignKeys, table.displayColumns]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      primaryKey,
      foreignKeys,
      displayColumns,
    });
    onClose();
  };

  const handlePrimaryKeyChange = (columnName: string) => {
    setPrimaryKey((prev) =>
      prev.includes(columnName)
        ? prev.filter((col) => col !== columnName)
        : [...prev, columnName]
    );
  };

  const handleForeignKeyConfirm = (columnName: string) => {
    setForeignKeys((prev) =>
      prev.map((fk) =>
        fk.columnName === columnName
          ? { ...fk, isGuessed: false, confidence: 1 }
          : fk
      )
    );
  };

  const handleForeignKeyRemove = (columnName: string) => {
    setForeignKeys((prev) => prev.filter((fk) => fk.columnName !== columnName));
  };

  const handleDisplayColumnChange = (columnName: string) => {
    setDisplayColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((col) => col !== columnName)
        : [...prev, columnName]
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Edit Table Properties
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4">
                  {/* Primary Key Section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Primary Key
                    </h4>
                    <div className="space-y-2">
                      {table.columns?.map((column) => (
                        <label
                          key={column.column_name}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={primaryKey.includes(column.column_name)}
                            onChange={() =>
                              handlePrimaryKeyChange(column.column_name)
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {capitalCase(column.column_name)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Foreign Keys Section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Foreign Keys
                    </h4>
                    <div className="space-y-3">
                      {foreignKeys.map((fk) => (
                        <div
                          key={fk.columnName}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {capitalCase(fk.columnName)}
                            </div>
                            <div className="text-sm text-gray-500">
                              → {fk.targetSchema}.{fk.targetTable}.
                              {fk.targetColumn}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {fk.isGuessed ? (
                              <>
                                <span className="text-xs text-orange-600">
                                  {Math.round(fk.confidence! * 100)}% confidence
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleForeignKeyConfirm(fk.columnName)
                                  }
                                  className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                                >
                                  Confirm
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                handleForeignKeyRemove(fk.columnName)
                              }
                              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {foreignKeys.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No foreign keys defined
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Display Columns Section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Display Columns
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Select columns that best represent this table's records in
                      foreign key references.
                      {displayColumns.length === 0 && (
                        <span className="block mt-1 text-orange-600">
                          No display columns selected. The primary key will be
                          used as fallback.
                        </span>
                      )}
                    </p>
                    <div className="space-y-2">
                      {table.columns?.map((column) => (
                        <label
                          key={column.column_name}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={displayColumns.includes(
                              column.column_name
                            )}
                            onChange={() =>
                              handleDisplayColumnChange(column.column_name)
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {capitalCase(column.column_name)}
                            <span className="ml-2 text-xs text-gray-500">
                              ({column.data_type})
                              {column.foreignKey && (
                                <span className="text-blue-500 ml-1">
                                  • Foreign Key
                                </span>
                              )}
                              {table.primaryKey?.includes(
                                column.column_name
                              ) && (
                                <span className="text-yellow-500 ml-1">
                                  • Primary Key
                                </span>
                              )}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
