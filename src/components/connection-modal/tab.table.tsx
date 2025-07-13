'use client';

import { getConnection } from '@/app/api/connections';
import { getTable, getTables, saveTable } from '@/app/api/tables';
import { useToast } from '@/hooks/use-toast';
import browserLogger from '@/lib/browser-logger';
import { CalculatedColumn } from '@/types/connections';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EyeIcon,
  EyeOffIcon,
  Filter,
  icons,
  PencilIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import { sort } from 'radash';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';
import { ItemBadgeView } from '../explorer/item-views/item-badge-view';
import { ItemCardView } from '../explorer/item-views/item-card-view';
import { TColorName } from '../explorer/item-views/item-colors';
import { ItemIcon } from '../explorer/item-views/item-icon';
import { ItemInlineView } from '../explorer/item-views/item-inline-view';
import { ItemListView } from '../explorer/item-views/item-list-view';
import { Button } from '../ui/button';
import { ColorPicker } from '../ui/color-picker';
import { IconPicker } from '../ui/icon-picker';
import { Input } from '../ui/input';
import { autoAssignTableSettingsOptimized } from './auto-assign-optimized.actions';
import { Breadcrumbs } from './breadcrumbs';
import { ViewEditor } from './view-editor';

interface TableFormValues {
  icon: keyof typeof icons;
  color: TColorName;
  singularName: string;
  pluralName: string;
}

const createTableTabContext = () => {
  const [page, setPage] = useState<
    'general' | 'inline-view' | 'card-view' | 'list-view' | 'column-edit'
  >('general');

  return { page, setPage };
};

type TableTabContextType = ReturnType<typeof createTableTabContext>;

const TableTabContext = createContext<TableTabContextType | null>(null);

const useTableTabContext = () => {
  const context = useContext(TableTabContext);
  if (!context) {
    throw new Error('useTableTabContext must be used within a TableTabContext');
  }
  return context;
};

export interface TableTabProps {
  connectionId: string;
  tableName: string;
  setTab: (tab: 'connection') => void;
  initialPage?:
    | 'general'
    | 'inline-view'
    | 'card-view'
    | 'list-view'
    | 'column-edit';
}

export const TableTab = forwardRef<HTMLDivElement, TableTabProps>(
  ({ connectionId, tableName, setTab, initialPage = 'general' }, ref) => {
    const [page, setPage] = useState<
      'general' | 'inline-view' | 'card-view' | 'list-view' | 'column-edit'
    >(initialPage);
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const form = useForm<TableFormValues>({
      defaultValues: {
        icon: 'Table',
        color: 'green',
        singularName: '',
        pluralName: '',
      },
    });

    const connectionQuery = useQuery({
      queryKey: ['connections', connectionId],
      queryFn: () => getConnection(connectionId),
    });

    const tableQuery = useQuery({
      queryKey: ['connections', connectionId, 'tables', tableName],
      queryFn: () => getTable(connectionId, tableName),
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const saveTableMutation = useMutation({
      mutationFn: async (updatedValues: Partial<TableFormValues>) => {
        if (!tableQuery.data) return;
        const updatedTable = { ...tableQuery.data };
        updatedTable.details = {
          ...updatedTable.details,
          ...updatedValues,
        };
        await saveTable(updatedTable);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['connections', connectionId, 'tables'],
        });
        // Also invalidate the sidebar's tables query
        queryClient.invalidateQueries({
          queryKey: ['tables', connectionId],
        });
      },
      onError: (error) => {
        browserLogger.error('Failed to save table', {
          connectionId,
          tableName,
          error: error.message || error,
        });
        toast({
          title: 'Failed to save table',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      },
    });

    useEffect(() => {
      if (tableQuery.data) {
        form.reset({
          icon: tableQuery.data.details.icon,
          color: tableQuery.data.details.color,
          singularName: tableQuery.data.details.singularName,
          pluralName: tableQuery.data.details.pluralName,
        });
      }
    }, [tableQuery.data, form]);

    return (
      <TableTabContext.Provider value={{ page, setPage }}>
        <div ref={ref} className="flex flex-col gap-3 h-full overflow-hidden">
          <Breadcrumbs>
            <Button
              variant="link"
              size="sm"
              onClick={() => setTab('connection')}
            >
              {connectionQuery.data?.name}
            </Button>
            <ItemBadgeView
              item={{
                name: form.watch('pluralName') || tableName,
                icon: form.watch('icon'),
                color: form.watch('color'),
                type: 'collection',
              }}
              className="cursor-pointer"
              onClick={() => setPage('general')}
            />
            {page === 'inline-view' && <span>Inline View</span>}
            {page === 'card-view' && <span>Card View</span>}
            {page === 'list-view' && <span>List View</span>}
            {page === 'column-edit' && <span>Edit Column</span>}
          </Breadcrumbs>

          {page === 'general' && (
            <TableTabGeneralPage
              connectionId={connectionId}
              tableName={tableName}
              form={form}
              saveTableMutation={saveTableMutation}
              onEditColumn={(colName) => {
                setEditingColumn(colName);
                setPage('column-edit');
              }}
            />
          )}
          {page === 'inline-view' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <ViewEditor
                type="inline"
                connectionId={connectionId}
                tableName={tableName}
              />
            </div>
          )}
          {page === 'card-view' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <ViewEditor
                type="card"
                connectionId={connectionId}
                tableName={tableName}
              />
            </div>
          )}
          {page === 'list-view' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <ViewEditor
                type="list"
                connectionId={connectionId}
                tableName={tableName}
              />
            </div>
          )}
          {page === 'column-edit' && editingColumn && (
            <TableTabColumnEditPage
              connectionId={connectionId}
              tableName={tableName}
              columnName={editingColumn}
              onBack={() => setPage('general')}
            />
          )}
        </div>
      </TableTabContext.Provider>
    );
  }
);

export function TableTabGeneralPage({
  connectionId,
  tableName,
  form,
  saveTableMutation,
  onEditColumn,
}: {
  connectionId: string;
  tableName: string;
  form: any;
  saveTableMutation: any;
  onEditColumn?: (colName: string) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setPage } = useTableTabContext();
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

  const tableQuery = useQuery({
    queryKey: ['connections', connectionId, 'tables', tableName],
    queryFn: () => getTable(connectionId, tableName),
  });

  const autoAssignMutation = useMutation({
    mutationFn: () =>
      autoAssignTableSettingsOptimized({ connectionId, tableName }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'tables'],
      });
      toast({
        title: 'Table settings auto-assigned',
        description:
          'Icons and display names have been automatically assigned.',
      });
    },
    onError: (error) => {
      browserLogger.error('Failed to auto-assign table settings', {
        connectionId,
        tableName,
        error: error.message || error,
      });
      toast({
        title: 'Error auto-assigning table settings',
        variant: 'destructive',
        description: error.message,
      });
    },
  });

  const allColumns = Object.values(tableQuery.data?.details.columns || {});
  const displayedColumns = showOnlyEnabled
    ? allColumns.filter((c) => !c.hidden)
    : allColumns;
  const visibleColumns = allColumns.filter((c) => !c.hidden);

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-row items-center gap-4">
        <ItemIcon item={{ icon: form.watch('icon') }} />
        <div className="flex flex-col">
          <div className="text-lg font-semibold">
            {form.watch('pluralName')}
          </div>
          <div className="text-sm text-neutral-500">
            {form.watch('singularName')}
          </div>
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => autoAssignMutation.mutate()}
          disabled={autoAssignMutation.isPending}
        >
          {autoAssignMutation.isPending ? 'Auto-assigning...' : 'Auto-assign'}
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {/* Icon and color */}
          <div className="flex flex-row gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">Icon</div>
              <IconPicker
                value={form.watch('icon')}
                onChange={(value) => {
                  form.setValue('icon', value);
                  saveTableMutation.mutate({ icon: value });
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">Color</div>
              <ColorPicker
                value={form.watch('color')}
                onChange={(value) => {
                  form.setValue('color', value);
                  saveTableMutation.mutate({ color: value });
                }}
              />
            </div>
          </div>

          {/* Singular and plural names */}
          <div className="flex flex-row gap-4">
            {/* Singular name */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-sm font-medium">Singular Name</div>
              <Input
                value={form.watch('singularName')}
                onChange={(e) => form.setValue('singularName', e.target.value)}
                onBlur={(e) =>
                  saveTableMutation.mutate({ singularName: e.target.value })
                }
                className="w-full"
                placeholder="Table"
              />
            </div>

            {/* Plural name */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-sm font-medium">Plural Name</div>
              <Input
                value={form.watch('pluralName')}
                onChange={(e) => form.setValue('pluralName', e.target.value)}
                onBlur={(e) =>
                  saveTableMutation.mutate({ pluralName: e.target.value })
                }
                className="w-full"
                placeholder="Tables"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Columns</div>
            <div className="flex items-center gap-2">
              <Button
                variant={showOnlyEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowOnlyEnabled(!showOnlyEnabled)}
                className="text-xs"
              >
                <Filter className="size-3 mr-1" />
                {showOnlyEnabled ? 'Show All' : 'Show Only Enabled'}
              </Button>
              <span className="text-xs text-neutral-500">
                {showOnlyEnabled
                  ? `${displayedColumns.length} enabled`
                  : `${displayedColumns.length} total (${visibleColumns.length} enabled)`}
              </span>
            </div>
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {displayedColumns.map((column) => (
              <div
                key={column.name}
                className="flex flex-row gap-2 items-center"
              >
                <Button variant="ghost" size="icon">
                  {column.hidden ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </Button>
                <ItemIcon item={{ icon: column.icon }} />
                <span>{column.displayName}</span>
                <span className="font-mono text-xs text-neutral-700">
                  {column.type}
                </span>
                {onEditColumn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditColumn(column.name)}
                    type="button"
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Calculated Columns */}
          <CalculatedColumnsSection
            connectionId={connectionId}
            tableName={tableName}
            table={tableQuery.data}
          />

          {/* Inline View */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between">
              <div className="text-sm font-medium">Inline View</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage('inline-view')}
              >
                <PencilIcon className="size-4" />
              </Button>
            </div>

            <div className="flex flex-row gap-2">
              <ItemInlineView
                item={{
                  icon: form.watch('icon'),
                  columns: sort(
                    Object.entries(
                      tableQuery.data?.details.inlineView.columns || {}
                    ),
                    (c) => c[1].order
                  )
                    .filter((c) => !c[1].hidden)
                    .map(([name]) => ({
                      name: name,
                      value:
                        tableQuery.data?.details.columns?.[name]?.displayName ||
                        name,
                    })),
                }}
              />
            </div>
          </div>

          {/* Card View */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between">
              <div className="text-sm font-medium">Card View</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage('card-view')}
              >
                <PencilIcon className="size-4" />
              </Button>
            </div>

            <div className="flex flex-row gap-2">
              <ItemCardView
                item={{
                  id: '1',
                  icon: form.watch('icon'),
                  columns: sort(
                    Object.entries(
                      tableQuery.data?.details.cardView.columns || {}
                    ),
                    (c) => c[1].order
                  )
                    .filter((c) => !c[1].hidden)
                    .map(([name]) => ({
                      name: name,
                      value:
                        tableQuery.data?.details.columns?.[name]?.displayName ||
                        name,
                    })),
                }}
              />
            </div>
          </div>

          {/* List View */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between">
              <div className="text-sm font-medium">List View</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage('list-view')}
              >
                <PencilIcon className="size-4" />
              </Button>
            </div>

            <div className="flex flex-row gap-2">
              <ItemListView
                item={{
                  id: '1',
                  icon: form.watch('icon'),
                  columns: sort(
                    Object.entries(
                      tableQuery.data?.details.listView.columns || {}
                    ),
                    (c) => c[1].order
                  )
                    .filter((c) => !c[1].hidden)
                    .map(([name]) => ({
                      name: name,
                      value:
                        tableQuery.data?.details.columns?.[name]?.displayName ||
                        name,
                    })),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Scaffold TableTabColumnEditPage ---

function TableTabColumnEditPage({
  connectionId,
  tableName,
  columnName,
  onBack,
}: {
  connectionId: string;
  tableName: string;
  columnName: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: tableData } = useQuery({
    queryKey: ['connections', connectionId, 'tables', tableName],
    queryFn: () => getTable(connectionId, tableName),
  });
  const { data: allTables } = useQuery({
    queryKey: ['connections', connectionId, 'tables'],
    queryFn: () => getTables(connectionId),
  });

  const column = tableData?.details.columns[columnName];
  const [displayName, setDisplayName] = useState(column?.displayName || '');
  const [icon, setIcon] = useState(column?.icon || 'Table');
  const [isFK, setIsFK] = useState(!!column?.foreignKey);
  const [fkTable, setFkTable] = useState(column?.foreignKey?.targetTable || '');
  const [fkColumn, setFkColumn] = useState(
    column?.foreignKey?.targetColumn || ''
  );
  const [saving, setSaving] = useState(false);

  // Get columns for selected FK table
  const fkTableColumns =
    allTables?.find((t) => t.name === fkTable)?.details.columns || {};

  const mutation = useMutation({
    mutationFn: async () => {
      if (!tableData) return;
      const updatedTable = { ...tableData };
      updatedTable.details.columns = { ...updatedTable.details.columns };
      updatedTable.details.columns[columnName] = {
        ...updatedTable.details.columns[columnName],
        displayName,
        icon,
        foreignKey:
          isFK && fkTable && fkColumn
            ? { targetTable: fkTable, targetColumn: fkColumn, isGuessed: false }
            : undefined,
      };
      await saveTable(updatedTable);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'tables'],
      });
      toast({ title: 'Column updated', variant: 'default' });
      setSaving(false);
      onBack();
    },
    onError: (err: any) => {
      browserLogger.error('Failed to update column', {
        connectionId,
        tableName,
        columnName,
        error: err.message || err,
      });
      toast({
        title: 'Failed to update column',
        description: err.message,
        variant: 'destructive',
      });
      setSaving(false);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    mutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg">
      <div className="text-lg font-bold">Edit Column: {columnName}</div>
      <form className="flex flex-col gap-4" onSubmit={handleSave}>
        <div>
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Icon</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div className="flex flex-col gap-1 border-t pt-4 mt-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isFK}
              onChange={(e) => setIsFK(e.target.checked)}
              id="isFK"
            />
            <label htmlFor="isFK" className="text-sm font-medium">
              Reference (Foreign Key)
            </label>
          </div>
          <span className="text-xs text-muted-foreground">
            This is for display purposes only. Mark this column as referencing
            another table to show related records in the UI.
          </span>
          {isFK && (
            <div className="flex flex-col gap-2 mt-2">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reference Table
                </label>
                <select
                  value={fkTable}
                  onChange={(e) => {
                    setFkTable(e.target.value);
                    setFkColumn('');
                  }}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Select table...</option>
                  {allTables?.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.details.pluralName}
                    </option>
                  ))}
                </select>
              </div>
              {fkTable && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reference Column
                  </label>
                  <select
                    value={fkColumn}
                    onChange={(e) => setFkColumn(e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="">Select column...</option>
                    {Object.values(fkTableColumns).map((col: any) => (
                      <option key={col.name} value={col.name}>
                        {col.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
        <Button
          type="submit"
          variant="default"
          className="mt-4"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}

// --- Calculated Columns Section ---

function CalculatedColumnsSection({
  connectionId,
  tableName,
  table,
}: {
  connectionId: string;
  tableName: string;
  table: any;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnTemplate, setNewColumnTemplate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const calculatedColumns = table?.details.calculatedColumns || [];

  const addCalculatedColumnMutation = useMutation({
    mutationFn: async (newColumn: Omit<CalculatedColumn, 'id'>) => {
      if (!table) throw new Error('Table not found');

      const updatedTable = { ...table };
      const newCalculatedColumn: CalculatedColumn = {
        ...newColumn,
        id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      updatedTable.details.calculatedColumns = [
        ...(updatedTable.details.calculatedColumns || []),
        newCalculatedColumn,
      ];

      // Add calculated column to all view configurations
      const calcColumnId = `calc_${newCalculatedColumn.id}`;
      const columnConfig = {
        order: Object.keys(updatedTable.details.cardView?.columns || {}).length,
        hidden: false,
      };

      // Add to card view
      if (!updatedTable.details.cardView)
        updatedTable.details.cardView = { columns: {} };
      updatedTable.details.cardView.columns[calcColumnId] = columnConfig;

      // Add to list view
      if (!updatedTable.details.listView)
        updatedTable.details.listView = { columns: {} };
      updatedTable.details.listView.columns[calcColumnId] = columnConfig;

      // Add to inline view
      if (!updatedTable.details.inlineView)
        updatedTable.details.inlineView = { columns: {} };
      updatedTable.details.inlineView.columns[calcColumnId] = columnConfig;

      await saveTable(updatedTable);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'tables'],
      });
      setNewColumnName('');
      setNewColumnTemplate('');
      setIsAdding(false);
      toast({
        title: 'Calculated column added',
        description: 'The calculated column has been created successfully.',
      });
    },
    onError: (error) => {
      browserLogger.error('Failed to add calculated column', {
        connectionId,
        tableName,
        error: error.message || error,
      });
      toast({
        title: 'Error adding calculated column',
        variant: 'destructive',
        description: error.message,
      });
    },
  });

  const deleteCalculatedColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      if (!table) throw new Error('Table not found');

      const updatedTable = { ...table };
      updatedTable.details.calculatedColumns = (
        updatedTable.details.calculatedColumns || []
      ).filter((col: CalculatedColumn) => col.id !== columnId);

      await saveTable(updatedTable);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'tables'],
      });
      toast({
        title: 'Calculated column deleted',
        description: 'The calculated column has been removed.',
      });
    },
    onError: (error) => {
      browserLogger.error('Failed to delete calculated column', {
        connectionId,
        tableName,
        error: error.message || error,
      });
      toast({
        title: 'Error deleting calculated column',
        variant: 'destructive',
        description: error.message,
      });
    },
  });

  const handleAddColumn = () => {
    if (!newColumnName.trim() || !newColumnTemplate.trim()) {
      toast({
        title: 'Missing information',
        description:
          'Please provide both a name and template for the calculated column.',
        variant: 'destructive',
      });
      return;
    }

    addCalculatedColumnMutation.mutate({
      name: newColumnName.trim(),
      displayName: newColumnName.trim(),
      template: newColumnTemplate.trim(),
      icon: 'Calculator',
      order: calculatedColumns.length,
      hidden: false,
    });
  };

  const availableColumns = Object.keys(table?.details.columns || {});

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center justify-between">
        <div className="text-sm font-medium">Calculated Columns</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          type="button"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Existing calculated columns */}
      <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
        {calculatedColumns.map((column: CalculatedColumn) => (
          <div
            key={column.id}
            className="flex flex-row gap-2 items-center p-2 bg-blue-50 rounded border"
          >
            <Button variant="ghost" size="icon">
              {column.hidden ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </Button>
            <ItemIcon item={{ icon: column.icon }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {column.displayName}
              </div>
              <div className="text-xs text-blue-600 font-mono truncate">
                {column.template}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteCalculatedColumnMutation.mutate(column.id)}
              type="button"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new calculated column form */}
      {isAdding && (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded border">
          <Input
            placeholder="Column name (e.g., Full Name)"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder={`Template (e.g., {${
              availableColumns[0] || 'column1'
            }} {${availableColumns[1] || 'column2'}})`}
            value={newColumnTemplate}
            onChange={(e) => setNewColumnTemplate(e.target.value)}
            className="text-sm font-mono"
          />
          <div className="text-xs text-gray-500">
            Available columns: {availableColumns.join(', ')}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddColumn}
              disabled={addCalculatedColumnMutation.isPending}
              type="button"
            >
              {addCalculatedColumnMutation.isPending ? 'Adding...' : 'Add'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewColumnName('');
                setNewColumnTemplate('');
              }}
              type="button"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
