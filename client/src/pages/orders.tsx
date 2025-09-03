import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Package, Eye, MessageCircle, Calendar, MapPin, Phone, Mail, Building } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Orders() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user's inquiries (this is a B2B marketplace focused on inquiries)
  const { data: inquiriesData, isLoading } = useQuery({
    queryKey: ['/api/inquiries/buyer'],
    queryFn: async () => {
      const response = await fetch('/api/inquiries/buyer', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch inquiries');
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
            <p className="text-muted-foreground mb-4">Please log in to view your inquiries.</p>
            <Button onClick={() => setLocation('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  const inquiries = inquiriesData?.inquiries || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Orders & Inquiries</h1>
          <p className="text-muted-foreground">
            Track your inquiries and business communications
          </p>
        </div>

        {/* Inquiries List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No inquiries yet</h3>
            <p className="text-muted-foreground mb-4">Start browsing the marketplace and send inquiries to sellers</p>
            <Button asChild data-testid="button-start-shopping">
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {inquiries.map((inquiry: any) => (
              <Card key={inquiry.id} className="overflow-hidden" data-testid={`inquiry-card-${inquiry.id}`}>
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg" data-testid={`inquiry-id-${inquiry.id}`}>
                        Inquiry #{inquiry.id}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(inquiry.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800" data-testid={`inquiry-status-${inquiry.id}`}>
                          Sent
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium text-foreground" data-testid={`inquiry-quantity-${inquiry.id}`}>
                        Qty: {inquiry.quantity} {inquiry.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {inquiry.grade_name} - {inquiry.gsm}GSM
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
                          <h4 className="font-semibold text-lg mb-1" data-testid={`product-title-${inquiry.id}`}>
                            {inquiry.brand_name}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {inquiry.product_type} - {inquiry.grade_name}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">GSM:</span>
                              <p className="font-medium">{inquiry.gsm}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Location:</span>
                              <p className="font-medium">{inquiry.location}</p>
                            </div>
                          </div>
                          {inquiry.message && (
                            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm font-medium text-muted-foreground">Your Message:</p>
                              <p className="text-sm mt-1">{inquiry.message}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Seller Info */}
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Seller Details
                        </h5>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium" data-testid={`seller-company-${inquiry.id}`}>
                            {inquiry.seller_company}
                          </p>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{inquiry.seller_phone}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{inquiry.seller_email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{inquiry.seller_location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inquiry Actions */}
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      asChild
                      data-testid={`button-view-product-${inquiry.id}`}
                    >
                      <Link href={`/deal/${inquiry.trans_id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Deal
                      </Link>
                    </Button>
                    
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        const message = `Hi! I sent an inquiry for ${inquiry.brand_name} (${inquiry.grade_name} - ${inquiry.gsm}GSM). Inquiry ID: ${inquiry.id}`;
                        window.open(`https://wa.me/${inquiry.seller_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      data-testid={`button-whatsapp-seller-${inquiry.id}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      WhatsApp Seller
                    </Button>
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