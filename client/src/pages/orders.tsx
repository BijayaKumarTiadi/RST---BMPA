import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Package, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Orders() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch inquiries received as seller
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

  // Fetch inquiries sent as buyer
  const { data: sentOrders, isLoading } = useQuery({
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

  // Combine both received and sent orders
  const receivedOrdersArray = receivedOrders || [];
  const sentOrdersArray = sentOrders || [];
  const allOrders = [...receivedOrdersArray, ...sentOrdersArray];
  
  // Sort by created_at date (newest first)
  allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground">
            Track your orders and sales
          </p>
        </div>

        {/* Orders Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : allOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">Orders will appear here once buyers start purchasing</p>
            <Button asChild data-testid="button-start-shopping">
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <CardTitle className="text-foreground">Order Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted border-b-4 border-primary/20">
                      <th className="font-semibold text-foreground text-left p-4">Order ID</th>
                      <th className="font-semibold text-foreground text-left p-4">Product</th>
                      <th className="font-semibold text-foreground text-left p-4">Customer</th>
                      <th className="font-semibold text-foreground text-left p-4">Amount</th>
                      <th className="font-semibold text-foreground text-left p-4">Status</th>
                      <th className="font-semibold text-foreground text-left p-4">Date</th>
                      <th className="font-semibold text-foreground text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map((order: any) => (
                      <tr 
                        key={order.id} 
                        className="hover:bg-muted/50 transition-colors border-b"
                        data-testid={`order-row-${order.id}`}
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-foreground" data-testid={`order-id-${order.id}`}>
                            #{order.id?.slice(0, 8)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-foreground">
                            {order.product_title || 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-foreground">
                            {order.customer_name || 'Anonymous'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-foreground" data-testid={`order-amount-${order.id}`}>
                            ₹{order.total_amount?.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="py-4 px-4">
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
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="hover:bg-blue-50"
                            data-testid={`button-contact-buyer-${order.id}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}