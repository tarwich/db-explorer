import { useCallback, useRef, useState } from 'react';

interface UseResizableOptions {
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
}

interface UseResizableReturn {
  width: number;
  startResizing: (e: React.MouseEvent) => void;
  isResizing: React.RefObject<boolean>;
  resizerProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    className: string;
  };
}

export function useResizable({
  minWidth = 200,
  maxWidth = 600,
  initialWidth = 300,
}: UseResizableOptions = {}): UseResizableReturn {
  const [width, setWidth] = useState(initialWidth);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing.current) return;
      setWidth((width) => {
        const newWidth = e.clientX;
        return Math.max(minWidth, Math.min(maxWidth, newWidth));
      });
    },
    [maxWidth, minWidth]
  );

  const resizerProps = {
    onMouseDown: startResizing,
    className:
      'absolute inset-0 w-2 cursor-col-resize hover:bg-gray-200 active:bg-gray-300',
  };

  return {
    width,
    startResizing,
    isResizing,
    resizerProps,
  };
}
