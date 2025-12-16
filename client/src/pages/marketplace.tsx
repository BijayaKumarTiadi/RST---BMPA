import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Navigation from "@/components/navigation";
import { Package, Search, Filter, MessageCircle, MapPin, Heart, Eye, Edit, ChevronDown, ChevronUp, Mail, MessageSquare, Calendar, SlidersHorizontal, Loader2, X, LayoutGrid, List } from "lucide-react";
import { Link, useLocation } from "wouter";
import ProductDetailsModal from "@/components/product-details-modal";
import EnquiryFormModal from "@/components/inquiry-form-modal";
import WhatsAppQuotationModal from "@/components/whatsapp-quotation-modal";
import PowerSearch from "@/components/power-search";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { QuickFilterChips } from "@/components/quick-filter-chips";

export default function Marketplace() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'block' | 'grid'>('block'); // Default to block view
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAggregations, setSearchAggregations] = useState<any>(null);
  // Unified Filter State
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    selectedMakes: [] as string[],
    selectedGrades: [] as string[],
    selectedBrands: [] as string[],
    selectedCategories: [] as string[],
    selectedLocations: [] as string[],
    gsmRange: { min: "", max: "" },
    quantityRange: { min: "", max: "" }, // Quantity range in KG for Paper/Board/Kraft
    dimensionRange: {
      deckle: { min: "", max: "" },
      grain: { min: "", max: "" }
    },
    dateRange: "all" // all, today, week, month
  });

  // Pending filters (UI state, not applied yet)
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [pendingSelectedCategory, setPendingSelectedCategory] = useState("");

  // Main search state - this will be used for everything
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Client-side sorting function
  const sortDeals = (deals: any[], sortType: string) => {
    if (!deals || deals.length === 0) return deals;

    const dealsCopy = [...deals];

    switch (sortType) {
      case 'newest':
        return dealsCopy.sort((a, b) => new Date(b.deal_created_at).getTime() - new Date(a.deal_created_at).getTime());
      case 'oldest':
        return dealsCopy.sort((a, b) => new Date(a.deal_created_at).getTime() - new Date(b.deal_created_at).getTime());
      case 'gsm-low':
        return dealsCopy.sort((a, b) => (a.GSM || 0) - (b.GSM || 0));
      case 'gsm-high':
        return dealsCopy.sort((a, b) => (b.GSM || 0) - (a.GSM || 0));
      case 'quantity-low':
        return dealsCopy.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      case 'quantity-high':
        return dealsCopy.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      case 'size-small':
        return dealsCopy.sort((a, b) => {
          const sizeA = (a.Deckle_mm || 0) * (a.grain_mm || 0);
          const sizeB = (b.Deckle_mm || 0) * (b.grain_mm || 0);
          return sizeA - sizeB;
        });
      case 'size-large':
        return dealsCopy.sort((a, b) => {
          const sizeA = (a.Deckle_mm || 0) * (a.grain_mm || 0);
          const sizeB = (b.Deckle_mm || 0) * (b.grain_mm || 0);
          return sizeB - sizeA;
        });
      case 'location':
        return dealsCopy.sort((a, b) => (a.Location || '').localeCompare(b.Location || ''));
      case 'company':
        return dealsCopy.sort((a, b) => (a.created_by_company || '').localeCompare(b.created_by_company || ''));
      case 'category':
        return dealsCopy.sort((a, b) => (a.category_name || '').localeCompare(b.category_name || ''));
      default:
        return dealsCopy.sort((a, b) => new Date(b.deal_created_at).getTime() - new Date(a.deal_created_at).getTime());
    }
  };

  // Available filter options from search API (dynamic based on search)
  const [availableMakes, setAvailableMakes] = useState<any[]>([]);
  const [availableGrades, setAvailableGrades] = useState<any[]>([]);
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);
  const [availableGsm, setAvailableGsm] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [availableStates, setAvailableStates] = useState<any[]>([]);

  // Spare part filter states
  const [isSparePartMode, setIsSparePartMode] = useState(false);
  const [availableProcesses, setAvailableProcesses] = useState<any[]>([]);
  const [availableCategoryTypes, setAvailableCategoryTypes] = useState<any[]>([]);
  const [availableMachineTypes, setAvailableMachineTypes] = useState<any[]>([]);
  const [availableManufacturers, setAvailableManufacturers] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // Precise search states
  const [preciseSearch, setPreciseSearch] = useState({
    category: "",
    gsm: "",
    tolerance: "10",
    deckle: "",
    deckleUnit: "cm",
    grain: "",
    grainUnit: "cm",
    dimensionTolerance: "2",
    // Spare part fields
    process: "",
    categoryType: "",
    machineType: "",
    manufacturer: "",
    model: "",
    partName: "",
    partNo: ""
  });

  // Auto-suggestion states
  const [gsmSuggestions, setGsmSuggestions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Client-side pagination for precise search results
  const [allPreciseSearchResults, setAllPreciseSearchResults] = useState<any[]>([]);

  // Client-side filter states (checkbox based)
  const [clientFilters, setClientFilters] = useState({
    makes: [] as string[],
    grades: [] as string[],
    brands: [] as string[],
    gsm: [] as string[],
    categories: [] as string[],
    states: [] as string[],
    // Spare part filters
    processes: [] as string[],
    categoryTypes: [] as string[],
    machineTypes: [] as string[],
    manufacturers: [] as string[],
    models: [] as string[]
  });
  const [filteredResults, setFilteredResults] = useState<any[]>([]);

  // Handle checkbox changes for client-side filters
  const handleFilterChange = (filterType: string, value: string, checked: boolean) => {
    setClientFilters(prev => {
      const newFilters = { ...prev };
      const filterArray = newFilters[filterType as keyof typeof newFilters];

      if (checked) {
        // Add value if not already present
        if (!filterArray.includes(value)) {
          newFilters[filterType as keyof typeof newFilters] = [...filterArray, value];
        }
      } else {
        // Remove value
        newFilters[filterType as keyof typeof newFilters] = filterArray.filter(item => item !== value);
      }

      return newFilters;
    });
  };

  // Clear all client-side filters
  const clearClientFilters = () => {
    setClientFilters({
      makes: [],
      grades: [],
      brands: [],
      gsm: [],
      categories: [],
      states: [],
      processes: [],
      categoryTypes: [],
      machineTypes: [],
      manufacturers: [],
      models: []
    });
  };

  // Auto-apply client filters when they change
  useEffect(() => {
    applyClientFilters();
  }, [clientFilters, allPreciseSearchResults, appliedFilters.quantityRange]);

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    categories: true,
    states: false,
    makes: false,
    grades: false,
    brands: false,
    gsm: false,
    units: false,
    location: false,
    gsmRange: false,
    quantityRange: false,
    priceRange: false,
    dimensionRange: false,
    // Spare part sections
    processes: false,
    categoryTypes: false,
    machineTypes: false,
    manufacturers: false,
    models: false
  });
  const [preciseSearchExpanded, setPreciseSearchExpanded] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchCardRef = useRef<HTMLDivElement | null>(null);

  // Modal states
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Fetch stock hierarchy
  const { data: stockHierarchy, isLoading: hierarchyLoading } = useQuery({
    queryKey: ["/api/stock/hierarchy"],
    queryFn: async () => {
      const response = await fetch('/api/stock/hierarchy');
      if (!response.ok) throw new Error('Failed to fetch stock hierarchy');
      return response.json();
    },
  });

  // Fetch all categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/suggestions/categories", "all"],
    queryFn: async () => {
      const response = await fetch('/api/suggestions/categories?q=');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const result = await response.json();
      return result.suggestions || [];
    },
  });

  // Fetch distinct states for filter
  const { data: statesData } = useQuery({
    queryKey: ["/api/suggestions/states"],
    queryFn: async () => {
      const response = await fetch('/api/suggestions/states');
      if (!response.ok) throw new Error('Failed to fetch states');
      const result = await response.json();
      return result.suggestions || [];
    },
  });

  // Update available states when data is fetched
  useEffect(() => {
    if (statesData) {
      setAvailableStates(statesData);
    }
  }, [statesData]);

  // Fetch user settings for dimension unit preference
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Update precise search default units when user settings are loaded
  useEffect(() => {
    if (userSettings?.dimension_unit) {
      const defaultUnit = userSettings.dimension_unit;
      setPreciseSearch(prev => ({
        ...prev,
        deckleUnit: defaultUnit,
        grainUnit: defaultUnit
      }));
    }
  }, [userSettings]);

  // Helper function to check if group is Kraft Reel
  const isKraftReelGroup = (groupName: string, groupID?: number): boolean => {
    return groupName?.toLowerCase().trim() === 'kraft reel' || groupID === 3;
  };

  // Helper function to format dimensions based on user preference
  const formatDimensions = (deckle_mm: number, grain_mm: number, groupName?: string, groupID?: number) => {
    const userUnit = userSettings?.dimension_unit || 'cm';
    const isKraftReel = isKraftReelGroup(groupName || '', groupID);

    if (isKraftReel) {
      // For Kraft Reel: use "," separator and show original grain_mm value with "B.F" suffix
      if (userUnit === 'inch') {
        const deckleInch = (deckle_mm / 25.4).toFixed(2);
        return (
          <>
            <div>{deckleInch}", {grain_mm} B.F</div>
            <div className="text-xs text-muted-foreground">{(deckle_mm / 10).toFixed(1)} cm, {grain_mm} B.F</div>
          </>
        );
      } else {
        return (
          <>
            <div>{(deckle_mm / 10).toFixed(1)} cm, {grain_mm} B.F</div>
            <div className="text-xs text-muted-foreground">{(deckle_mm / 25.4).toFixed(2)}", {grain_mm} B.F</div>
          </>
        );
      }
    } else {
      // For regular products: use "×" separator and normal conversions
      if (userUnit === 'inch') {
        const deckleInch = (deckle_mm / 25.4).toFixed(2);
        const grainInch = (grain_mm / 25.4).toFixed(2);
        return (
          <>
            <div>{deckleInch}" × {grainInch}"</div>
            <div className="text-xs text-muted-foreground">{(deckle_mm / 10).toFixed(1)} × {(grain_mm / 10).toFixed(1)} cm</div>
          </>
        );
      } else {
        return (
          <>
            <div>{(deckle_mm / 10).toFixed(1)} × {(grain_mm / 10).toFixed(1)} cm</div>
            <div className="text-xs text-muted-foreground">{(deckle_mm / 25.4).toFixed(2)}" × {(grain_mm / 25.4).toFixed(2)}"</div>
          </>
        );
      }
    }
  };

  // Fetch deals - initial load only, sorting is client-side
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals", user?.id],
    queryFn: async () => {
      // If we have search results, use them instead
      if (searchResults && searchResults.data) {
        return {
          deals: searchResults.data,
          total: searchResults.total,
          page: searchResults.page || 1
        };
      }

      // Otherwise fetch regular deals (no sorting, we'll sort client-side)
      const params = new URLSearchParams();
      params.append('limit', '100'); // Get more data for client-side sorting
      params.append('page', '1');

      // Exclude user's own products from marketplace view
      if (user?.id) {
        params.append('exclude_member_id', user.id.toString());
      }

      const response = await fetch(`/api/deals?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    },
    enabled: !isSearching, // Don't fetch when search is in progress
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to access the marketplace.</p>
            <Button onClick={() => setLocation('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to check if any client filters are applied
  const hasClientFilters = () => {
    return Object.values(clientFilters).some(filterArray => filterArray.length > 0);
  };

  // Use search results if available, otherwise use regular deals
  // Apply client-side sorting to existing data (NO API CALLS)
  let deals = [];
  let totalDeals = 0;

  if (searchResults?.maxRecords && allPreciseSearchResults.length > 0) {
    // Use filtered results if filters are applied, otherwise use all results
    const rawData = hasClientFilters() || appliedFilters.quantityRange.min || appliedFilters.quantityRange.max
      ? filteredResults
      : allPreciseSearchResults;

    // Apply client-side sorting first
    const sortedData = sortDeals(rawData, sortBy);

    // Then apply client-side pagination for precise search (max 100 records)
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    deals = sortedData.slice(startIndex, endIndex);
    totalDeals = sortedData.length;
  } else {
    // Get raw data from search results or regular deals
    let rawData = searchResults?.data || dealsData?.deals || [];

    // Apply quantity filter to regular deals
    if (appliedFilters.quantityRange.min || appliedFilters.quantityRange.max) {
      rawData = rawData.filter((deal: any) => {
        let quantityInKg = deal.quantity || 0;

        // Convert to KG based on unit
        const unit = (deal.OfferUnit || deal.unit || '').toLowerCase();
        if (unit === 'mt') {
          quantityInKg = quantityInKg * 1000;
        } else if (unit === 'kg') {
          quantityInKg = quantityInKg;
        }

        const minQty = appliedFilters.quantityRange.min ? parseInt(appliedFilters.quantityRange.min) : 0;
        const maxQty = appliedFilters.quantityRange.max ? parseInt(appliedFilters.quantityRange.max) : Infinity;

        return quantityInKg >= minQty && quantityInKg <= maxQty;
      });
    }

    // Apply client-side sorting to existing data (NO API CALLS)
    const sortedData = sortDeals(rawData, sortBy);

    // Apply pagination to sorted data
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    deals = sortedData.slice(startIndex, endIndex);
    totalDeals = sortedData.length;
  }

  const totalPages = Math.max(1, Math.ceil(totalDeals / itemsPerPage));

  // Handle page change with filters
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // If filters are active, reapply them with the new page
    if (hasActiveFilters()) {
      applyFilters(appliedFilters, false); // false means don't reset page
    }
    // Note: For precise search with maxRecords (100 limit), pagination is handled client-side automatically
  };

  // Ensure current page doesn't exceed total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const groups = stockHierarchy?.groups || [];
  const makes = stockHierarchy?.makes || [];
  const grades = stockHierarchy?.grades || [];
  const brands = stockHierarchy?.brands || [];

  // Define dynamic filter options first based on search results
  const dynamicMakes = searchAggregations?.makes
    ? searchAggregations.makes.map((item: any) => ({ name: item.Make, count: item.count }))
    : null;

  const dynamicGrades = searchAggregations?.grades
    ? searchAggregations.grades.map((item: any) => ({ name: item.Grade, count: item.count }))
    : null;

  const dynamicBrands = searchAggregations?.brands
    ? searchAggregations.brands.map((item: any) => ({ name: item.Brand, count: item.count }))
    : null;

  const dynamicUnits = searchAggregations?.units
    ? searchAggregations.units.map((item: any) => ({ name: item.OfferUnit, count: item.count }))
    : null;

  // Dynamic GSM options based on search results or all deals
  const gsmOptions = searchAggregations?.gsm
    ? searchAggregations.gsm.map((item: any) => ({ value: item.GSM.toString(), count: item.count }))
    : Array.from(new Set(deals.filter((deal: any) => deal.GSM).map((deal: any) => deal.GSM.toString()))).sort((a, b) => parseFloat(a as string) - parseFloat(b as string)).map((gsm) => ({ value: gsm as string, count: 0 }));

  // No filtering needed - using available options from search API

  // Reset to page 1 when filters change
  const resetPage = () => setCurrentPage(1);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset page when quantity filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters.quantityRange]);

  // Load initial filter data when component mounts
  useEffect(() => {
    loadInitialFilters();
  }, []);

  // Load initial filter options
  const loadInitialFilters = async () => {
    try {
      console.log('Loading initial filter data...');
      const response = await fetch('/api/search/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '', // Empty query to get all data
          page: 1,
          pageSize: 1, // Just need aggregations, not all results
          exclude_member_id: user?.id // Exclude user's own products
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Initial filter response:', data);

        if (data.aggregations) {
          console.log('Setting initial filter options');
          setAvailableMakes(data.aggregations.makes || []);
          setAvailableGrades(data.aggregations.grades || []);
          setAvailableBrands(data.aggregations.brands || []);
          setAvailableGsm(data.aggregations.gsm || []);
          setAvailableUnits(data.aggregations.units || []);
          setAvailableStates(data.aggregations.states || []);
        }
      }
    } catch (error) {
      console.error('Error loading initial filters:', error);
    }
  };

  // Apply pending filters
  const applySearch = () => {
    // Trigger search with current search term
    setCurrentPage(1);
    performSearch(pendingSearchTerm);
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch('/api/search/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          page: currentPage,
          pageSize: itemsPerPage,
          exclude_member_id: user?.id // Exclude user's own products
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setSearchTerm(query); // Update search term after successful search
        console.log('Search API response:', data);
        console.log('Available aggregations:', data.aggregations);

        if (data.aggregations) {
          setSearchAggregations(data.aggregations);

          // Log each filter array to debug
          console.log('Makes data:', data.aggregations.makes);
          console.log('Grades data:', data.aggregations.grades);
          console.log('Brands data:', data.aggregations.brands);
          console.log('GSM data:', data.aggregations.gsm);

          const makes = data.aggregations.makes || [];
          const grades = data.aggregations.grades || [];
          const brands = data.aggregations.brands || [];
          const gsm = data.aggregations.gsm || [];
          const units = data.aggregations.units || [];

          console.log('Setting availableMakes:', makes);
          console.log('Setting availableGrades:', grades);
          console.log('Setting availableBrands:', brands);
          console.log('Setting availableGsm:', gsm);

          setAvailableMakes(makes);
          setAvailableGrades(grades);
          setAvailableBrands(brands);
          setAvailableGsm(gsm);
          setAvailableUnits(units);
          setAvailableStates(data.aggregations.states || []);
        } else {
          console.log('No aggregations found in response');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle hierarchical filter changes
  // Handle search term changes to update filter options
  const handleSearchChange = async (value: string) => {
    setPendingSearchTerm(value);

    // Update filter options based on current search
    if (value.trim()) {
      try {
        const response = await fetch('/api/search/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: value.trim(),
            page: 1,
            pageSize: itemsPerPage,
            exclude_member_id: user?.id // Exclude user's own products
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Search Change API response:', data);

          if (data.aggregations) {
            console.log('Updating filters with aggregations:', data.aggregations);
            setAvailableMakes(data.aggregations.makes || []);
            setAvailableGrades(data.aggregations.grades || []);
            setAvailableBrands(data.aggregations.brands || []);
            setAvailableGsm(data.aggregations.gsm || []);
            setAvailableUnits(data.aggregations.units || []);
          } else {
            console.log('No aggregations in search change response');
          }
        }
      } catch (error) {
        console.error('Error updating filters:', error);
      }
    } else {
      // Clear filter options when search is empty
      setAvailableMakes([]);
      setAvailableGrades([]);
      setAvailableBrands([]);
      setAvailableGsm([]);
      setAvailableUnits([]);
    }
  };

  const addFilterToSearch = (filterText: string) => {
    const currentText = pendingSearchTerm.trim();
    const newText = currentText ? `${currentText} ${filterText}` : filterText;
    setPendingSearchTerm(newText);
  };

  const handleMakeClick = (make: any) => {
    console.log('Make clicked:', make);
    const makeText = make.Make || make.name || make.value || (typeof make === 'string' ? make : '');
    addFilterToSearch(makeText);
  };

  const handleGradeClick = (grade: any) => {
    console.log('Grade clicked:', grade);
    const gradeText = grade.Grade || grade.name || grade.value || (typeof grade === 'string' ? grade : '');
    addFilterToSearch(gradeText);
  };

  const handleBrandClick = (brand: any) => {
    console.log('Brand clicked:', brand);
    const brandText = brand.Brand || brand.name || brand.value || (typeof brand === 'string' ? brand : '');
    addFilterToSearch(brandText);
  };

  const handleGsmClick = (gsm: any) => {
    console.log('GSM clicked:', gsm);
    const gsmText = gsm.GSM || gsm.value || (typeof gsm === 'string' ? gsm : '');
    addFilterToSearch(`${gsmText}gsm`);
  };

  const handleUnitClick = (unit: any) => {
    addFilterToSearch(unit.OfferUnit || unit.name || unit.value || unit);
  };

  // Apply filters and trigger search
  const applyFilters = async (newFilters = appliedFilters, resetPage = true) => {
    setIsSearching(true);
    if (resetPage) setCurrentPage(1);

    try {
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: newFilters,
          page: resetPage ? 1 : currentPage,
          pageSize: 100, // Get more data for client-side sorting
          sortBy: 'newest' // Use default sort for API, sorting handled client-side
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setSearchAggregations(data.aggregations || null);
        setAppliedFilters(newFilters);
        console.log('Applied filters:', newFilters);
        console.log('Filter results:', data);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Add filter
  const addFilter = (type: string, value: string) => {
    const newFilters = { ...appliedFilters };
    switch (type) {
      case 'makes':
        if (!newFilters.selectedMakes.includes(value)) {
          newFilters.selectedMakes = [...newFilters.selectedMakes, value];
        }
        break;
      case 'grades':
        if (!newFilters.selectedGrades.includes(value)) {
          newFilters.selectedGrades = [...newFilters.selectedGrades, value];
        }
        break;
      case 'brands':
        if (!newFilters.selectedBrands.includes(value)) {
          newFilters.selectedBrands = [...newFilters.selectedBrands, value];
        }
        break;
      case 'categories':
        if (!newFilters.selectedCategories.includes(value)) {
          newFilters.selectedCategories = [...newFilters.selectedCategories, value];
        }
        break;
      case 'locations':
        if (!newFilters.selectedLocations.includes(value)) {
          newFilters.selectedLocations = [...newFilters.selectedLocations, value];
        }
        break;
    }
    applyFilters(newFilters);
  };

  // Remove filter
  const removeFilter = (type: string, value: string) => {
    setClientFilters(prev => {
      const newFilters = { ...prev };
      const filterArray = newFilters[type as keyof typeof newFilters];

      if (Array.isArray(filterArray)) {
        newFilters[type as keyof typeof newFilters] = filterArray.filter(item => item !== value);
      }

      return newFilters;
    });
  };

  // Set range filter
  const setRangeFilter = (type: string, range: any) => {
    const newFilters = { ...appliedFilters };
    if (type === 'gsm') {
      newFilters.gsmRange = range;
    } else if (type === 'deckle') {
      newFilters.dimensionRange.deckle = range;
    } else if (type === 'grain') {
      newFilters.dimensionRange.grain = range;
    }
    applyFilters(newFilters);
  };

  // Check if filters are active
  const hasActiveFilters = () => {
    return appliedFilters.selectedMakes.length > 0 ||
      appliedFilters.selectedGrades.length > 0 ||
      appliedFilters.selectedBrands.length > 0 ||
      appliedFilters.selectedCategories.length > 0 ||
      appliedFilters.selectedLocations.length > 0 ||
      appliedFilters.gsmRange.min !== "" ||
      appliedFilters.gsmRange.max !== "" ||
      appliedFilters.quantityRange.min !== "" ||
      appliedFilters.quantityRange.max !== "" ||
      appliedFilters.dimensionRange.deckle.min !== "" ||
      appliedFilters.dimensionRange.deckle.max !== "" ||
      appliedFilters.dimensionRange.grain.min !== "" ||
      appliedFilters.dimensionRange.grain.max !== "";
  };

  // Clear all filters
  const clearAllFilters = () => {
    const emptyFilters = {
      searchTerm: "",
      selectedMakes: [],
      selectedGrades: [],
      selectedBrands: [],
      selectedCategories: [],
      selectedLocations: [],
      gsmRange: { min: "", max: "" },
      quantityRange: { min: "", max: "" },
      dimensionRange: {
        deckle: { min: "", max: "" },
        grain: { min: "", max: "" }
      },
      dateRange: "all"
    };

    setPendingSearchTerm("");
    setSearchTerm("");
    setSortBy("newest");
    setCurrentPage(1);
    setSearchResults(null);
    setSearchAggregations(null);
    setAvailableMakes([]);
    setAvailableGrades([]);
    setAvailableBrands([]);
    setAvailableGsm([]);
    setAvailableUnits([]);
    setAvailableLocations([]);
    setAppliedFilters(emptyFilters);
  };

  const handleContactSeller = async (dealId: number, sellerId: number) => {
    try {
      console.log('Starting chat with dealId:', dealId, 'sellerId:', sellerId);
      console.log('Deal object:', deals.find((d: any) => d.TransID === dealId));

      if (!dealId || !sellerId) {
        console.error('Missing dealId or sellerId');
        alert(`Missing dealId (${dealId}) or sellerId (${sellerId}). Please try again.`);
        return;
      }

      const response = await fetch('/api/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId,
          sellerId
        })
      });

      const result = await response.json();
      console.log('Chat start result:', result);

      if (result.success) {
        setLocation(`/chat/${result.chatId}`);
      } else {
        console.error('Failed to start chat:', result.message);
        alert(`Failed to start chat: ${result.message}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Error starting chat. Please try again.');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Extract unique values from precise search results for client-side filtering
  const getUniqueValues = (field: string) => {
    if (!allPreciseSearchResults.length) return [];

    const values = allPreciseSearchResults
      .map(deal => {
        // For spare parts, the backend has already parsed the fields
        const isSparePartDeal = deal.is_spare_part || deal.process;

        switch (field) {
          case 'makes':
            return isSparePartDeal ? null : deal.Make;
          case 'grades':
            return isSparePartDeal ? null : deal.Grade;
          case 'brands':
            return isSparePartDeal ? null : deal.Brand;
          case 'gsm':
            return isSparePartDeal ? null : deal.GSM?.toString();
          case 'categories':
            return deal.category_name;
          case 'states':
            return deal.member_state;
          // Spare part fields - use parsed fields from backend
          case 'processes':
            return isSparePartDeal ? deal.process : null;
          case 'categoryTypes':
            return isSparePartDeal ? deal.category_type : null;
          case 'machineTypes':
            return isSparePartDeal ? deal.machine_type : null;
          case 'manufacturers':
            return isSparePartDeal ? deal.manufacturer : null;
          case 'models':
            return isSparePartDeal ? deal.model : null;
          default:
            return null;
        }
      })
      .filter(value => value && value.trim() !== '')
      .reduce((acc: Array<{ value: string, count: number }>, value) => {
        const existing = acc.find((item: { value: string, count: number }) => item.value === value);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ value, count: 1 });
        }
        return acc;
      }, [] as Array<{ value: string, count: number }>);

    // Sort alphabetically by value for makes, grades, brands, and categories
    // Sort numerically for GSM
    if (field === 'gsm') {
      return values.sort((a: { value: string, count: number }, b: { value: string, count: number }) => {
        const numA = parseInt(a.value);
        const numB = parseInt(b.value);
        return numA - numB;
      });
    }
    return values.sort((a: { value: string, count: number }, b: { value: string, count: number }) => a.value.localeCompare(b.value));
  };

  // Client-side filtering function
  const applyClientFilters = () => {
    if (!hasClientFilters() && !appliedFilters.quantityRange.min && !appliedFilters.quantityRange.max) {
      setFilteredResults(allPreciseSearchResults);
      return;
    }

    const filtered = allPreciseSearchResults.filter(deal => {
      // Check makes filter
      if (clientFilters.makes.length > 0 && !clientFilters.makes.includes(deal.Make)) {
        return false;
      }

      // Check grades filter
      if (clientFilters.grades.length > 0 && !clientFilters.grades.includes(deal.Grade)) {
        return false;
      }

      // Check brands filter
      if (clientFilters.brands.length > 0 && !clientFilters.brands.includes(deal.Brand)) {
        return false;
      }

      // Check GSM filter
      if (clientFilters.gsm.length > 0 && !clientFilters.gsm.includes(deal.GSM?.toString())) {
        return false;
      }

      // Check categories filter
      if (clientFilters.categories.length > 0 && !clientFilters.categories.includes(deal.category_name)) {
        return false;
      }

      // Check states filter (from member profile)
      if (clientFilters.states.length > 0 && !clientFilters.states.includes(deal.member_state)) {
        return false;
      }

      // Quantity Range Filter (client-side) - Convert to KG
      if (appliedFilters.quantityRange.min || appliedFilters.quantityRange.max) {
        let quantityInKg = deal.quantity || 0;

        // Convert to KG based on unit
        const unit = (deal.OfferUnit || deal.unit || '').toLowerCase();
        if (unit === 'mt') {
          quantityInKg = quantityInKg * 1000;
        } else if (unit === 'kg') {
          quantityInKg = quantityInKg;
        }
        // For other units (Sheet, Reel, etc.), use as-is or skip filtering

        const minQty = appliedFilters.quantityRange.min ? parseInt(appliedFilters.quantityRange.min) : 0;
        const maxQty = appliedFilters.quantityRange.max ? parseInt(appliedFilters.quantityRange.max) : Infinity;

        if (quantityInKg < minQty || quantityInKg > maxQty) {
          return false;
        }
      }

      // Spare part filters
      if (clientFilters.processes.length > 0 && !clientFilters.processes.includes(deal.process)) {
        return false;
      }

      if (clientFilters.categoryTypes.length > 0 && !clientFilters.categoryTypes.includes(deal.category_type)) {
        return false;
      }

      if (clientFilters.machineTypes.length > 0 && !clientFilters.machineTypes.includes(deal.machine_type)) {
        return false;
      }

      if (clientFilters.manufacturers.length > 0 && !clientFilters.manufacturers.includes(deal.manufacturer)) {
        return false;
      }

      if (clientFilters.models.length > 0 && !clientFilters.models.includes(deal.model)) {
        return false;
      }

      return true;
    });

    setFilteredResults(filtered);
    setCurrentPage(1); // Reset to first page
  };



  // Apply client-side filters whenever filters change or results change
  useEffect(() => {
    if (allPreciseSearchResults.length > 0) {
      applyClientFilters();
    }
  }, [clientFilters, allPreciseSearchResults]);

  // Auto-suggestion functions for precise search
  const fetchGsmSuggestions = async (query: string | any) => {
    const queryStr = String(query || '');
    if (!queryStr.trim()) {
      setGsmSuggestions([]);
      return;
    }
    try {
      // Include category parameter if selected
      const categoryParam = preciseSearch.category ? `&category=${encodeURIComponent(preciseSearch.category)}` : '';
      const response = await fetch(`/api/suggestions/gsm?q=${encodeURIComponent(queryStr)}${categoryParam}`);
      if (response.ok) {
        const data = await response.json();
        setGsmSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching GSM suggestions:', error);
    }
  };

  // Click outside handler for GSM suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-testid="input-precise-gsm"]') &&
        !target.closest('.absolute.z-50')) {
        setGsmSuggestions([]);
      }
    };

    if (gsmSuggestions.length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [gsmSuggestions.length]);

  // Click outside handler for precise search card
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is on the search card itself
      if (searchCardRef.current && searchCardRef.current.contains(target)) {
        return;
      }

      // Check if click is on a Select dropdown (Radix UI portals)
      // These render outside the component tree
      const isSelectDropdown = target.closest('[role="listbox"]') ||
        target.closest('[data-radix-select-content]') ||
        target.closest('[data-radix-popper-content-wrapper]');

      if (isSelectDropdown) {
        return; // Don't close if clicking on dropdown
      }

      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // Close immediately when clicked outside
      setPreciseSearchExpanded(false);
    };

    if (preciseSearchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, [preciseSearchExpanded]);


  // Handle precise search field changes
  const handlePreciseSearchChange = (field: string, value: string) => {
    setPreciseSearch(prev => ({ ...prev, [field]: value }));

    // Clear GSM suggestions when category changes to get fresh category-specific suggestions
    if (field === 'category') {
      setGsmSuggestions([]);

      // Detect spare part mode
      const isSparePart = value?.toLowerCase()?.includes('spare part');
      setIsSparePartMode(isSparePart);

      // If spare part mode, fetch spare part filter options
      if (isSparePart) {
        fetchSparePartFilterOptions();
      }
    }

    // For spare part fields, fetch manufacturers when process changes
    if (field === 'process') {
      fetchManufacturersByProcess(value);
    }

    // Trigger auto-suggestions based on field (excluding category - dropdown only)
    if (field === 'gsm') fetchGsmSuggestions(value);
  };

  // Fetch manufacturers filtered by process
  const fetchManufacturersByProcess = async (process: string) => {
    try {
      const manufacturersResponse = await fetch(`/api/spare-parts/manufacturers?process=${encodeURIComponent(process)}`);
      if (manufacturersResponse.ok) {
        const manufacturers = await manufacturersResponse.json();
        setAvailableManufacturers(manufacturers.map((m: string) => ({ value: m })));
      }
      // Clear manufacturer selection when process changes
      setPreciseSearch(prev => ({ ...prev, manufacturer: '' }));
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
    }
  };

  // Fetch spare part filter options - all independent
  const fetchSparePartFilterOptions = async () => {
    try {
      // Fetch processes
      const processesResponse = await fetch('/api/spare-parts/processes');
      if (processesResponse.ok) {
        const processes = await processesResponse.json();
        setAvailableProcesses(processes.map((p: string) => ({ value: p })));
      }

      // Fetch category types - common for all processes
      const categoryTypesResponse = await fetch(`/api/spare-parts/category-types`);
      if (categoryTypesResponse.ok) {
        const categoryTypes = await categoryTypesResponse.json();
        setAvailableCategoryTypes(categoryTypes.map((c: string) => ({ value: c })));
      }

      // Fetch machine types - independent
      const machineTypesResponse = await fetch(`/api/spare-parts/machine-types`);
      if (machineTypesResponse.ok) {
        const machineTypes = await machineTypesResponse.json();
        setAvailableMachineTypes(machineTypes.map((m: string) => ({ value: m })));
      }

      // Manufacturers will be fetched when process is selected
      // Models are now text input, not dropdown
    } catch (error) {
      console.error('Error fetching spare part filters:', error);
    }
  };

  const performPreciseSearch = async () => {
    console.log('Performing precise search with (max 100 records):', preciseSearch);

    try {
      setIsSearching(true);

      // Determine which endpoint to use based on spare part mode
      const endpoint = isSparePartMode ? '/api/spare-parts/search' : '/api/search/precise';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...preciseSearch,
          exclude_member_id: user?.id // Exclude user's own products
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Precise search results (MAX 100 RECORDS):', data);
        console.log(`Received ${data.data?.length || 0} records (max 100 limit)`);

        // Store all results for client-side pagination
        setAllPreciseSearchResults(data.data || []);

        // Set search results for display (this will be paginated client-side)
        setSearchResults({
          ...data,
          maxRecords: 100, // Flag to indicate 100 record limit
          isSparePartSearch: isSparePartMode
        });

        setSearchTerm(''); // Clear regular search term
        setCurrentPage(1); // Reset to first page
      } else {
        console.error('Precise search failed');
      }
    } catch (error) {
      console.error('Error performing precise search:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Modal handlers
  const handleViewDetails = (deal: any) => {
    setSelectedDeal(deal);
    setIsProductModalOpen(true);
  };

  const handleSendEnquiry = (deal: any) => {
    setSelectedDeal(deal);
    setIsEnquiryModalOpen(true);
  };

  // Helper function to calculate relative time
  const getRelativeTime = (dateString: string) => {
    if (!dateString) return 'Recently';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  };

  // Helper function to format stock age from API's StockAge field (days)
  const formatStockAge = (stockAgeDays: number) => {
    if (stockAgeDays === undefined || stockAgeDays === null) return 'N/A';

    if (stockAgeDays === 0) {
      return 'Fresh stock';
    } else if (stockAgeDays === 1) {
      return '1 day old';
    } else if (stockAgeDays < 7) {
      return `${stockAgeDays} days old`;
    } else if (stockAgeDays < 30) {
      const weeks = Math.floor(stockAgeDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'} old`;
    } else if (stockAgeDays < 365) {
      const months = Math.floor(stockAgeDays / 30);
      if (months === 1) {
        return '1 month old';
      }
      return `${months} months old`;
    } else {
      const years = Math.floor(stockAgeDays / 365);
      if (years === 1) {
        return '1 year old';
      }
      return `${years} years old`;
    }
  };

  const handleSendWhatsApp = (deal: any) => {
    setSelectedDeal(deal);
    setIsWhatsAppModalOpen(true);
  };

  // Handler for WhatsApp from product details modal
  const handleSendWhatsAppFromModal = (deal: any) => {
    setIsProductModalOpen(false); // Close product details modal first
    setSelectedDeal(deal);
    setIsWhatsAppModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto py-2 sm:py-4">


        {/* Precise Search - Hoverable Collapse */}
        <div
          ref={searchCardRef}
          className="mb-3"
          onMouseEnter={() => {
            // Clear any existing timeout
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setPreciseSearchExpanded(true);
          }}
          onMouseLeave={() => {
            // Set timeout to close after 3 seconds
            hoverTimeoutRef.current = setTimeout(() => {
              setPreciseSearchExpanded(false);
              hoverTimeoutRef.current = null;
            }, 20000);
          }}
        >
          <Card className="w-full transition-all duration-300 hover:shadow-lg border-blue-200 dark:border-blue-800">
            {/* Always visible header */}
            <div className="p-3 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400" data-testid="text-precise-search-instructions">Ready to find what you need? Fill in the required fields below and click Search.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${preciseSearchExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {/* Expandable content */}
            <div className={`transition-all duration-300 overflow-hidden ${preciseSearchExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-3 pb-3">
                <div className="border-t border-border mb-3"></div>
                {/* Single Row Layout */}
                <div className="flex flex-wrap items-end gap-3">
                  {/* Category */}
                  <div className="flex-1 min-w-32">
                    <label className="text-sm font-medium">Category <span className="text-red-500">*</span></label>
                    <div className="relative flex items-center gap-1 mt-1">
                      <Select
                        value={preciseSearch.category}
                        onValueChange={(value) => handlePreciseSearchChange('category', value)}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid="select-precise-category">
                          <SelectValue placeholder="Select category first..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categoriesData?.map((category: any, index: number) => (
                            <SelectItem key={index} value={category.value || category}>
                              {category.value || category} {category.count && `(${category.count})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {preciseSearch.category && (
                        <button
                          onClick={() => handlePreciseSearchChange('category', '')}
                          className="flex-shrink-0 p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          type="button"
                          title="Clear category"
                        >
                          <X className="h-3 w-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Regular Product Fields - GSM */}
                  {!isSparePartMode && (
                    <div className="relative flex-1 min-w-24">
                      <label className="text-sm font-medium">
                        GSM <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="000"
                        value={preciseSearch.gsm}
                        maxLength={3}
                        onBeforeInput={(e: any) => {
                          const char = e.data;
                          const currentValue = (e.target as HTMLInputElement).value;
                          if (char && (!/^[0-9]$/.test(char) || currentValue.length >= 3)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                          handlePreciseSearchChange('gsm', value);
                        }}
                        data-testid="input-precise-gsm"
                        className="mt-1 h-9 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        disabled={!preciseSearch.category}
                      />
                      {gsmSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                          <div className="flex items-center justify-between p-2 border-b">
                            <span className="text-xs font-medium text-muted-foreground">GSM Suggestions</span>
                            <button
                              onClick={() => setGsmSuggestions([])}
                              className="text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-accent"
                              data-testid="button-close-gsm-suggestions"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          {gsmSuggestions.map((suggestion: any, index: number) => (
                            <button
                              key={index}
                              className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                              onClick={() => {
                                handlePreciseSearchChange('gsm', suggestion.value || suggestion);
                                setGsmSuggestions([]);
                              }}
                            >
                              {suggestion.value || suggestion} {suggestion.count && `(${suggestion.count})`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spare Part Fields - Only show when spare part mode is active */}
                  {isSparePartMode && (
                    <>
                      {/* Process */}
                      <div className="flex-1 min-w-32">
                        <label className="text-sm font-medium">Process</label>
                        <div className="relative flex items-center gap-1 mt-1">
                          <Select
                            value={preciseSearch.process}
                            onValueChange={(value) => handlePreciseSearchChange('process', value)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select process..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProcesses.map((proc: any, index: number) => (
                                <SelectItem key={index} value={proc.value || proc}>
                                  {proc.value || proc}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {preciseSearch.process && (
                            <button
                              onClick={() => handlePreciseSearchChange('process', '')}
                              className="flex-shrink-0 p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              type="button"
                              title="Clear process"
                            >
                              <X className="h-3 w-3 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Machine Type */}
                      <div className="flex-1 min-w-32">
                        <label className="text-sm font-medium">Machine Type</label>
                        <div className="relative flex items-center gap-1 mt-1">
                          <Select
                            value={preciseSearch.machineType}
                            onValueChange={(value) => handlePreciseSearchChange('machineType', value)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select machine..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMachineTypes.map((machine: any, index: number) => (
                                <SelectItem key={index} value={machine.value || machine}>
                                  {machine.value || machine}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {preciseSearch.machineType && (
                            <button
                              onClick={() => handlePreciseSearchChange('machineType', '')}
                              className="flex-shrink-0 p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              type="button"
                              title="Clear machine type"
                            >
                              <X className="h-3 w-3 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Manufacturer - filtered by Process */}
                      <div className="flex-1 min-w-32">
                        <label className="text-sm font-medium">Manufacturer</label>
                        <div className="relative flex items-center gap-1 mt-1">
                          <Select
                            value={preciseSearch.manufacturer}
                            onValueChange={(value) => handlePreciseSearchChange('manufacturer', value)}
                            disabled={!preciseSearch.process}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder={preciseSearch.process ? "Select manufacturer..." : "Select process first..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableManufacturers.map((mfr: any, index: number) => (
                                <SelectItem key={index} value={mfr.value || mfr}>
                                  {mfr.value || mfr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {preciseSearch.manufacturer && (
                            <button
                              onClick={() => handlePreciseSearchChange('manufacturer', '')}
                              className="flex-shrink-0 p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              type="button"
                              title="Clear manufacturer"
                            >
                              <X className="h-3 w-3 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Type - common for all processes */}
                      <div className="flex-1 min-w-32">
                        <label className="text-sm font-medium">Category Type</label>
                        <div className="relative flex items-center gap-1 mt-1">
                          <Select
                            value={preciseSearch.categoryType}
                            onValueChange={(value) => handlePreciseSearchChange('categoryType', value)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCategoryTypes.map((type: any, index: number) => (
                                <SelectItem key={index} value={type.value || type}>
                                  {type.value || type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {preciseSearch.categoryType && (
                            <button
                              onClick={() => handlePreciseSearchChange('categoryType', '')}
                              className="flex-shrink-0 p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              type="button"
                              title="Clear category type"
                            >
                              <X className="h-3 w-3 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Model - text input */}
                      <div className="flex-1 min-w-32">
                        <label className="text-sm font-medium">Model</label>
                        <Input
                          type="text"
                          placeholder="Enter model..."
                          value={preciseSearch.model}
                          onChange={(e) => handlePreciseSearchChange('model', e.target.value)}
                          className="mt-1 h-9 text-sm"
                        />
                      </div>

                      {/* Part Name */}
                      <div className="flex-1 min-w-32">
                        <label className="text-sm font-medium">Part Name</label>
                        <Input
                          type="text"
                          placeholder="Enter part name..."
                          value={preciseSearch.partName}
                          onChange={(e) => handlePreciseSearchChange('partName', e.target.value)}
                          className="mt-1 h-9 text-sm"
                        />
                      </div>

                      {/* Part Number */}
                      <div className="flex-1 min-w-32">
                        <label className="text-sm font-medium">Part No</label>
                        <Input
                          type="text"
                          placeholder="Enter part number..."
                          value={preciseSearch.partNo}
                          onChange={(e) => handlePreciseSearchChange('partNo', e.target.value)}
                          className="mt-1 h-9 text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* Regular Product Fields Only - All hidden for spare parts */}
                  {!isSparePartMode && (
                    <>
                      {/* GSM Tolerance */}
                      <div className="flex-1 min-w-24">
                        <label className="text-sm font-medium">GSM ±</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="00"
                          value={preciseSearch.tolerance}
                          maxLength={2}
                          onBeforeInput={(e: any) => {
                            const char = e.data;
                            if (char && !/^[0-9]$/.test(char)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                            handlePreciseSearchChange('tolerance', value);
                          }}
                          data-testid="input-precise-tolerance"
                          className="mt-1 h-9 text-sm"
                          disabled={!preciseSearch.category || !preciseSearch.gsm}
                        />
                      </div>

                      {/* Deckle Field */}
                      <div className="flex-1 min-w-24">
                        <label className="text-sm font-medium">Deckle</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="000.0"
                          value={preciseSearch.deckle}
                          maxLength={6}
                          onBeforeInput={(e: any) => {
                            const char = e.data;
                            if (char && !/^[0-9.]$/.test(char)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const numValue = parseFloat(value);
                            if (value === '' || (!isNaN(numValue) && numValue <= 999.99)) {
                              handlePreciseSearchChange('deckle', value);
                            }
                          }}
                          data-testid="input-precise-deckle"
                          className="mt-1 h-9 text-sm"
                          disabled={!preciseSearch.category || !preciseSearch.gsm}
                        />
                      </div>

                      {/* Grain Field - Category specific */}
                      {(() => {
                        const category = preciseSearch.category;
                        const isPaperReel = category?.toLowerCase().includes('paper reel');
                        const isBoardReel = category?.toLowerCase().includes('board reel');
                        const isKraftReel = category?.toLowerCase().includes('kraft reel');
                        const grainLabel = isKraftReel ? 'B.F' : 'Grain';
                        const showGrainField = !isPaperReel && !isBoardReel;

                        return showGrainField ? (
                          <div className="flex-1 min-w-24">
                            <label className="text-sm font-medium">{grainLabel}</label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="000.0"
                              value={preciseSearch.grain}
                              maxLength={6}
                              onBeforeInput={(e: any) => {
                                const char = e.data;
                                if (char && !/^[0-9.]$/.test(char)) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                const numValue = parseFloat(value);
                                if (value === '' || (!isNaN(numValue) && numValue <= 999.99)) {
                                  handlePreciseSearchChange('grain', value);
                                }
                              }}
                              data-testid="input-precise-grain"
                              className="mt-1 h-9 text-sm"
                              disabled={!preciseSearch.category || !preciseSearch.gsm}
                            />
                          </div>
                        ) : null;
                      })()}

                      {/* Dimension Tolerance */}
                      <div className="flex-1 min-w-24">
                        <label className="text-sm font-medium">Dim ±</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={preciseSearch.dimensionTolerance}
                          max={99}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (isNaN(value) || value <= 99) {
                              handlePreciseSearchChange('dimensionTolerance', e.target.value);
                            }
                          }}
                          data-testid="input-precise-dimension-tolerance"
                          className="mt-1 h-9 text-sm"
                          disabled={!preciseSearch.category || !preciseSearch.gsm}
                        />
                      </div>

                      {/* Single Unit Selector */}
                      <div className="flex-shrink-0">
                        <label className="text-sm font-medium">Unit</label>
                        <Select
                          value={preciseSearch.deckleUnit}
                          onValueChange={(value) => {
                            setPreciseSearch(prev => ({
                              ...prev,
                              deckleUnit: value,
                              grainUnit: value
                            }));
                          }}
                        >
                          <SelectTrigger className="w-16 h-9 mt-1 text-sm" disabled={!preciseSearch.category || !preciseSearch.gsm}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="inch">inch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={performPreciseSearch}
                      className="h-9 px-4 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-precise-search"
                      disabled={isSearching || !preciseSearch.category || (!isSparePartMode && !preciseSearch.gsm)}
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Search
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-3 w-3" />
                          Search
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreciseSearch({
                          category: '',
                          gsm: '',
                          tolerance: '10',
                          deckle: '',
                          deckleUnit: 'cm',
                          grain: '',
                          grainUnit: 'cm',
                          dimensionTolerance: '2',
                          // Spare part fields
                          process: '',
                          categoryType: '',
                          machineType: '',
                          manufacturer: '',
                          model: '',
                          partName: '',
                          partNo: ''
                        });
                        setGsmSuggestions([]);
                        setIsSparePartMode(false);
                      }}
                      className="h-9 px-3"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>


        {/* Active Filters Display */}
        {hasActiveFilters() && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs h-6 px-2"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {appliedFilters.selectedMakes.map((make, index) => (
                <Badge key={`make-${index}`} variant="secondary" className="flex items-center gap-1">
                  Make: {make}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeFilter('makes', make)}
                  />
                </Badge>
              ))}
              {appliedFilters.selectedGrades.map((grade, index) => (
                <Badge key={`grade-${index}`} variant="secondary" className="flex items-center gap-1">
                  Grade: {grade}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeFilter('grades', grade)}
                  />
                </Badge>
              ))}
              {appliedFilters.selectedBrands.map((brand, index) => (
                <Badge key={`brand-${index}`} variant="secondary" className="flex items-center gap-1">
                  Brand: {brand}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeFilter('brands', brand)}
                  />
                </Badge>
              ))}
              {appliedFilters.selectedCategories.map((category, index) => (
                <Badge key={`category-${index}`} variant="secondary" className="flex items-center gap-1">
                  Category: {category}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeFilter('categories', category)}
                  />
                </Badge>
              ))}
              {appliedFilters.selectedLocations.map((location, index) => (
                <Badge key={`location-${index}`} variant="secondary" className="flex items-center gap-1">
                  Location: {location}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeFilter('locations', location)}
                  />
                </Badge>
              ))}
              {(appliedFilters.gsmRange.min || appliedFilters.gsmRange.max) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  GSM: {appliedFilters.gsmRange.min || '0'}-{appliedFilters.gsmRange.max || '∞'}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setRangeFilter('gsm', { min: '', max: '' })}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Quick Filter Chips for Mobile */}
        <QuickFilterChips
          clientFilters={clientFilters}
          onRemoveFilter={removeFilter}
          onClearAll={clearAllFilters}
        />

        {/* Mobile Filter Drawer */}
        {isMobile && (
          <MobileFilterDrawer
            appliedFilters={appliedFilters}
            pendingSearchTerm={pendingSearchTerm}
            sortBy={sortBy}
            availableMakes={availableMakes}
            availableGrades={availableGrades}
            availableBrands={availableBrands}
            availableGsm={availableGsm}
            availableLocations={availableLocations}
            availableStates={availableStates}
            onSearchChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            onRangeFilterChange={setRangeFilter}
            onSortChange={setSortBy}
            onClearFilters={clearClientFilters}
            clientFilters={clientFilters}
            searchAggregations={searchAggregations}
            searchResults={searchResults}
            allPreciseSearchResults={allPreciseSearchResults}
            getUniqueValues={getUniqueValues}
          />
        )}

        {/* Old Mobile Filter Button - Hidden */}
        <div className="hidden">
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filter
                {searchTerm && (
                  <Badge variant="secondary" className="ml-2">
                    Active Search
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-[350px] overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              {/* Mobile Filter Content - Will be the same as desktop */}
              <div className="space-y-6">
                <Card className="sticky top-4">
                  <CardContent className="space-y-6 pt-6">
                    {/* Search */}
                    <div>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search offers..."
                          value={pendingSearchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="pl-10"
                          data-testid="input-search"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* GSM Range Filter */}
                    <div>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto font-semibold"
                        onClick={() => toggleSection('gsmRange')}
                      >
                        GSM Range
                        {expandedSections.gsmRange ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {expandedSections.gsmRange && (
                        <div className="mt-3 space-y-3">
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Min GSM"
                              value={appliedFilters.gsmRange.min}
                              onChange={(e) => {
                                const newRange = { ...appliedFilters.gsmRange, min: e.target.value };
                                setRangeFilter('gsm', newRange);
                              }}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="number"
                              placeholder="Max GSM"
                              value={appliedFilters.gsmRange.max}
                              onChange={(e) => {
                                const newRange = { ...appliedFilters.gsmRange, max: e.target.value };
                                setRangeFilter('gsm', newRange);
                              }}
                              className="h-8 text-xs"
                            />
                          </div>
                          {(appliedFilters.gsmRange.min || appliedFilters.gsmRange.max) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRangeFilter('gsm', { min: '', max: '' })}
                              className="w-full h-7 text-xs"
                            >
                              Clear GSM Range
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Makes Filter */}
                    <div>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto font-semibold"
                        onClick={() => toggleSection('makes')}
                      >
                        Makes
                        {expandedSections.makes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {expandedSections.makes && (
                        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                          {availableMakes.map((make: any, index: number) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="w-full justify-between h-auto p-2 text-left"
                              onClick={() => handleMakeClick(make)}
                            >
                              <span className="text-sm">{make.Make || make.name || make.value || (typeof make === 'string' ? make : 'Unknown')}</span>
                              {make.count && (
                                <Badge variant="secondary" className="text-xs px-2 py-0">
                                  {make.count}
                                </Badge>
                              )}
                            </Button>
                          ))}
                          {availableMakes.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">Type in search to see available makes</p>
                          )}
                        </div>
                      )}
                    </div>




                    <Separator />

                    {/* Sort Options */}
                    <div>
                      <label className="text-sm font-semibold">Sort By</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="mt-2" data-testid="select-sort">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
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

                    {/* Filter Action Buttons */}
                    <div className="space-y-3">
                      <Button
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                        onClick={applySearch}
                      >
                        Apply Search
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={clearAllFilters}
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Desktop Sidebar - Filters */}
          <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
            <Card className="sticky top-4">
              <CardContent className="space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto pt-6">

                {/* Dynamic Filters based on search mode */}
                {searchResults?.isSparePartSearch ? (
                  <>
                    {/* Spare Part Filters */}
                    {/* Process Filter */}
                    {getUniqueValues('processes').length > 0 && (
                      <>
                        <div>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-0 h-auto font-semibold"
                            onClick={() => toggleSection('processes')}
                          >
                            Process
                            {expandedSections.processes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          {expandedSections.processes && (
                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                              {getUniqueValues('processes').map((proc: any, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`process-${index}`}
                                    checked={clientFilters.processes.includes(proc.value)}
                                    onCheckedChange={(checked) => handleFilterChange('processes', proc.value, checked as boolean)}
                                  />
                                  <label htmlFor={`process-${index}`} className="text-sm flex-1 cursor-pointer">
                                    {proc.value}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Category Type Filter */}
                    {getUniqueValues('categoryTypes').length > 0 && (
                      <>
                        <div>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-0 h-auto font-semibold"
                            onClick={() => toggleSection('categoryTypes')}
                          >
                            Category Type
                            {expandedSections.categoryTypes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          {expandedSections.categoryTypes && (
                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                              {getUniqueValues('categoryTypes').map((type: any, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`categoryType-${index}`}
                                    checked={clientFilters.categoryTypes.includes(type.value)}
                                    onCheckedChange={(checked) => handleFilterChange('categoryTypes', type.value, checked as boolean)}
                                  />
                                  <label htmlFor={`categoryType-${index}`} className="text-sm flex-1 cursor-pointer">
                                    {type.value}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Machine Type Filter */}
                    {getUniqueValues('machineTypes').length > 0 && (
                      <>
                        <div>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-0 h-auto font-semibold"
                            onClick={() => toggleSection('machineTypes')}
                          >
                            Machine Type
                            {expandedSections.machineTypes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          {expandedSections.machineTypes && (
                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                              {getUniqueValues('machineTypes').map((type: any, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`machineType-${index}`}
                                    checked={clientFilters.machineTypes.includes(type.value)}
                                    onCheckedChange={(checked) => handleFilterChange('machineTypes', type.value, checked as boolean)}
                                  />
                                  <label htmlFor={`machineType-${index}`} className="text-sm flex-1 cursor-pointer">
                                    {type.value}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Manufacturer Filter */}
                    {getUniqueValues('manufacturers').length > 0 && (
                      <>
                        <div>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-0 h-auto font-semibold"
                            onClick={() => toggleSection('manufacturers')}
                          >
                            Manufacturer
                            {expandedSections.manufacturers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          {expandedSections.manufacturers && (
                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                              {getUniqueValues('manufacturers').map((mfr: any, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`manufacturer-${index}`}
                                    checked={clientFilters.manufacturers.includes(mfr.value)}
                                    onCheckedChange={(checked) => handleFilterChange('manufacturers', mfr.value, checked as boolean)}
                                  />
                                  <label htmlFor={`manufacturer-${index}`} className="text-sm flex-1 cursor-pointer">
                                    {mfr.value}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Model Filter */}
                    {getUniqueValues('models').length > 0 && (
                      <>
                        <div>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-0 h-auto font-semibold"
                            onClick={() => toggleSection('models')}
                          >
                            Model
                            {expandedSections.models ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          {expandedSections.models && (
                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                              {getUniqueValues('models').map((model: any, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`model-${index}`}
                                    checked={clientFilters.models.includes(model.value)}
                                    onCheckedChange={(checked) => handleFilterChange('models', model.value, checked as boolean)}
                                  />
                                  <label htmlFor={`model-${index}`} className="text-sm flex-1 cursor-pointer">
                                    {model.value}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Separator />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Regular Product Filters */}
                    {/* Makes Filter - Checkbox based */}
                    <div>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto font-semibold"
                        onClick={() => toggleSection('makes')}
                      >
                        Makes
                        {expandedSections.makes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {expandedSections.makes && (
                        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                          {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                            getUniqueValues('makes') :
                            (searchAggregations?.makes || availableMakes || []).map((make: any) => ({
                              value: make.Make || make.name || make.value || (typeof make === 'string' ? make : 'Unknown'),
                              count: make.count || 0
                            }))
                          ).sort((a: any, b: any) => a.value.localeCompare(b.value)).map((make: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Checkbox
                                id={`make-${index}`}
                                checked={clientFilters.makes.includes(make.value)}
                                onCheckedChange={(checked) => handleFilterChange('makes', make.value, checked as boolean)}
                                data-testid={`checkbox-make-${make.value}`}
                              />
                              <label htmlFor={`make-${index}`} className="text-sm flex-1 cursor-pointer">
                                <span>{make.value}</span>
                              </label>
                            </div>
                          ))}
                          {!(searchResults?.maxRecords && allPreciseSearchResults.length > 0) &&
                            !(searchAggregations?.makes || availableMakes || []).length && (
                              <p className="text-sm text-muted-foreground italic">Type in search to see available makes</p>
                            )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Grades Filter - Checkbox based */}
                    <div>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto font-semibold"
                        onClick={() => toggleSection('grades')}
                      >
                        Grades
                        {expandedSections.grades ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {expandedSections.grades && (
                        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                          {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                            getUniqueValues('grades') :
                            (searchAggregations?.grades || availableGrades || []).map((grade: any) => ({
                              value: grade.Grade || grade.name || grade.value || (typeof grade === 'string' ? grade : 'Unknown'),
                              count: grade.count || 0
                            }))
                          ).sort((a: any, b: any) => a.value.localeCompare(b.value)).map((grade: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Checkbox
                                id={`grade-${index}`}
                                checked={clientFilters.grades.includes(grade.value)}
                                onCheckedChange={(checked) => handleFilterChange('grades', grade.value, checked as boolean)}
                                data-testid={`checkbox-grade-${grade.value}`}
                              />
                              <label htmlFor={`grade-${index}`} className="text-sm flex-1 cursor-pointer">
                                <span>{grade.value}</span>
                              </label>
                            </div>
                          ))}
                          {!(searchResults?.maxRecords && allPreciseSearchResults.length > 0) &&
                            !(searchAggregations?.grades || availableGrades || []).length && (
                              <p className="text-sm text-muted-foreground italic">Type in search to see available grades</p>
                            )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Brands Filter - Checkbox based */}
                    <div>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto font-semibold"
                        onClick={() => toggleSection('brands')}
                      >
                        Brands
                        {expandedSections.brands ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {expandedSections.brands && (
                        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                          {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                            getUniqueValues('brands') :
                            (searchAggregations?.brands || availableBrands || []).map((brand: any) => ({
                              value: brand.Brand || brand.name || brand.value || (typeof brand === 'string' ? brand : 'Unknown'),
                              count: brand.count || 0
                            }))
                          ).sort((a: any, b: any) => a.value.localeCompare(b.value)).map((brand: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Checkbox
                                id={`brand-${index}`}
                                checked={clientFilters.brands.includes(brand.value)}
                                onCheckedChange={(checked) => handleFilterChange('brands', brand.value, checked as boolean)}
                                data-testid={`checkbox-brand-${brand.value}`}
                              />
                              <label htmlFor={`brand-${index}`} className="text-sm flex-1 cursor-pointer">
                                <span>{brand.value}</span>
                              </label>
                            </div>
                          ))}
                          {!(searchResults?.maxRecords && allPreciseSearchResults.length > 0) &&
                            !(searchAggregations?.brands || availableBrands || []).length && (
                              <p className="text-sm text-muted-foreground italic">Type in search to see available brands</p>
                            )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* GSM Filter - Checkbox based */}
                    <div>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto font-semibold"
                        onClick={() => toggleSection('gsm')}
                      >
                        GSM
                        {expandedSections.gsm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {expandedSections.gsm && (
                        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                          {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                            getUniqueValues('gsm') :
                            (searchAggregations?.gsm || availableGsm || []).map((gsm: any) => ({
                              value: gsm.GSM?.toString() || gsm.value?.toString() || (typeof gsm === 'string' ? gsm : 'Unknown'),
                              count: gsm.count || 0
                            }))
                          ).sort((a: any, b: any) => {
                            const numA = parseInt(a.value);
                            const numB = parseInt(b.value);
                            return numA - numB;
                          }).map((gsm: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Checkbox
                                id={`gsm-${index}`}
                                checked={clientFilters.gsm.includes(gsm.value)}
                                onCheckedChange={(checked) => handleFilterChange('gsm', gsm.value, checked as boolean)}
                                data-testid={`checkbox-gsm-${gsm.value}`}
                              />
                              <label htmlFor={`gsm-${index}`} className="text-sm flex-1 cursor-pointer">
                                <span>{gsm.value} GSM</span>
                              </label>
                            </div>
                          ))}
                          {!(searchResults?.maxRecords && allPreciseSearchResults.length > 0) &&
                            !(searchAggregations?.gsm || availableGsm || []).length && (
                              <p className="text-sm text-muted-foreground italic">Type in search to see available GSM values</p>
                            )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* State Filter - Dropdown based */}
                    <div>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto font-semibold"
                        onClick={() => toggleSection('states')}
                      >
                        State
                        {expandedSections.states ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {expandedSections.states && (
                        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                          {(searchResults?.maxRecords && allPreciseSearchResults.length > 0 ?
                            getUniqueValues('states') :
                            (searchAggregations?.states || availableStates || []).map((state: any) => ({
                              value: state.state || state.name || state.value || (typeof state === 'string' ? state : 'Unknown'),
                              count: state.count || 0
                            }))
                          ).sort((a: any, b: any) => a.value.localeCompare(b.value)).map((state: any, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Checkbox
                                id={`state-${index}`}
                                checked={clientFilters.states.includes(state.value)}
                                onCheckedChange={(checked) => handleFilterChange('states', state.value, checked as boolean)}
                                data-testid={`checkbox-state-${state.value}`}
                              />
                              <label htmlFor={`state-${index}`} className="text-sm flex-1 cursor-pointer">
                                <span>{state.value}</span>
                              </label>
                            </div>
                          ))}
                          {!(searchResults?.maxRecords && allPreciseSearchResults.length > 0) &&
                            !(searchAggregations?.states || availableStates || []).length && (
                              <p className="text-sm text-muted-foreground italic">Type in search to see available states</p>
                            )}
                        </div>
                      )}
                    </div>
                    {/* Quantity Range Filter - Only for Paper/Board/Kraft */}
                    <>
                      <Separator />
                      <div>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-0 h-auto font-semibold"
                          onClick={() => toggleSection('quantityRange')}
                        >
                          Quantity Range (KG)
                          {expandedSections.quantityRange ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        {expandedSections.quantityRange && (
                          <div className="mt-3 space-y-3">
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{appliedFilters.quantityRange.min || '0'} KG</span>
                                <span>{appliedFilters.quantityRange.max || '1000'} KG</span>
                              </div>
                              <Slider
                                min={0}
                                max={1000}
                                step={10}
                                value={[
                                  parseInt(appliedFilters.quantityRange.min) || 0,
                                  parseInt(appliedFilters.quantityRange.max) || 1000
                                ]}
                                onValueChange={(values) => {
                                  const newFilters = { ...appliedFilters };
                                  newFilters.quantityRange.min = values[0].toString();
                                  newFilters.quantityRange.max = values[1].toString();
                                  setAppliedFilters(newFilters);
                                }}
                                className="w-full"
                              />
                              <div className="text-xs text-center text-muted-foreground">
                                Drag to set range
                              </div>
                            </div>
                            {(appliedFilters.quantityRange.min !== "" || appliedFilters.quantityRange.max !== "") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  const newFilters = { ...appliedFilters };
                                  newFilters.quantityRange = { min: "", max: "" };
                                  setAppliedFilters(newFilters);
                                }}
                              >
                                Clear Quantity Filter
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  </>
                )}





                <Separator />

                {/* Sort Options */}
                <div>
                  <label className="text-sm font-semibold">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="mt-2" data-testid="select-sort-desktop">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
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

                {/* Filter Action Buttons */}
                <div className="space-y-3">
                  {searchResults?.maxRecords && allPreciseSearchResults.length > 0 ? (
                    // Client-side filter buttons
                    <>
                      <div className="text-sm text-center text-muted-foreground">
                        {hasClientFilters() ?
                          `Showing ${totalDeals} of ${allPreciseSearchResults.length} results` :
                          `${allPreciseSearchResults.length} results (max 100)`
                        }
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={clearClientFilters}
                        disabled={!hasClientFilters()}
                        data-testid="button-clear-client-filters-desktop"
                      >
                        Clear Filters {hasClientFilters() && `(${Object.values(clientFilters).flat().length})`}
                      </Button>
                    </>
                  ) : (
                    // Original filter buttons for regular search
                    <>
                      <Button
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                        onClick={applySearch}
                        data-testid="button-apply-search-desktop"
                      >
                        Apply Search
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={clearAllFilters}
                        data-testid="button-clear-filters-desktop"
                      >
                        Clear All Filters
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0">
            {/* Results */}
            {dealsLoading || hierarchyLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 pb-20 lg:pb-0">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-4"></div>
                      <div className="h-6 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : deals.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No deals found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search terms
                </p>
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                {/* View Toggle and Results Count */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    {totalDeals} {totalDeals === 1 ? 'result' : 'results'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">View:</span>
                    <div className="flex border rounded-md overflow-hidden">
                      <Button
                        variant={viewMode === 'block' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('block')}
                        className="rounded-none px-2 h-8"
                        data-testid="button-block-view"
                        title="Block View (Cards)"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-none px-2 h-8"
                        data-testid="button-grid-view"
                        title="Grid View (Table)"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Grid View (Table/Spreadsheet format) */}
                {viewMode === 'grid' ? (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs border-collapse" data-testid="deals-table">
                      <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                          <th className="px-2 py-2 text-left font-semibold border-b border-r whitespace-nowrap">Description</th>
                          <th className="px-2 py-2 text-left font-semibold border-b border-r whitespace-nowrap">Make</th>
                          <th className="px-2 py-2 text-left font-semibold border-b border-r whitespace-nowrap">Grade</th>
                          <th className="px-2 py-2 text-center font-semibold border-b border-r whitespace-nowrap">GSM</th>
                          <th className="px-2 py-2 text-center font-semibold border-b border-r whitespace-nowrap">Size</th>
                          <th className="px-2 py-2 text-center font-semibold border-b border-r whitespace-nowrap">Qty</th>
                          <th className="px-2 py-2 text-center font-semibold border-b border-r whitespace-nowrap">Rate</th>
                          <th className="px-2 py-2 text-center font-semibold border-b border-r whitespace-nowrap">Stock Age</th>
                          <th className="px-2 py-2 text-center font-semibold border-b whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.map((deal: any, index: number) => (
                          <tr
                            key={deal.TransID}
                            className={`hover:bg-blue-50 dark:hover:bg-blue-950/30 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}`}
                            data-testid={`table-row-${deal.TransID}`}
                          >
                            <td className="px-2 py-2 border-b border-r max-w-[200px]">
                              <span className="font-medium text-foreground line-clamp-2" data-testid={`deal-title-${deal.TransID}`}>
                                {deal.stock_description || `${deal.Make} ${deal.Grade}`.trim() || 'Product Details'}
                              </span>
                            </td>
                            <td className="px-2 py-2 border-b border-r whitespace-nowrap">{deal.Make || '-'}</td>
                            <td className="px-2 py-2 border-b border-r whitespace-nowrap">{deal.Grade || '-'}</td>
                            <td className="px-2 py-2 border-b border-r text-center whitespace-nowrap">{deal.GSM || '-'}</td>
                            <td className="px-2 py-2 border-b border-r text-center whitespace-nowrap">
                              {(deal.Deckle_mm && deal.grain_mm) ?
                                formatDimensions(deal.Deckle_mm, deal.grain_mm, deal.GroupName, deal.GroupID)
                                : '-'}
                            </td>
                            <td className="px-2 py-2 border-b border-r text-center whitespace-nowrap font-medium">
                              {deal.quantity || 1000} {deal.OfferUnit || deal.Unit || 'KG'}
                            </td>
                            <td className="px-2 py-2 border-b border-r text-center whitespace-nowrap">
                              {deal.show_rate_in_marketplace === false || deal.show_rate_in_marketplace === 0 ? (
                                <span className="text-amber-600 italic">On request</span>
                              ) : Number(deal.OfferPrice) > 0 ? (
                                <span className="text-green-600 font-medium">Rs. {Number(deal.OfferPrice).toLocaleString('en-IN')}</span>
                              ) : (
                                <span className="text-amber-600 italic">On request</span>
                              )}
                            </td>
                            <td className="px-2 py-2 border-b border-r text-center whitespace-nowrap text-gray-500">
                              {formatStockAge(deal.StockAge)}
                            </td>
                            <td className="px-2 py-2 border-b text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleViewDetails(deal)}
                                  data-testid={`button-view-details-${deal.TransID}`}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                                {deal.created_by_member_id === user?.id ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setLocation(`/edit-deal/${deal.TransID}`)}
                                    data-testid={`button-edit-deal-${deal.TransID}`}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4 text-yellow-600" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleSendEnquiry(deal)}
                                      data-testid={`button-send-inquiry-${deal.TransID}`}
                                      title="Send Enquiry"
                                    >
                                      <Mail className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleSendWhatsApp(deal)}
                                      data-testid={`button-send-whatsapp-${deal.TransID}`}
                                      title="WhatsApp"
                                    >
                                      <MessageSquare className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Block View (Card Grid) - 4 columns on large screens */
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {deals.map((deal: any) => (
                      <Card key={deal.TransID} className="group hover:shadow-lg transition-all duration-200 overflow-hidden h-full flex flex-col">
                        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-2">
                          {/* Header with badges - No Board/Reel */}
                          <div className="flex items-center justify-between mb-1">
                            {/* Status Badge removed */}
                          </div>

                          {/* Product Description in Header */}
                          <h3 className="font-bold text-sm line-clamp-2 text-gray-800 dark:text-gray-200" data-testid={`deal-title-${deal.TransID}`}>
                            {deal.stock_description || `${deal.Make} ${deal.Grade}`.trim() || 'Product Details'}
                          </h3>
                        </div>

                        <CardContent className="p-2 flex-1 flex flex-col">

                          {/* Product Details - Different for spare parts vs regular products */}
                          {deal.is_spare_part || deal.process ? (
                            <>
                              {/* Spare Part Information */}
                              <div className="mb-2 space-y-1.5">
                                {deal.process && (
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-500">Process:</span>
                                    <span className="font-bold text-foreground ml-1">{deal.process}</span>
                                  </div>
                                )}
                                {deal.category_type && (
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-500">Type:</span>
                                    <span className="font-bold text-foreground ml-1">{deal.category_type}</span>
                                  </div>
                                )}
                                {deal.machine_type && (
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-500">Machine:</span>
                                    <span className="font-bold text-foreground ml-1">{deal.machine_type}</span>
                                  </div>
                                )}
                                {deal.manufacturer && (
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-500">Mfr:</span>
                                    <span className="font-bold text-foreground ml-1">{deal.manufacturer}</span>
                                  </div>
                                )}
                                {deal.model && (
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-500">Model:</span>
                                    <span className="font-bold text-foreground ml-1">{deal.model}</span>
                                  </div>
                                )}
                                {deal.part_name && (
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-500">Part:</span>
                                    <span className="font-bold text-foreground ml-1">{deal.part_name}</span>
                                  </div>
                                )}
                                {deal.part_no && (
                                  <div className="text-xs">
                                    <span className="font-medium text-gray-500">Part No:</span>
                                    <span className="font-bold text-foreground ml-1">{deal.part_no}</span>
                                  </div>
                                )}
                              </div>

                              {/* Quantity for spare parts */}
                              <div className="flex items-center mb-2 p-1.5 rounded border border-gray-200 dark:border-gray-700">
                                <div className="text-xs">
                                  <span className="font-medium text-gray-500">Qty:</span>
                                  <span className="font-bold text-foreground ml-1">{deal.pcs || deal.quantity || 1} {deal.unit || deal.OfferUnit || 'PCS'}</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Regular Product Information */}
                              {/* 2. GSM and Dimensions properly aligned */}
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-medium text-gray-500">GSM:</span>
                                    <span className="font-bold text-foreground ml-1">{deal.GSM || 'N/A'}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-foreground">
                                      {(deal.Deckle_mm && deal.grain_mm) ?
                                        formatDimensions(deal.Deckle_mm, deal.grain_mm, deal.GroupName, deal.GroupID)
                                        : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Quantity */}
                              <div className="flex items-center mb-2 p-1.5 rounded border border-gray-200 dark:border-gray-700">
                                <div className="text-xs">
                                  <span className="font-medium text-gray-500">Qty:</span>
                                  <span className="font-bold text-foreground ml-1">{deal.quantity || 1000} {deal.OfferUnit || deal.Unit || 'KG'}</span>
                                </div>
                              </div>
                            </>
                          )}



                          {/* Stock Age - from API */}
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>Stock: {formatStockAge(deal.StockAge)}</span>
                          </div>

                          {/* Rate Display */}
                          <div className="flex items-center justify-between mb-2 p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <span className="font-medium text-xs text-gray-600 dark:text-gray-400">Rate:</span>
                            {deal.show_rate_in_marketplace === false || deal.show_rate_in_marketplace === 0 ? (
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 italic" data-testid={`rate-on-request-${deal.TransID}`}>
                                Rate on request
                              </span>
                            ) : Number(deal.OfferPrice) > 0 ? (
                              <span className="text-xs font-bold text-green-700 dark:text-green-400" data-testid={`rate-display-${deal.TransID}`}>
                                Rs. {Number(deal.OfferPrice).toLocaleString('en-IN')} / {deal.OfferUnit || 'unit'}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 italic" data-testid={`rate-not-set-${deal.TransID}`}>
                                Rate on request
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-auto">
                            <Button
                              size="sm"
                              className="w-full text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white mb-1"
                              onClick={() => handleViewDetails(deal)}
                              data-testid={`button-view-details-${deal.TransID}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Details
                            </Button>

                            {/* Show edit button only for deals created by current user */}
                            {deal.created_by_member_id === user?.id ? (
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation(`/edit-deal/${deal.TransID}`)}
                                  data-testid={`button-edit-deal-${deal.TransID}`}
                                  className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>

                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendEnquiry(deal)}
                                    data-testid={`button-send-inquiry-${deal.TransID}`}
                                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 text-xs"
                                  >
                                    <Mail className="h-3 w-3" />
                                    <span className="ml-0.5">Enquiry</span>
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendWhatsApp(deal)}
                                    data-testid={`button-send-whatsapp-${deal.TransID}`}
                                    className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 text-xs"
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    WhatsApp
                                  </Button>
                                </div>

                              </div>
                            )}
                          </div>

                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center mt-8 mb-20 lg:mb-8 space-y-4">
                    <p className="text-muted-foreground text-xs sm:text-sm text-center">
                      Showing {deals.length} of {totalDeals} deal{totalDeals !== 1 ? 's' : ''} (Page {currentPage} of {totalPages})
                    </p>
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>

                      {/* Page Numbers - Show fewer on mobile */}
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - (isMobile ? 2 : 4), currentPage - (isMobile ? 1 : 2))) + i;
                          if (pageNum <= totalPages) {
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                          return null;
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProductDetailsModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        deal={selectedDeal}
        onSendEnquiry={handleSendEnquiry}
        onSendWhatsApp={handleSendWhatsAppFromModal}
      />

      <EnquiryFormModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        deal={selectedDeal}
      />

      <WhatsAppQuotationModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        deal={selectedDeal}
        user={user}
      />
    </div>
  );
}