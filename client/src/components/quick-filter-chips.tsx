import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface QuickFilterChipsProps {
  clientFilters: any;
  onRemoveFilter: (type: string, value: string) => void;
  onClearAll: () => void;
}

export function QuickFilterChips({
  clientFilters,
  onRemoveFilter,
  onClearAll
}: QuickFilterChipsProps) {
  const hasActiveFilters = 
    clientFilters.makes.length > 0 ||
    clientFilters.grades.length > 0 ||
    clientFilters.brands.length > 0 ||
    clientFilters.gsm.length > 0;

  if (!hasActiveFilters) return null;

  return (
    <div className="lg:hidden mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 sticky top-0 z-40 pb-2 pt-2 -mx-4 px-4 border-b">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">Active Filters</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearAll}
          className="text-xs h-6 px-2"
        >
          Clear All
        </Button>
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {clientFilters.makes.map((make: string, index: number) => (
            <Badge 
              key={`make-${index}`} 
              variant="secondary" 
              className="flex items-center gap-1 whitespace-nowrap"
            >
              Make: {make}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onRemoveFilter('makes', make)}
              />
            </Badge>
          ))}
          
          {clientFilters.grades.map((grade: string, index: number) => (
            <Badge 
              key={`grade-${index}`} 
              variant="secondary" 
              className="flex items-center gap-1 whitespace-nowrap"
            >
              Grade: {grade}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onRemoveFilter('grades', grade)}
              />
            </Badge>
          ))}
          
          {clientFilters.brands.map((brand: string, index: number) => (
            <Badge 
              key={`brand-${index}`} 
              variant="secondary" 
              className="flex items-center gap-1 whitespace-nowrap"
            >
              Brand: {brand}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onRemoveFilter('brands', brand)}
              />
            </Badge>
          ))}
          
          {clientFilters.gsm.map((gsm: string, index: number) => (
            <Badge 
              key={`gsm-${index}`} 
              variant="secondary" 
              className="flex items-center gap-1 whitespace-nowrap"
            >
              GSM: {gsm}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onRemoveFilter('gsm', gsm)}
              />
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}