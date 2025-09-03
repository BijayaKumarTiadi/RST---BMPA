import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Package, Search, Filter, MessageCircle, MapPin, Heart, Eye, Edit, ChevronDown, ChevronUp, Mail, MessageSquare, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import ProductDetailsModal from "@/components/product-details-modal";
import InquiryFormModal from "@/components/inquiry-form-modal";

export default function Marketplace() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedGsm, setSelectedGsm] = useState<string[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedStockStatus, setSelectedStockStatus] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
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
      stockStatus: selectedStockStatus
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory && selectedCategory !== 'all') params.append('group_id', selectedCategory);
      if (sortBy) params.append('sort', sortBy);
      if (selectedMakes.length > 0) params.append('makes', selectedMakes.join(','));
      if (selectedGrades.length > 0) params.append('grades', selectedGrades.join(','));
      if (selectedBrands.length > 0) params.append('brands', selectedBrands.join(','));
      if (selectedGsm.length > 0) params.append('gsm', selectedGsm.join(','));
      if (selectedUnits.length > 0) params.append('units', selectedUnits.join(','));
      if (selectedStockStatus.length > 0) params.append('stock_status', selectedStockStatus.join(','));
      
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
  const groups = stockHierarchy?.groups || [];
  const makes = stockHierarchy?.makes || [];
  const grades = stockHierarchy?.grades || [];
  const brands = stockHierarchy?.brands || [];

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
    const buyerName = user?.name || user?.company_name || 'Buyer';
    const productTitle = deal.DealTitle || deal.Seller_comments || `${deal.MakeName} ${deal.GradeName} ${deal.BrandName}`.trim() || 'Product';
    const productDetails = `${productTitle} (ID: ${deal.TransID})`;
    const sellerPrice = `₹${(deal.OfferPrice || deal.Price || 0).toLocaleString('en-IN')} per ${deal.OfferUnit || deal.Unit || 'unit'}`;
    const additionalDetails = [];
    
    if (deal.MakeName) additionalDetails.push(`Make: ${deal.MakeName}`);
    if (deal.GradeName) additionalDetails.push(`Grade: ${deal.GradeName}`);
    if (deal.BrandName) additionalDetails.push(`Brand: ${deal.BrandName}`);
    if (deal.GSM) additionalDetails.push(`GSM: ${deal.GSM}`);
    
    const productInfo = additionalDetails.length > 0 
      ? `${productDetails} (${additionalDetails.join(', ')})` 
      : productDetails;
    
    const message = encodeURIComponent(
      `Hey, I am ${buyerName}. I am interested in ${productInfo}, your price is ${sellerPrice}, my quotation price is [Please specify your price].`
    );
    
    const whatsappUrl = `https://wa.me/918984222915?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Discover stock deals from verified sellers across the trading industry
          </p>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex gap-6">
          {/* Left Sidebar - Filters */}
          <div className="w-80 flex-shrink-0">
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
                      placeholder="Search deals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                          checked={selectedCategory === "" || selectedCategory === "all"}
                          onCheckedChange={(checked) => setSelectedCategory(checked ? "all" : "")}
                        />
                        <label htmlFor="all-categories" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          All Categories
                        </label>
                      </div>
                      {groups.map((group: any) => (
                        <div key={group.GroupID} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`category-${group.GroupID}`}
                            checked={selectedCategory === group.GroupID.toString()}
                            onCheckedChange={(checked) => setSelectedCategory(checked ? group.GroupID.toString() : "")}
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
                      {makes.map((make: any) => (
                        <div key={make.MakeID || make.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`make-${make.MakeID || make.id}`}
                            checked={selectedMakes.includes((make.MakeID || make.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const makeId = (make.MakeID || make.id)?.toString();
                              if (makeId) {
                                if (checked) {
                                  setSelectedMakes([...selectedMakes, makeId]);
                                } else {
                                  setSelectedMakes(selectedMakes.filter(id => id !== makeId));
                                }
                              }
                            }}
                          />
                          <label htmlFor={`make-${make.MakeID || make.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {make.MakeName || make.name}
                          </label>
                        </div>
                      ))}
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
                      {grades.map((grade: any) => (
                        <div key={grade.GradeID || grade.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`grade-${grade.GradeID || grade.id}`}
                            checked={selectedGrades.includes((grade.GradeID || grade.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const gradeId = (grade.GradeID || grade.id)?.toString();
                              if (gradeId) {
                                if (checked) {
                                  setSelectedGrades([...selectedGrades, gradeId]);
                                } else {
                                  setSelectedGrades(selectedGrades.filter(id => id !== gradeId));
                                }
                              }
                            }}
                          />
                          <label htmlFor={`grade-${grade.GradeID || grade.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {grade.GradeName || grade.name}
                          </label>
                        </div>
                      ))}
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
                      {brands.map((brand: any) => (
                        <div key={brand.BrandID || brand.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`brand-${brand.BrandID || brand.id}`}
                            checked={selectedBrands.includes((brand.BrandID || brand.id)?.toString())}
                            onCheckedChange={(checked) => {
                              const brandId = (brand.BrandID || brand.id)?.toString();
                              if (brandId) {
                                if (checked) {
                                  setSelectedBrands([...selectedBrands, brandId]);
                                } else {
                                  setSelectedBrands(selectedBrands.filter(id => id !== brandId));
                                }
                              }
                            }}
                          />
                          <label htmlFor={`brand-${brand.BrandID || brand.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {brand.BrandName || brand.name}
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
                            checked={selectedStockStatus.includes(status.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedStockStatus([...selectedStockStatus, status.value]);
                              } else {
                                setSelectedStockStatus(selectedStockStatus.filter(val => val !== status.value));
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
                
                {/* Clear Filters Button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("");
                    setSortBy("newest");
                    setSelectedMakes([]);
                    setSelectedGrades([]);
                    setSelectedBrands([]);
                    setSelectedGsm([]);
                    setSelectedUnits([]);
                    setSelectedStockStatus([]);
                    setSelectedLocations([]);
                  }}
                >
                  Clear All Filters
                </Button>
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
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("");
                    setSortBy("newest");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-muted-foreground">
                    Showing {deals.length} deal{deals.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Deal Cards Grid - 3 products per row for better visibility */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {deals.map((deal: any) => (
                    <Card key={deal.TransID} className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden h-full flex flex-col">
                      <div className="relative">
                        {/* Product Image Placeholder */}
                        <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 flex items-center justify-center">
                          <Package className="h-16 w-16 text-blue-400" />
                        </div>
                          
                          {/* Wishlist Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-wishlist-${deal.TransID}`}
                          >
                            <Heart className="h-4 w-4" />
                          </Button>

                          {/* Group Badge */}
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                              {deal.GroupName}
                            </Badge>
                          </div>

                          {/* Status Badge */}
                          <div className="absolute bottom-2 left-2">
                            <Badge 
                              variant={deal.Status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {deal.Status === 'active' ? 'Available' : deal.Status}
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="p-3 flex-1 flex flex-col">
                          {/* Product Name First */}
                          <Link href={`/deal/${deal.TransID}`}>
                            <h3 className="font-semibold text-base line-clamp-2 mb-3 hover:text-primary transition-colors" data-testid={`deal-title-${deal.TransID}`}>
                              {deal.DealTitle || deal.Seller_comments || `${deal.MakeName} ${deal.GradeName} ${deal.BrandName}`.trim() || 'Product Details'}
                            </h3>
                          </Link>

                          {/* Price - More Prominent */}
                          <div className="flex items-baseline gap-1 mb-3">
                            <span className="text-xl font-bold text-primary" data-testid={`deal-price-${deal.TransID}`}>
                              ₹{(deal.OfferPrice || deal.Price || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-sm text-muted-foreground">/{deal.OfferUnit || deal.Unit || 'unit'}</span>
                          </div>

                          {/* Enhanced Product Details */}
                          <div className="text-xs text-muted-foreground mb-2 space-y-1">
                            {deal.MakeName && <div><span className="font-medium">Make:</span> {deal.MakeName}</div>}
                            {deal.GradeName && <div><span className="font-medium">Grade:</span> {deal.GradeName}</div>}
                            {deal.BrandName && <div><span className="font-medium">Brand:</span> {deal.BrandName}</div>}
                            {deal.GSM && <div><span className="font-medium">GSM:</span> {deal.GSM}</div>}
                            {deal.Deckle && <div><span className="font-medium">Deckle:</span> {deal.Deckle}</div>}
                            {deal.Grain && <div><span className="font-medium">Grain:</span> {deal.Grain}</div>}
                          </div>

                          {/* Seller Info */}
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs text-muted-foreground">by</span>
                            <span className="text-xs font-medium text-foreground" data-testid={`seller-name-${deal.TransID}`}>
                              {deal.created_by_name || deal.seller_name || deal.seller_company || deal.created_by_company || 'Seller'}
                            </span>
                          </div>

                          {/* Location */}
                          {deal.Location && (
                            <div className="flex items-center gap-1 mb-3">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{deal.Location}</span>
                            </div>
                          )}

                          {/* Description */}
                          {deal.Description && (
                            <div className="text-xs text-muted-foreground mb-2">
                              <span className="font-medium">Description:</span> 
                              <span className="line-clamp-2">{deal.Description}</span>
                            </div>
                          )}

                          {/* Quantity Info */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>Qty: {deal.Quantity || deal.StockAge || 'Available'} {deal.OfferUnit || deal.Unit || ''}</span>
                            {deal.MinOrderQuantity > 1 && (
                              <span>Min: {deal.MinOrderQuantity}</span>
                            )}
                          </div>

                          {/* Deal Age - Relative Time */}
                          {deal.deal_created_at && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                              <Calendar className="h-3 w-3" />
                              <span>{getRelativeTime(deal.deal_created_at)}</span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="space-y-2 mt-auto">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => handleViewDetails(deal)}
                              data-testid={`button-view-details-${deal.TransID}`}
                            >
                              <Eye className="h-3 w-3 mr-1" />
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
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation(`/deal/${deal.TransID}`)}
                                  data-testid={`button-view-own-deal-${deal.TransID}`}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
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
        onSendWhatsApp={handleSendWhatsApp}
      />
      
      <InquiryFormModal 
        isOpen={isInquiryModalOpen} 
        onClose={() => setIsInquiryModalOpen(false)} 
        deal={selectedDeal} 
      />
    </div>
  );
}