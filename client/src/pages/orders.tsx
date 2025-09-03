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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inquiries.map((inquiry: any) => (
              <Card key={inquiry.id} className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`inquiry-card-${inquiry.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold" data-testid={`inquiry-id-${inquiry.id}`}>
                        Inquiry #{inquiry.id}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(inquiry.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0" data-testid={`inquiry-status-${inquiry.id}`}>
                          Sent
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 pb-4 px-4">
                  {/* Product Summary */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 truncate" data-testid={`product-title-${inquiry.id}`}>
                          {inquiry.brand_name}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-1">
                          {inquiry.product_type} - {inquiry.grade_name}
                        </p>
                        <p className="text-xs text-foreground">
                          <span className="font-medium">Qty:</span> {inquiry.quantity} {inquiry.unit} | 
                          <span className="font-medium"> GSM:</span> {inquiry.gsm}
                        </p>
                      </div>
                    </div>

                    {/* Seller Info Compact */}
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Building className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-medium truncate" data-testid={`seller-company-${inquiry.id}`}>
                          {inquiry.seller_company}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{inquiry.seller_phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{inquiry.seller_location}</span>
                        </div>
                      </div>
                    </div>

                    {inquiry.message && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                        <p className="text-xs font-medium text-amber-800 mb-1">Your Message:</p>
                        <p className="text-xs text-amber-700 line-clamp-2">{inquiry.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Compact Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-xs h-8"
                      asChild
                      data-testid={`button-view-product-${inquiry.id}`}
                    >
                      <Link href={`/deal/${inquiry.trans_id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        View Deal
                      </Link>
                    </Button>
                    
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                      onClick={() => {
                        const message = `Hi! I sent an inquiry for ${inquiry.brand_name} (${inquiry.grade_name} - ${inquiry.gsm}GSM). Inquiry ID: ${inquiry.id}`;
                        window.open(`https://wa.me/${inquiry.seller_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      data-testid={`button-whatsapp-seller-${inquiry.id}`}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      WhatsApp
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