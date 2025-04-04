import { Dialog, Transition, Listbox } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { DatabaseTable, TableColumn, ForeignKeyInfo } from '@/stores/database';
import { capitalCase } from 'change-case';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/solid';

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
                    <Listbox
                      value={primaryKey}
                      onChange={setPrimaryKey}
                      multiple
                    >
                      <div className="relative mt-1">
                        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 text-gray-900 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-300">
                          <span className="block truncate">
                            {primaryKey.length === 0
                              ? 'Select primary key columns...'
                              : primaryKey
                                  .map((col) => capitalCase(col))
                                  .join(', ')}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon
                              className="h-5 w-5 text-gray-600"
                              aria-hidden="true"
                            />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                            {table.columns?.map((column) => (
                              <Listbox.Option
                                key={column.column_name}
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                    active
                                      ? 'bg-blue-100 text-blue-900'
                                      : 'text-gray-900'
                                  }`
                                }
                                value={column.column_name}
                              >
                                {({ selected }) => (
                                  <>
                                    <span
                                      className={`block truncate ${
                                        selected ? 'font-medium' : 'font-normal'
                                      }`}
                                    >
                                      {capitalCase(column.column_name)}
                                      <span className="ml-2 text-xs text-gray-700">
                                        ({column.data_type})
                                        {column.foreignKey && (
                                          <span className="text-blue-600 ml-1 font-medium">
                                            • Foreign Key
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                    {selected ? (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-700">
                                        <CheckIcon
                                          className="h-5 w-5"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
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
                    <Listbox
                      value={displayColumns}
                      onChange={setDisplayColumns}
                      multiple
                    >
                      <div className="relative mt-1">
                        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 text-gray-900 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-300">
                          <span className="block truncate">
                            {displayColumns.length === 0
                              ? 'Select columns...'
                              : displayColumns
                                  .map((col) => capitalCase(col))
                                  .join(', ')}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon
                              className="h-5 w-5 text-gray-600"
                              aria-hidden="true"
                            />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                            {table.columns?.map((column) => (
                              <Listbox.Option
                                key={column.column_name}
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                    active
                                      ? 'bg-blue-100 text-blue-900'
                                      : 'text-gray-900'
                                  }`
                                }
                                value={column.column_name}
                              >
                                {({ selected }) => (
                                  <>
                                    <span
                                      className={`block truncate ${
                                        selected ? 'font-medium' : 'font-normal'
                                      }`}
                                    >
                                      {capitalCase(column.column_name)}
                                      <span className="ml-2 text-xs text-gray-700">
                                        ({column.data_type})
                                        {column.foreignKey && (
                                          <span className="text-blue-600 ml-1 font-medium">
                                            • Foreign Key
                                          </span>
                                        )}
                                        {table.primaryKey?.includes(
                                          column.column_name
                                        ) && (
                                          <span className="text-yellow-600 ml-1 font-medium">
                                            • Primary Key
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                    {selected ? (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-700">
                                        <CheckIcon
                                          className="h-5 w-5"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
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
