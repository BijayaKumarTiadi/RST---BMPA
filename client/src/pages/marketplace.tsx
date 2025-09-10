import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Navigation from "@/components/navigation";
import { Package, Search, MessageCircle, MapPin, Heart, Eye, Edit, Mail, MessageSquare, Calendar, Building, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import ProductDetailsModal from "@/components/product-details-modal";
import InquiryFormModal from "@/components/inquiry-form-modal";
import WhatsAppQuotationModal from "@/components/whatsapp-quotation-modal";
import PowerSearch from "@/components/power-search";

export default function Marketplace() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState("newest");
  
  // Client-side filtering states
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
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


  // Load data when deals change
  useEffect(() => {
    if (dealsData?.success && dealsData?.data) {
      setAllDeals(dealsData.data);
      setFilteredDeals(dealsData.data);
    }
  }, [dealsData, sortBy]);


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


  
  
  // No filtering needed - using available options from search API


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


        {/* Results and Sorting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Showing {paginatedDeals.length} of {totalDeals} results
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

        {/* Main Content */}
        <div>
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
                  No deals are currently available
                </p>
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