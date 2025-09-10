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
import { Package, Search, Filter, MessageCircle, MapPin, Heart, Eye, Edit, ChevronDown, ChevronUp, Mail, MessageSquare, Calendar, SlidersHorizontal, Building, Loader2 } from "lucide-react";
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
  // Pending filters (UI state, not applied yet)
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [pendingSelectedCategory, setPendingSelectedCategory] = useState("");
  
  // Main search state - this will be used for everything
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  
  // Client-side filtering states
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState({
    search: '',
    makes: [] as string[],
    grades: [] as string[],
    brands: [] as string[],
    categories: [] as string[],
    gsm: { min: '', max: '' },
    dimensions: { deckle: '', grain: '', unit: 'cm', tolerance: '' },
    units: [] as string[],
    locations: [] as string[]
  });

  // Quick precise search states
  const [quickSearch, setQuickSearch] = useState({
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

  // Fetch all deals once for client-side filtering
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/search/data"],
    queryFn: async () => {
      const response = await fetch('/api/search/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: isAuthenticated,
  });

  // Update quick search default units when user settings are loaded
  useEffect(() => {
    if (userSettings?.dimension_unit) {
      const defaultUnit = userSettings.dimension_unit;
      setQuickSearch(prev => ({
        ...prev,
        deckleUnit: defaultUnit,
        grainUnit: defaultUnit
      }));
      setActiveFilters(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          unit: defaultUnit
        }
      }));
    }
  }, [userSettings]);

  // Load and filter data when deals or filters change
  useEffect(() => {
    if (dealsData?.success && dealsData?.data) {
      setAllDeals(dealsData.data);
      applyFilters(dealsData.data);
    }
  }, [dealsData, activeFilters, sortBy]);

  // Client-side filtering function
  const applyFilters = (deals: any[]) => {
    let filtered = [...deals];

    // Text search filter
    if (activeFilters.search.trim()) {
      const searchLower = activeFilters.search.toLowerCase();
      filtered = filtered.filter(deal => {
        const searchFields = [
          deal.Make,
          deal.Grade, 
          deal.Brand,
          deal.stock_description,
          deal.category_name,
          deal.Seller_comments
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchFields.includes(searchLower);
      });
    }

    // Makes filter
    if (activeFilters.makes.length > 0) {
      filtered = filtered.filter(deal => 
        activeFilters.makes.includes(deal.Make)
      );
    }

    // Grades filter  
    if (activeFilters.grades.length > 0) {
      filtered = filtered.filter(deal => 
        activeFilters.grades.includes(deal.Grade)
      );
    }

    // Brands filter
    if (activeFilters.brands.length > 0) {
      filtered = filtered.filter(deal => 
        activeFilters.brands.includes(deal.Brand)
      );
    }

    // Categories filter
    if (activeFilters.categories.length > 0) {
      filtered = filtered.filter(deal => 
        activeFilters.categories.includes(deal.category_name)
      );
    }

    // GSM range filter
    if (activeFilters.gsm.min || activeFilters.gsm.max) {
      filtered = filtered.filter(deal => {
        const gsm = Number(deal.GSM);
        if (isNaN(gsm)) return false;
        
        const min = activeFilters.gsm.min ? Number(activeFilters.gsm.min) : 0;
        const max = activeFilters.gsm.max ? Number(activeFilters.gsm.max) : Infinity;
        
        return gsm >= min && gsm <= max;
      });
    }

    // Dimensions filter (deckle x grain with tolerance)
    if (activeFilters.dimensions.deckle || activeFilters.dimensions.grain) {
      filtered = filtered.filter(deal => {
        let matches = true;
        const tolerance = Number(activeFilters.dimensions.tolerance) || 0;
        
        // Convert input dimensions to mm for comparison
        if (activeFilters.dimensions.deckle) {
          const deckleInput = Number(activeFilters.dimensions.deckle);
          if (isNaN(deckleInput)) return false;
          
          let deckleInputMm = deckleInput;
          if (activeFilters.dimensions.unit === 'cm') {
            deckleInputMm = deckleInput * 10;
          } else if (activeFilters.dimensions.unit === 'inch') {
            deckleInputMm = deckleInput * 25.4;
          }
          
          const dealDeckle = Number(deal.Deckle_mm);
          if (isNaN(dealDeckle)) return false;
          
          const minDeckle = deckleInputMm - tolerance;
          const maxDeckle = deckleInputMm + tolerance;
          
          matches = matches && (dealDeckle >= minDeckle && dealDeckle <= maxDeckle);
        }
        
        if (activeFilters.dimensions.grain) {
          const grainInput = Number(activeFilters.dimensions.grain);
          if (isNaN(grainInput)) return false;
          
          let grainInputMm = grainInput;
          if (activeFilters.dimensions.unit === 'cm') {
            grainInputMm = grainInput * 10;
          } else if (activeFilters.dimensions.unit === 'inch') {
            grainInputMm = grainInput * 25.4;
          }
          
          const dealGrain = Number(deal.grain_mm);
          if (isNaN(dealGrain)) return false;
          
          const minGrain = grainInputMm - tolerance;
          const maxGrain = grainInputMm + tolerance;
          
          matches = matches && (dealGrain >= minGrain && dealGrain <= maxGrain);
        }
        
        return matches;
      });
    }

    // Units filter
    if (activeFilters.units.length > 0) {
      filtered = filtered.filter(deal => 
        activeFilters.units.includes(deal.OfferUnit)
      );
    }

    // Apply sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.DateCreated).getTime() - new Date(a.DateCreated).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.DateCreated).getTime() - new Date(b.DateCreated).getTime());
    } else if (sortBy === 'price-low') {
      filtered.sort((a, b) => Number(a.PerKgRate) - Number(b.PerKgRate));
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => Number(b.PerKgRate) - Number(a.PerKgRate));
    }

    setFilteredDeals(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

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

  // Use filtered deals for display and pagination
  const deals = filteredDeals;
  const totalDeals = filteredDeals.length;
  const totalPages = Math.ceil(totalDeals / itemsPerPage);
  
  // Paginated deals for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDeals = filteredDeals.slice(startIndex, endIndex);

  // Generate filter options from all available data
  const getUniqueValues = (field: string) => {
    return [...new Set(allDeals.map(deal => deal[field]).filter(Boolean))].sort();
  };
  
  const availableMakes = getUniqueValues('Make');
  const availableGrades = getUniqueValues('Grade');  
  const availableBrands = getUniqueValues('Brand');
  const availableCategories = getUniqueValues('category_name');
  const availableUnits = getUniqueValues('OfferUnit');

  // Filter management functions
  const toggleArrayFilter = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const currentArray = prev[filterType] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return { ...prev, [filterType]: newArray };
    });
  };

  const updateFilter = (filterType: keyof typeof activeFilters, value: any) => {
    setActiveFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearAllFilters = () => {
    setActiveFilters({
      search: '',
      makes: [],
      grades: [],
      brands: [],
      categories: [],
      gsm: { min: '', max: '' },
      dimensions: { deckle: '', grain: '', unit: activeFilters.dimensions.unit, tolerance: '' },
      units: [],
      locations: []
    });
  };

  const clearSpecificFilter = (filterType: keyof typeof activeFilters) => {
    if (filterType === 'gsm') {
      updateFilter('gsm', { min: '', max: '' });
    } else if (filterType === 'dimensions') {
      updateFilter('dimensions', { deckle: '', grain: '', unit: activeFilters.dimensions.unit, tolerance: '' });
    } else if (Array.isArray(activeFilters[filterType])) {
      updateFilter(filterType, []);
    } else {
      updateFilter(filterType, '');
    }
  };

  // Count active filters for display
  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.search.trim()) count++;
    if (activeFilters.makes.length > 0) count++;
    if (activeFilters.grades.length > 0) count++;
    if (activeFilters.brands.length > 0) count++;
    if (activeFilters.categories.length > 0) count++;
    if (activeFilters.gsm.min || activeFilters.gsm.max) count++;
    if (activeFilters.dimensions.deckle || activeFilters.dimensions.grain) count++;
    if (activeFilters.units.length > 0) count++;
    return count;
  };
  
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
          setAvailableMakes(data.aggregations.makes || []);
          setAvailableGrades(data.aggregations.grades || []);
          setAvailableBrands(data.aggregations.brands || []);
          setAvailableGsm(data.aggregations.gsm || []);
          setAvailableUnits(data.aggregations.units || []);
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
          pageSize: itemsPerPage
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
            pageSize: itemsPerPage
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
        {/* Client-Side Search and Filter Section */}
        <div className="mb-6 space-y-4">
          {/* Main Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by make, grade, brand, description..."
                value={activeFilters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="h-12 text-lg"
                data-testid="input-main-search"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsFilterSheetOpen(true)}
                className="h-12 px-6"
                data-testid="button-open-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
              </Button>
              
              {getActiveFilterCount() > 0 && (
                <Button 
                  variant="ghost" 
                  onClick={clearAllFilters}
                  className="h-12 px-4 text-red-600"
                  data-testid="button-clear-all-filters"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {getActiveFilterCount() > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.search && (
                <Badge variant="secondary" className="px-3 py-1">
                  Search: "{activeFilters.search}"
                  <button 
                    onClick={() => updateFilter('search', '')}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              
              {activeFilters.makes.map(make => (
                <Badge key={make} variant="secondary" className="px-3 py-1">
                  Make: {make}
                  <button 
                    onClick={() => toggleArrayFilter('makes', make)}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              
              {activeFilters.grades.map(grade => (
                <Badge key={grade} variant="secondary" className="px-3 py-1">
                  Grade: {grade}
                  <button 
                    onClick={() => toggleArrayFilter('grades', grade)}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              
              {activeFilters.brands.map(brand => (
                <Badge key={brand} variant="secondary" className="px-3 py-1">
                  Brand: {brand}
                  <button 
                    onClick={() => toggleArrayFilter('brands', brand)}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              
              {activeFilters.categories.map(category => (
                <Badge key={category} variant="secondary" className="px-3 py-1">
                  Category: {category}
                  <button 
                    onClick={() => toggleArrayFilter('categories', category)}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              
              {(activeFilters.gsm.min || activeFilters.gsm.max) && (
                <Badge variant="secondary" className="px-3 py-1">
                  GSM: {activeFilters.gsm.min || '0'} - {activeFilters.gsm.max || '∞'}
                  <button 
                    onClick={() => clearSpecificFilter('gsm')}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              
              {(activeFilters.dimensions.deckle || activeFilters.dimensions.grain) && (
                <Badge variant="secondary" className="px-3 py-1">
                  Dimensions: {activeFilters.dimensions.deckle || ''}×{activeFilters.dimensions.grain || ''} {activeFilters.dimensions.unit}
                  <button 
                    onClick={() => clearSpecificFilter('dimensions')}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
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

        {/* Comprehensive Filter Sheet */}
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetContent side="right" className="w-[85vw] sm:w-[400px] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFilterCount()} Active
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearAllFilters}
                  className="flex-1"
                >
                  Clear All
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex-1"
                >
                  Apply Filters
                </Button>
              </div>

              <Separator />

              {/* Makes Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Makes</label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {availableMakes.slice(0, 20).map((make: string) => (
                    <div key={make} className="flex items-center space-x-2">
                      <Checkbox
                        id={`make-${make}`}
                        checked={activeFilters.makes.includes(make)}
                        onCheckedChange={() => toggleArrayFilter('makes', make)}
                      />
                      <label htmlFor={`make-${make}`} className="text-sm flex-1 cursor-pointer">
                        {make}
                      </label>
                    </div>
                  ))}
                  {availableMakes.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing first 20 of {availableMakes.length} makes
                    </p>
                  )}
                </div>
              </div>

              {/* Grades Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Grades</label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {availableGrades.slice(0, 20).map((grade: string) => (
                    <div key={grade} className="flex items-center space-x-2">
                      <Checkbox
                        id={`grade-${grade}`}
                        checked={activeFilters.grades.includes(grade)}
                        onCheckedChange={() => toggleArrayFilter('grades', grade)}
                      />
                      <label htmlFor={`grade-${grade}`} className="text-sm flex-1 cursor-pointer">
                        {grade}
                      </label>
                    </div>
                  ))}
                  {availableGrades.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing first 20 of {availableGrades.length} grades
                    </p>
                  )}
                </div>
              </div>

              {/* Brands Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Brands</label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {availableBrands.slice(0, 20).map((brand: string) => (
                    <div key={brand} className="flex items-center space-x-2">
                      <Checkbox
                        id={`brand-${brand}`}
                        checked={activeFilters.brands.includes(brand)}
                        onCheckedChange={() => toggleArrayFilter('brands', brand)}
                      />
                      <label htmlFor={`brand-${brand}`} className="text-sm flex-1 cursor-pointer">
                        {brand}
                      </label>
                    </div>
                  ))}
                  {availableBrands.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing first 20 of {availableBrands.length} brands
                    </p>
                  )}
                </div>
              </div>

              {/* Categories Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Categories</label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {availableCategories.map((category: string) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={activeFilters.categories.includes(category)}
                        onCheckedChange={() => toggleArrayFilter('categories', category)}
                      />
                      <label htmlFor={`category-${category}`} className="text-sm flex-1 cursor-pointer">
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* GSM Range Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">GSM Range</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min GSM"
                    value={activeFilters.gsm.min}
                    onChange={(e) => updateFilter('gsm', { ...activeFilters.gsm, min: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Max GSM"
                    value={activeFilters.gsm.max}
                    onChange={(e) => updateFilter('gsm', { ...activeFilters.gsm, max: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Dimensions Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Dimensions</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Deckle"
                      value={activeFilters.dimensions.deckle}
                      onChange={(e) => updateFilter('dimensions', { ...activeFilters.dimensions, deckle: e.target.value })}
                      className="flex-1"
                    />
                    <span className="flex items-center px-2 text-sm text-muted-foreground">×</span>
                    <Input
                      type="number"
                      placeholder="Grain"
                      value={activeFilters.dimensions.grain}
                      onChange={(e) => updateFilter('dimensions', { ...activeFilters.dimensions, grain: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select
                      value={activeFilters.dimensions.unit}
                      onValueChange={(value) => updateFilter('dimensions', { ...activeFilters.dimensions, unit: value })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="inch">inch</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      type="number"
                      placeholder="Tolerance"
                      value={activeFilters.dimensions.tolerance}
                      onChange={(e) => updateFilter('dimensions', { ...activeFilters.dimensions, tolerance: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Units Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Offer Units</label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {availableUnits.map((unit: string) => (
                    <div key={unit} className="flex items-center space-x-2">
                      <Checkbox
                        id={`unit-${unit}`}
                        checked={activeFilters.units.includes(unit)}
                        onCheckedChange={() => toggleArrayFilter('units', unit)}
                      />
                      <label htmlFor={`unit-${unit}`} className="text-sm flex-1 cursor-pointer">
                        {unit}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Results and Sorting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Showing {paginatedDeals.length} of {totalDeals} results
              {getActiveFilterCount() > 0 && ` (${getActiveFilterCount()} filters applied)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sort:</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                      {availableGrades.map((grade: any, index: number) => (
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
                      {availableGrades.length === 0 && (
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
                      {availableBrands.map((brand: any, index: number) => (
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
                      {availableBrands.length === 0 && (
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
                      {availableGsm.map((gsm: any, index: number) => (
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
                      {availableGsm.length === 0 && (
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
                    Showing {paginatedDeals.length} of {totalDeals} deal{totalDeals !== 1 ? 's' : ''} (Page {currentPage} of {totalPages})
                  </p>
                </div>

                {/* Deal Cards Grid - Responsive */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {paginatedDeals.map((deal: any) => (
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