import { useState, useEffect } from "react";
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
import { Package, Search, Filter, MessageCircle, MapPin, Heart, Eye, Edit, ChevronDown, ChevronUp, Mail, MessageSquare, Calendar, SlidersHorizontal, Building, Loader2, X, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import ProductDetailsModal from "@/components/product-details-modal";
import InquiryFormModal from "@/components/inquiry-form-modal";
import WhatsAppQuotationModal from "@/components/whatsapp-quotation-modal";
import PowerSearch from "@/components/power-search";

export default function Marketplace() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAggregations, setSearchAggregations] = useState<any>(null);
  
  // Main search state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  
  // UNIFIED FILTER STATE - Complete filter management
  const [filters, setFilters] = useState({
    // Selected filter values
    selectedMakes: [] as string[],
    selectedGrades: [] as string[],
    selectedBrands: [] as string[],
    selectedGsm: [] as string[],
    selectedUnits: [] as string[],
    selectedLocations: [] as string[],
    
    // Range filters
    gsmRange: { min: '', max: '' },
    priceRange: { min: '', max: '' },
    
    // Date filters
    dateRange: { from: '', to: '' },
    
    // Dimension filters
    dimensionFilters: {
      deckleMin: '',
      deckleMax: '',
      grainMin: '',
      grainMax: '',
      unit: 'cm'
    },
    
    // Category filter
    selectedCategory: '',
    
    // Availability filters
    inStock: false,
    hasImages: false,
    verifiedSellers: false
  });
  
  // Available filter options from search API (dynamic based on search)
  const [availableFilters, setAvailableFilters] = useState({
    makes: [] as any[],
    grades: [] as any[],
    brands: [] as any[],
    gsm: [] as any[],
    units: [] as any[],
    locations: [] as any[]
  });

  // Precise search states
  const [preciseSearch, setPreciseSearch] = useState({
    category: "",
    gsm: "",
    tolerance: "",
    deckle: "",
    deckleUnit: "cm",
    grain: "",
    grainUnit: "cm",
    dimensionTolerance: ""
  });
  
  // Auto-suggestion states
  const [gsmSuggestions, setGsmSuggestions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    categories: true,
    makes: false,
    grades: false,
    brands: false,
    gsm: false,
    units: false,
    location: false
  });
  
  // Modal states
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
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

  // Helper function to format dimensions based on user preference
  const formatDimensions = (deckle_mm: number, grain_mm: number) => {
    const userUnit = userSettings?.dimension_unit || 'cm';
    
    if (userUnit === 'inch') {
      const deckleInch = (deckle_mm / 25.4).toFixed(2);
      const grainInch = (grain_mm / 25.4).toFixed(2);
      return (
        <>
          <div>{deckleInch}" × {grainInch}"</div>
          <div className="text-xs text-muted-foreground">{(deckle_mm/10).toFixed(1)} × {(grain_mm/10).toFixed(1)} cm</div>
        </>
      );
    } else {
      return (
        <>
          <div>{(deckle_mm/10).toFixed(1)} × {(grain_mm/10).toFixed(1)} cm</div>
          <div className="text-xs text-muted-foreground">{(deckle_mm/25.4).toFixed(2)}" × {(grain_mm/25.4).toFixed(2)}"</div>
        </>
      );
    }
  };

  // Unified search and filter function
  const performUnifiedSearch = async (resetPage = false) => {
    const page = resetPage ? 1 : currentPage;
    setIsSearching(true);
    
    try {
      const payload = {
        // Search terms
        query: searchTerm,
        preciseSearch,
        
        // All active filters
        filters: {
          makes: filters.selectedMakes,
          grades: filters.selectedGrades,
          brands: filters.selectedBrands,
          gsm: filters.selectedGsm,
          units: filters.selectedUnits,
          locations: filters.selectedLocations,
          category: filters.selectedCategory,
          gsmRange: filters.gsmRange,
          priceRange: filters.priceRange,
          dateRange: filters.dateRange,
          dimensionFilters: filters.dimensionFilters,
          inStock: filters.inStock,
          hasImages: filters.hasImages,
          verifiedSellers: filters.verifiedSellers
        },
        
        // Pagination and sorting
        page,
        pageSize: itemsPerPage,
        sortBy
      };
      
      const response = await fetch('/api/search/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setSearchAggregations(data.aggregations || null);
        
        // Update available filter options
        if (data.aggregations) {
          setAvailableFilters({
            makes: data.aggregations.makes || [],
            grades: data.aggregations.grades || [],
            brands: data.aggregations.brands || [],
            gsm: data.aggregations.gsm || [],
            units: data.aggregations.units || [],
            locations: data.aggregations.locations || []
          });
        }
        
        if (resetPage) setCurrentPage(1);
      }
    } catch (error) {
      console.error('Unified search error:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.selectedMakes.length > 0 ||
      filters.selectedGrades.length > 0 ||
      filters.selectedBrands.length > 0 ||
      filters.selectedGsm.length > 0 ||
      filters.selectedUnits.length > 0 ||
      filters.selectedLocations.length > 0 ||
      filters.selectedCategory !== '' ||
      filters.gsmRange.min !== '' ||
      filters.gsmRange.max !== '' ||
      filters.priceRange.min !== '' ||
      filters.priceRange.max !== '' ||
      filters.dateRange.from !== '' ||
      filters.dateRange.to !== '' ||
      filters.dimensionFilters.deckleMin !== '' ||
      filters.dimensionFilters.deckleMax !== '' ||
      filters.dimensionFilters.grainMin !== '' ||
      filters.dimensionFilters.grainMax !== '' ||
      filters.inStock ||
      filters.hasImages ||
      filters.verifiedSellers ||
      searchTerm !== ''
    );
  };
  
  // Fetch deals - fallback when no search/filters are active
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals", { sort: sortBy, page: currentPage }],
    queryFn: async () => {
      // If we have search results, use them instead
      if (searchResults && searchResults.data) {
        return {
          deals: searchResults.data,
          total: searchResults.total,
          page: searchResults.page || 1
        };
      }
      
      // Otherwise fetch regular deals (fallback)
      const params = new URLSearchParams();
      if (sortBy) params.append('sort', sortBy);
      params.append('limit', itemsPerPage.toString());
      params.append('page', currentPage.toString());
      
      const response = await fetch(`/api/deals?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    },
    enabled: !isSearching && !hasActiveFilters(), // Only fetch when no search/filters are active
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

  // FILTER MANAGEMENT FUNCTIONS
  const addFilter = (type: string, value: string) => {
    setFilters(prev => {
      const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof prev;
      const currentValues = prev[key] as string[];
      if (!currentValues.includes(value)) {
        return {
          ...prev,
          [key]: [...currentValues, value]
        };
      }
      return prev;
    });
    // Trigger search with new filter
    setTimeout(() => performUnifiedSearch(true), 100);
  };
  
  const removeFilter = (type: string, value: string) => {
    setFilters(prev => {
      const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof prev;
      const currentValues = prev[key] as string[];
      return {
        ...prev,
        [key]: currentValues.filter(v => v !== value)
      };
    });
    // Trigger search with updated filters
    setTimeout(() => performUnifiedSearch(true), 100);
  };
  
  const updateRangeFilter = (type: 'gsmRange' | 'priceRange' | 'dateRange', field: 'min' | 'max' | 'from' | 'to', value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };
  
  const updateDimensionFilter = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      dimensionFilters: {
        ...prev.dimensionFilters,
        [field]: value
      }
    }));
  };
  
  const toggleBooleanFilter = (type: 'inStock' | 'hasImages' | 'verifiedSellers') => {
    setFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
    // Trigger search with updated filter
    setTimeout(() => performUnifiedSearch(true), 100);
  };
  
  const clearAllFilters = () => {
    setFilters({
      selectedMakes: [],
      selectedGrades: [],
      selectedBrands: [],
      selectedGsm: [],
      selectedUnits: [],
      selectedLocations: [],
      gsmRange: { min: '', max: '' },
      priceRange: { min: '', max: '' },
      dateRange: { from: '', to: '' },
      dimensionFilters: {
        deckleMin: '',
        deckleMax: '',
        grainMin: '',
        grainMax: '',
        unit: 'cm'
      },
      selectedCategory: '',
      inStock: false,
      hasImages: false,
      verifiedSellers: false
    });
    setSearchTerm('');
    setPreciseSearch({
      category: "",
      gsm: "",
      tolerance: "",
      deckle: "",
      deckleUnit: "cm",
      grain: "",
      grainUnit: "cm",
      dimensionTolerance: ""
    });
    setSearchResults(null);
    setCurrentPage(1);
  };
  
  // Get count of active filters for display
  const getActiveFilterCount = () => {
    return (
      filters.selectedMakes.length +
      filters.selectedGrades.length +
      filters.selectedBrands.length +
      filters.selectedGsm.length +
      filters.selectedUnits.length +
      filters.selectedLocations.length +
      (filters.selectedCategory ? 1 : 0) +
      (filters.gsmRange.min || filters.gsmRange.max ? 1 : 0) +
      (filters.priceRange.min || filters.priceRange.max ? 1 : 0) +
      (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
      (filters.dimensionFilters.deckleMin || filters.dimensionFilters.deckleMax || 
       filters.dimensionFilters.grainMin || filters.dimensionFilters.grainMax ? 1 : 0) +
      (filters.inStock ? 1 : 0) +
      (filters.hasImages ? 1 : 0) +
      (filters.verifiedSellers ? 1 : 0)
    );
  };
  
  // Use search results if available, otherwise use regular deals
  const deals = searchResults?.data || dealsData?.deals || [];
  const totalDeals = searchResults?.total || dealsData?.total || 0;
  const totalPages = Math.ceil(totalDeals / itemsPerPage);
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
          pageSize: 1 // Just need aggregations, not all results
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Initial filter response:', data);
        
        if (data.aggregations) {
          console.log('Setting initial filter options');
          setAvailableFilters({
            makes: data.aggregations.makes || [],
            grades: data.aggregations.grades || [],
            brands: data.aggregations.brands || [],
            gsm: data.aggregations.gsm || [],
            units: data.aggregations.units || [],
            locations: data.aggregations.locations || []
          });
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
    performUnifiedSearch(true);
  };

  const performSearch = async (query: string) => {
    setSearchTerm(query);
    performUnifiedSearch(true);
  };
  
  // Legacy search change handler - now just updates search term
  const handleSearchChange = async (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      // Debounce the unified search
      setTimeout(() => performUnifiedSearch(true), 300);
    }
  };

  // Updated filter click handlers using new unified system
  const handleMakeClick = (make: any) => {
    const makeText = make.Make || make.name || make.value || (typeof make === 'string' ? make : '');
    addFilter('makes', makeText);
  };

  const handleGradeClick = (grade: any) => {
    const gradeText = grade.Grade || grade.name || grade.value || (typeof grade === 'string' ? grade : '');
    addFilter('grades', gradeText);
  };

  const handleBrandClick = (brand: any) => {
    const brandText = brand.Brand || brand.name || brand.value || (typeof brand === 'string' ? brand : '');
    addFilter('brands', brandText);
  };

  const handleGsmClick = (gsm: any) => {
    const gsmText = gsm.GSM || gsm.value || (typeof gsm === 'string' ? gsm : '');
    addFilter('gsm', gsmText);
  };

  const handleUnitClick = (unit: any) => {
    const unitText = unit.OfferUnit || unit.name || unit.value || unit;
    addFilter('units', unitText);
  };

  // This function is now replaced by the comprehensive clearAllFilters above

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

  // Auto-suggestion functions for precise search
  const fetchGsmSuggestions = async (query: string | any) => {
    const queryStr = String(query || '');
    if (!queryStr.trim()) {
      setGsmSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`/api/suggestions/gsm?q=${encodeURIComponent(queryStr)}`);
      if (response.ok) {
        const data = await response.json();
        setGsmSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching GSM suggestions:', error);
    }
  };


  // Handle precise search field changes
  const handlePreciseSearchChange = (field: string, value: string) => {
    setPreciseSearch(prev => ({ ...prev, [field]: value }));
    
    // Trigger auto-suggestions based on field (excluding category - dropdown only)
    if (field === 'gsm') fetchGsmSuggestions(value);
  };

  const performPreciseSearch = async () => {
    console.log('Performing precise search with:', preciseSearch);
    
    try {
      setIsSearching(true);
      const response = await fetch('/api/search/precise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...preciseSearch,
          page: 1,
          pageSize: itemsPerPage
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Precise search results:', data);
        setSearchResults(data);
        setSearchTerm(''); // Clear regular search term
        setCurrentPage(1);
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

  const handleSendInquiry = (deal: any) => {
    setSelectedDeal(deal);
    setIsInquiryModalOpen(true);
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
      
      <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto py-4 sm:py-8">
        {/* Powerful Search Bar */}
        <div className="mb-6">
          <PowerSearch 
            onSearch={(results) => {
              if (results && results.success) {
                setSearchResults(results);
                setSearchAggregations(results.aggregations || null);
                setCurrentPage(1);
              }
            }}
            onLoading={(loading) => setIsSearching(loading)}
            className="w-full"
          />
        </div>

        {/* OR Divider */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex-grow h-px bg-border"></div>
          <span className="px-4 text-sm text-muted-foreground font-medium">OR</span>
          <div className="flex-grow h-px bg-border"></div>
        </div>

        {/* Precise Search */}
        <div className="mb-3">
          <Card className="w-full">
            <CardHeader className="pb-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Precise Search
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {/* Single Row Layout */}
              <div className="flex flex-wrap items-end gap-3">
                {/* Category */}
                <div className="flex-1 min-w-32">
                  <label className="text-sm font-medium">Category</label>
                  <Select 
                    value={preciseSearch.category} 
                    onValueChange={(value) => handlePreciseSearchChange('category', value)}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm" data-testid="select-precise-category">
                      <SelectValue placeholder="Select category..." />
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
                </div>

                {/* GSM */}
                <div className="relative flex-1 min-w-24">
                  <label className="text-sm font-medium">GSM</label>
                  <Input
                    type="number"
                    placeholder="300"
                    value={preciseSearch.gsm}
                    onChange={(e) => handlePreciseSearchChange('gsm', e.target.value)}
                    data-testid="input-precise-gsm"
                    className="mt-1 h-9 text-sm"
                  />
                  {gsmSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
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

                {/* GSM Tolerance */}
                <div className="flex-1 min-w-24">
                  <label className="text-sm font-medium">GSM ±</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={preciseSearch.tolerance}
                    onChange={(e) => handlePreciseSearchChange('tolerance', e.target.value)}
                    data-testid="input-precise-tolerance"
                    className="mt-1 h-9 text-sm"
                  />
                </div>

                {/* Deckle x Grain - Category specific */}
                <div className="flex-1 min-w-40">
                  {(() => {
                    const category = preciseSearch.category;
                    const isPaperReel = category?.toLowerCase().includes('paper reel');
                    const isBoardReel = category?.toLowerCase().includes('board reel');
                    const isKraftReel = category?.toLowerCase().includes('kraft reel');
                    const grainLabel = isKraftReel ? 'B.S' : 'Grain';
                    const showGrainField = !isPaperReel && !isBoardReel;
                    const dimensionLabel = showGrainField ? `Deckle x ${grainLabel}` : 'Deckle';
                    
                    return (
                      <>
                        <label className="text-sm font-medium">{dimensionLabel}</label>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="64.8"
                              value={preciseSearch.deckle}
                              onChange={(e) => handlePreciseSearchChange('deckle', e.target.value)}
                              data-testid="input-precise-deckle"
                              className="h-9 text-sm"
                            />
                          </div>
                          {showGrainField && (
                            <>
                              <span className="text-gray-500 text-sm font-medium px-1">x</span>
                              <div className="relative flex-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="84.1"
                                  value={preciseSearch.grain}
                                  onChange={(e) => handlePreciseSearchChange('grain', e.target.value)}
                                  data-testid="input-precise-grain"
                                  className="h-9 text-sm"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Dimension Tolerance */}
                <div className="flex-1 min-w-24">
                  <label className="text-sm font-medium">Dim ±</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="2"
                    value={preciseSearch.dimensionTolerance}
                    onChange={(e) => handlePreciseSearchChange('dimensionTolerance', e.target.value)}
                    data-testid="input-precise-dimension-tolerance"
                    className="mt-1 h-9 text-sm"
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
                    <SelectTrigger className="w-16 h-9 mt-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="inch">inch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={performPreciseSearch}
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700"
                    data-testid="button-precise-search"
                    disabled={isSearching}
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
                        tolerance: '',
                        deckle: '',
                        deckleUnit: 'cm',
                        grain: '',
                        grainUnit: 'cm',
                        dimensionTolerance: ''
                      });
                      setGsmSuggestions([]);
                    }}
                    className="h-9 px-3"
                  >
                    Clear
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
        
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Discover stock deals from verified sellers across the trading industry
          </p>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
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
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle className="text-lg">Filters</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search offers..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
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
                      {availableFilters.makes.map((make: any, index: number) => (
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
                      {availableFilters.makes.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Type in search to see available makes</p>
                      )}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* Grades Filter */}
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
                      {availableFilters.grades.map((grade: any, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-auto p-2 text-left"
                          onClick={() => handleGradeClick(grade)}
                        >
                          <span className="text-sm">{grade.Grade || grade.name || grade.value || (typeof grade === 'string' ? grade : 'Unknown')}</span>
                          {grade.count && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {grade.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                      {availableFilters.grades.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Type in search to see available grades</p>
                      )}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* Brands Filter */}
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
                      {availableFilters.brands.map((brand: any, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-auto p-2 text-left"
                          onClick={() => handleBrandClick(brand)}
                        >
                          <span className="text-sm">{brand.Brand || brand.name || brand.value || (typeof brand === 'string' ? brand : 'Unknown')}</span>
                          {brand.count && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {brand.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                      {availableFilters.brands.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Type in search to see available brands</p>
                      )}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* GSM Filter */}
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
                      {availableFilters.gsm.map((gsm: any, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-auto p-2 text-left"
                          onClick={() => handleGsmClick(gsm)}
                        >
                          <span className="text-sm">{gsm.GSM || gsm.value || (typeof gsm === 'string' ? gsm : 'Unknown')} GSM</span>
                          {gsm.count && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {gsm.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                      {availableFilters.gsm.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Type in search to see available GSM values</p>
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
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                      <SelectItem value="quantity">Quantity</SelectItem>
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
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <Card className="sticky top-4">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle className="text-lg">Filters</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                
                
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
                      {availableFilters.makes.map((make: any, index: number) => (
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
                      {availableFilters.makes.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Type in search to see available makes</p>
                      )}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* Grades Filter */}
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
                      {availableFilters.grades.map((grade: any, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-auto p-2 text-left"
                          onClick={() => handleGradeClick(grade)}
                        >
                          <span className="text-sm">{grade.Grade || grade.name || grade.value || (typeof grade === 'string' ? grade : 'Unknown')}</span>
                          {grade.count && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {grade.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                      {availableFilters.grades.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Type in search to see available grades</p>
                      )}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* Brands Filter */}
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
                      {availableFilters.brands.map((brand: any, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-auto p-2 text-left"
                          onClick={() => handleBrandClick(brand)}
                        >
                          <span className="text-sm">{brand.Brand || brand.name || brand.value || (typeof brand === 'string' ? brand : 'Unknown')}</span>
                          {brand.count && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {brand.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                      {availableFilters.brands.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Type in search to see available brands</p>
                      )}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* GSM Filter */}
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
                      {availableFilters.gsm.map((gsm: any, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-auto p-2 text-left"
                          onClick={() => handleGsmClick(gsm)}
                        >
                          <span className="text-sm">{gsm.GSM || gsm.value || (typeof gsm === 'string' ? gsm : 'Unknown')} GSM</span>
                          {gsm.count && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {gsm.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                      {availableFilters.gsm.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Type in search to see available GSM values</p>
                      )}
                    </div>
                  )}
                </div>
                

                
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
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                      <SelectItem value="quantity">Quantity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filter Action Buttons */}
                <div className="space-y-3">
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
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Content Area */}
          <div className="flex-1 min-w-0">
            {/* Results */}
            {dealsLoading || hierarchyLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-muted-foreground">
                    Showing {deals.length} of {totalDeals} deal{totalDeals !== 1 ? 's' : ''} (Page {currentPage} of {totalPages})
                  </p>
                </div>

                {/* Deal Cards Grid - Responsive */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {deals.map((deal: any) => (
                    <Card key={deal.TransID} className="group hover:shadow-lg transition-all duration-200 overflow-hidden h-full flex flex-col border-l-4 border-l-blue-500">
                      <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-3">
                        {/* Header with badges - No Board/Reel */}
                        <div className="flex items-center justify-between mb-2">
                          {/* Status Badge */}
                          <Badge 
                            variant={deal.Status === 'active' ? 'default' : 'secondary'}
                            className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          >
                            {deal.Status === 'active' ? 'Available' : deal.Status}
                          </Badge>
                          
                          {/* Wishlist Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
                            data-testid={`button-wishlist-${deal.TransID}`}
                          >
                            <Heart className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                        <CardContent className="p-4 flex-1 flex flex-col">
                          {/* 1. Description - Extract from Seller_comments after newline */}
                            <h3 className="font-bold text-lg line-clamp-2 mb-4 text-foreground" data-testid={`deal-title-${deal.TransID}`}>
                              {deal.stock_description || `${deal.Make} ${deal.Grade}`.trim() || 'Product Details'}
                            </h3>

                          {/* 2. GSM and Dimensions properly aligned */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm">
                              <span className="font-medium text-gray-500">GSM:</span>
                              <span className="font-bold text-foreground ml-2">{deal.GSM || 'N/A'}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-500">Dimensions:</span>
                              <div className="text-xs font-semibold text-foreground mt-1">
                                {(deal.Deckle_mm && deal.grain_mm) ? 
                                  formatDimensions(deal.Deckle_mm, deal.grain_mm)
                                : 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* 3. Quantity and Price */}
                          <div className="flex items-center justify-between mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="text-sm">
                              <span className="font-medium text-gray-500">Qty:</span>
                              <span className="font-bold text-foreground ml-1">{deal.quantity || 1000} {deal.OfferUnit || deal.Unit || 'KG'}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-500">Price:</span>
                              <span className="font-bold text-foreground ml-1" data-testid={`deal-price-${deal.TransID}`}>
                                ₹{(deal.OfferPrice || deal.Price || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-sm text-gray-500">/{deal.OfferUnit || deal.Unit || 'KG'}</span>
                            </div>
                          </div>



                          {/* Seller Info with Icon */}
                          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <Building className="h-4 w-4 text-gray-500" />
                            <div>
                              <span className="text-xs text-gray-500">by </span>
                              <span className="text-sm font-medium text-foreground" data-testid={`seller-name-${deal.TransID}`}>
                                {deal.created_by_name || deal.seller_name || deal.seller_company || deal.created_by_company || 'Seller'}
                              </span>
                            </div>
                          </div>


                          {/* Deal Age */}
                          {deal.deal_created_at && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                              <Calendar className="h-3 w-3" />
                              <span>{getRelativeTime(deal.deal_created_at)}</span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="space-y-2 mt-auto">
                            <Button
                              size="sm"
                              className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleViewDetails(deal)}
                              data-testid={`button-view-details-${deal.TransID}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            
                            {/* Show edit button only for deals created by current user */}
                            {deal.created_by_member_id === user?.member_id ? (
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
                                    onClick={() => handleSendInquiry(deal)}
                                    data-testid={`button-send-inquiry-${deal.TransID}`}
                                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                  >
                                    <Mail className="h-3 w-3 mr-1" />
                                    Send Inquiry
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendWhatsApp(deal)}
                                    data-testid={`button-send-whatsapp-${deal.TransID}`}
                                    className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center mt-8 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum <= totalPages) {
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
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
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
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
        onSendInquiry={handleSendInquiry}
        onSendWhatsApp={handleSendWhatsAppFromModal}
      />
      
      <InquiryFormModal 
        isOpen={isInquiryModalOpen} 
        onClose={() => setIsInquiryModalOpen(false)} 
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