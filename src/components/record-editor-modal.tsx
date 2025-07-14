'use client';

import { toast } from '@/hooks/use-toast';
import browserLogger from '@/lib/browser-logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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
import { Backlinks } from './backlinks';
import { RecordNavigationBreadcrumbs, BreadcrumbItem } from './record-navigation-breadcrumbs';

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
  initialBreadcrumbs?: BreadcrumbItem[];
}

export function RecordEditorModal({
  isOpen,
  onClose,
  connectionId,
  tableName,
  recordId,
  initialBreadcrumbs = [],
}: RecordEditorModalProps) {
  const queryClient = useQueryClient();
  
  // Navigation state
  const [currentConnectionId, setCurrentConnectionId] = useState(connectionId);
  const [currentTableName, setCurrentTableName] = useState(tableName);
  const [currentRecordId, setCurrentRecordId] = useState(recordId);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);
  
  // Update state when props change
  useEffect(() => {
    setCurrentConnectionId(connectionId);
    setCurrentTableName(tableName);
    setCurrentRecordId(recordId);
    if (initialBreadcrumbs.length > 0) {
      setBreadcrumbs(initialBreadcrumbs);
    } else {
      setBreadcrumbs([]);
    }
  }, [connectionId, tableName, recordId, initialBreadcrumbs.length]);

  const tableInfoQuery = useQuery({
    queryKey: ['connection', currentConnectionId, 'table', currentTableName],
    queryFn: () => getTableInfo({ connectionId: currentConnectionId, tableName: currentTableName }),
    enabled: isOpen,
  });

  const recordQuery = useQuery({
    queryKey: ['connection', currentConnectionId, 'table', currentTableName, 'record', currentRecordId],
    queryFn: () => getRecord({ connectionId: currentConnectionId, tableName: currentTableName, pk: currentRecordId }),
    enabled: isOpen && !!currentRecordId,
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
      return updateRecord({ connectionId: currentConnectionId, tableName: currentTableName, pk: currentRecordId, record: data });
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
        connectionId: currentConnectionId,
        tableName: currentTableName,
        recordId: currentRecordId,
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
    mutationFn: () => deleteRecord({ connectionId: currentConnectionId, tableName: currentTableName, pk: currentRecordId }),
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
        connectionId: currentConnectionId,
        tableName: currentTableName,
        recordId: currentRecordId,
        error: error.message || error,
      });
      toast({
        title: 'Failed to delete record',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  // Navigation functions
  const navigateToRecord = (targetConnectionId: string, targetTableName: string, targetRecordId: any, displayValue?: string) => {
    if (!targetRecordId) return;
    
    // Create breadcrumb item for current record
    const currentBreadcrumbItem: BreadcrumbItem = {
      connectionId: currentConnectionId,
      tableName: currentTableName,
      recordId: currentRecordId,
      displayValue: getRecordDisplayValue(record, tableInfo) || `${tableInfo?.details?.singularName || currentTableName}`,
      tableInfo
    };
    
    // Add current record to breadcrumbs if it's not already there
    const newBreadcrumbs = breadcrumbs.some(b => 
      b.connectionId === currentConnectionId && 
      b.tableName === currentTableName && 
      b.recordId === currentRecordId
    ) ? breadcrumbs : [...breadcrumbs, currentBreadcrumbItem];
    
    // Update navigation state
    setCurrentConnectionId(targetConnectionId);
    setCurrentTableName(targetTableName);
    setCurrentRecordId(targetRecordId);
    setBreadcrumbs(newBreadcrumbs);
    
    // Reset form for new record
    form.reset({});
  };

  const navigateToBreadcrumb = (item: BreadcrumbItem, index: number) => {
    // Don't navigate if clicking on the current record (last item)
    const totalItems = breadcrumbs.length + (record && tableInfo ? 1 : 0);
    if (index === totalItems - 1) {
      return; // Current record, do nothing
    }
    
    // Navigate to the selected breadcrumb item
    setCurrentConnectionId(item.connectionId);
    setCurrentTableName(item.tableName);
    setCurrentRecordId(item.recordId);
    
    // Trim breadcrumbs to the selected index (exclude the current record)
    setBreadcrumbs(breadcrumbs.slice(0, index));
    
    // Reset form for new record
    form.reset({});
  };

  const getRecordDisplayValue = (record: any, tableInfo: any) => {
    if (!record || !tableInfo) return null;
    
    // Use display field if available
    const displayField = tableInfo.details?.displayField;
    if (displayField && record[displayField]) {
      return record[displayField];
    }
    
    // Use inline view configuration if available
    const inlineViewColumns = tableInfo.details?.inlineView?.columns;
    if (inlineViewColumns) {
      // Get visible columns in order
      const visibleColumns = Object.entries(inlineViewColumns)
        .filter(([_, config]: [string, any]) => !config.hidden)
        .sort(([_, a]: [string, any], [__, b]: [string, any]) => a.order - b.order)
        .map(([columnName]) => columnName);
      
      if (visibleColumns.length > 0) {
        const displayValues = visibleColumns
          .map((colName: string) => record[colName])
          .filter(Boolean);
        
        if (displayValues.length > 0) {
          return displayValues.join(' ');
        }
      }
    }
    
    // Fall back to determine display columns logic
    const { determineDisplayColumns } = require('@/utils/display-columns');
    const displayColumns = determineDisplayColumns(tableInfo);
    
    const displayValues = displayColumns
      .map((colName: string) => record[colName])
      .filter(Boolean);
    
    if (displayValues.length > 0) {
      return displayValues.join(' ');
    }
    
    return null;
  };

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
        <DialogHeader className="flex-shrink-0 space-y-3">
          <DialogTitle>
            Edit {tableInfo?.details.singularName || currentTableName}
          </DialogTitle>
          
          {(breadcrumbs.length > 0 || (record && tableInfo)) && (
            <RecordNavigationBreadcrumbs
              items={[
                ...breadcrumbs,
                // Add current record as the last breadcrumb
                ...(record && tableInfo ? [{
                  connectionId: currentConnectionId,
                  tableName: currentTableName,
                  recordId: currentRecordId,
                  displayValue: getRecordDisplayValue(record, tableInfo) || `${tableInfo?.details?.singularName || currentTableName}`,
                  tableInfo
                }] : [])
              ]}
              onNavigate={navigateToBreadcrumb}
              className="text-sm"
            />
          )}
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
                        connectionId={currentConnectionId}
                        isPrimaryKey={isPrimaryKey}
                        isForeignKey={isForeignKey}
                        isNullable={isNullable}
                        isGenerated={isGenerated}
                        onNavigateToRecord={navigateToRecord}
                      />
                    );
                  })}
                </div>

                {/* Backlinks Section */}
                <Backlinks 
                  connectionId={currentConnectionId}
                  tableName={currentTableName}
                  recordId={currentRecordId}
                  onNavigateToRecord={navigateToRecord}
                />
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