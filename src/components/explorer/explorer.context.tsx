'use client';

import { createContext, useContext, useState } from 'react';
import { ICollection } from './types';

export const createExplorerContext = () => {
  const [collection, setCollection] = useState<ICollection | null>(null);

  return { collection, setCollection };
};

export const ExplorerContext = createContext<ReturnType<
  typeof createExplorerContext
> | null>(null);

export function ExplorerProvider({ children }: { children: React.ReactNode }) {
  const explorerContext = createExplorerContext();

  return (
    <ExplorerContext.Provider value={explorerContext}>
      {children}
    </ExplorerContext.Provider>
  );
}

export function useExplorer() {
  const context = useContext(ExplorerContext);

  if (!context) {
    throw new Error('useExplorer must be used within a ExplorerProvider');
  }

  return context;
}
