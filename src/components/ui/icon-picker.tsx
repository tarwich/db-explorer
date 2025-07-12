'use client';

import { cn } from '@/lib/utils';
import { icons } from 'lucide-react';
import * as React from 'react';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface IconPickerProps {
  value?: keyof typeof icons;
  onChange?: (value: keyof typeof icons) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const SelectedIcon = value ? icons[value] : null;

  // Common/popular icons to show initially
  const commonIcons = [
    'Table', 'Database', 'Users', 'User', 'FileText', 'Folder', 'Settings',
    'Home', 'Search', 'Plus', 'Edit', 'Trash', 'Save', 'Download', 'Upload',
    'Mail', 'Phone', 'Calendar', 'Clock', 'Star', 'Heart', 'Check', 'X',
    'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Shield', 'AlertCircle', 'Info'
  ] as (keyof typeof icons)[];

  // Filter logic: show common icons if no search, otherwise show filtered results
  const visibleIcons = React.useMemo(() => {
    if (!search.trim()) {
      return commonIcons.filter(name => icons[name]).map(name => [name, icons[name]] as const);
    }
    
    return Object.entries(icons)
      .filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 100); // Limit to 100 results to maintain performance
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn('size-8', className)}
        >
          {SelectedIcon ? (
            <SelectedIcon className="size-4" />
          ) : (
            <span className="text-muted-foreground">?</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="Search icons..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No icons found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-6 gap-1 p-1">
              {visibleIcons.map(([name, Icon]) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onChange?.(name as keyof typeof icons);
                    setOpen(false);
                  }}
                  className="size-8 p-0 flex items-center justify-center"
                >
                  <Icon className="size-4" />
                </CommandItem>
              ))}
            </div>
            {!search.trim() && (
              <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                Type to search {Object.keys(icons).length} icons...
              </div>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
