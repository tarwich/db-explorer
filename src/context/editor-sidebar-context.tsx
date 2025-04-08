import RecordEditorSidebar from '@/components/record-editor-sidebar';
import { produce } from 'immer';
import { uid } from 'radash';
import React, {
  ComponentProps,
  createContext,
  ReactNode,
  useContext,
  useState,
} from 'react';

export type RecordEditorSidebarProps = ComponentProps<
  typeof RecordEditorSidebar
>;

export const RecordEditorSidebarContext = createContext<{
  sidebars: RecordEditorSidebarProps[];
  openEditor: (tableName: string, pk: any) => void;
  closeEditor: (id: string) => void;
  pinEditor: (id: string) => void;
}>({
  sidebars: [],
  openEditor: () => {},
  closeEditor: () => {},
  pinEditor: () => {},
});

// Create a provider component
export const SidebarProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [sidebars, setSidebars] = useState<RecordEditorSidebarProps[]>([]);

  const openEditor = (tableName: string, pk: any) => {
    setSidebars(
      produce(sidebars, (draft) => {
        // Find a non-pinned sidebar
        const sidebar = draft.find((sidebar) => !sidebar.isPinned);
        if (sidebar) {
          sidebar.tableName = tableName;
          sidebar.pk = pk;
        } else {
          draft.push({ tableName, pk, isPinned: false, id: uid(8) });
        }
      })
    );
  };

  const closeEditor = (id: string) => {
    setSidebars(
      produce(sidebars, (draft) => {
        const index = draft.findIndex((sidebar) => sidebar.id === id);
        if (index !== -1) {
          draft.splice(index, 1);
        }
      })
    );
  };

  const pinEditor = (id: string) => {
    setSidebars(
      produce(sidebars, (draft) => {
        const sidebar = draft.find((sidebar) => sidebar.id === id);

        if (sidebar) {
          sidebar.isPinned = true;
        }
      })
    );
  };

  return (
    <RecordEditorSidebarContext.Provider
      value={{ sidebars, openEditor, closeEditor, pinEditor }}
    >
      {children}
    </RecordEditorSidebarContext.Provider>
  );
};

// Create a custom hook to use the sidebar context
export function useRecordEditorSidebar() {
  const context = useContext(RecordEditorSidebarContext);
  if (!context) {
    throw new Error(
      'useRecordEditorSidebar must be used within a RecordEditorSidebarProvider'
    );
  }
  return context;
}

export const EditorSidebars = () => {
  const { sidebars } = useRecordEditorSidebar();

  return (
    <>
      {sidebars.map((sidebar) => (
        <RecordEditorSidebar key={sidebar.id} {...sidebar} />
      ))}
    </>
  );
};
