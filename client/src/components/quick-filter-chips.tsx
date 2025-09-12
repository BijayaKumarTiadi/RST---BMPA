import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface QuickFilterChipsProps {
  appliedFilters: any;
  onRemoveFilter: (type: string, value: string) => void;
  onClearRange: (type: string) => void;
  onClearAll: () => void;
}

export function QuickFilterChips({
  appliedFilters,
  onRemoveFilter,
  onClearRange,
  onClearAll
}: QuickFilterChipsProps) {
  const hasActiveFilters = 
    appliedFilters.selectedMakes.length > 0 ||
    appliedFilters.selectedGrades.length > 0 ||
    appliedFilters.selectedBrands.length > 0 ||
    appliedFilters.selectedCategories.length > 0 ||
    appliedFilters.selectedLocations.length > 0 ||
    appliedFilters.gsmRange.min ||
    appliedFilters.gsmRange.max ||
    appliedFilters.priceRange.min ||
    appliedFilters.priceRange.max;

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
          {appliedFilters.selectedMakes.map((make: string, index: number) => (
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
          
          {appliedFilters.selectedGrades.map((grade: string, index: number) => (
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
          
          {appliedFilters.selectedBrands.map((brand: string, index: number) => (
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
          
          {appliedFilters.selectedCategories.map((category: string, index: number) => (
            <Badge 
              key={`category-${index}`} 
              variant="secondary" 
              className="flex items-center gap-1 whitespace-nowrap"
            >
              Category: {category}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onRemoveFilter('categories', category)}
              />
            </Badge>
          ))}
          
          {appliedFilters.selectedLocations.map((location: string, index: number) => (
            <Badge 
              key={`location-${index}`} 
              variant="secondary" 
              className="flex items-center gap-1 whitespace-nowrap"
            >
              Location: {location}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onRemoveFilter('locations', location)}
              />
            </Badge>
          ))}
          
          {(appliedFilters.gsmRange.min || appliedFilters.gsmRange.max) && (
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1 whitespace-nowrap"
            >
              GSM: {appliedFilters.gsmRange.min || '0'}-{appliedFilters.gsmRange.max || '∞'}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onClearRange('gsm')}
              />
            </Badge>
          )}
          
          {(appliedFilters.priceRange.min || appliedFilters.priceRange.max) && (
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1 whitespace-nowrap"
            >
              ₹{appliedFilters.priceRange.min || '0'}-{appliedFilters.priceRange.max || '∞'}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onClearRange('price')}
              />
            </Badge>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}