'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  allowClear?: boolean;
  maxHeight?: string;
}

export function SimpleSearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Seçim yapın...',
  searchPlaceholder = 'Ara...',
  emptyText = 'Hiçbir öğe bulunamadı.',
  disabled = false,
  loading = false,
  allowClear = false,
  maxHeight = '300px',
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [inputRef, setInputRef] = React.useState<HTMLInputElement | null>(null);

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue);
    setOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.('');
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearchTerm('');
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef && !inputRef.contains(event.target as Node)) {
        setOpen(false);
        setSearchTerm('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, inputRef]);

  return (
    <div className="relative">
      <div
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setOpen(!open)}
      >
        <span className="flex-1 text-left truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.label}
              {selectedOption.description && (
                <span className="text-muted-foreground text-sm">({selectedOption.description})</span>
              )}
              {selectedOption.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {selectedOption.badge}
                </Badge>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {allowClear && value && (
            <button
              type="button"
              onClick={handleClear}
              className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-gray-100 transition-colors"
              aria-label="Clear selection"
            >
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                ref={setInputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>
          
          <ScrollArea style={{ maxHeight }} className="p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-muted-foreground">Yükleniyor...</div>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-muted-foreground">{emptyText}</div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option, index) => (
                  <div
                    key={option.key || option.value || index}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(option.value);
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors",
                      option.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                      value === option.value && "bg-blue-50 hover:bg-blue-100"
                    )}
                  >
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="font-medium truncate">{option.label}</span>
                      {option.description && (
                        <span className="text-sm text-muted-foreground truncate">
                          {option.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {option.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {option.badge}
                        </Badge>
                      )}
                      {value === option.value && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
