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
import { Package, Search, Filter, ShoppingCart, MessageCircle, MapPin, Star, Heart, Eye, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Marketplace() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    categories: true,
    price: true,
    makes: false,
    grades: false,
    brands: false,
    location: false
  });

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
      priceRange 
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory && selectedCategory !== 'all') params.append('group_id', selectedCategory);
      if (sortBy) params.append('sort', sortBy);
      if (priceRange && priceRange !== 'all') params.append('price_range', priceRange);
      
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

  const handleContactSeller = async (dealId: number, sellerId: number) => {
    try {
      console.log('Starting chat with dealId:', dealId, 'sellerId:', sellerId);
      
      if (!dealId || !sellerId) {
        console.error('Missing dealId or sellerId');
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
                
                {/* Price Range */}
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto font-semibold"
                    onClick={() => toggleSection('price')}
                  >
                    Price Range
                    {expandedSections.price ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {expandedSections.price && (
                    <div className="mt-3 space-y-4">
                      <div className="px-3">
                        <Slider
                          value={[minPrice, maxPrice]}
                          onValueChange={([min, max]) => {
                            setMinPrice(min);
                            setMaxPrice(max);
                          }}
                          max={100000}
                          min={0}
                          step={1000}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-2">
                          <span>₹{minPrice.toLocaleString()}</span>
                          <span>₹{maxPrice.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "Under ₹1,000", value: "0-1000" },
                          { label: "₹1,000 - ₹5,000", value: "1000-5000" },
                          { label: "₹5,000 - ₹25,000", value: "5000-25000" },
                          { label: "₹25,000 - ₹1,00,000", value: "25000-100000" },
                          { label: "Above ₹1,00,000", value: "100000+" }
                        ].map((range) => (
                          <div key={range.value} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`price-${range.value}`}
                              checked={priceRange === range.value}
                              onCheckedChange={(checked) => setPriceRange(checked ? range.value : "")}
                            />
                            <label htmlFor={`price-${range.value}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {range.label}
                            </label>
                          </div>
                        ))}
                      </div>
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
                    setPriceRange("");
                    setMinPrice(0);
                    setMaxPrice(100000);
                    setSelectedMakes([]);
                    setSelectedGrades([]);
                    setSelectedBrands([]);
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
                    setPriceRange("");
                    setMinPrice(0);
                    setMaxPrice(100000);
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

                {/* Deal Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {deals.map((deal: any) => (
                    <Card key={deal.TransID} className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                      <div className="relative">
                        {/* Product Image Placeholder */}
                        <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 flex items-center justify-center">
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

                        <CardContent className="p-3">
                          {/* Deal Info */}
                          <Link href={`/deal/${deal.TransID}`}>
                            <h3 className="font-semibold text-sm line-clamp-2 mb-2 hover:text-primary transition-colors" data-testid={`deal-title-${deal.TransID}`}>
                              {deal.DealTitle}
                            </h3>
                          </Link>

                          {/* Stock Hierarchy */}
                          <div className="text-xs text-muted-foreground mb-2 space-y-1">
                            {deal.MakeName && <div>Make: {deal.MakeName}</div>}
                            {deal.GradeName && <div>Grade: {deal.GradeName}</div>}
                            {deal.BrandName && <div>Brand: {deal.BrandName}</div>}
                          </div>

                          {/* Price */}
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-lg font-bold text-primary" data-testid={`deal-price-${deal.TransID}`}>
                              ₹{deal.Price?.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs text-muted-foreground">/{deal.Unit}</span>
                          </div>

                          {/* Seller Info */}
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs text-muted-foreground">by</span>
                            <span className="text-xs font-medium text-foreground" data-testid={`seller-name-${deal.TransID}`}>
                              {deal.seller_name || deal.seller_company || 'Seller'}
                            </span>
                          </div>

                          {/* Location */}
                          {deal.Location && (
                            <div className="flex items-center gap-1 mb-3">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{deal.Location}</span>
                            </div>
                          )}

                          {/* Quantity Info */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                            <span>Qty: {deal.Quantity} {deal.Unit}</span>
                            {deal.MinOrderQuantity > 1 && (
                              <span>Min: {deal.MinOrderQuantity}</span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => setLocation(`/deal/${deal.TransID}`)}
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
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleContactSeller(deal.TransID, deal.SellerID)}
                                  data-testid={`button-contact-seller-${deal.TransID}`}
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  Chat
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation(`/deal/${deal.TransID}`)}
                                  data-testid={`button-buy-now-${deal.TransID}`}
                                >
                                  <ShoppingCart className="h-3 w-3 mr-1" />
                                  Buy
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Rating (placeholder) */}
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                            <div className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-current" />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">(4.5)</span>
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
    </div>
  );
}