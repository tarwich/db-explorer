'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  searchCapabilities?: {
    tableSize: 'small' | 'medium' | 'large';
    searchableColumns: Array<{
      name: string;
      displayName: string;
      searchType: 'exact' | 'text' | 'numeric' | 'date' | 'fulltext';
      indexed: boolean;
      priority: number;
    }>;
    searchStrategies: Array<{
      type: 'fulltext' | 'column_specific' | 'exact_match' | 'fuzzy';
      description: string;
      performance: 'fast' | 'medium' | 'slow';
      recommended: boolean;
    }>;
    supportsFullText: boolean;
  };
  onSearchTypeChange?: (searchType: string) => void;
  className?: string;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  searchCapabilities,
  onSearchTypeChange,
  className,
  placeholder = "Search records...",
}: SearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSearchType, setSelectedSearchType] = useState<string>('column_specific');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchTypeSelect = useCallback((searchType: string) => {
    setSelectedSearchType(searchType);
    onSearchTypeChange?.(searchType);
    setShowSuggestions(false);
  }, [onSearchTypeChange]);

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const getSearchTypeDisplay = (type: string) => {
    switch (type) {
      case 'fulltext':
        return { label: 'Full Text', icon: '🔍' };
      case 'column_specific':
        return { label: 'Smart Search', icon: '✨' };
      case 'exact_match':
        return { label: 'Exact Match', icon: '🎯' };
      case 'fuzzy':
        return { label: 'Fuzzy Search', icon: '🌊' };
      default:
        return { label: 'Search', icon: '🔍' };
    }
  };

  const currentSearchType = getSearchTypeDisplay(selectedSearchType);
  const recommendedStrategies = searchCapabilities?.searchStrategies.filter(s => s.recommended) || [];
  const otherStrategies = searchCapabilities?.searchStrategies.filter(s => !s.recommended) || [];

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex">
        {/* Search Type Selector */}
        {searchCapabilities && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-r-none border-r-0 px-3 text-xs"
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <span className="mr-1">{currentSearchType.icon}</span>
              <span className="hidden sm:inline">{currentSearchType.label}</span>
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>

            {/* Search Type Dropdown */}
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 z-50 mt-1 w-80 rounded-lg border bg-white shadow-lg"
              >
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Search Options for {searchCapabilities.tableSize} table
                  </div>
                  
                  {/* Recommended Strategies */}
                  {recommendedStrategies.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-green-700 mb-1">Recommended</div>
                      {recommendedStrategies.map((strategy) => (
                        <button
                          key={strategy.type}
                          className={cn(
                            "w-full text-left p-2 rounded text-xs hover:bg-gray-50 border transition-colors",
                            selectedSearchType === strategy.type ? "bg-blue-50 border-blue-200" : "border-transparent"
                          )}
                          onClick={() => handleSearchTypeSelect(strategy.type)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{getSearchTypeDisplay(strategy.type).icon}</span>
                              <span className="font-medium">{getSearchTypeDisplay(strategy.type).label}</span>
                              <span className={cn(
                                "px-1.5 py-0.5 text-xs rounded",
                                strategy.performance === 'fast' ? "bg-green-100 text-green-700" :
                                strategy.performance === 'medium' ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              )}>
                                {strategy.performance}
                              </span>
                            </div>
                          </div>
                          <div className="text-gray-600 mt-1">{strategy.description}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Other Strategies */}
                  {otherStrategies.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Other Options</div>
                      {otherStrategies.map((strategy) => (
                        <button
                          key={strategy.type}
                          className={cn(
                            "w-full text-left p-2 rounded text-xs hover:bg-gray-50 border transition-colors",
                            selectedSearchType === strategy.type ? "bg-blue-50 border-blue-200" : "border-transparent"
                          )}
                          onClick={() => handleSearchTypeSelect(strategy.type)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{getSearchTypeDisplay(strategy.type).icon}</span>
                              <span className="font-medium">{getSearchTypeDisplay(strategy.type).label}</span>
                              <span className={cn(
                                "px-1.5 py-0.5 text-xs rounded",
                                strategy.performance === 'fast' ? "bg-green-100 text-green-700" :
                                strategy.performance === 'medium' ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              )}>
                                {strategy.performance}
                              </span>
                            </div>
                          </div>
                          <div className="text-gray-600 mt-1">{strategy.description}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Searchable Columns Info */}
                  {searchCapabilities.searchableColumns.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium text-gray-700 mb-1">Searchable Fields</div>
                      <div className="flex flex-wrap gap-1">
                        {searchCapabilities.searchableColumns.slice(0, 8).map((column) => (
                          <span
                            key={column.name}
                            className={cn(
                              "px-2 py-1 text-xs rounded",
                              column.searchType === 'text' ? "bg-blue-100 text-blue-700" :
                              column.searchType === 'numeric' ? "bg-green-100 text-green-700" :
                              column.searchType === 'date' ? "bg-purple-100 text-purple-700" :
                              "bg-gray-100 text-gray-700"
                            )}
                          >
                            {column.displayName}
                            {column.indexed && <span className="ml-1">⚡</span>}
                          </span>
                        ))}
                        {searchCapabilities.searchableColumns.length > 8 && (
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                            +{searchCapabilities.searchableColumns.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "pl-10 pr-10 h-10",
              searchCapabilities ? "rounded-l-none" : "rounded-md"
            )}
          />
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Stats */}
      {value && searchCapabilities && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-500">
          Searching {searchCapabilities.searchableColumns.length} fields in {searchCapabilities.tableSize} table
          {searchCapabilities.tableSize === 'large' && (
            <span className="text-amber-600"> • Results may be limited</span>
          )}
        </div>
      )}
    </div>
  );
}