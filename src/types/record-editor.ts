import { DatabaseTable } from '@/stores/database';

export interface RecordEditor {
  // Unique identifier for this editor instance
  id: string;

  // The table this record belongs to
  tableId: string;

  // The actual record data being edited
  record: Record<string, unknown>;

  // Track if there are unsaved changes
  isDirty: boolean;

  // Original record data before any changes
  originalRecord: Record<string, unknown>;

  // Whether the editor is currently pinned in the sidebar
  isPinned: boolean;

  // Timestamp when this editor was opened
  openedAt: string;
}
