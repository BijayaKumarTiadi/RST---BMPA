import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Package, MessageCircle, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function Orders() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

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
                      <th className="font-semibold text-foreground text-left p-4">Customer/Seller</th>
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
                              order.status === 'inquiry' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'sent' ? 'bg-purple-100 text-purple-700' :
                              order.status === 'completed' ? 'bg-green-100 text-green-700' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }
                            data-testid={`order-status-${order.id}`}
                          >
                            {order.status === 'inquiry' ? 'Received Enquiry' : 
                             order.status === 'sent' ? 'Sent Enquiry' :
                             order.status === 'completed' ? 'Completed' :
                             order.status === 'pending' ? 'Pending' :
                             order.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
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
                                onClick={() => {
                                  const subject = encodeURIComponent(`Regarding your inquiry for ${order.product_title}`);
                                  const body = encodeURIComponent(`Dear ${order.customer_name},\n\nThank you for your inquiry about ${order.product_title}.\n\nBest regards`);
                                  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${order.customer_email}&su=${subject}&body=${body}`, '_blank');
                                }}
                                data-testid={`button-contact-${order.id}`}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Contact
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
                      {selectedOrder.status === 'inquiry' ? 'Received Enquiry' : 
                       selectedOrder.status === 'sent' ? 'Sent Enquiry' :
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

                {/* Enquiry Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Enquiry Details</h3>
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
                        const subject = encodeURIComponent(`Regarding your inquiry for ${selectedOrder.product_title}`);
                        const body = encodeURIComponent(`Dear ${selectedOrder.customer_name},\n\nThank you for your inquiry about ${selectedOrder.product_title}.\n\nBest regards`);
                        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedOrder.customer_email}&su=${subject}&body=${body}`, '_blank');
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