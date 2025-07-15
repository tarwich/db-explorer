import { useQuery } from '@tanstack/react-query';

export function useForeignKeyTableInfo({
  connectionId,
  targetTable,
  isForeignKey,
  foreignKey,
  value,
}: {
  connectionId: string;
  targetTable: string;
  isForeignKey: boolean;
  foreignKey: any;
  value: any;
}) {
  return useQuery({
    queryKey: ['connection', connectionId, 'table', targetTable],
    queryFn: () => foreignKey ? require('../components/recored-editor-sidebar.actions').getTableInfo({ connectionId, tableName: targetTable }) : null,
    enabled: isForeignKey && !!foreignKey && !!value,
  });
}
