'use client';

import { toast } from '@/hooks/use-toast';
import browserLogger from '@/lib/browser-logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React, { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  deleteRecord,
  getRecord,
  getTableInfo,
  updateRecord,
} from './recored-editor-sidebar.actions';
import { Button } from './ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from './ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { EnhancedColumnEditor } from './enhanced-column-editor';

// Custom DialogContent without the automatic close button
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg grid-rows-[auto_1fr]',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = 'CustomDialogContent';

interface RecordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  tableName: string;
  recordId: any;
}

export function RecordEditorModal({
  isOpen,
  onClose,
  connectionId,
  tableName,
  recordId,
}: RecordEditorModalProps) {
  const queryClient = useQueryClient();

  const tableInfoQuery = useQuery({
    queryKey: ['connection', connectionId, 'table', tableName],
    queryFn: () => getTableInfo({ connectionId, tableName }),
    enabled: isOpen,
  });

  const recordQuery = useQuery({
    queryKey: ['connection', connectionId, 'table', tableName, 'record', recordId],
    queryFn: () => getRecord({ connectionId, tableName, pk: recordId }),
    enabled: isOpen && !!recordId,
  });

  const tableInfo = tableInfoQuery.data;
  const record = recordQuery.data;

  const form = useForm<Record<string, any>>({
    defaultValues: record || {},
  });

  useEffect(() => {
    if (record && !form.formState.isDirty) {
      form.reset(record);
    }
  }, [record, form]);

  const saveRecordMutation = useMutation({
    mutationFn: (data: Record<string, any>) => {
      return updateRecord({ connectionId, tableName, pk: recordId, record: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'records'],
      });
      toast({
        title: 'Record updated',
        description: 'The record has been successfully updated.',
      });
      onClose();
    },
    onError: (error) => {
      browserLogger.error('Failed to update record', {
        connectionId,
        tableName,
        recordId,
        error: error.message || error,
      });
      toast({
        title: 'Failed to update record',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: () => deleteRecord({ connectionId, tableName, pk: recordId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'records'],
      });
      toast({
        title: 'Record deleted',
        description: 'The record has been successfully deleted.',
      });
      onClose();
    },
    onError: (error) => {
      browserLogger.error('Failed to delete record', {
        connectionId,
        tableName,
        recordId,
        error: error.message || error,
      });
      toast({
        title: 'Failed to delete record',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    saveRecordMutation.mutate(data);
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      deleteRecordMutation.mutate();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <CustomDialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Edit {tableInfo?.details.singularName || tableName}
          </DialogTitle>
        </DialogHeader>

        {tableInfoQuery.isLoading || recordQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : tableInfoQuery.error || recordQuery.error ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            Error loading record data
          </div>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(tableInfo?.details.columns || {}).map((column: any) => {
                    const isPrimaryKey = !!tableInfo?.details.pk.includes(column.name);
                    const isForeignKey = !!column.foreignKey;
                    const isNullable = !!column.nullable;
                    const isGenerated = !!column.isGenerated;

                    return (
                      <EnhancedColumnEditor
                        key={column.name}
                        column={column}
                        connectionId={connectionId}
                        isPrimaryKey={isPrimaryKey}
                        isForeignKey={isForeignKey}
                        isNullable={isNullable}
                        isGenerated={isGenerated}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center justify-between p-4 border-t bg-white">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteRecordMutation.isPending}
                >
                  {deleteRecordMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Delete
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveRecordMutation.isPending}
                  >
                    {saveRecordMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </FormProvider>
        )}
      </CustomDialogContent>
    </Dialog>
  );
}