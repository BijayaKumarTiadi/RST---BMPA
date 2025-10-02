import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/navigation";
import { Link } from "wouter";
import { Package, ShoppingCart, MessageSquare, TrendingUp, Plus, Search, Star, Filter, Grid, List, Shield } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  const { data: recentListings } = useQuery({
    queryKey: ['/api/stock/listings'],
    queryFn: async () => {
      const response = await fetch('/api/stock/listings?limit=8');
      return response.json();
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products?limit=12');
      return response.json();
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      return response.json();
    },
  });

  // All authenticated users can add products
  const canAddProducts = isAuthenticated;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section - Ecommerce Style */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4" data-testid="hero-heading">
              {isAuthenticated ? `Welcome back, ${user?.firstName || user?.name || 'Member'}!` : 'STOCK LAABH Trading'}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {isAuthenticated 
                ? 'Your professional trading platform dashboard' 
                : 'Professional B2B Trading Platform for Stock, Materials & Equipment'
              }
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search for products, materials, equipment..."
                  className="pl-10 pr-4 py-6 text-lg w-full rounded-full border-2"
                  data-testid="search-input"
                />
                <Button size="lg" className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full">
                  Search
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories Section */}
        {categories?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Shop by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.slice(0, 6).map((category: any) => (
                <Card key={category.category_id} className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105" data-testid={`category-${category.category_id}`}>
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{category.category_name}</h3>
                    {category.product_count && (
                      <p className="text-xs text-muted-foreground mt-1">{category.product_count} items</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="quick-action-browse">
            <CardContent className="p-6 text-center">
              <Search className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Browse Stock</h3>
              <p className="text-sm text-muted-foreground mb-4">Find trading materials and opportunities</p>
              <Button asChild className="w-full">
                <Link href="/marketplace">Browse Now</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="quick-action-list">
            <CardContent className="p-6 text-center">
              <Plus className="h-12 w-12 text-chart-2 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">List Stock</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your inventory to the marketplace</p>
              <Button asChild className="w-full" variant="outline">
                <Link href="/seller-dashboard">Add Listing</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="quick-action-orders">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-chart-1 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">My Orders</h3>
              <p className="text-sm text-muted-foreground mb-4">Track your purchases and sales</p>
              <Button asChild className="w-full" variant="outline">
                <Link href='/seller-dashboard'>
                  View Orders
                </Link>
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Featured Products Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Featured Products</h2>
              <p className="text-muted-foreground">Discover the latest and most popular items</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button asChild>
                <Link href="/marketplace">View All Products</Link>
              </Button>
            </div>
          </div>

          {productsData?.products?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
              {productsData.products.map((product: any) => (
                <Card key={product.id} className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white border border-gray-200 overflow-hidden h-full flex flex-col" data-testid={`product-${product.id}`}>
                  <div className="relative overflow-hidden bg-gray-50">
                    {/* Product Placeholder */}
                    <div className="aspect-square relative bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Package className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                        <p className="text-xs text-indigo-700 font-medium line-clamp-2">{product.title}</p>
                      </div>
                    </div>
                    
                    {/* Category Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-blue-600 text-white text-xs font-medium px-2 py-1">
                        {product.category_name || 'Product'}
                      </Badge>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white text-xs">
                        In Stock
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
                    {/* Product Title */}
                    <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors flex-1" data-testid={`text-title-${product.id}`}>
                      {product.title}
                    </h3>
                    
                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-lg sm:text-xl font-bold text-primary" data-testid={`text-price-${product.id}`}>
                        ₹{product.price?.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        /{product.unit}
                      </span>
                    </div>
                    
                    {/* Rating (placeholder) */}
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">(4.5)</span>
                    </div>
                    
                    {/* Seller Info */}
                    <div className="text-xs text-muted-foreground mb-2">
                      <div className="truncate font-medium text-blue-600">
                        {product.seller_company || product.seller_name}
                      </div>
                    </div>
                    
                    {/* Quantity Available */}
                    <div className="text-xs text-green-600 font-medium mb-3">
                      {product.quantity} {product.unit} available
                    </div>
                  </CardContent>

                  <div className="p-3 sm:p-4 pt-0">
                    <Button 
                      asChild
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-2 transition-colors duration-200" 
                      data-testid={`button-view-${product.id}`}
                    >
                      <Link href={`/product/${product.id}`}>
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/20 rounded-xl">
              <Package className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No products available</h3>
              <p className="text-muted-foreground mb-6">Be the first to add products to our marketplace</p>
              {canAddProducts && (
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Product
                </Button>
              )}
            </div>
          )}
        </div>


        {/* User Dashboard Links */}
        {isAuthenticated && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card data-testid="buyer-dashboard-link">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  My Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Track orders and manage purchases</p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/seller-dashboard">View Orders</Link>
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="seller-dashboard-link">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  My Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Manage inventory and sales</p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/seller-dashboard">Manage Products</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Platform Benefits Section - Moved to Bottom */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-8 mt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose STOCK LAABH?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Join thousands of businesses trading efficiently on our platform</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Verified Sellers</h3>
              <p className="text-muted-foreground">All our sellers are verified and approved by our admin team</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Competitive Prices</h3>
              <p className="text-muted-foreground">Get the best deals on stock, materials, and equipment</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Direct Communication</h3>
              <p className="text-muted-foreground">Chat directly with buyers and sellers for better deals</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
