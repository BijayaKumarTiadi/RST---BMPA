import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  onSearchChange: (value: string) => void;
  onFilterChange: (type: string, value: string, checked: boolean) => void;
  onRangeFilterChange: (type: string, range: any) => void;
  onSortChange: (value: string) => void;
  onApplySearch: () => void;
  onClearFilters: () => void;
  clientFilters: any;
  searchAggregations: any;
  searchResults: any;
  allPreciseSearchResults: any[];
  getUniqueValues: (type: string) => any[];
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
  onSearchChange,
  onFilterChange,
  onRangeFilterChange,
  onSortChange,
  onApplySearch,
  onClearFilters,
  clientFilters,
  searchAggregations,
  searchResults,
  allPreciseSearchResults,
  getUniqueValues
}: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Count active filters
  const activeFilterCount = 
    clientFilters.makes.length +
    clientFilters.grades.length +
    clientFilters.brands.length +
    clientFilters.gsm.length +
    clientFilters.categories.length;

  const handleApply = () => {
    onApplySearch();
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearFilters();
    setIsOpen(false);
  };

  const FilterSection = ({ title, type, children }: { title: string; type: string; children: React.ReactNode }) => (
    <div className="border-b">
      <button
        className="w-full flex items-center justify-between py-4 px-4 text-left hover:bg-gray-50"
        onClick={() => setActiveSection(activeSection === type ? null : type)}
      >
        <span className="font-medium">{title}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${activeSection === type ? 'rotate-90' : ''}`} />
      </button>
      {activeSection === type && (
        <div className="px-4 pb-4">
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
                  onClick={onClearFilters}
                  className="text-sm"
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
                ).map((make: any, index: number) => (
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
                ).map((grade: any, index: number) => (
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
                ).map((brand: any, index: number) => (
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
                ).map((gsm: any, index: number) => (
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
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-background border-t p-4 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleClear}
          >
            Clear All
          </Button>
          <Button 
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}