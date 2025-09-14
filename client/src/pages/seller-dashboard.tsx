import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { Package, Plus, TrendingUp, DollarSign, Users, Eye, Edit2, Trash2, MessageCircle, ShoppingCart, Filter, Search, Calendar, IndianRupee, Clock, X, User, MessageSquare, Mail } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPostingDate } from "@/lib/utils";

export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  // Fetch user settings to get dimension preference
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: isAuthenticated
  });

  // Helper function to calculate relative time
  const getRelativeTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    }
  };

  // Helper function to check if group is Kraft Reel
  const isKraftReelGroup = (groupName: string, groupID?: number): boolean => {
    return groupName?.toLowerCase().trim() === 'kraft reel' || groupID === 3;
  };

  // Helper function to format dimensions based on user preference
  const formatDimensions = (deckle_mm?: number, grain_mm?: number, groupName?: string, groupID?: number) => {
    if (!deckle_mm || !grain_mm) return 'N/A';
    
    const userUnit = (userSettings as any)?.dimension_unit || 'cm';
    const isKraftReel = isKraftReelGroup(groupName || '', groupID);
    
    if (isKraftReel) {
      // For Kraft Reel: use "," separator and show original grain_mm value with "B.S" suffix
      if (userUnit === 'inch') {
        const deckleInch = (deckle_mm / 25.4).toFixed(2);
        return `${deckleInch}", ${grain_mm} B.S`;
      } else {
        const deckleCm = (deckle_mm / 10).toFixed(1);
        return `${deckleCm}cm, ${grain_mm} B.S`;
      }
    } else {
      // For regular products: use "×" separator and normal conversions
      if (userUnit === 'inch') {
        const deckleInch = (deckle_mm / 25.4).toFixed(2);
        const grainInch = (grain_mm / 25.4).toFixed(2);
        return `${deckleInch}" × ${grainInch}"`;
      } else {
        const deckleCm = (deckle_mm / 10).toFixed(1);
        const grainCm = (grain_mm / 10).toFixed(1);
        return `${deckleCm} × ${grainCm} cm`;
      }
    }
  };

  // Helper function to get product description
  const getProductDescription = (deal: any) => {
    // First try stock_description
    if (deal.stock_description) {
      return deal.stock_description;
    }
    // Then try building from Make, Brand, Grade
    const parts = [];
    if (deal.Make) parts.push(deal.Make);
    if (deal.Brand) parts.push(deal.Brand);
    if (deal.Grade) parts.push(deal.Grade);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    // Fall back to Seller_comments first line if available
    if (deal.Seller_comments) {
      return deal.Seller_comments.split('\n')[0];
    }
    // Finally, use a default
    return `Deal #${deal.TransID}`;
  };


  // Helper function to format stock age from API's StockAge field (days)
  const formatStockAge = (stockAgeDays: number) => {
    if (stockAgeDays === undefined || stockAgeDays === null) return 'N/A';
    
    if (stockAgeDays === 0) {
      return 'Fresh';
    } else if (stockAgeDays === 1) {
      return '1 day';
    } else if (stockAgeDays < 7) {
      return `${stockAgeDays} days`;
    } else if (stockAgeDays < 30) {
      const weeks = Math.floor(stockAgeDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'}`;
    } else if (stockAgeDays < 365) {
      const months = Math.floor(stockAgeDays / 30);
      return `${months} month${months === 1 ? '' : 's'}`;
    } else {
      const years = Math.floor(stockAgeDays / 365);
      return `${years} year${years === 1 ? '' : 's'}`;
    }
  };

  // Fetch seller's deals (products)
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals", "seller_only"],
    queryFn: async () => {
      const response = await fetch(`/api/deals?seller_only=true`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
  });

  // Fetch seller stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/seller/stats"],
    queryFn: async () => {
      const response = await fetch(`/api/seller/stats`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch orders for seller (received inquiries)
  const { data: receivedOrders } = useQuery({
    queryKey: ["/api/orders", "seller"],
    queryFn: async () => {
      const response = await fetch(`/api/orders?role=seller`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch seller orders');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch orders for buyer (sent inquiries)
  const { data: sentOrders } = useQuery({
    queryKey: ["/api/orders", "buyer"],
    queryFn: async () => {
      const response = await fetch(`/api/orders?role=buyer`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch buyer orders');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch inquiries received by seller (new Drizzle-based system)
  const { data: sellerInquiries, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["/api/inquiries/seller"],
    queryFn: async () => {
      const response = await fetch(`/api/inquiries/seller`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch seller inquiries');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
  });

  // Fetch inquiries sent by current user (for Counter Offers tab)
  const { data: buyerInquiries, isLoading: buyerInquiriesLoading } = useQuery({
    queryKey: ["/api/inquiries/buyer"],
    queryFn: async () => {
      const response = await fetch(`/api/inquiries/buyer`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch buyer inquiries');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
  });

  // Mark deal as sold mutation
  const markAsSoldMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest('PUT', `/api/deals/${dealId}/mark-sold`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal marked as sold successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", "seller_only"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/stats"] });
      // Force refetch stats to bypass cache
      queryClient.refetchQueries({ queryKey: ["/api/seller/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark deal as sold",
        variant: "destructive",
      });
    },
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest('DELETE', `/api/deals/${dealId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", "seller_only"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete deal",
        variant: "destructive",
      });
    },
  });

  const deals = dealsData?.deals || [];
  // Combine both received and sent orders
  const receivedOrdersArray = receivedOrders || [];
  const sentOrdersArray = sentOrders || [];
  const allOrders = [...receivedOrdersArray, ...sentOrdersArray];
  
  // Sort by created_at date (newest first)
  allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Get status text from numeric code
  const getStatusText = (stockStatus: number) => {
    switch (stockStatus) {
      case 0: return 'Inactive';
      case 1: return 'Active';
      case 2: return 'Sold';
      default: return 'Active';
    }
  };

  // Get status color from numeric code
  const getStatusColor = (stockStatus: number) => {
    switch (stockStatus) {
      case 0: return 'bg-gray-100 text-gray-700'; // Inactive
      case 1: return 'bg-green-100 text-green-700'; // Active
      case 2: return 'bg-red-100 text-red-700'; // Sold
      default: return 'bg-green-100 text-green-700';
    }
  };

  // Filter deals based on search and status
  const filteredDeals = deals.filter((deal: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || 
                         deal.Seller_comments?.toLowerCase().includes(searchLower) ||
                         deal.stock_description?.toLowerCase().includes(searchLower) ||
                         deal.GroupName?.toLowerCase().includes(searchLower) ||
                         deal.Make?.toLowerCase().includes(searchLower) ||
                         deal.Grade?.toLowerCase().includes(searchLower) ||
                         deal.Brand?.toLowerCase().includes(searchLower) ||
                         deal.GSM?.toString().includes(searchTerm) ||
                         deal.Deckle_mm?.toString().includes(searchTerm) ||
                         deal.grain_mm?.toString().includes(searchTerm) ||
                         deal.TransID.toString().includes(searchTerm) ||
                         deal.category_name?.toLowerCase().includes(searchLower);
    
    const stockStatus = deal.StockStatus || 1; // Default to Active if null
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && stockStatus === 1) ||
                         (statusFilter === "sold" && stockStatus === 2) ||
                         (statusFilter === "inactive" && stockStatus === 0);
    
    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to access your seller dashboard.</p>
            <Button onClick={() => setLocation('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  const stats = statsData || { totalProducts: 0, totalDeals: 0, totalOrders: 0, totalRevenue: 0, activeDeals: 0 };

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      
      <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Member Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome back, {user?.mname || user?.name}! Manage your products and track your business.
              </p>
            </div>
            <Button 
              asChild 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg" 
              data-testid="button-add-deal"
            >
              <Link href="/add-product">
                <Plus className="mr-2 h-4 w-4" />
                <span className="text-xs">Add New Deal</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Active Offers</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-active-offers">{stats.activeDeals}</div>
              <p className="text-xs text-green-100 mt-1">
                Currently available
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Offers</CardTitle>
              <Package className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-total-offers">{stats.totalDeals}</div>
              <p className="text-xs text-blue-100 mt-1">
                All time listings
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Sold Offers</CardTitle>
              <ShoppingCart className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-sold-offers">
                {(stats.totalDeals || 0) - (stats.activeDeals || 0)}
              </div>
              <p className="text-xs text-purple-100 mt-1">
                Successfully sold
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="offers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-background border shadow-sm">
            <TabsTrigger value="offers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Offers</TabsTrigger>
            <TabsTrigger value="inquiries" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Inquiries</TabsTrigger>
            <TabsTrigger value="counter-offers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Counter Offers</TabsTrigger>
          </TabsList>

          {/* Offers Tab */}
          <TabsContent value="offers" className="space-y-6">
            <Card className="border-2 border-border shadow-lg bg-card">
              <CardHeader className="bg-muted border-b-2 border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Product Inventory</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Manage your product listings and inventory
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {dealsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : filteredDeals.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {deals.length === 0 ? "No deals yet" : "No matching products"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {deals.length === 0 ? "Start selling by adding your first product" : "Try adjusting your search or filters"}
                    </p>
                    {deals.length === 0 && (
                      <Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-first-product">
                        <Link href="/add-product">Add Your First Product</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted border-b-4 border-primary/20">
                            <TableHead className="font-semibold text-foreground">Product</TableHead>
                            <TableHead className="font-semibold text-foreground">Category</TableHead>
                            <TableHead className="font-semibold text-foreground">Specifications</TableHead>
                            <TableHead className="font-semibold text-foreground">Price</TableHead>
                            <TableHead className="font-semibold text-foreground">Status</TableHead>
                            <TableHead className="font-semibold text-foreground">Posted on</TableHead>
                            <TableHead className="font-semibold text-foreground">Stock Age</TableHead>
                            <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDeals.map((deal: any) => (
                            <TableRow 
                              key={deal.TransID} 
                              className="hover:bg-muted/50 transition-colors"
                              data-testid={`deal-row-${deal.TransID}`}
                            >
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-foreground" data-testid={`deal-title-${deal.TransID}`}>
                                      {getProductDescription(deal)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      ID: {deal.TransID}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium text-foreground">
                                  {deal.GroupName || 'No Category'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 text-sm">
                                  <div><span className="text-muted-foreground">GSM:</span> <span className="font-medium" data-testid={`deal-gsm-${deal.TransID}`}>{deal.GSM || 'N/A'}</span></div>
                                  <div><span className="text-muted-foreground">Dim:</span> <span className="font-medium">{formatDimensions(deal.Deckle_mm, deal.grain_mm, deal.GroupName, deal.groupID)}</span></div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-foreground" data-testid={`deal-price-${deal.TransID}`}>
                                  ₹{deal.OfferPrice?.toLocaleString('en-IN')}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  per {deal.OfferUnit || 'unit'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge 
                                    variant="secondary"
                                    className={getStatusColor(deal.StockStatus || 1)}
                                    data-testid={`deal-status-${deal.TransID}`}
                                  >
                                    {getStatusText(deal.StockStatus || 1)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-foreground" title="When offer was created">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {formatPostingDate(deal)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-foreground" title="Actual stock age">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  {formatStockAge(deal.StockAge)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedDeal(deal);
                                      setViewModalOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-blue-100"
                                    data-testid={`button-view-${deal.TransID}`}
                                  >
                                    <Eye className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    asChild
                                    className="h-8 w-8 p-0 hover:bg-green-100"
                                    data-testid={`button-edit-${deal.TransID}`}
                                  >
                                    <Link href={`/edit-product/${deal.TransID}`}>
                                      <Edit2 className="h-4 w-4 text-green-600" />
                                    </Link>
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => markAsSoldMutation.mutate(deal.TransID.toString())}
                                    disabled={markAsSoldMutation.isPending || (deal.StockStatus || 1) === 2}
                                    className="h-8 px-2 text-xs hover:bg-orange-100 disabled:opacity-50"
                                    data-testid={`button-mark-sold-${deal.TransID}`}
                                  >
                                    <IndianRupee className="h-3 w-3 text-orange-600 mr-1" />
                                    Sold
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this product?')) {
                                        deleteDealMutation.mutate(deal.TransID.toString());
                                      }
                                    }}
                                    disabled={deleteDealMutation.isPending || (deal.StockStatus || 1) === 0}
                                    className="h-8 w-8 p-0 hover:bg-red-100 disabled:opacity-50"
                                    data-testid={`button-delete-${deal.TransID}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                      {filteredDeals.map((deal: any) => (
                        <Card key={deal.TransID} className="border border-border hover:shadow-md transition-shadow" data-testid={`deal-card-${deal.TransID}`}>
                          <CardContent className="p-4">
                            {/* Header with Product Name and Status */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground text-sm leading-tight" data-testid={`deal-title-${deal.TransID}`}>
                                    {getProductDescription(deal)}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-1">ID: {deal.TransID}</p>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <Badge 
                                  variant="secondary"
                                  className={`text-xs ${getStatusColor(deal.StockStatus || 1)}`}
                                  data-testid={`deal-status-${deal.TransID}`}
                                >
                                  {getStatusText(deal.StockStatus || 1)}
                                </Badge>
                              </div>
                            </div>

                            {/* Category */}
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1">Category</p>
                              <p className="text-sm font-medium text-foreground">{deal.GroupName || 'No Category'}</p>
                            </div>

                            {/* Product Specifications */}
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-2">Specifications</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">GSM:</span>
                                  <span className="font-medium text-foreground ml-1" data-testid={`deal-gsm-${deal.TransID}`}>
                                    {deal.GSM || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Dim:</span>
                                  <span className="font-medium text-foreground ml-1">
                                    {formatDimensions(deal.Deckle_mm, deal.grain_mm, deal.GroupName, deal.groupID)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Grain:</span>
                                  <span className="font-medium text-foreground ml-1">
                                    {deal.grain_mm}mm
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Deckle:</span>
                                  <span className="font-medium text-foreground ml-1">
                                    {deal.Deckle_mm}mm
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Price and Age */}
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="font-bold text-foreground" data-testid={`deal-price-${deal.TransID}`}>
                                  ₹{deal.OfferPrice?.toLocaleString('en-IN')}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    per {deal.OfferUnit || 'unit'}
                                  </span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Posted/Stock Age</p>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1 text-xs text-foreground" title="When offer was created">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span>{formatPostingDate(deal)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-foreground" title="Actual stock age">
                                    <Package className="h-3 w-3 text-muted-foreground" />
                                    <span>{formatStockAge(deal.StockAge)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-3 border-t border-border">
                              <Button 
                                size="sm" 
                                variant="outline"
                                asChild
                                className="flex-1 text-xs"
                                data-testid={`button-view-${deal.TransID}`}
                              >
                                <Link href={`/deal/${deal.TransID}`}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Link>
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                asChild
                                className="flex-1 text-xs"
                                data-testid={`button-edit-${deal.TransID}`}
                              >
                                <Link href={`/edit-product/${deal.TransID}`}>
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Link>
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => markAsSoldMutation.mutate(deal.TransID.toString())}
                                disabled={markAsSoldMutation.isPending || (deal.StockStatus || 1) === 2}
                                className="flex-1 text-xs disabled:opacity-50"
                                data-testid={`button-mark-sold-${deal.TransID}`}
                              >
                                <IndianRupee className="h-3 w-3 mr-1" />
                                Sold
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this product?')) {
                                    deleteDealMutation.mutate(deal.TransID.toString());
                                  }
                                }}
                                disabled={deleteDealMutation.isPending || (deal.StockStatus || 1) === 0}
                                className="text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                                data-testid={`button-delete-${deal.TransID}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiries Tab */}
          <TabsContent value="inquiries" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="text-foreground">Inquiry Management</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Track and manage buyer inquiries for your products
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {inquiriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : !sellerInquiries?.inquiries || sellerInquiries.inquiries.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No inquiries yet</h3>
                    <p className="text-muted-foreground">Buyer inquiries will appear here once customers start showing interest in your products</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b-4 border-primary/20">
                        <TableHead className="font-semibold text-foreground">Inquiry ID</TableHead>
                        <TableHead className="font-semibold text-foreground">Buyer</TableHead>
                        <TableHead className="font-semibold text-foreground">Company</TableHead>
                        <TableHead className="font-semibold text-foreground">Quoted Price</TableHead>
                        <TableHead className="font-semibold text-foreground">Quantity</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellerInquiries.inquiries.map((inquiry: any) => (
                        <TableRow 
                          key={inquiry.id} 
                          className="hover:bg-muted/50 transition-colors"
                          data-testid={`inquiry-row-${inquiry.id}`}
                        >
                          <TableCell className="py-4">
                            <div className="font-medium text-foreground" data-testid={`inquiry-id-${inquiry.id}`}>
                              #INQ-{inquiry.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {inquiry.buyer_name || 'Anonymous'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              {inquiry.buyer_company || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground" data-testid={`inquiry-price-${inquiry.id}`}>
                              {inquiry.price_offered ? `₹${parseFloat(inquiry.price_offered).toLocaleString('en-IN')}` : '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              {inquiry.quantity || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                inquiry.status === 'responded' ? 'bg-green-100 text-green-700' :
                                inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                                inquiry.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }
                              data-testid={`inquiry-status-${inquiry.id}`}
                            >
                              {inquiry.status || 'open'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-foreground">
                              {inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN') : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedInquiry(inquiry);
                                  setInquiryModalOpen(true);
                                }}
                                data-testid={`button-view-${inquiry.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              
                              {inquiry.buyerEmail && (
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => window.location.href = `mailto:${inquiry.buyerEmail}?subject=Regarding your inquiry&body=Dear ${inquiry.buyerName},%0D%0A%0D%0AThank you for your inquiry.%0D%0A%0D%0ABest regards`}
                                  data-testid={`button-contact-${inquiry.id}`}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Contact
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Counter Offers Tab */}
          <TabsContent value="counter-offers" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="text-foreground">My Sent Inquiries</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Track inquiries you have sent to other sellers
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {buyerInquiriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : !buyerInquiries?.inquiries || buyerInquiries.inquiries.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No sent inquiries yet</h3>
                    <p className="text-muted-foreground">Inquiries you send to other sellers will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b-4 border-primary/20">
                        <TableHead className="font-semibold text-foreground">Inquiry ID</TableHead>
                        <TableHead className="font-semibold text-foreground">Seller</TableHead>
                        <TableHead className="font-semibold text-foreground">Product</TableHead>
                        <TableHead className="font-semibold text-foreground">Quoted Price</TableHead>
                        <TableHead className="font-semibold text-foreground">Quantity</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buyerInquiries.inquiries.map((inquiry: any) => (
                        <TableRow 
                          key={inquiry.id} 
                          className="hover:bg-muted/50 transition-colors"
                          data-testid={`sent-inquiry-row-${inquiry.id}`}
                        >
                          <TableCell className="py-4">
                            <div className="font-medium text-foreground" data-testid={`sent-inquiry-id-${inquiry.id}`}>
                              #INQ-{inquiry.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {inquiry.seller_name || 'Unknown Seller'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              <div className="font-medium">Product #{inquiry.product_id}</div>
                              <div className="text-sm text-muted-foreground">
                                {inquiry.product_details || ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground" data-testid={`sent-inquiry-price-${inquiry.id}`}>
                              {inquiry.quoted_price ? `₹${parseFloat(inquiry.quoted_price).toLocaleString('en-IN')}` : '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              {inquiry.quantity || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                inquiry.status === 'responded' ? 'bg-green-100 text-green-700' :
                                inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                                inquiry.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }
                              data-testid={`sent-inquiry-status-${inquiry.id}`}
                            >
                              {inquiry.status || 'open'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-foreground">
                              {inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN') : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedInquiry(inquiry);
                                  setInquiryModalOpen(true);
                                }}
                                data-testid={`button-view-sent-${inquiry.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              
                              {inquiry.sellerEmail && (
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => window.location.href = `mailto:${inquiry.sellerEmail}?subject=Follow up on inquiry&body=Dear Seller,%0D%0A%0D%0AI would like to follow up on my inquiry.%0D%0A%0D%0ABest regards`}
                                  data-testid={`button-followup-${inquiry.id}`}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Follow Up
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Details Modal */}
        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Order Details
              </DialogTitle>
              <DialogDescription>
                Complete information about this inquiry/order
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Basic Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                    <p className="font-semibold">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge className={
                      selectedOrder.status === 'inquiry' ? 'bg-blue-100 text-blue-700' :
                      selectedOrder.status === 'sent' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {selectedOrder.status === 'inquiry' ? 'Received Inquiry' : 
                       selectedOrder.status === 'sent' ? 'Sent Inquiry' :
                       selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString('en-IN') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time</p>
                    <p>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                  </div>
                </div>

                {/* Product Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Product Information</h3>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">{selectedOrder.product_title}</h4>
                    
                    {/* Product Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Make:</span>
                        <span className="ml-2 font-medium">{selectedOrder.MakeName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Grade:</span>
                        <span className="ml-2 font-medium">{selectedOrder.GradeName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Brand:</span>
                        <span className="ml-2 font-medium">{selectedOrder.BrandName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">GSM:</span>
                        <span className="ml-2 font-medium">{selectedOrder.gsm || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="ml-2 font-medium">
                          {selectedOrder.deckle && selectedOrder.grain 
                            ? `${selectedOrder.deckle}×${selectedOrder.grain}mm` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Seller Price:</span>
                        <span className="ml-2 font-medium text-green-600">
                          ₹{selectedOrder.seller_price?.toLocaleString('en-IN') || '0'} per {selectedOrder.unit || 'unit'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-semibold">{selectedOrder.customer_name || 'Anonymous'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p>{selectedOrder.customer_company || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-blue-600">{selectedOrder.customer_email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p>{selectedOrder.customer_phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Inquiry Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Inquiry Details</h3>
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quoted Price</p>
                        <p className="font-semibold text-orange-600">
                          {selectedOrder.buyer_quoted_price 
                            ? `₹${Number(selectedOrder.buyer_quoted_price).toLocaleString('en-IN')}` 
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                        <p className="font-semibold">{selectedOrder.buyer_quantity || 'Not specified'}</p>
                      </div>
                    </div>
                    
                    {selectedOrder.buyer_message && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
                        <div className="p-3 bg-slate-50 rounded border-l-4 border-blue-500">
                          <p className="text-sm">{selectedOrder.buyer_message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedOrder.customer_email && (
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        const subject = `Regarding your inquiry for ${selectedOrder.product_title}`;
                        const body = `Dear ${selectedOrder.customer_name},%0D%0A%0D%0AThank you for your inquiry about ${selectedOrder.product_title}.%0D%0A%0D%0ABest regards`;
                        window.location.href = `mailto:${selectedOrder.customer_email}?subject=${subject}&body=${body}`;
                        setIsOrderModalOpen(false);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Reply via Email
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setIsOrderModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Product Details Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
              <DialogDescription>
                View complete details of your product listing
              </DialogDescription>
            </DialogHeader>
            {selectedDeal && (
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Deal ID</p>
                      <p className="font-semibold">#{selectedDeal.TransID}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(selectedDeal.StockStatus || 1)}>
                        {getStatusText(selectedDeal.StockStatus || 1)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p className="font-semibold">{getRelativeTime(selectedDeal.deal_created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Stock Age</p>
                      <p className="font-semibold">{selectedDeal.StockAge || 0} days</p>
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Product Details</h3>
                  <div className="p-4 border rounded-lg space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      <p className="font-semibold">{selectedDeal.stock_description || selectedDeal.Seller_comments || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Category</p>
                        <p className="font-semibold">{selectedDeal.GroupName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Make</p>
                        <p className="font-semibold">{selectedDeal.MakeName || selectedDeal.Make || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Grade</p>
                        <p className="font-semibold">{selectedDeal.GradeName || selectedDeal.Grade || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Brand</p>
                        <p className="font-semibold">{selectedDeal.BrandName || selectedDeal.Brand || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Technical Specifications</h3>
                  <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">GSM</p>
                      <p className="font-semibold">{selectedDeal.GSM || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Deckle</p>
                      <p className="font-semibold">
                        {selectedDeal.Deckle_mm}mm
                        {selectedDeal.Deckle_mm && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(selectedDeal.Deckle_mm / 10).toFixed(1)}cm / {(selectedDeal.Deckle_mm / 25.4).toFixed(2)}in)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {isKraftReelGroup(selectedDeal.GroupName) ? 'B.S' : 'Grain'}
                      </p>
                      <p className="font-semibold">
                        {selectedDeal.grain_mm}mm
                        {selectedDeal.grain_mm && !isKraftReelGroup(selectedDeal.GroupName) && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(selectedDeal.grain_mm / 10).toFixed(1)}cm / {(selectedDeal.grain_mm / 25.4).toFixed(2)}in)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing & Quantity */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Pricing & Quantity</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Price</p>
                      <p className="font-semibold text-green-600">
                        ₹{selectedDeal.OfferPrice?.toLocaleString('en-IN')} per {selectedDeal.OfferUnit || 'unit'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Available Quantity</p>
                      <p className="font-semibold">{selectedDeal.quantity || 'N/A'} {selectedDeal.OfferUnit || 'units'}</p>
                    </div>
                  </div>
                </div>

                {/* Seller Comments */}
                {selectedDeal.Seller_comments && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Additional Comments</h3>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedDeal.Seller_comments}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    asChild
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Link href={`/edit-product/${selectedDeal.TransID}`}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Product
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setViewModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Inquiry Details Modal */}
        <Dialog open={inquiryModalOpen} onOpenChange={setInquiryModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Inquiry Details #{selectedInquiry?.id}
              </DialogTitle>
              <DialogDescription>
                {selectedInquiry?.inquiry_ref ? `Reference: ${selectedInquiry.inquiry_ref}` : 'View complete inquiry information'}
              </DialogDescription>
            </DialogHeader>
            
            {selectedInquiry && (
              <div className="space-y-6">
                {/* Buyer Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Buyer Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-semibold">{selectedInquiry.buyer_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p className="font-semibold">{selectedInquiry.buyer_company || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="font-semibold text-blue-600">{selectedInquiry.buyer_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="font-semibold">{selectedInquiry.buyer_phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    Product Information
                  </h3>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Product ID</p>
                        <p className="font-semibold">#{selectedInquiry.product_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Product Title</p>
                        <p className="font-semibold">{selectedInquiry.product_title || selectedInquiry.product_details || 'Product'}</p>
                      </div>
                    </div>
                    {selectedInquiry.seller_name && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Seller</p>
                        <p className="font-semibold">{selectedInquiry.seller_name} {selectedInquiry.seller_company ? `(${selectedInquiry.seller_company})` : ''}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inquiry Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                    Inquiry Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Quoted Price</p>
                      <p className="font-semibold text-green-600">
                        {selectedInquiry.price_offered || selectedInquiry.quoted_price ? 
                          `₹${parseFloat(selectedInquiry.price_offered || selectedInquiry.quoted_price).toLocaleString('en-IN')}` : 
                          'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                      <p className="font-semibold">{selectedInquiry.quantity || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge className={
                        selectedInquiry.status === 'responded' ? 'bg-green-100 text-green-700' :
                        selectedInquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                        selectedInquiry.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {selectedInquiry.status || 'open'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date</p>
                      <p className="font-semibold">
                        {selectedInquiry.created_at ? 
                          new Date(selectedInquiry.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 
                          'Not available'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedInquiry.message && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
                      <div className="p-4 border rounded-lg bg-white">
                        <p className="text-sm whitespace-pre-wrap">{selectedInquiry.message}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedInquiry.buyer_email && (
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        window.location.href = `mailto:${selectedInquiry.buyer_email}?subject=Re: Inquiry for Product #${selectedInquiry.product_id}`;
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Reply via Email
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setInquiryModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}