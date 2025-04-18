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
              {Object.entries(icons)
                .filter(([name]) =>
                  name.toLowerCase().includes(search.toLowerCase())
                )
                .map(([name, Icon]) => (
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
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
