'use client';

import { getConnection } from '@/app/api/connections';
import { getTable, getTables, saveTable } from '@/app/api/tables';
import { useToast } from '@/hooks/use-toast';
import browserLogger from '@/lib/browser-logger';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeIcon, EyeOffIcon, icons, PencilIcon } from 'lucide-react';
import { sort } from 'radash';
import {
    createContext,
    forwardRef,
    useContext,
    useEffect,
    useMemo,
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
import { autoAssignTableSettings } from './auto-assign.actions';
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
            <ViewEditor
              type="inline"
              connectionId={connectionId}
              tableName={tableName}
            />
          )}
          {page === 'card-view' && (
            <ViewEditor
              type="card"
              connectionId={connectionId}
              tableName={tableName}
            />
          )}
          {page === 'list-view' && (
            <ViewEditor
              type="list"
              connectionId={connectionId}
              tableName={tableName}
            />
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
  const { setPage } = useTableTabContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tableQuery = useQuery({
    queryKey: ['connections', connectionId, 'tables', tableName],
    queryFn: () => getTable(connectionId, tableName),
  });

  const autoAssignMutation = useMutation({
    mutationFn: () => autoAssignTableSettings({ connectionId, tableName }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['connections', connectionId, 'tables'],
        });
        // Also invalidate the sidebar's tables query
        queryClient.invalidateQueries({
          queryKey: ['tables', connectionId],
        });
        toast({
          title: 'Auto-assignment completed',
          description: result.message,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Auto-assignment failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Auto-assignment failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });




  return (
    <>
      <form className="flex flex-col gap-3 h-full overflow-hidden">
        <div className={cn('flex flex-col gap-4', 'flex-1 overflow-y-auto')}>
          <div className="flex flex-row items-center justify-between">
            <div className="text-sm font-medium">Table Information</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => autoAssignMutation.mutate()}
              disabled={autoAssignMutation.isPending}
              className="flex items-center gap-2"
            >
              {autoAssignMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Auto-assigning...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Auto-assign
                </>
              )}
            </Button>
          </div>

          {/* Database name */}
          <div className="flex flex-row gap-2 text-xs text-neutral-800">
            <span>Database Name: </span>
            <span>{tableName}</span>
          </div>

          <div className="flex flex-row gap-2">
            {/* Icon */}
            <div className="flex flex-col gap-1 justify-center items-center">
              <div className="text-sm font-medium">Icon</div>
              <IconPicker
                value={form.watch('icon')}
                onChange={(value) => {
                  form.setValue('icon', value);
                  saveTableMutation.mutate({ icon: value });
                }}
                className="size-8"
              />
            </div>

            {/* Color */}
            <div className="flex flex-col gap-1 justify-center items-center">
              <div className="text-sm font-medium">Color</div>
              <ColorPicker
                value={form.watch('color')}
                onChange={(value) => {
                  form.setValue('color', value);
                  saveTableMutation.mutate({ color: value });
                }}
                className="size-8"
              />
            </div>

            {/* Singular name */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-sm font-medium">Singular Name</div>
              <Input
                value={form.watch('singularName')}
                onChange={(e) => form.setValue('singularName', e.target.value)}
                onBlur={(e) => saveTableMutation.mutate({ singularName: e.target.value })}
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
                onBlur={(e) => saveTableMutation.mutate({ pluralName: e.target.value })}
                className="w-full"
                placeholder="Tables"
              />
            </div>
          </div>

          <div className="text-sm font-medium">Columns</div>

          {/* Columns */}
          <div className="flex flex-col gap-2">
            {Object.values(tableQuery.data?.details.columns || {}).map(
              (column) => (
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
              )
            )}
          </div>

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
      </form>
    </>
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
