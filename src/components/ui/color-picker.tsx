'use client';

import { cn } from '@/lib/utils';
import { useDisclosure } from '@reactuses/core';
import { FC } from 'react';
import { Colors, TColorName } from '../explorer/item-views/item-colors';
import { Button } from './button';
import { Command, CommandGroup, CommandItem } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface ColorPickerProps {
  value?: TColorName;
  onChange?: (value: TColorName) => void;
  className?: string;
}

export const ColorPicker: FC<ColorPickerProps> = ({
  value,
  onChange,
  className,
}) => {
  const { isOpen, onOpenChange, onClose } = useDisclosure();

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={isOpen}
          className={cn('size-8', className, Colors[value || 'slate'])}
        >
          {value ? 'X' : <span className="text-muted-foreground">?</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Command>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-6 gap-1 p-1">
              {Object.entries(Colors).map(([name, Color]) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onChange?.(name as TColorName);
                    onClose();
                  }}
                  className="size-8 p-0 flex items-center justify-center"
                >
                  <Swatch color={name as TColorName} />
                </CommandItem>
              ))}
            </div>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Swatch = ({ color }: { color: TColorName }) => {
  return (
    <div
      className={`size-6 rounded-sm border flex flex-col items-center justify-center text-xs ${Colors[color]}`}
    >
      X
    </div>
  );
};
