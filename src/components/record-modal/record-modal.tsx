import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DatabaseTable } from '@/types/connections';

interface RecordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record: Record<string, any>;
  table: DatabaseTable;
}

export function RecordModal({
  isOpen,
  onOpenChange,
  record,
  table,
}: RecordModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{table.details.singularName} Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {Object.values(table.details.columns).map((column) => (
            <div
              key={column.name}
              className="grid grid-cols-4 items-center gap-4"
            >
              <div className="font-medium">{column.displayName}</div>
              <div className="col-span-3">{String(record[column.name])}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
