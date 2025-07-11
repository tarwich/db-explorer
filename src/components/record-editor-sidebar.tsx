import { toast } from '@/hooks/use-toast';
import browserLogger from '@/lib/browser-logger';
import { PopoverClose } from '@radix-ui/react-popover';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useRecordEditorSidebar } from '../context/editor-sidebar-context';
import { ColumnEditor } from './column-editor';
import {
  deleteRecord,
  getRecord,
  getTableInfo,
  updateRecord,
} from './recored-editor-sidebar.actions';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
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
      tableInfo.details.displayColumns.map((c) => record[c]).join(' ') || pk
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

  const deleteRecordMutation = useMutation({
    mutationFn: () => deleteRecord({ connectionId, tableName, pk }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connection', connectionId, 'table', tableName, 'rows'],
      });
      onClose();
    },
    onError: () => {
      browserLogger.error('Failed to delete record', {
        connectionId,
        tableName,
        pk,
      });
      toast({
        title: 'Failed to delete record',
        variant: 'destructive',
      });
    },
  });

  return (
    <Sheet open={true} modal={false} onOpenChange={onClose}>
      <SheetTitle className="hidden">{tableName} Editor</SheetTitle>
      <SheetDescription className="hidden">{description}</SheetDescription>
      <SheetContent>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4 h-full">
            <h1 className="text-xl font-bold flex flex-col gap-2 capitalize">
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
                  <ColumnEditor
                    key={c.name}
                    column={c}
                    isPrimaryKey={isPrimaryKey}
                    isForeignKey={isForeignKey}
                    isNullable={isNullable}
                  />
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
              <span className="w-full"></span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="destructive">Delete</Button>
                </PopoverTrigger>
                <PopoverContent className="flex flex-col gap-2">
                  <p>
                    Are you sure you want to delete{' '}
                    {description || 'this record'}?
                  </p>
                  <div className="flex flex-row gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => deleteRecordMutation.mutate()}
                      disabled={deleteRecordMutation.isPending}
                    >
                      {deleteRecordMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Delete'
                      )}
                    </Button>
                    <PopoverClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </PopoverClose>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
