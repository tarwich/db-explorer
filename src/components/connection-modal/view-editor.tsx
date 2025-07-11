import { getTable } from '@/app/api/tables';
import { useToast } from '@/hooks/use-toast';
import browserLogger from '@/lib/browser-logger';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeIcon, EyeOffIcon, GripVertical } from 'lucide-react';
import { sort } from 'radash';
import { useMemo } from 'react';
import { ItemCardView } from '../explorer/item-views/item-card-view';
import { ItemIcon } from '../explorer/item-views/item-icon';
import { ItemInlineView } from '../explorer/item-views/item-inline-view';
import { ItemListView } from '../explorer/item-views/item-list-view';
import { Button } from '../ui/button';
import { updateColumn } from './view-editor.actions';

interface ViewEditorProps {
  type: 'inline' | 'card' | 'list';
  connectionId: string;
  tableName: string;
}

interface Column {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  type: string;
  hidden: boolean;
  order: number;
}

interface SortableColumnProps {
  column: Column;
  onVisibilityToggle: () => void;
}

function SortableColumn({ column, onVisibilityToggle }: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-row gap-2 items-center"
    >
      <button
        className="cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4 text-neutral-400" />
      </button>
      <Button variant="ghost" size="icon" onClick={onVisibilityToggle}>
        {column.hidden ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </Button>
      <ItemIcon item={{ icon: column.icon }} />
      <span className="flex-1">{column.displayName}</span>
      <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
        {column.type}
      </span>
    </div>
  );
}

export function ViewEditor({ type, connectionId, tableName }: ViewEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tableQuery = useQuery({
    queryKey: ['connections', connectionId, 'tables', tableName],
    queryFn: () => getTable(connectionId, tableName),
    select: (data) => {
      const view = (() => {
        if (type === 'card') return data.details.cardView;
        if (type === 'list') return data.details.listView;
        if (type === 'inline') return data.details.inlineView;

        throw new Error('Invalid view type');
      })();

      return { table: data, view };
    },
  });

  const { table, view } = useMemo(
    () => ({
      table: tableQuery.data?.table,
      view: tableQuery.data?.view,
    }),
    [tableQuery.data]
  );

  // Convert database columns to state
  const columns = useMemo(() => {
    return sort(
      Object.values(table?.details.columns || {}),
      (c) => view?.columns[c.name]?.order ?? 0
    ).map((c, index) => ({
      id: c.name,
      name: c.name,
      displayName: c.displayName,
      icon: c.icon,
      type: c.type,
      hidden: view?.columns[c.name]?.hidden ?? c.hidden,
      order: index,
    }));
  }, [table, view]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newIndex = columns.findIndex((c) => c.id === over.id);

    // Update the column's order using the mutation
    updateColumnMutation.mutate({
      name: active.id as string,
      update: { order: newIndex },
    });
  };

  const updateColumnMutation = useMutation({
    mutationFn: ({ name, update }: { name: string; update: Partial<Column> }) =>
      updateColumn({
        connectionId,
        tableName,
        view: type,
        columnName: name,
        update,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'tables'],
      });
    },
    onError: (error) => {
      browserLogger.error('Failed to update column', {
        connectionId,
        tableName,
        columnName: name,
        error: error.message || error,
      });
      toast({
        title: 'Error updating column',
        variant: 'destructive',
        description: error.message,
      });
    },
  });

  const visibleColumns = columns.filter((c) => !c.hidden);

  return (
    <div className="flex flex-col gap-4">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {columns.map((column, index) => (
              <SortableColumn
                key={column.name}
                column={column}
                onVisibilityToggle={() =>
                  updateColumnMutation.mutate({
                    name: column.name,
                    update: { hidden: !column.hidden },
                  })
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">Preview</div>
        {type === 'inline' ? (
          <ItemInlineView
            item={{
              icon: 'Table',
              columns: visibleColumns.map((c) => ({
                name: c.name,
                value: c.name,
              })),
            }}
          />
        ) : type === 'card' ? (
          <ItemCardView
            item={{
              id: '1',
              icon: 'Table',
              columns: visibleColumns.map((c) => ({
                name: c.name,
                value: c.name,
              })),
            }}
          />
        ) : (
          <ItemListView
            item={{
              id: '1',
              icon: 'Table',
              columns: visibleColumns.map((c) => ({
                name: c.name,
                value: c.name,
              })),
            }}
          />
        )}
      </div>
    </div>
  );
}
