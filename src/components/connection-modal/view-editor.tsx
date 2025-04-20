import { getTable, updateTable } from '@/app/api/tables';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeIcon, EyeOffIcon, GripVertical } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ItemCardView } from '../explorer/item-views/item-card-view';
import { ItemIcon } from '../explorer/item-views/item-icon';
import { ItemInlineView } from '../explorer/item-views/item-inline-view';
import { Button } from '../ui/button';

interface ViewEditorProps {
  type: 'inline' | 'card';
  connectionId: string;
  tableName: string;
}

interface SortableColumnProps {
  id: string;
  name: string;
  value: string;
  icon: string;
  type: string;
  hidden: boolean;
  onNameChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onVisibilityToggle: () => void;
}

function SortableColumn({
  id,
  name,
  value,
  icon,
  type,
  hidden,
  onNameChange,
  onValueChange,
  onVisibilityToggle,
}: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

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
        {hidden ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </Button>
      <ItemIcon item={{ icon }} />
      <span className="flex-1">{name}</span>
      <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
        {type}
      </span>
    </div>
  );
}

export function ViewEditor({ type, connectionId, tableName }: ViewEditorProps) {
  const queryClient = useQueryClient();
  const tableQuery = useQuery({
    queryKey: ['connections', connectionId, 'tables', tableName],
    queryFn: () => getTable(connectionId, tableName),
  });

  const updateTableMutation = useMutation({
    mutationFn: (details: Parameters<typeof updateTable>[2]) =>
      updateTable(connectionId, tableName, details),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'tables', tableName],
      });
    },
  });

  const form = useForm({
    defaultValues: {
      columns: [] as {
        id: string;
        name: string;
        value: string;
        icon: string;
        type: string;
        hidden: boolean;
      }[],
    },
  });

  useEffect(() => {
    if (tableQuery.data) {
      const columns = tableQuery.data.details.columns.map((c) => ({
        id: c.name,
        name: c.displayName,
        value: c.name,
        icon: c.icon,
        type: c.type,
        hidden: c.hidden,
      }));
      form.reset({ columns });
    }
  }, [tableQuery.data]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = form
      .getValues('columns')
      .findIndex((c) => c.id === active.id);
    const newIndex = form
      .getValues('columns')
      .findIndex((c) => c.id === over.id);

    const columns = [...form.getValues('columns')];
    const [movedItem] = columns.splice(oldIndex, 1);
    columns.splice(newIndex, 0, movedItem);

    form.setValue('columns', columns);
    updateTableMutation.mutate({
      displayColumns: columns.filter((c) => !c.hidden).map((c) => c.value),
    });
  };

  const handleColumnChange = (
    index: number,
    field: 'name' | 'value' | 'hidden',
    value: any
  ) => {
    const columns = [...form.getValues('columns')];
    columns[index] = { ...columns[index], [field]: value };
    form.setValue('columns', columns);

    if (field === 'hidden') {
      const updatedColumns =
        tableQuery.data?.details.columns.map((c) => {
          const formColumn = columns.find((fc) => fc.id === c.name);
          if (formColumn) {
            return {
              ...c,
              hidden: formColumn.hidden,
            };
          }
          return c;
        }) || [];

      updateTableMutation.mutate({
        columns: updatedColumns,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={form.watch('columns')}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {form.watch('columns').map((column, index) => (
              <SortableColumn
                key={column.id}
                id={column.id}
                name={column.name}
                value={column.value}
                icon={column.icon}
                type={column.type}
                hidden={column.hidden}
                onNameChange={(value) =>
                  handleColumnChange(index, 'name', value)
                }
                onValueChange={(value) =>
                  handleColumnChange(index, 'value', value)
                }
                onVisibilityToggle={() =>
                  handleColumnChange(index, 'hidden', !column.hidden)
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
              columns: form
                .watch('columns')
                .filter((c) => !c.hidden)
                .map((c) => ({
                  name: c.name,
                  value: c.value,
                })),
            }}
          />
        ) : (
          <ItemCardView
            item={{
              id: '1',
              icon: 'Table',
              columns: form
                .watch('columns')
                .filter((c) => !c.hidden)
                .map((c) => ({
                  name: c.name,
                  value: c.value,
                })),
            }}
          />
        )}
      </div>
    </div>
  );
}
