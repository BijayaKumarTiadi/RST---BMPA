import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/navigation";
import DashboardStats from "@/components/dashboard-stats";
import { Link } from "wouter";
import { ShoppingBag, Bookmark, TrendingUp, MessageSquare, Package, Search, Heart, AlertCircle, Mail, Phone, Building } from "lucide-react";

export default function BuyerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders?role=buyer', {
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch orders');
      }
      return response.json();
    },
    retry: false,
    enabled: !!user,
  });

  const { data: inquiriesData, isLoading: inquiriesLoading } = useQuery({
    queryKey: ['/api/inquiries/buyer'],
    queryFn: async () => {
      const response = await fetch('/api/inquiries/buyer', {
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch inquiries');
      }
      return response.json();
    },
    retry: false,
    enabled: !!user,
  });

  const { data: savedSearches } = useQuery({
    queryKey: ['/api/buyer/saved-searches'],
    queryFn: async () => {
      // This would be implemented in the backend
      return [
        { id: 1, query: "offset paper 80gsm", filters: { category: "paper" }, resultsCount: 25 },
        { id: 2, query: "printing ink CMYK", filters: { category: "ink" }, resultsCount: 12 },
      ];
    },
    enabled: !!user,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['/api/buyer/recommendations'],
    queryFn: async () => {
      // This would be implemented in the backend
      return [
        {
          id: 1,
          title: "Premium Art Paper",
          price: "120",
          unit: "sheet",
          seller: "ABC Papers Ltd",
          description: "High-quality finish for brochures"
        },
        {
          id: 2,
          title: "Digital Printing Ink Set",
          price: "1500",
          unit: "set",
          seller: "Ink Masters",
          description: "CMYK colors for digital printing"
        },
      ];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to access your buyer dashboard.</p>
        </div>
      </div>
    );
  }

  const activeOrdersCount = orders?.filter((order: any) => ['pending', 'confirmed', 'shipped'].includes(order.status)).length || 0;
  const monthlySpent = orders?.reduce((total: number, order: any) => {
    const orderDate = new Date(order.createdAt);
    const thisMonth = new Date();
    if (orderDate.getMonth() === thisMonth.getMonth() && orderDate.getFullYear() === thisMonth.getFullYear()) {
      return total + parseFloat(order.totalAmount);
    }
    return total;
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="buyer-dashboard-title">
            Buyer Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your orders and discover new printing materials
          </p>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats
          stats={[
            {
              title: "Active Orders",
              value: activeOrdersCount.toString(),
              icon: ShoppingBag,
              color: "primary"
            },
            {
              title: "Saved Searches",
              value: savedSearches?.length?.toString() || "0",
              icon: Bookmark,
              color: "chart-2"
            },
            {
              title: "This Month",
              value: `₹${(monthlySpent / 1000).toFixed(1)}K`,
              icon: TrendingUp,
              color: "chart-1"
            },
            {
              title: "Messages",
              value: "5",
              icon: MessageSquare,
              color: "chart-4"
            }
          ]}
          loading={ordersLoading}
        />

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Button asChild className="h-auto p-4 flex-col" data-testid="quick-action-browse">
            <Link href="/marketplace">
              <Search className="h-8 w-8 mb-2" />
              Browse Stock
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto p-4 flex-col" data-testid="quick-action-orders">
            <Link href="#orders">
              <Package className="h-8 w-8 mb-2" />
              My Orders
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto p-4 flex-col" data-testid="quick-action-saved">
            <Link href="#saved">
              <Bookmark className="h-8 w-8 mb-2" />
              Saved Items
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="orders" className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders" data-testid="tab-orders">My Orders</TabsTrigger>
            <TabsTrigger value="recommendations" data-testid="tab-recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="saved" data-testid="tab-saved">Saved Items</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Orders & Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Orders Section */}
                {orders && orders.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      Recent Orders
                    </h3>
                    <div className="space-y-4">
                      {orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`order-${order.id}`}>
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <h4 className="font-semibold">Order #{order.id.slice(-8)}</h4>
                              <p className="text-sm text-muted-foreground">
                                {order.quantity} items • ₹{order.totalAmount}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'shipped' ? 'secondary' :
                              order.status === 'confirmed' ? 'outline' : 'destructive'
                            }>
                              {order.status}
                            </Badge>
                            <Button size="sm" variant="outline" data-testid={`view-order-${order.id}`}>
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inquiries Section */}
                {inquiriesData?.inquiries && inquiriesData.inquiries.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      Your Inquiries
                    </h3>
                    <div className="space-y-4">
                      {inquiriesData.inquiries.map((inquiry: any) => (
                        <div key={inquiry.id} className="p-4 border border-border rounded-lg" data-testid={`inquiry-${inquiry.id}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Mail className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold">
                                  {inquiry.product_title || `${inquiry.MakeName} ${inquiry.GradeName}`}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {inquiry.GroupName} {inquiry.BrandName && `• ${inquiry.BrandName}`}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                              Inquiry Sent
                            </Badge>
                          </div>

                          {/* Inquiry Details */}
                          <div className="grid md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Your Details:</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center">
                                  <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="font-medium">{inquiry.buyer_name}</span>
                                </div>
                                {inquiry.buyer_company && (
                                  <div className="flex items-center">
                                    <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                                    <span>{inquiry.buyer_company}</span>
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span>{inquiry.buyer_email}</span>
                                </div>
                                {inquiry.buyer_phone && (
                                  <div className="flex items-center">
                                    <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                                    <span>{inquiry.buyer_phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Inquiry Details:</p>
                              <div className="space-y-1 text-xs">
                                {inquiry.quantity && (
                                  <div><span className="font-medium">Quantity:</span> {inquiry.quantity}</div>
                                )}
                                {inquiry.quoted_price && (
                                  <div><span className="font-medium">Your Price:</span> ₹{inquiry.quoted_price}</div>
                                )}
                                {inquiry.OfferPrice && (
                                  <div><span className="font-medium">Seller Price:</span> ₹{inquiry.OfferPrice}/{inquiry.OfferUnit}</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Message */}
                          {inquiry.message && (
                            <div className="mb-3">
                              <p className="text-sm text-muted-foreground mb-1">Your Message:</p>
                              <p className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                "{inquiry.message}"
                              </p>
                            </div>
                          )}

                          {/* Seller Info and Date */}
                          <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Sent to:</span> {inquiry.seller_name || inquiry.seller_company || 'Seller'}
                            </div>
                            <div>
                              {new Date(inquiry.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!orders || orders.length === 0) && (!inquiriesData?.inquiries || inquiriesData.inquiries.length === 0) && (
                  <div className="text-center py-12">
                    <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Orders or Inquiries Yet</h3>
                    <p className="text-muted-foreground mb-4">Start browsing the marketplace to place your first order or send inquiries</p>
                    <Button asChild>
                      <Link href="/marketplace">Browse Marketplace</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  Recommended for You
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recommendations && recommendations.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {recommendations.map((item: any) => (
                      <div key={item.id} className="p-4 border border-border rounded-lg" data-testid={`recommendation-${item.id}`}>
                        <h4 className="font-semibold mb-2">{item.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-primary">₹{item.price}/{item.unit}</span>
                          <span className="text-sm text-muted-foreground">{item.seller}</span>
                        </div>
                        <Button size="sm" className="w-full" data-testid={`view-recommendation-${item.id}`}>
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
                    <p className="text-muted-foreground">Browse more products to get personalized recommendations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bookmark className="mr-2 h-5 w-5" />
                  Saved Searches & Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedSearches && savedSearches.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Saved Searches</h4>
                    {savedSearches.map((search: any) => (
                      <div key={search.id} className="flex items-center justify-between p-3 bg-secondary rounded-md" data-testid={`saved-search-${search.id}`}>
                        <div>
                          <p className="font-medium">"{search.query}"</p>
                          <p className="text-sm text-muted-foreground">{search.resultsCount} results found</p>
                        </div>
                        <Button size="sm" variant="outline">Run Search</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Saved Items</h3>
                    <p className="text-muted-foreground">Save searches and bookmark items for quick access</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Activity Timeline</h3>
                  <p className="text-muted-foreground">Your recent marketplace activity will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
