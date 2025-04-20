import { cn } from '@/lib/utils';
import { Children } from 'react';

interface BreadcrumbsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Breadcrumbs({ ...props }: BreadcrumbsProps) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-row gap-2 text-sm font-semibold overflow-hidden',
        'items-center',
        props.className
      )}
    >
      {Children.map(props.children, (child, index) =>
        child ? (
          <>
            {index > 0 && <span className="text-gray-500">/</span>}
            {child}
          </>
        ) : null
      )}
    </div>
  );
}
