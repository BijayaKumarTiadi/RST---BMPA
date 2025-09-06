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
import { Package, Plus, TrendingUp, DollarSign, Users, Eye, Edit2, Trash2, MessageCircle, ShoppingCart, Filter, Search, Calendar, IndianRupee, Clock, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

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
      case 1: return 'Available';
      case 2: return 'Sold';
      default: return 'Available';
    }
  };

  // Get status color from numeric code
  const getStatusColor = (stockStatus: number) => {
    switch (stockStatus) {
      case 0: return 'bg-gray-100 text-gray-700'; // Inactive
      case 1: return 'bg-green-100 text-green-700'; // Available
      case 2: return 'bg-red-100 text-red-700'; // Sold
      default: return 'bg-green-100 text-green-700';
    }
  };

  // Filter deals based on search and status
  const filteredDeals = deals.filter((deal: any) => {
    const matchesSearch = deal.Seller_comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.GroupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.TransID.toString().includes(searchTerm);
    
    const stockStatus = deal.StockStatus || 1; // Default to Available if null
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
                Add New Deal
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Deals</CardTitle>
              <Package className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-total-deals">{stats.totalDeals}</div>
              <p className="text-xs text-blue-100 mt-1">
                {stats.activeDeals} active listings
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Total Orders</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-total-orders">{allOrders.length}</div>
              <p className="text-xs text-green-100 mt-1">
                Orders received
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Total Revenue</CardTitle>
              <IndianRupee className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-total-revenue">
                ₹{allOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-purple-100 mt-1">
                Gross sales
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Active Products</CardTitle>
              <Users className="h-5 w-5 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-active-products">
                {stats.activeDeals}
              </div>
              <p className="text-xs text-orange-100 mt-1">
                Available for sale
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-background border shadow-sm">
            <TabsTrigger value="products" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">My Products</TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Orders</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
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
                        <SelectItem value="active">Available</SelectItem>
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
                            <TableHead className="font-semibold text-foreground">Offer Age</TableHead>
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
                                      {deal.Seller_comments?.split('\n')[0] || `Deal #${deal.TransID}`}
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
                                  <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">{deal.Deckle_mm}×{deal.grain_mm}mm</span></div>
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
                                  {deal.StockAge > 30 && (
                                    <Badge variant="destructive" className="text-xs">
                                      Old Stock
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {getRelativeTime(deal.deal_created_at)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    asChild
                                    className="h-8 w-8 p-0 hover:bg-blue-100"
                                    data-testid={`button-view-${deal.TransID}`}
                                  >
                                    <Link href={`/deal/${deal.TransID}`}>
                                      <Eye className="h-4 w-4 text-blue-600" />
                                    </Link>
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
                                    {deal.Seller_comments?.split('\n')[0] || `Deal #${deal.TransID}`}
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
                                {deal.StockAge > 30 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Old Stock
                                  </Badge>
                                )}
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
                                  <span className="text-muted-foreground">Size:</span>
                                  <span className="font-medium text-foreground ml-1">
                                    {deal.Deckle_mm}×{deal.grain_mm}mm
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
                                <p className="text-xs text-muted-foreground">Offer Age</p>
                                <div className="flex items-center gap-1 text-xs text-foreground">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  {getRelativeTime(deal.deal_created_at)}
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

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="text-foreground">Order Management</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Orders and inquiries from buyers
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {allOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
                    <p className="text-muted-foreground">Orders will appear here once buyers start purchasing</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b-4 border-primary/20">
                        <TableHead className="font-semibold text-foreground">Order ID</TableHead>
                        <TableHead className="font-semibold text-foreground">Product</TableHead>
                        <TableHead className="font-semibold text-foreground">Customer</TableHead>
                        <TableHead className="font-semibold text-foreground">Amount</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrders.map((order: any) => (
                        <TableRow 
                          key={order.id} 
                          className="hover:bg-muted/50 transition-colors"
                          data-testid={`order-row-${order.id}`}
                        >
                          <TableCell className="py-4">
                            <div className="font-medium text-foreground" data-testid={`order-id-${order.id}`}>
                              #{order.id?.slice(0, 8)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {order.product_title || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              {order.customer_name || 'Anonymous'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground" data-testid={`order-amount-${order.id}`}>
                              ₹{order.total_amount?.toLocaleString('en-IN')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }
                              data-testid={`order-status-${order.id}`}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-foreground">
                              {new Date(order.created_at).toLocaleDateString('en-IN')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsOrderModalOpen(true);
                                }}
                                data-testid={`button-view-${order.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              
                              {order.customer_email && (
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => window.location.href = `mailto:${order.customer_email}?subject=Regarding your inquiry for ${order.product_title}&body=Dear ${order.customer_name},%0D%0A%0D%0AThank you for your inquiry about ${order.product_title}.%0D%0A%0D%0ABest regards`}
                                  data-testid={`button-contact-${order.id}`}
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
      </div>
    </div>
  );
}