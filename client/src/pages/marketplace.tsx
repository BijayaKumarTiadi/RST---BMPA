import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Package, Search, Filter, ShoppingCart, MessageCircle, MapPin, Star, Heart, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Marketplace() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState("");

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Fetch products with filters
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", { 
      search: searchTerm, 
      category: selectedCategory, 
      sort: sortBy, 
      priceRange 
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (sortBy) params.append('sort', sortBy);
      if (priceRange) params.append('price_range', priceRange);
      
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to access the marketplace.</p>
            <Button onClick={() => setLocation('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  const products = productsData?.products || [];

  const handleContactSeller = async (productId: string, sellerId: string) => {
    try {
      const response = await fetch('/api/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          sellerId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLocation(`/chat/${result.chatId}`);
      } else {
        console.error('Failed to start chat:', result.message);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Discover products from verified sellers across the trading industry
          </p>
        </div>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Find Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((category: any) => (
                    <SelectItem key={category.category_id} value={category.category_id.toString()}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Price Range */}
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger data-testid="select-price-range">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Prices</SelectItem>
                  <SelectItem value="0-1000">₹0 - ₹1,000</SelectItem>
                  <SelectItem value="1000-5000">₹1,000 - ₹5,000</SelectItem>
                  <SelectItem value="5000-10000">₹5,000 - ₹10,000</SelectItem>
                  <SelectItem value="10000-50000">₹10,000 - ₹50,000</SelectItem>
                  <SelectItem value="50000+">₹50,000+</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="name_asc">Name: A to Z</SelectItem>
                  <SelectItem value="name_desc">Name: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search filters</p>
            <Button onClick={() => {
              setSearchTerm("");
              setSelectedCategory("");
              setPriceRange("");
              setSortBy("newest");
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                Found {products.length} products
              </p>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {searchTerm && `"${searchTerm}"`}
                  {selectedCategory && ` in ${categories.find((c: any) => c.category_id.toString() === selectedCategory)?.category_name}`}
                </span>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {products.map((product: any) => (
                <Card 
                  key={product.id} 
                  className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden"
                  data-testid={`product-card-${product.id}`}
                >
                  <div className="relative">
                    {/* Product Display */}
                    <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
                      <div className="text-center p-3">
                        <Package className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                        <p className="text-xs text-indigo-700 font-medium line-clamp-2">{product.title}</p>
                      </div>
                      
                      {/* Wishlist Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-wishlist-${product.id}`}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>

                      {/* Category Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                          {product.category_name}
                        </Badge>
                      </div>

                      {/* Status Badge */}
                      <div className="absolute bottom-2 left-2">
                        <Badge 
                          variant={product.status === 'available' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {product.status === 'available' ? 'In Stock' : product.status}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-3">
                      {/* Product Info */}
                      <Link href={`/product/${product.id}`}>
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2 hover:text-primary transition-colors" data-testid={`product-title-${product.id}`}>
                          {product.title}
                        </h3>
                      </Link>

                      {/* Price */}
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-lg font-bold text-primary" data-testid={`product-price-${product.id}`}>
                          ₹{product.price?.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-muted-foreground">/{product.unit}</span>
                      </div>

                      {/* Seller Info */}
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-xs text-muted-foreground">by</span>
                        <span className="text-xs font-medium text-foreground" data-testid={`seller-name-${product.id}`}>
                          {product.seller_name || product.seller_company || 'Seller'}
                        </span>
                      </div>

                      {/* Location */}
                      {product.location && (
                        <div className="flex items-center gap-1 mb-3">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{product.location}</span>
                        </div>
                      )}

                      {/* Quantity Info */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>Qty: {product.quantity} {product.unit}</span>
                        {product.min_order_quantity > 1 && (
                          <span>Min: {product.min_order_quantity}</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => setLocation(`/product/${product.id}`)}
                          data-testid={`button-view-details-${product.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContactSeller(product.id, product.seller_id)}
                            data-testid={`button-contact-seller-${product.id}`}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Chat
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/product/${product.id}`)}
                            data-testid={`button-buy-now-${product.id}`}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Buy
                          </Button>
                        </div>
                      </div>

                      {/* Rating (placeholder) */}
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">(4.5)</span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}