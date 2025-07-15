import { useQuery } from '@tanstack/react-query';

export function useForeignKeyCurrentRecord({
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
    queryKey: ['fk-current-record', connectionId, targetTable, value],
    queryFn: () => {
      if (!foreignKey || !value) return null;
      const { getRecord } = require('../components/recored-editor-sidebar.actions');
      return getRecord({ connectionId, tableName: targetTable, pk: value });
    },
    enabled: isForeignKey && !!foreignKey && !!value,
  });
}
