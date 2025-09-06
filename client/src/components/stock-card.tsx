import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Share2, MapPin, Building, Star } from "lucide-react";

interface StockListing {
  id: string;
  title: string;
  description: string;
  price: string;
  quantity: number;
  unit: string;
  status: string;
  location?: string;
  sellerId: string;
  imageUrls?: string[];
  createdAt: string;
}

interface StockCardProps {
  listing: StockListing;
  viewMode?: 'grid' | 'list';
}

export default function StockCard({ listing, viewMode = 'grid' }: StockCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'low_stock':
        return 'secondary';
      case 'out_of_stock':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return status;
    }
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-lg transition-shadow" data-testid={`stock-card-${listing.id}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            {/* Image placeholder */}
            <div className="w-24 h-24 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-foreground truncate" data-testid={`title-${listing.id}`}>
                    {listing.Make} {listing.Brand} {listing.Grade}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{listing.stock_description || `${listing.GSM} GSM, ${listing.Deckle_mm}x${listing.grain_mm}mm`}</p>
                </div>
                <Badge variant={getStatusColor(listing.status)} className="ml-2">
                  {getStatusText(listing.status)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-2xl font-bold text-primary" data-testid={`price-${listing.id}`}>
                      ₹{listing.price}
                    </span>
                    <span className="text-sm text-muted-foreground">/{listing.unit}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="font-semibold" data-testid={`quantity-${listing.id}`}>
                      {listing.quantity.toLocaleString()} {listing.unit}
                    </p>
                  </div>
                  {listing.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {listing.location}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button size="sm" data-testid={`add-to-cart-${listing.id}`}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button size="sm" variant="outline" data-testid={`save-${listing.id}`}>
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" data-testid={`share-${listing.id}`}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid={`stock-card-${listing.id}`}>
      {/* Image placeholder */}
      <div className="h-48 bg-secondary rounded-t-lg flex items-center justify-center">
        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg truncate" data-testid={`title-${listing.id}`}>
            {listing.title}
          </CardTitle>
          <Badge variant={getStatusColor(listing.status)}>
            {getStatusText(listing.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{listing.description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold text-primary" data-testid={`price-${listing.id}`}>
              ₹{listing.price}
            </span>
            <span className="text-sm text-muted-foreground">/{listing.unit}</span>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-lg font-semibold" data-testid={`quantity-${listing.id}`}>
              {listing.quantity.toLocaleString()} {listing.unit}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Building className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Verified Supplier</span>
          </div>
          {listing.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{listing.location}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-chart-4 fill-current" />
            <span className="text-sm text-muted-foreground">4.8 (24 reviews)</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Listed {new Date(listing.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <Button className="flex-1" data-testid={`add-to-cart-${listing.id}`}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
          <Button variant="outline" size="icon" data-testid={`save-${listing.id}`}>
            <Heart className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" data-testid={`share-${listing.id}`}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
