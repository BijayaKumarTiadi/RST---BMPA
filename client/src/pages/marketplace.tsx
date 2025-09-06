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
import { Package, Search, Filter, MessageCircle, MapPin, Heart, Eye, Edit, ChevronDown, ChevronUp, Mail, MessageSquare, Calendar, SlidersHorizontal, Building } from "lucide-react";
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
  // Pending filters (UI state, not applied yet)
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [pendingSelectedCategory, setPendingSelectedCategory] = useState("");
  
  // Applied filters (actually used in queries)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  // Pending filters (UI state, not applied yet)
  const [pendingMakes, setPendingMakes] = useState<string[]>([]);
  const [pendingGrades, setPendingGrades] = useState<string[]>([]);
  const [pendingBrands, setPendingBrands] = useState<string[]>([]);
  const [pendingGsm, setPendingGsm] = useState<string[]>([]);
  const [pendingUnits, setPendingUnits] = useState<string[]>([]);
  const [pendingStockStatus, setPendingStockStatus] = useState<string[]>([]);
  const [pendingLocations, setPendingLocations] = useState<string[]>([]);
  
  // Applied filters (actually used in queries)
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedGsm, setSelectedGsm] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedStockStatus, setSelectedStockStatus] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    categories: true,
    makes: false,
    grades: false,
    brands: false,
    gsm: false,
    units: false,
    stockStatus: false,
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

  // Fetch deals with filters
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals", { 
      search: searchTerm, 
      group_id: selectedCategory, 
      sort: sortBy,
      makes: selectedMakes,
      grades: selectedGrades,
      brands: selectedBrands,
      gsm: selectedGsm,
      units: selectedUnits,
      stockStatus: selectedStockStatus,
      page: currentPage
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm?.trim()) params.append('search', searchTerm.trim());
      if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== '') params.append('group_id', selectedCategory);
      if (sortBy) params.append('sort', sortBy);
      if (selectedMakes.length > 0) params.append('makes', selectedMakes.join(','));
      if (selectedGrades.length > 0) params.append('grades', selectedGrades.join(','));
      if (selectedBrands.length > 0) params.append('brands', selectedBrands.join(','));
      if (selectedGsm.length > 0) params.append('gsm', selectedGsm.join(','));
      if (selectedUnits.length > 0) params.append('units', selectedUnits.join(','));
      if (selectedStockStatus.length > 0) params.append('stock_status', selectedStockStatus.join(','));
      params.append('limit', itemsPerPage.toString());
      params.append('page', currentPage.toString());
      
      const response = await fetch(`/api/deals?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    },
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

  const deals = dealsData?.deals || [];
  const totalDeals = dealsData?.total || 0;
  const totalPages = Math.ceil(totalDeals / itemsPerPage);
  const groups = stockHierarchy?.groups || [];
  const makes = stockHierarchy?.makes || [];
  const grades = stockHierarchy?.grades || [];
  const brands = stockHierarchy?.brands || [];
  
  // Filter makes, grades, and brands based on selections (hierarchical filtering)
  const filteredMakes = makes.filter((make: any) => 
    pendingSelectedCategory ? (make.GroupID != null ? make.GroupID.toString() === pendingSelectedCategory : false) : true
  );
  const filteredGrades = grades.filter((grade: any) => 
    pendingMakes.length > 0 ? pendingMakes.some(makeId => grade.Make_ID != null ? grade.Make_ID.toString() === makeId : false) : true
  );
  const filteredBrands = brands.filter((brand: any) => 
    pendingMakes.length > 0 ? pendingMakes.some(makeId => brand.make_ID != null ? brand.make_ID.toString() === makeId : false) : true
  );
  
  // Extract unique GSM values from deals
  const gsmOptions = [...new Set(deals.filter((deal: any) => deal.GSM).map((deal: any) => deal.GSM.toString()))].sort((a, b) => parseFloat(a) - parseFloat(b));

  // Reset to page 1 when filters change
  const resetPage = () => setCurrentPage(1);

  // Reset page when any applied filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedMakes, selectedGrades, selectedBrands, selectedGsm, selectedUnits, selectedStockStatus]);
  
  // Apply pending filters
  const applyFilters = () => {
    setSearchTerm(pendingSearchTerm);
    setSelectedCategory(pendingSelectedCategory);
    setSelectedMakes(pendingMakes);
    setSelectedGrades(pendingGrades);
    setSelectedBrands(pendingBrands);
    setSelectedGsm(pendingGsm);
    setSelectedUnits(pendingUnits);
    setSelectedStockStatus(pendingStockStatus);
    setSelectedLocations(pendingLocations);
    setCurrentPage(1);
  };
  
  // Handle hierarchical filter changes
  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      setPendingSelectedCategory(categoryId === "all" ? "" : categoryId);
    } else {
      setPendingSelectedCategory("");
    }
    // Reset dependent filters when category changes
    setPendingMakes([]);
    setPendingGrades([]);
    setPendingBrands([]);
  };

  const handleMakeChange = (makeId: string, checked: boolean) => {
    if (checked) {
      setPendingMakes([...pendingMakes, makeId]);
    } else {
      setPendingMakes(pendingMakes.filter(id => id !== makeId));
      // Filter out any grades and brands that only belong to the unchecked make
      const remainingMakes = pendingMakes.filter(id => id !== makeId);
      if (remainingMakes.length === 0) {
        setPendingGrades([]);
        setPendingBrands([]);
      } else {
        // Keep only grades and brands that belong to remaining makes
        const validGrades = grades.filter((grade: any) => 
          remainingMakes.some(rmakeId => grade.Make_ID != null ? grade.Make_ID.toString() === rmakeId : false)
        ).map((grade: any) => grade.gradeID?.toString()).filter(Boolean);
        
        const validBrands = brands.filter((brand: any) => 
          remainingMakes.some(rmakeId => brand.make_ID != null ? brand.make_ID.toString() === rmakeId : false)
        ).map((brand: any) => brand.brandID?.toString()).filter(Boolean);
        
        setPendingGrades(pendingGrades.filter(gradeId => validGrades.includes(gradeId)));
        setPendingBrands(pendingBrands.filter(brandId => validBrands.includes(brandId)));
      }
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    // Clear both pending and applied filters
    setPendingSearchTerm("");
    setPendingSelectedCategory("");
    setPendingMakes([]);
    setPendingGrades([]);
    setPendingBrands([]);
    setPendingGsm([]);
    setPendingUnits([]);
    setPendingStockStatus([]);
    setPendingLocations([]);
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedMakes([]);
    setSelectedGrades([]);
    setSelectedBrands([]);
    setSelectedGsm([]);
    setSelectedUnits([]);
    setSelectedStockStatus([]);
    setSelectedLocations([]);
    setSortBy("newest");
    setCurrentPage(1);
  };

  const handleContactSeller = async (dealId: number, sellerId: number) => {
    try {
      console.log('Starting chat with dealId:', dealId, 'sellerId:', sellerId);
      console.log('Deal object:', deals.find(d => d.TransID === dealId));
      
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
              console.log('Search results:', results);
              // Update deals with search results
              if (results && results.data) {
                // Handle search results
                setCurrentPage(1);
              }
            }}
            onLoading={(loading) => console.log('Searching:', loading)}
            className="w-full"
          />
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
                {(selectedMakes.length > 0 || selectedGrades.length > 0 || selectedBrands.length > 0 || searchTerm || selectedCategory) && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedMakes.length + selectedGrades.length + selectedBrands.length + (searchTerm ? 1 : 0) + (selectedCategory ? 1 : 0)}
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
                      value={pendingSearchTerm}
                      onChange={(e) => setPendingSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Categories */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto font-semibold"
                    onClick={() => toggleSection('categories')}
                  >
                    Categories
                    {expandedSections.categories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {expandedSections.categories && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="all-categories" 
                          checked={pendingSelectedCategory === "" || pendingSelectedCategory === "all"}
                          onCheckedChange={(checked) => setPendingSelectedCategory(checked ? "all" : "")}
                        />
                        <label htmlFor="all-categories" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          All Categories
                        </label>
                      </div>
                      {groups.map((group: any) => (
                        <div key={group.GroupID} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`category-${group.GroupID}`}
                            checked={pendingSelectedCategory === group.GroupID.toString()}
                            onCheckedChange={(checked) => handleCategoryChange(group.GroupID.toString(), checked)}
                          />
                          <label htmlFor={`category-${group.GroupID}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {group.GroupName}
                          </label>
                        </div>
                      ))}
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
                      {filteredMakes.map((make: any) => (
                        <div key={make.make_ID || make.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`make-${make.make_ID || make.id}`}
                            checked={pendingMakes.includes((make.make_ID || make.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const makeId = (make.make_ID || make.id)?.toString();
                              if (makeId) {
                                handleMakeChange(makeId, checked);
                              }
                            }}
                          />
                          <label htmlFor={`make-${make.make_ID || make.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {make.make_Name || make.name}
                          </label>
                        </div>
                      ))}
                      {filteredMakes.length === 0 && pendingSelectedCategory && (
                        <p className="text-sm text-muted-foreground italic">No makes available for selected category</p>
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
                      {filteredGrades.map((grade: any) => (
                        <div key={grade.gradeID || grade.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`grade-${grade.gradeID || grade.id}`}
                            checked={pendingGrades.includes((grade.gradeID || grade.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const gradeId = (grade.gradeID || grade.id)?.toString();
                              if (gradeId) {
                                if (checked) {
                                  setPendingGrades([...pendingGrades, gradeId]);
                                } else {
                                  setPendingGrades(pendingGrades.filter(id => id !== gradeId));
                                }
                              }
                            }}
                          />
                          <label htmlFor={`grade-${grade.gradeID || grade.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {grade.GradeName || grade.name}
                          </label>
                        </div>
                      ))}
                      {filteredGrades.length === 0 && pendingMakes.length > 0 && (
                        <p className="text-sm text-muted-foreground italic">No grades available for selected makes</p>
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
                      {filteredBrands.map((brand: any) => (
                        <div key={brand.brandID || brand.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`brand-${brand.brandID || brand.id}`}
                            checked={pendingBrands.includes((brand.brandID || brand.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const brandId = (brand.brandID || brand.id)?.toString();
                              if (brandId) {
                                if (checked) {
                                  setPendingBrands([...pendingBrands, brandId]);
                                } else {
                                  setPendingBrands(pendingBrands.filter(id => id !== brandId));
                                }
                              }
                            }}
                          />
                          <label htmlFor={`brand-${brand.brandID || brand.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {brand.brandname || brand.name}
                          </label>
                        </div>
                      ))}
                      {filteredBrands.length === 0 && pendingMakes.length > 0 && (
                        <p className="text-sm text-muted-foreground italic">No brands available for selected makes</p>
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
                      {gsmOptions.map((gsm: string) => (
                        <div key={gsm} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`gsm-${gsm}`}
                            checked={pendingGsm.includes(gsm)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPendingGsm([...pendingGsm, gsm]);
                              } else {
                                setPendingGsm(pendingGsm.filter(val => val !== gsm));
                              }
                            }}
                          />
                          <label htmlFor={`gsm-${gsm}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {gsm} GSM
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* Stock Status Filter */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto font-semibold"
                    onClick={() => toggleSection('stockStatus')}
                  >
                    Stock Status
                    {expandedSections.stockStatus ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {expandedSections.stockStatus && (
                    <div className="mt-3 space-y-2">
                      {[
                        { label: "Available", value: "1" },
                        { label: "Sold", value: "2" },
                        { label: "Reserved", value: "3" },
                        { label: "On Hold", value: "4" }
                      ].map((status) => (
                        <div key={status.value} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`status-${status.value}`}
                            checked={pendingStockStatus.includes(status.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPendingStockStatus([...pendingStockStatus, status.value]);
                              } else {
                                setPendingStockStatus(pendingStockStatus.filter(val => val !== status.value));
                              }
                            }}
                          />
                          <label htmlFor={`status-${status.value}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {status.label}
                          </label>
                        </div>
                      ))}
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
                    onClick={applyFilters}
                  >
                    Apply Filters
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
                
                {/* Categories */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto font-semibold"
                    onClick={() => toggleSection('categories')}
                  >
                    Categories
                    {expandedSections.categories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {expandedSections.categories && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="all-categories-desktop" 
                          checked={pendingSelectedCategory === "" || pendingSelectedCategory === "all"}
                          onCheckedChange={(checked) => setPendingSelectedCategory(checked ? "all" : "")}
                        />
                        <label htmlFor="all-categories-desktop" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          All Categories
                        </label>
                      </div>
                      {groups.map((group: any) => (
                        <div key={group.GroupID} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`category-desktop-${group.GroupID}`}
                            checked={pendingSelectedCategory === group.GroupID.toString()}
                            onCheckedChange={(checked) => handleCategoryChange(group.GroupID.toString(), checked)}
                          />
                          <label htmlFor={`category-desktop-${group.GroupID}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {group.GroupName}
                          </label>
                        </div>
                      ))}
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
                      {filteredMakes.map((make: any) => (
                        <div key={make.make_ID || make.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`make-desktop-${make.make_ID || make.id}`}
                            checked={pendingMakes.includes((make.make_ID || make.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const makeId = (make.make_ID || make.id)?.toString();
                              if (makeId) {
                                handleMakeChange(makeId, checked);
                              }
                            }}
                          />
                          <label htmlFor={`make-desktop-${make.make_ID || make.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {make.make_Name || make.name}
                          </label>
                        </div>
                      ))}
                      {filteredMakes.length === 0 && pendingSelectedCategory && (
                        <p className="text-sm text-muted-foreground italic">No makes available for selected category</p>
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
                      {filteredGrades.map((grade: any) => (
                        <div key={grade.gradeID || grade.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`grade-desktop-${grade.gradeID || grade.id}`}
                            checked={pendingGrades.includes((grade.gradeID || grade.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const gradeId = (grade.gradeID || grade.id)?.toString();
                              if (gradeId) {
                                if (checked) {
                                  setPendingGrades([...pendingGrades, gradeId]);
                                } else {
                                  setPendingGrades(pendingGrades.filter(id => id !== gradeId));
                                }
                              }
                            }}
                          />
                          <label htmlFor={`grade-desktop-${grade.gradeID || grade.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {grade.GradeName || grade.name}
                          </label>
                        </div>
                      ))}
                      {filteredGrades.length === 0 && pendingMakes.length > 0 && (
                        <p className="text-sm text-muted-foreground italic">No grades available for selected makes</p>
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
                      {filteredBrands.map((brand: any) => (
                        <div key={brand.brandID || brand.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`brand-desktop-${brand.brandID || brand.id}`}
                            checked={pendingBrands.includes((brand.brandID || brand.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const brandId = (brand.brandID || brand.id)?.toString();
                              if (brandId) {
                                if (checked) {
                                  setPendingBrands([...pendingBrands, brandId]);
                                } else {
                                  setPendingBrands(pendingBrands.filter(id => id !== brandId));
                                }
                              }
                            }}
                          />
                          <label htmlFor={`brand-desktop-${brand.brandID || brand.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {brand.brandname || brand.name}
                          </label>
                        </div>
                      ))}
                      {filteredBrands.length === 0 && pendingMakes.length > 0 && (
                        <p className="text-sm text-muted-foreground italic">No brands available for selected makes</p>
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
                      {gsmOptions.map((gsm: string) => (
                        <div key={gsm} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`gsm-desktop-${gsm}`}
                            checked={pendingGsm.includes(gsm)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPendingGsm([...pendingGsm, gsm]);
                              } else {
                                setPendingGsm(pendingGsm.filter(val => val !== gsm));
                              }
                            }}
                          />
                          <label htmlFor={`gsm-desktop-${gsm}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {gsm} GSM
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Separator />

                {/* Stock Status Filter */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto font-semibold"
                    onClick={() => toggleSection('stockStatus')}
                  >
                    Stock Status
                    {expandedSections.stockStatus ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {expandedSections.stockStatus && (
                    <div className="mt-3 space-y-2">
                      {[
                        { label: "Available", value: "1" },
                        { label: "Sold", value: "2" },
                        { label: "Reserved", value: "3" },
                        { label: "On Hold", value: "4" }
                      ].map((status) => (
                        <div key={status.value} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`status-desktop-${status.value}`}
                            checked={pendingStockStatus.includes(status.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPendingStockStatus([...pendingStockStatus, status.value]);
                              } else {
                                setPendingStockStatus(pendingStockStatus.filter(val => val !== status.value));
                              }
                            }}
                          />
                          <label htmlFor={`status-desktop-${status.value}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {status.label}
                          </label>
                        </div>
                      ))}
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
                    onClick={applyFilters}
                    data-testid="button-apply-filters-desktop"
                  >
                    Apply Filters
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
                                {(deal.Deckle_mm && deal.grain_mm) ? (
                                  <>
                                    <div>{(deal.Deckle_mm/10).toFixed(1)} × {(deal.grain_mm/10).toFixed(1)} cm</div>
                                    <div>{(deal.Deckle_mm/25.4).toFixed(2)}" × {(deal.grain_mm/25.4).toFixed(2)}"</div>
                                  </>
                                ) : 'N/A'}
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
                          {deal.uplaodDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                              <Calendar className="h-3 w-3" />
                              <span>{getRelativeTime(deal.uplaodDate)}</span>
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