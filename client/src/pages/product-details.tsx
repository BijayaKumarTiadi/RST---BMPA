import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { ArrowLeft, MessageSquare, Star, MapPin, Package, Truck, Shield, Heart, Share2, Minus, Plus, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function ProductDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['/api/products', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      return response.json();
    },
    enabled: !!id,
  });

  // Mark as sold mutation (for sellers only)
  const markAsSoldMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PUT', `/api/products/${id}/mark-sold`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product marked as sold successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark product as sold",
        variant: "destructive",
      });
    },
  });

  // Start chat mutation
  const startChatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/chat/start', {
        productId: id,
        sellerId: product.seller_id
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Chat Started",
        description: "Redirecting to chat with seller...",
      });
      // Redirect to chat page
      setLocation(`/chat/${data.chatId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start chat",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Product Not Found</h1>
            <Button onClick={() => setLocation('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isProductOwner = isAuthenticated && user?.id === product.seller_id;
  const isSoldOut = product.status === 'sold' || product.quantity === 0;

  const handleImageLoad = (imageUrl: string) => {
    if (imageUrl.startsWith('https://storage.googleapis.com/replit-objstore-')) {
      return `/api/images/${imageUrl.split('/.private/')[1]}`;
    }
    return imageUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/')}
          className="mb-6 hover:bg-muted"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
              <img
                src={product.image_urls?.[0] ? 
                  handleImageLoad(product.image_urls[0]) : 
                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjI1MCIgeT0iMjUwIiBmb250LXNpemU9IjIwIiBmaWxsPSIjNjU3Mzg0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UHJvZHVjdCBJbWFnZTwvdGV4dD48L3N2Zz4='
                }
                alt={product.title}
                className="w-full h-full object-cover"
                data-testid="img-product-main"
              />
            </div>
            
            {/* Thumbnail Images */}
            {product.image_urls?.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.image_urls.slice(1, 5).map((imageUrl: string, index: number) => (
                  <div key={index} className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                    <img
                      src={handleImageLoad(imageUrl)}
                      alt={`${product.title} ${index + 2}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                      data-testid={`img-thumbnail-${index}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <Badge className="bg-blue-600 text-white" data-testid="badge-category">
                  {product.category_name || 'Product'}
                </Badge>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-product-title">
                {product.title}
              </h1>
              
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-bold text-primary" data-testid="text-product-price">
                  ₹{product.price?.toLocaleString('en-IN')}
                </span>
                <span className="text-lg text-muted-foreground">/{product.unit}</span>
                {product.min_order_quantity > 1 && (
                  <Badge variant="outline" className="ml-2">
                    Min Order: {product.min_order_quantity} {product.unit}
                  </Badge>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">(4.5) • 127 reviews</span>
              </div>
            </div>

            <Separator />

            {/* Stock Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-600" data-testid="text-stock-status">
                  {isSoldOut ? 'Out of Stock' : `${product.quantity} ${product.unit} available`}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground" data-testid="text-location">
                  {product.location}
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            {!isSoldOut && !isProductOwner && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    data-testid="button-decrease-quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 text-sm font-medium" data-testid="text-quantity">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                    disabled={quantity >= product.quantity}
                    data-testid="button-increase-quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Total: ₹{(product.price * quantity).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {isProductOwner ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">You are the seller of this product</p>
                  {!isSoldOut && (
                    <Button
                      onClick={() => markAsSoldMutation.mutate()}
                      disabled={markAsSoldMutation.isPending}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      data-testid="button-mark-sold"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {markAsSoldMutation.isPending ? 'Marking as Sold...' : 'Mark as Sold'}
                    </Button>
                  )}
                  {isSoldOut && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <span className="text-red-600 font-medium">This product is marked as sold</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {!isSoldOut ? (
                    <>
                      <Button
                        size="lg"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                        onClick={() => startChatMutation.mutate()}
                        disabled={!isAuthenticated || startChatMutation.isPending}
                        data-testid="button-chat-seller"
                      >
                        <MessageSquare className="mr-2 h-5 w-5" />
                        {startChatMutation.isPending ? 'Starting Chat...' : 'Chat with Seller'}
                      </Button>
                      
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full"
                        disabled={!isAuthenticated}
                        data-testid="button-add-cart"
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Add to Cart
                      </Button>
                    </>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <span className="text-gray-600 font-medium">This product is currently sold out</span>
                    </div>
                  )}
                  
                  {!isAuthenticated && (
                    <p className="text-sm text-muted-foreground text-center">
                      Please log in to chat with seller or add to cart
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <Shield className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Verified Seller</span>
              </div>
              <div className="text-center">
                <Truck className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Fast Delivery</span>
              </div>
              <div className="text-center">
                <Package className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Quality Assured</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description and Details */}
        <div className="mt-12 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Product Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-description">
                  {product.description}
                </p>
              </CardContent>
            </Card>

            {/* Specifications */}
            {product.specifications && (
              <Card>
                <CardHeader>
                  <CardTitle>Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(JSON.parse(product.specifications)).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Seller Info */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Seller Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground" data-testid="text-seller-company">
                    {product.seller_company}
                  </h4>
                  <p className="text-sm text-muted-foreground" data-testid="text-seller-name">
                    Contact: {product.seller_name}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {product.location}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">(4.8) Seller Rating</span>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Time:</span>
                    <span className="font-medium">Within 2 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ship Time:</span>
                    <span className="font-medium">2-3 business days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member Since:</span>
                    <span className="font-medium">2022</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}