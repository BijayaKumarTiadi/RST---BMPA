import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/navigation";
import DashboardStats from "@/components/dashboard-stats";
import { apiRequest } from "@/lib/queryClient";
import { Package, Plus, Clock, TrendingUp, AlertCircle, Edit, Trash2, Eye } from "lucide-react";

const stockListingSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().min(1, "Price is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  minOrderQuantity: z.number().min(1, "Minimum order quantity required"),
  location: z.string().min(2, "Location is required"),
});

type StockListingForm = z.infer<typeof stockListingSchema>;

export default function SellerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingStock, setIsAddingStock] = useState(false);

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

  const form = useForm<StockListingForm>({
    resolver: zodResolver(stockListingSchema),
    defaultValues: {
      minOrderQuantity: 1,
      quantity: 1,
    },
  });

  const { data: categories } = useQuery<Array<{id: string, name: string}>>({
    queryKey: ['/api/categories'],
    enabled: !!user,
  });

  const { data: myListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['/api/stock/listings', { sellerId: user?.id }],
    queryFn: async () => {
      const response = await fetch(`/api/stock/listings?sellerId=${user?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch listings');
      }
      return response.json();
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ['/api/orders', { role: 'seller' }],
    queryFn: async () => {
      const response = await fetch('/api/orders?role=seller', {
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch orders');
      }
      return response.json();
    },
    enabled: !!user,
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: StockListingForm) => {
      const response = await apiRequest('POST', '/api/stock/listings', {
        ...data,
        price: parseFloat(data.price),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock Listed",
        description: "Your stock has been successfully listed in the marketplace.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/listings'] });
      form.reset();
      setIsAddingStock(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Failed to List Stock",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      await apiRequest('DELETE', `/api/stock/listings/${listingId}`);
    },
    onSuccess: () => {
      toast({
        title: "Listing Removed",
        description: "Your stock listing has been removed from the marketplace.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/listings'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Failed to Remove Listing",
        description: error.message,
        variant: "destructive",
      });
    },
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
          <p className="text-muted-foreground">Please log in to access your seller dashboard.</p>
        </div>
      </div>
    );
  }

  const activeListingsCount = myListings?.listings?.filter((listing: any) => listing.isActive).length || 0;
  const pendingOrdersCount = orders?.filter((order: any) => order.status === 'pending').length || 0;
  const monthlyEarnings = orders?.reduce((total: number, order: any) => {
    const orderDate = new Date(order.createdAt);
    const thisMonth = new Date();
    if (orderDate.getMonth() === thisMonth.getMonth() && orderDate.getFullYear() === thisMonth.getFullYear()) {
      return total + parseFloat(order.totalAmount);
    }
    return total;
  }, 0) || 0;

  const handleFormSubmit = (data: StockListingForm) => {
    createListingMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="seller-dashboard-title">
              Seller Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your inventory and track sales performance
            </p>
          </div>
          <Dialog open={isAddingStock} onOpenChange={setIsAddingStock}>
            <DialogTrigger asChild>
              <Button data-testid="add-stock-button">
                <Plus className="mr-2 h-4 w-4" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Stock Listing</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Product Title</Label>
                    <Input
                      id="title"
                      {...form.register('title')}
                      placeholder="Premium Coated Paper"
                      data-testid="input-stock-title"
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="categoryId">Category</Label>
                    <Select onValueChange={(value) => form.setValue('categoryId', value)}>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category: any) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.categoryId && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.categoryId.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Detailed description of your product..."
                    data-testid="input-stock-description"
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      {...form.register('price')}
                      placeholder="150.00"
                      data-testid="input-stock-price"
                    />
                    {form.formState.errors.price && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.price.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      {...form.register('quantity', { valueAsNumber: true })}
                      placeholder="1000"
                      data-testid="input-stock-quantity"
                    />
                    {form.formState.errors.quantity && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.quantity.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Select onValueChange={(value) => form.setValue('unit', value)}>
                      <SelectTrigger data-testid="select-unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sheets">Sheets</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="meters">Meters</SelectItem>
                        <SelectItem value="pieces">Pieces</SelectItem>
                        <SelectItem value="boxes">Boxes</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.unit && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.unit.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minOrderQuantity">Minimum Order Quantity</Label>
                    <Input
                      id="minOrderQuantity"
                      type="number"
                      {...form.register('minOrderQuantity', { valueAsNumber: true })}
                      placeholder="1"
                      data-testid="input-min-order"
                    />
                    {form.formState.errors.minOrderQuantity && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.minOrderQuantity.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      {...form.register('location')}
                      placeholder="Mumbai, Maharashtra"
                      data-testid="input-stock-location"
                    />
                    {form.formState.errors.location && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.location.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    type="submit"
                    disabled={createListingMutation.isPending}
                    data-testid="submit-stock-listing"
                  >
                    {createListingMutation.isPending ? "Adding..." : "Add Stock"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingStock(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats
          stats={[
            {
              title: "Active Listings",
              value: activeListingsCount.toString(),
              icon: Package,
              color: "primary"
            },
            {
              title: "Pending Orders",
              value: pendingOrdersCount.toString(),
              icon: Clock,
              color: "chart-2"
            },
            {
              title: "Monthly Sales",
              value: `₹${(monthlyEarnings / 1000).toFixed(1)}K`,
              icon: TrendingUp,
              color: "chart-1"
            },
            {
              title: "Inquiries",
              value: "12",
              icon: AlertCircle,
              color: "chart-4"
            }
          ]}
          loading={listingsLoading}
        />

        {/* Main Content */}
        <Tabs defaultValue="inventory" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  My Stock Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myListings?.listings && myListings.listings.length > 0 ? (
                  <div className="space-y-4">
                    {myListings.listings.map((listing: any) => (
                      <div key={listing.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`listing-${listing.id}`}>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{listing.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              ₹{listing.price}/{listing.unit} • {listing.quantity} available
                            </p>
                            <p className="text-xs text-muted-foreground">{listing.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            listing.status === 'available' ? 'default' :
                            listing.status === 'low_stock' ? 'secondary' : 'destructive'
                          }>
                            {listing.status}
                          </Badge>
                          <Button size="sm" variant="outline" data-testid={`view-listing-${listing.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" data-testid={`edit-listing-${listing.id}`}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteListingMutation.mutate(listing.id)}
                            disabled={deleteListingMutation.isPending}
                            data-testid={`delete-listing-${listing.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Stock Listed</h3>
                    <p className="text-muted-foreground mb-4">Start by adding your first stock listing to the marketplace</p>
                    <Button onClick={() => setIsAddingStock(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Listing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
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
                          <Button size="sm" variant="outline" data-testid={`manage-order-${order.id}`}>
                            Manage Order
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                    <p className="text-muted-foreground">Orders from buyers will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                    <p className="text-muted-foreground">Detailed sales analytics and reports will be available here</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventory Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Listings</span>
                      <span className="text-sm font-medium">{activeListingsCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">This Month Sales</span>
                      <span className="text-sm font-medium">₹{(monthlyEarnings / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending Orders</span>
                      <span className="text-sm font-medium">{pendingOrdersCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
