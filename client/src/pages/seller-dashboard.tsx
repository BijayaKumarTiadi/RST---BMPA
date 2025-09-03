import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { Package, Plus, TrendingUp, DollarSign, Users, Eye, Edit2, Trash2, MessageCircle, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch seller's deals (products)
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/seller/deals"],
    queryFn: async () => {
      const response = await fetch(`/api/deals?seller_only=true`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.member_id,
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

  // Fetch orders for seller
  const { data: ordersData } = useQuery({
    queryKey: ["/api/seller/orders"],
    queryFn: async () => {
      const response = await fetch(`/api/orders?seller_id=${user?.member_id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.member_id,
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
      queryClient.invalidateQueries({ queryKey: ["/api/seller/deals"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/seller/deals"] });
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
  const orders = ordersData?.orders || [];

  // Debug logging
  console.log('🔧 Dashboard Debug:', {
    dealsLoading,
    dealsData,
    deals: deals?.length,
    user: user?.id,
    isAuthenticated
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
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Seller Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.mname || user?.name}! Manage your products and track your business.
              </p>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90" data-testid="button-add-deal">
              <Link href="/add-product">
                <Plus className="mr-2 h-4 w-4" />
                Add New Deal
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-deals">{stats.totalDeals}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeDeals} active listings
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-orders">{orders.length}</div>
              <p className="text-xs text-muted-foreground">
                Orders received
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-revenue">
                ₹{orders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground">
                Gross sales
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-products">
                {stats.activeDeals}
              </div>
              <p className="text-xs text-muted-foreground">
                Available for sale
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-400">
            <TabsTrigger value="products">My Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Products</CardTitle>
                <CardDescription>
                  Manage your product listings and inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dealsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : deals.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No deals yet</h3>
                    <p className="text-muted-foreground mb-4">Start selling by adding your first product</p>
                    <Button asChild data-testid="button-add-first-product">
                      <Link href="/add-product">Add Your First Product</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deals.map((deal: any) => (
                      <div key={deal.TransID} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid={`deal-card-${deal.TransID}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                                <Package className="h-8 w-8 text-indigo-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg" data-testid={`deal-title-${deal.TransID}`}>{deal.Seller_comments?.split('\n')[0] || 'No Title'}</h4>
                                <p className="text-sm text-muted-foreground">{deal.GroupName || 'No Category'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={deal.StockStatus === 'sold' ? 'secondary' : 'default'} data-testid={`deal-status-${deal.TransID}`}>
                                    {deal.StockStatus || 'available'}
                                  </Badge>
                                  {deal.StockAge > 30 && (
                                    <Badge variant="destructive">Old Stock</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Price:</span>
                                <p className="font-semibold" data-testid={`deal-price-${deal.TransID}`}>₹{deal.OfferPrice?.toLocaleString('en-IN')} / {deal.OfferUnit || 'unit'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">GSM:</span>
                                <p className="font-semibold" data-testid={`deal-gsm-${deal.TransID}`}>{deal.GSM || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Size:</span>
                                <p className="font-semibold">{deal.Deckle_mm}×{deal.grain_mm} mm</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Created:</span>
                                <p className="font-semibold">
                                  {new Date(deal.uplaodDate || deal.deal_created_at).toLocaleDateString('en-IN')}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              asChild
                              data-testid={`button-view-${deal.TransID}`}
                            >
                              <Link href={`/deal/${deal.TransID}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                            
                            <Button 
                              size="sm" 
                              variant="outline"
                              asChild
                              data-testid={`button-edit-${deal.TransID}`}
                            >
                              <Link href={`/edit-product/${deal.TransID}`}>
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </Link>
                            </Button>
                            
                            {(!deal.Status || deal.Status === 'active') && (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => markAsSoldMutation.mutate(deal.TransID.toString())}
                                disabled={markAsSoldMutation.isPending}
                                data-testid={`button-mark-sold-${deal.TransID}`}
                              >
                                Mark Sold
                              </Button>
                            )}
                            
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this product?')) {
                                  deleteProductMutation.mutate(product.id);
                                }
                              }}
                              disabled={deleteProductMutation.isPending}
                              data-testid={`button-delete-${product.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Orders and inquiries from buyers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
                    <p className="text-muted-foreground">Orders will appear here once buyers start purchasing</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order: any) => (
                      <div key={order.id} className="border rounded-lg p-4" data-testid={`order-card-${order.id}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold" data-testid={`order-id-${order.id}`}>Order #{order.id?.slice(0, 8)}</h4>
                            <p className="text-sm text-muted-foreground">{order.product_title}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge data-testid={`order-status-${order.id}`}>{order.status}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold" data-testid={`order-amount-${order.id}`}>₹{order.total_amount?.toLocaleString('en-IN')}</p>
                            <Button size="sm" variant="outline" className="mt-2" data-testid={`button-contact-buyer-${order.id}`}>
                              <MessageCircle className="h-4 w-4 mr-1" />
                              Contact Buyer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}