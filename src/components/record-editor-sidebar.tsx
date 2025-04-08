import { cn } from '@/lib/utils';
import { KeyIcon, LinkIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { title } from 'radash';
import { Fragment, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useRecordEditorSidebar } from '../context/editor-sidebar-context';
import {
  getRecord,
  getTableInfo,
  updateRecord,
} from './recored-editor-sidebar.actions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';

export default function RecordEditorSidebar({
  id,
  tableName,
  pk,
  isPinned,
}: {
  id: string;
  tableName: string;
  pk: any;
  isPinned: boolean;
}) {
  const { connectionId } = useParams<{ connectionId: string }>();
  const tableInfoQuery = useQuery({
    queryKey: ['connection', connectionId, 'table', tableName],
    queryFn: () => getTableInfo({ connectionId, tableName }),
  });
  const recordQuery = useQuery({
    queryKey: ['connection', connectionId, 'table', tableName, 'rows', pk],
    queryFn: () => getRecord({ connectionId, tableName, pk }),
  });
  const sidebarContext = useRecordEditorSidebar();
  const queryClient = useQueryClient();
  const tableInfo = tableInfoQuery.data;
  const record = recordQuery.data;

  const description = useMemo(() => {
    if (!tableInfo || !record) {
      return 'Loading...';
    }

    return (
      tableInfo.details.displayColumns.map((c) => record[c]).join(' ') || '?'
    );
  }, [recordQuery.data, tableName]);

  const form = useForm<Record<string, any>>({
    defaultValues: recordQuery.data,
  });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(recordQuery.data);
    }
  }, [recordQuery.data]);

  const onClose = () => {
    sidebarContext.closeEditor(id);
  };

  const saveRecordMutation = useMutation({
    mutationFn: (data: Record<string, any>) => {
      return updateRecord({ connectionId, tableName, pk, record: data });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    saveRecordMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['connection', connectionId, 'table', tableName, 'rows'],
        });
      },
    });
  });

  return (
    <Sheet open={true} modal={false} onOpenChange={onClose}>
      <SheetTitle className="hidden">{tableName} Editor</SheetTitle>
      <SheetDescription className="hidden">{description}</SheetDescription>
      <SheetContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 h-full">
          <h1 className="text-xl font-bold flex flex-col gap-2">
            {tableName}
            <small className="text-sm text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap">
              {description}
            </small>
          </h1>
          <div
            className="flex flex-col gap-2 h-full overflow-y-auto"
            style={{
              gridTemplateColumns: `auto 1fr`,
            }}
          >
            {tableInfoQuery.data?.details.columns.map((c) => {
              const isPrimaryKey = !!tableInfo?.details.pk.includes(c.name);
              const isForeignKey = !!c.foreignKey;
              const isNullable = !!c.nullable;

              return (
                <Fragment key={c.name}>
                  <label
                    htmlFor={c.name}
                    className={cn(
                      'text-sm text-muted-foreground flex flex-row gap-2 items-center',
                      isPrimaryKey && 'text-red-500',
                      isForeignKey && 'text-blue-500',
                      isNullable && 'text-gray-500'
                    )}
                  >
                    {title(c.name)}
                    {isPrimaryKey && <KeyIcon className="w-4 h-4" />}
                    {isForeignKey && <LinkIcon className="w-4 h-4" />}
                  </label>
                  <div className="flex flex-row gap-2 items-center h-auto max-h-full">
                    <Input
                      id={c.name}
                      {...form.register(c.name)}
                      className="flex-grow"
                    />
                    {isNullable && (
                      <XCircleIcon
                        className="w-4 h-4"
                        onClick={() => {
                          form.setValue(c.name, null);
                        }}
                      />
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
          <div className="flex flex-row gap-2">
            <Button
              variant="default"
              type="submit"
              disabled={saveRecordMutation.isPending}
            >
              {saveRecordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
