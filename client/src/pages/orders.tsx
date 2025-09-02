import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Package, Eye, MessageCircle, Calendar, MapPin, Phone, Mail, Truck } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Orders() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user's orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["/api/orders", { buyer_id: user?.id }],
    queryFn: async () => {
      const response = await fetch(`/api/orders?buyer_id=${user?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to view your orders.</p>
            <Button onClick={() => setLocation('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  const orders = ordersData || [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground">
            Track your orders and manage your purchases
          </p>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
            <Button asChild data-testid="button-start-shopping">
              <Link href="/marketplace">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => (
              <Card key={order.id} className="overflow-hidden" data-testid={`order-card-${order.id}`}>
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg" data-testid={`order-id-${order.id}`}>
                        Order #{order.id?.slice(0, 8)}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(order.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <Badge className={getStatusColor(order.status)} data-testid={`order-status-${order.id}`}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary" data-testid={`order-total-${order.id}`}>
                        ₹{order.total_amount?.toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {order.quantity} {order.unit}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Product Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-10 w-10 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1" data-testid={`product-title-${order.id}`}>
                            {order.product_title}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Category: {order.category_name}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Unit Price:</span>
                              <p className="font-medium">₹{order.unit_price?.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Quantity:</span>
                              <p className="font-medium">{order.quantity} {order.unit}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Seller & Shipping Info */}
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-foreground mb-2">Seller</h5>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium" data-testid={`seller-company-${order.id}`}>
                            {order.seller_company}
                          </p>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{order.seller_phone}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{order.seller_email}</span>
                          </div>
                        </div>
                      </div>

                      {order.shipping_address && (
                        <div>
                          <h5 className="font-medium text-foreground mb-2">Shipping Address</h5>
                          <div className="flex items-start gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                            <span>{order.shipping_address}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      asChild
                      data-testid={`button-view-product-${order.id}`}
                    >
                      <Link href={`/product/${order.product_id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Product
                      </Link>
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      data-testid={`button-contact-seller-${order.id}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Contact Seller
                    </Button>
                    
                    {order.status === 'shipped' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        data-testid={`button-track-order-${order.id}`}
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Track Order
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}