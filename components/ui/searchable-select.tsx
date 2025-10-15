'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  maxHeight?: string;
  showSearch?: boolean;
  allowClear?: boolean;
  onSearch?: (searchTerm: string) => void;
  loading?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Seçin...",
  searchPlaceholder = "Ara...",
  emptyText = "Sonuç bulunamadı",
  disabled = false,
  className,
  maxHeight = "200px",
  showSearch = true,
  allowClear = false,
  onSearch,
  loading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;
    
    const term = searchTerm.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(term) ||
      option.description?.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
    onSearch?.(searchValue);
  };

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue);
    setOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedOption && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedOption ? (
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="font-medium truncate">{selectedOption.label}</span>
                {selectedOption.description && (
                  <span className="text-sm text-muted-foreground truncate">
                    {selectedOption.description}
                  </span>
                )}
              </div>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
            {selectedOption?.badge && (
              <Badge variant="secondary" className="ml-2">
                {selectedOption.badge}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {allowClear && selectedOption && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          {showSearch && (
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
              />
            </div>
          )}
          <CommandList style={{ maxHeight }}>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Yükleniyor...
              </div>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.value}-${option.label}`}
                    onSelect={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      "flex items-center justify-between cursor-pointer",
                      option.disabled && "opacity-50 cursor-not-allowed"
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
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
