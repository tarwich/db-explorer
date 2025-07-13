import { getTables } from '@/app/api/tables';
import { cn } from '@/lib/utils';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { RotateCw, SettingsIcon, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ItemInlineView } from '../explorer/item-views/item-inline-view';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ConnectionTab } from './tab.connection';
import { TableTab } from './tab.table';

export function ConnectionModal({
  isOpen,
  onOpenChange,
  connectionId: initialConnectionId,
  initialTableName,
  initialTablePage,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId?: string;
  initialTableName?: string;
  initialTablePage?: 'general' | 'inline-view' | 'card-view' | 'list-view';
}) {
  const [connectionId, setConnectionId] = useState(initialConnectionId);

  // Update connectionId when the prop changes
  useEffect(() => {
    setConnectionId(initialConnectionId);
  }, [initialConnectionId]);

  const tablesQuery = useQuery({
    queryKey: ['tables', connectionId],
    queryFn: () => getTables(connectionId ?? ''),
    enabled: !!connectionId,
  });
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState(initialTableName || 'connection');

  const processedFilter = useMemo(() => {
    return filter.toLowerCase().split(/\W+/);
  }, [filter]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTitle className="invisible absolute size-0">
        Edit Connection
      </DialogTitle>
      <DialogDescription className="invisible absolute size-0">
        Edit connection dialog
      </DialogDescription>
      <DialogOverlay />
      <Tabs onValueChange={setTab} value={tab}>
        <DialogContent
          className={cn(
            'w-[90vw] h-[90vh] max-w-[800px] bg-slate-100 border border-neutral-200 p-0 overflow-hidden',
            'flex flex-row gap-0'
          )}
        >
          <div className="flex flex-col p-3 gap-2">
            <div className="flex flex-row gap-1 items-center">
              <SettingsIcon className="size-4" />
              <p className="text-sm font-semibold">Settings</p>
            </div>

            <hr className="border-neutral-200" />

            <TabsList className="contents flex-1">
              <div className="flex flex-col gap-3 w-full h-full overflow-hidden">
                {/* General */}
                <p className="text-sm font-medium">General</p>

                {/* Connection Settings */}
                <TabsTrigger value="connection" className="contents group">
                  <ItemInlineView
                    item={{
                      icon: 'Database',
                      columns: [
                        {
                          name: 'Connection Settings',
                          value: 'Connection Settings',
                        },
                      ],
                    }}
                    className={cn(
                      'w-full cursor-pointer hover:bg-neutral-200 rounded-md',
                      'flex flex-row gap-1 items-center',
                      'group-data-[state=active]:bg-neutral-200'
                    )}
                  />
                </TabsTrigger>

                {!!connectionId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => tablesQuery.refetch()}
                    >
                      <RotateCw className="size-4" />
                      Refresh
                    </Button>

                    {/* Tables */}
                    <p className="text-sm font-medium">Tables</p>

                    {/* Filter */}
                    <div className="flex flex-row gap-1 items-center relative">
                      <Input
                        placeholder="Filter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pr-8"
                      />
                      {filter && (
                        <button
                          onClick={() => setFilter('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-200 rounded-sm"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>

                    {/* Tables */}
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                      {tablesQuery.data
                        ?.filter((table) =>
                          processedFilter.every((f) =>
                            table.details.normalizedName.includes(f)
                          )
                        )
                        .map((table) => (
                          <TabsTrigger
                            key={table.name}
                            value={table.name}
                            className="contents group"
                          >
                            <ItemInlineView
                              item={{
                                icon: table.details.icon,
                                columns: [
                                  {
                                    name: 'Tables',
                                    value: table.details.pluralName,
                                  },
                                ],
                              }}
                              className={cn(
                                'w-full cursor-pointer hover:bg-neutral-200 rounded-md',
                                'flex flex-row gap-1 items-center',
                                'group-data-[state=active]:bg-neutral-200'
                              )}
                            />
                          </TabsTrigger>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </TabsList>
          </div>

          <div
            className={cn(
              'flex-1 bg-white border border-neutral-200 rounded-lg p-3',
              'flex flex-col gap-2 min-h-0 overflow-y-auto'
            )}
          >
            <TabsContent value="connection" asChild>
              <ConnectionTab
                connectionId={connectionId}
                onDelete={() => onOpenChange(false)}
                onConnectionIdChange={setConnectionId}
              />
            </TabsContent>

            {tablesQuery.data?.map((table) => (
              <TabsContent key={table.name} value={table.name} asChild>
                <TableTab
                  connectionId={connectionId!}
                  tableName={table.name}
                  setTab={setTab}
                  initialPage={initialTablePage}
                />
              </TabsContent>
            ))}
          </div>
        </DialogContent>
      </Tabs>
    </Dialog>
  );
}
