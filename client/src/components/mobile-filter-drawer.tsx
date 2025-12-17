import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Filter, Search, X, ChevronRight } from "lucide-react";

interface MobileFilterDrawerProps {
  appliedFilters: any;
  pendingSearchTerm: string;
  sortBy: string;
  availableMakes: any[];
  availableGrades: any[];
  availableBrands: any[];
  availableGsm: any[];
  availableLocations: any[];
  availableStates: any[];
  onSearchChange: (value: string) => void;
  onFilterChange: (type: string, value: string, checked: boolean) => void;
  onRangeFilterChange: (type: string, range: any) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
  clientFilters: any;
  searchAggregations: any;
  searchResults: any;
  allPreciseSearchResults: any[];
  getUniqueValues: (type: string) => any[];
  setAppliedFilters?: (filters: any) => void;
}

export function MobileFilterDrawer({
  appliedFilters,
  pendingSearchTerm,
  sortBy,
  availableMakes,
  availableGrades,
  availableBrands,
  availableGsm,
  availableLocations,
  availableStates,
  onSearchChange,
  onFilterChange,
  onRangeFilterChange,
  onSortChange,
  onClearFilters,
  clientFilters,
  searchAggregations,
  searchResults,
  allPreciseSearchResults,
  getUniqueValues,
  setAppliedFilters
}: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Count active filters (including quantity range)
  // Check for non-empty strings (not just truthy) since "0" is a valid filter value
  const hasQuantityFilter = 
    (appliedFilters.quantityRange?.min !== "" && appliedFilters.quantityRange?.min !== undefined) || 
    (appliedFilters.quantityRange?.max !== "" && appliedFilters.quantityRange?.max !== undefined);
  const activeFilterCount =
    clientFilters.makes.length +
    clientFilters.grades.length +
    clientFilters.brands.length +
    clientFilters.gsm.length +
    clientFilters.categories.length +
    (clientFilters.states?.length || 0) +
    (hasQuantityFilter ? 1 : 0);

  const handleApply = () => {
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearFilters();
    // Clear quantity filter using functional update to avoid stale state
    if (setAppliedFilters) {
      setAppliedFilters((prev: any) => ({
        ...prev,
        quantityRange: { min: "", max: "" }
      }));
    }
    setIsOpen(false);
  };

  const FilterSection = ({ title, type, children }: { title: string; type: string; children: React.ReactNode }) => (
    <div className="border-b border-border">
      <button
        className="w-full flex items-center justify-between py-4 px-4 text-left hover-elevate"
        onClick={() => setActiveSection(activeSection === type ? null : type)}
        data-testid={`button-mobile-filter-${type}`}
      >
        <span className="font-medium">{title}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${activeSection === type ? 'rotate-90' : ''}`} />
      </button>
      {activeSection === type && (
        <div className="px-4 pb-4 bg-muted/30">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
          data-testid="button-mobile-filter"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-xl p-0"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b">
          <SheetHeader className="px-4 py-3">
            <div className="flex items-center justify-between">
              <SheetTitle>Filters</SheetTitle>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClearFilters();
                    // Clear quantity filter using functional update to avoid stale state
                    if (setAppliedFilters) {
                      setAppliedFilters((prev: any) => ({
                        ...prev,
                        quantityRange: { min: "", max: "" }
                      }));
                    }
                  }}
                  className="text-sm"
                  data-testid="button-mobile-clear-all"
                >
                  Clear all ({activeFilterCount})
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Filter Content */}
        <ScrollArea className="flex-1">
          <div className="pb-20">
            {/* Sort */}
            <div className="border-b px-4 py-4">
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger data-testid="select-mobile-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="gsm-low">GSM: Low to High</SelectItem>
                  <SelectItem value="gsm-high">GSM: High to Low</SelectItem>
                  <SelectItem value="quantity-low">Quantity: Low to High</SelectItem>
                  <SelectItem value="quantity-high">Quantity: High to Low</SelectItem>
                  <SelectItem value="size-small">Size: Small to Large</SelectItem>
                  <SelectItem value="size-large">Size: Large to Small</SelectItem>
                  <SelectItem value="location">Location (A-Z)</SelectItem>
                  <SelectItem value="company">Company (A-Z)</SelectItem>
                  <SelectItem value="category">Category (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categories */}
            <FilterSection title={`Categories ${clientFilters.categories.length > 0 ? `(${clientFilters.categories.length})` : ''}`} type="categories">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                  getUniqueValues('categories') :
                  (searchAggregations?.categories || []).map((category: any) => ({
                    value: category.category_name || category.name || category.value || (typeof category === 'string' ? category : 'Unknown'),
                    count: category.count || 0
                  }))
                ).map((category: any, index: number) => (
                  <label key={index} className="flex items-center space-x-3 py-2">
                    <Checkbox
                      checked={clientFilters.categories.includes(category.value)}
                      onCheckedChange={(checked) => onFilterChange('categories', category.value, checked as boolean)}
                      data-testid={`checkbox-mobile-category-${category.value}`}
                    />
                    <span className="flex-1 text-sm">{category.value}</span>
                    {category.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {category.count}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Makes */}
            <FilterSection title={`Makes ${clientFilters.makes.length > 0 ? `(${clientFilters.makes.length})` : ''}`} type="makes">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                  getUniqueValues('makes') :
                  (searchAggregations?.makes || availableMakes || []).map((make: any) => ({
                    value: make.Make || make.name || make.value || (typeof make === 'string' ? make : 'Unknown'),
                    count: make.count || 0
                  }))
                ).sort((a: any, b: any) => a.value.localeCompare(b.value)).map((make: any, index: number) => (
                  <label key={index} className="flex items-center space-x-3 py-2">
                    <Checkbox
                      checked={clientFilters.makes.includes(make.value)}
                      onCheckedChange={(checked) => onFilterChange('makes', make.value, checked as boolean)}
                      data-testid={`checkbox-mobile-make-${make.value}`}
                    />
                    <span className="flex-1 text-sm">{make.value}</span>
                    {make.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {make.count}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Grades */}
            <FilterSection title={`Grades ${clientFilters.grades.length > 0 ? `(${clientFilters.grades.length})` : ''}`} type="grades">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                  getUniqueValues('grades') :
                  (searchAggregations?.grades || availableGrades || []).map((grade: any) => ({
                    value: grade.Grade || grade.name || grade.value || (typeof grade === 'string' ? grade : 'Unknown'),
                    count: grade.count || 0
                  }))
                ).sort((a: any, b: any) => a.value.localeCompare(b.value)).map((grade: any, index: number) => (
                  <label key={index} className="flex items-center space-x-3 py-2">
                    <Checkbox
                      checked={clientFilters.grades.includes(grade.value)}
                      onCheckedChange={(checked) => onFilterChange('grades', grade.value, checked as boolean)}
                      data-testid={`checkbox-mobile-grade-${grade.value}`}
                    />
                    <span className="flex-1 text-sm">{grade.value}</span>
                    {grade.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {grade.count}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Brands */}
            <FilterSection title={`Brands ${clientFilters.brands.length > 0 ? `(${clientFilters.brands.length})` : ''}`} type="brands">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                  getUniqueValues('brands') :
                  (searchAggregations?.brands || availableBrands || []).map((brand: any) => ({
                    value: brand.Brand || brand.name || brand.value || (typeof brand === 'string' ? brand : 'Unknown'),
                    count: brand.count || 0
                  }))
                ).sort((a: any, b: any) => a.value.localeCompare(b.value)).map((brand: any, index: number) => (
                  <label key={index} className="flex items-center space-x-3 py-2">
                    <Checkbox
                      checked={clientFilters.brands.includes(brand.value)}
                      onCheckedChange={(checked) => onFilterChange('brands', brand.value, checked as boolean)}
                      data-testid={`checkbox-mobile-brand-${brand.value}`}
                    />
                    <span className="flex-1 text-sm">{brand.value}</span>
                    {brand.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {brand.count}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* GSM */}
            <FilterSection title={`GSM ${clientFilters.gsm.length > 0 ? `(${clientFilters.gsm.length})` : ''}`} type="gsm">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                  getUniqueValues('gsm') :
                  (searchAggregations?.gsm || availableGsm || []).map((gsm: any) => ({
                    value: gsm.GSM || gsm.name || gsm.value || (typeof gsm === 'string' ? gsm : 'Unknown'),
                    count: gsm.count || 0
                  }))
                ).sort((a: any, b: any) => {
                  const numA = parseInt(a.value);
                  const numB = parseInt(b.value);
                  return numA - numB;
                }).map((gsm: any, index: number) => (
                  <label key={index} className="flex items-center space-x-3 py-2">
                    <Checkbox
                      checked={clientFilters.gsm.includes(gsm.value)}
                      onCheckedChange={(checked) => onFilterChange('gsm', gsm.value, checked as boolean)}
                      data-testid={`checkbox-mobile-gsm-${gsm.value}`}
                    />
                    <span className="flex-1 text-sm">{gsm.value} GSM</span>
                    {gsm.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {gsm.count}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* States */}
            <FilterSection title={`States ${(clientFilters.states?.length || 0) > 0 ? `(${clientFilters.states.length})` : ''}`} type="states">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                  getUniqueValues('states') :
                  (searchAggregations?.states || availableStates || []).map((state: any) => ({
                    value: state.state || state.name || state.value || (typeof state === 'string' ? state : 'Unknown'),
                    count: state.count || 0
                  }))
                ).sort((a: any, b: any) => a.value.localeCompare(b.value)).map((state: any, index: number) => (
                  <label key={index} className="flex items-center space-x-3 py-2">
                    <Checkbox
                      checked={(clientFilters.states || []).includes(state.value)}
                      onCheckedChange={(checked) => onFilterChange('states', state.value, checked as boolean)}
                      data-testid={`checkbox-mobile-state-${state.value}`}
                    />
                    <span className="flex-1 text-sm">{state.value}</span>
                    {state.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {state.count}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Quantity Range */}
            {setAppliedFilters && (
              <FilterSection 
                title={`Quantity Range ${appliedFilters.quantityRange?.min || appliedFilters.quantityRange?.max ? '(Active)' : ''}`} 
                type="quantityRange"
              >
                <div className="space-y-4">
                  {/* Min/Max Input Fields */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Min (KG)</label>
                      <Input
                        type="number"
                        min={0}
                        max={10000}
                        value={appliedFilters.quantityRange?.min || ''}
                        onChange={(e) => {
                          const newFilters = { ...appliedFilters };
                          newFilters.quantityRange = { 
                            ...newFilters.quantityRange, 
                            min: e.target.value 
                          };
                          setAppliedFilters(newFilters);
                        }}
                        placeholder="0"
                        className="h-9"
                        data-testid="input-mobile-qty-min"
                      />
                    </div>
                    <span className="text-muted-foreground mt-5">-</span>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Max (KG)</label>
                      <Input
                        type="number"
                        min={0}
                        max={10000}
                        value={appliedFilters.quantityRange?.max || ''}
                        onChange={(e) => {
                          const newFilters = { ...appliedFilters };
                          newFilters.quantityRange = { 
                            ...newFilters.quantityRange, 
                            max: e.target.value 
                          };
                          setAppliedFilters(newFilters);
                        }}
                        placeholder="10000"
                        className="h-9"
                        data-testid="input-mobile-qty-max"
                      />
                    </div>
                  </div>
                  {/* Dual-handle Slider */}
                  <div className="space-y-2 pt-2">
                    <Slider
                      min={0}
                      max={1000}
                      step={10}
                      value={[
                        Math.min(parseInt(appliedFilters.quantityRange?.min) || 0, 1000),
                        Math.min(parseInt(appliedFilters.quantityRange?.max) || 1000, 1000)
                      ]}
                      onValueChange={(values) => {
                        const newFilters = { ...appliedFilters };
                        newFilters.quantityRange = {
                          min: values[0].toString(),
                          max: values[1].toString()
                        };
                        setAppliedFilters(newFilters);
                      }}
                      className="w-full [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-background"
                      data-testid="slider-mobile-qty-range"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>500</span>
                      <span>1000+ KG</span>
                    </div>
                  </div>
                  {(appliedFilters.quantityRange?.min !== "" || appliedFilters.quantityRange?.max !== "") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const newFilters = { ...appliedFilters };
                        newFilters.quantityRange = { min: "", max: "" };
                        setAppliedFilters(newFilters);
                      }}
                      data-testid="button-mobile-clear-qty-filter"
                    >
                      Clear Quantity Filter
                    </Button>
                  )}
                </div>
              </FilterSection>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-background border-t p-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClear}
            data-testid="button-mobile-clear-filters"
          >
            Clear All
          </Button>
          <SheetClose asChild>
            <Button
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              data-testid="button-mobile-apply-filters"
            >
              Apply Filters
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}