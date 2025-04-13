import { PlusIcon } from '@heroicons/react/24/outline';
import { icons } from 'lucide-react';
import { Button } from './ui/button';

export function Header({
  icon,
  title,
  onNew,
}: {
  icon: keyof typeof icons;
  title: string;
  onNew: () => void;
}) {
  const Icon = icons[icon];

  return (
    <header className="flex flex-row items-center justify-between">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title}
      </h1>
      {onNew && (
        <Button variant="outline" size="sm" onClick={onNew}>
          <PlusIcon className="h-4 w-4" />
          New
        </Button>
      )}
    </header>
  );
}
