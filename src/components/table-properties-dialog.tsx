import { Fragment, useState, useEffect } from 'react';
import { DatabaseTable, TableColumn, ForeignKeyInfo } from '@/stores/database';
import { capitalCase } from 'change-case';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/solid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Table Properties</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4">
          {/* Primary Key Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Primary Key
            </h4>
            <Command className="rounded-lg border shadow-md">
              <CommandInput placeholder="Search columns..." />
              <CommandEmpty>No columns found.</CommandEmpty>
              <CommandGroup>
                {table.columns?.map((column) => (
                  <CommandItem
                    key={column.column_name}
                    value={column.column_name}
                    onSelect={() => handlePrimaryKeyChange(column.column_name)}
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 h-4 w-4',
                        primaryKey.includes(column.column_name)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span>{capitalCase(column.column_name)}</span>
                    <span className="ml-2 text-xs text-gray-700">
                      ({column.data_type})
                      {column.foreignKey && (
                        <span className="text-blue-600 ml-1 font-medium">
                          • Foreign Key
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
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
                      → {fk.targetSchema}.{fk.targetTable}.{fk.targetColumn}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {fk.isGuessed ? (
                      <>
                        <span className="text-xs text-orange-600">
                          {Math.round(fk.confidence! * 100)}% confidence
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleForeignKeyConfirm(fk.columnName)}
                          className="text-green-700 bg-green-100 hover:bg-green-200"
                        >
                          Confirm
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleForeignKeyRemove(fk.columnName)}
                      className="text-red-700 bg-red-100 hover:bg-red-200"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {foreignKeys.length === 0 && (
                <p className="text-sm text-gray-500">No foreign keys defined</p>
              )}
            </div>
          </div>

          {/* Display Columns Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Display Columns
            </h4>
            <Command className="rounded-lg border shadow-md">
              <CommandInput placeholder="Search columns..." />
              <CommandEmpty>No columns found.</CommandEmpty>
              <CommandGroup>
                {table.columns?.map((column) => (
                  <CommandItem
                    key={column.column_name}
                    value={column.column_name}
                    onSelect={() =>
                      handleDisplayColumnChange(column.column_name)
                    }
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 h-4 w-4',
                        displayColumns.includes(column.column_name)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span>{capitalCase(column.column_name)}</span>
                    <span className="ml-2 text-xs text-gray-700">
                      ({column.data_type})
                      {column.foreignKey && (
                        <span className="text-blue-600 ml-1 font-medium">
                          • Foreign Key
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
