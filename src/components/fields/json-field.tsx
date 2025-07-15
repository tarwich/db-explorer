import React from 'react';
import { Textarea } from '../ui/textarea';

interface JsonFieldProps {
  column: any;
  value: any;
  setValue: (val: any) => void;
  isGenerated: boolean;
}

export function JsonField({ column, value, setValue, isGenerated }: JsonFieldProps) {
  return (
    <Textarea
      value={value ? JSON.stringify(value, null, 2) : ''}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
        try {
          const parsed = JSON.parse(e.target.value);
          setValue(parsed);
        } catch {
          // Invalid JSON, don't update
        }
      }}
      className="font-mono text-sm min-h-[120px]"
      placeholder="Enter valid JSON..."
      readOnly={isGenerated}
    />
  );
}
