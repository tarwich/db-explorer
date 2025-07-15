import { getTableRecords } from '@/app/api/tables';
import { useQuery } from '@tanstack/react-query';

export function useForeignKeyRecords({
  connectionId,
  targetTable,
  fkSearchValue,
  isForeignKey,
  foreignKey,
  fkSearchOpen,
}: {
  connectionId: string;
  targetTable: string;
  fkSearchValue: string;
  isForeignKey: boolean;
  foreignKey: any;
  fkSearchOpen: boolean;
}) {
  return useQuery({
    queryKey: ['fk-records', connectionId, targetTable, fkSearchValue],
    queryFn: () =>
      foreignKey
        ? getTableRecords(connectionId, targetTable, {
            page: 1,
            pageSize: 50,
          })
        : null,
    enabled: isForeignKey && !!foreignKey && fkSearchOpen,
  });
}
