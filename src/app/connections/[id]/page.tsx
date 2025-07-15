'use client';

import { analyzeTable } from '@/app/api/tables-list';
import { DatabaseSidebar } from '@/components/data-browser/database-sidebar';
import { MainContent } from '@/components/data-browser/main-content';
import { ConnectionModal } from '@/components/connection-modal/connection-modal';
import { RecordEditorModal } from '@/components/record-editor-modal';
import { cn } from '@/lib/utils';
import { useDisclosure } from '@reactuses/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getConnections } from '../../api/connections';

type ViewType = 'grid' | 'list' | 'table';

export default function DataBrowserPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTable = searchParams.get('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const tableConfigModal = useDisclosure();
  const [recordEditorModal, setRecordEditorModal] = useState<{
    isOpen: boolean;
    recordId: any;
  }>({ isOpen: false, recordId: null });

  const connectionQuery = useQuery({
    queryKey: ['connections', params.id],
    queryFn: () => getConnections(),
    select: (data) => data.find((conn) => conn.id === params.id),
  });

  const handleRecordClick = (recordId: any) => {
    setRecordEditorModal({ isOpen: true, recordId });
  };

  const closeRecordEditor = () => {
    setRecordEditorModal({ isOpen: false, recordId: null });
  };

  const handleTableSelect = (tableName: string) => {
    router.push(`/connections/${params.id}?table=${tableName}`);
  };

  // Background analysis of tables is now handled in DatabaseSidebar component

  return (
    <div className="min-h-screen bg-gray-50 flex flex-row h-full overflow-hidden">
      {/* Sidebar */}
      <DatabaseSidebar
        connectionId={params.id}
        connectionName={connectionQuery.data?.name}
        selectedTable={selectedTable}
        onTableSelect={handleTableSelect}
        onResetPage={() => {}} // No longer needed for infinite scroll
      />

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col min-h-0 overflow-y-auto">
        <MainContent
          connectionId={params.id}
          selectedTable={selectedTable}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          viewType={viewType}
          onViewTypeChange={setViewType}
          onRecordClick={handleRecordClick}
          onTableConfigClick={() => tableConfigModal.onOpen()}
        />
      </div>

      {/* Table Configuration Modal */}
      {tableConfigModal.isOpen && selectedTable && (
        <ConnectionModal
          isOpen={tableConfigModal.isOpen}
          onOpenChange={tableConfigModal.onOpenChange}
          connectionId={params.id}
          initialTableName={selectedTable}
          initialTablePage="general"
        />
      )}

      {/* Record Editor Modal */}
      {recordEditorModal.isOpen && selectedTable && recordEditorModal.recordId && (
        <RecordEditorModal
          isOpen={recordEditorModal.isOpen}
          onClose={closeRecordEditor}
          connectionId={params.id}
          tableName={selectedTable}
          recordId={recordEditorModal.recordId}
        />
      )}
    </div>
  );
}
