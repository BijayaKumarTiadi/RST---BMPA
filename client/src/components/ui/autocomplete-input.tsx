import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string, item: any) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  suggestions: any[];
  displayField: string;
  valueField: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
  allowFreeText?: boolean;
  maxLength?: number;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  onTextChange,
  placeholder,
  suggestions,
  displayField,
  valueField,
  disabled = false,
  className,
  testId,
  allowFreeText = true,
  maxLength,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize input value from selected value or keep the text
  useEffect(() => {
    if (value) {
      // Try to find by ID first
      const selected = suggestions.find(
        (item) => item[valueField]?.toString() === value
      );
      if (selected) {
        let displayValue = selected[displayField] || "";
        // Enforce maxLength if specified
        if (maxLength && displayValue.length > maxLength) {
          displayValue = displayValue.slice(0, maxLength);
        }
        setInputValue(displayValue);
      } else if (allowFreeText) {
        // If not found in suggestions and allowFreeText, use the value as display text
        let displayValue = value;
        // Enforce maxLength if specified
        if (maxLength && displayValue.length > maxLength) {
          displayValue = displayValue.slice(0, maxLength);
        }
        setInputValue(displayValue);
      }
    } else {
      // Clear input if value is empty
      setInputValue("");
    }
  }, [value, suggestions, valueField, displayField, allowFreeText, maxLength]);

  // Filter suggestions based on input and remove duplicates
  useEffect(() => {
    const uniqueSuggestions = suggestions.filter((item, index, self) => {
      const displayValue = item[displayField] || "";
      // Remove duplicates based on display field
      return self.findIndex((i) => (i[displayField] || "") === displayValue) === index;
    });

    if (!inputValue) {
      setFilteredSuggestions(uniqueSuggestions);
    } else {
      const filtered = uniqueSuggestions.filter((item) => {
        const displayValue = item[displayField] || "";
        return displayValue.toLowerCase().includes(inputValue.toLowerCase());
      });
      setFilteredSuggestions(filtered);
    }
  }, [inputValue, suggestions, displayField]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Enforce maxLength if specified
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }
    
    setInputValue(newValue);
    setOpen(true);
    
    // Always call onTextChange with the current text
    if (onTextChange) {
      onTextChange(newValue);
    }
    
    // Check if input matches any suggestion exactly
    const exactMatch = suggestions.find(
      (item) => (item[displayField] || "").toLowerCase() === newValue.toLowerCase()
    );
    
    if (exactMatch) {
      const selectedValue = exactMatch[valueField]?.toString() || "";
      onChange(selectedValue);
      if (onSelect) {
        onSelect(selectedValue, exactMatch);
      }
    } else if (allowFreeText) {
      // For free text, pass the text itself as the value
      onChange(newValue);
      // Also trigger onSelect with the text value
      if (onSelect) {
        onSelect(newValue, { [valueField]: newValue, [displayField]: newValue });
      }
    } else {
      onChange("");
    }
  };

  const handleSelect = (item: any) => {
    const selectedValue = item[valueField]?.toString() || "";
    let displayValue = item[displayField] || "";
    
    // Enforce maxLength if specified
    if (maxLength && displayValue.length > maxLength) {
      displayValue = displayValue.slice(0, maxLength);
    }
    
    setInputValue(displayValue);
    onChange(selectedValue);
    if (onSelect) {
      onSelect(selectedValue, item);
    }
    setOpen(false);
  };

  const handleFocus = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if focus is moving to the popover
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && popoverRef.current?.contains(relatedTarget)) {
      return;
    }
    
    // Delay closing to allow click events to register
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "bg-popover border-border text-foreground placeholder:text-muted-foreground",
          className
        )}
        data-testid={testId}
        autoComplete="off"
        maxLength={maxLength}
      />
      {open && filteredSuggestions.length > 0 && (
        <div
          ref={popoverRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md"
        >
          <Command className="rounded-md">
            <CommandList className="max-h-[200px] overflow-y-auto">
              {filteredSuggestions.length === 0 ? (
                <CommandEmpty className="py-2 px-3 text-sm text-muted-foreground">
                  No results found
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredSuggestions.map((item, index) => {
                    const itemValue = item[valueField]?.toString() || "";
                    const displayValue = item[displayField] || "";
                    const isSelected = value === itemValue;
                    
                    return (
                      <CommandItem
                        key={`${itemValue}-${index}`}
                        value={displayValue}
                        onSelect={() => handleSelect(item)}
                        className={cn(
                          "cursor-pointer",
                          isSelected && "bg-accent"
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {displayValue}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}