import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/navigation";
import { Link } from "wouter";
import { Package, ShoppingCart, MessageSquare, TrendingUp, Plus, Search } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const { data: recentListings } = useQuery({
    queryKey: ['/api/stock/listings'],
    queryFn: async () => {
      const response = await fetch('/api/stock/listings?limit=6');
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="welcome-heading">
            Welcome back, {user?.firstName || 'Member'}!
          </h1>
          <p className="text-muted-foreground">
            Your professional trading platform dashboard
          </p>
        </div>

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

          {(user?.role === 'seller' || user?.role === 'both') && (
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
          )}

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="quick-action-orders">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-chart-1 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">My Orders</h3>
              <p className="text-sm text-muted-foreground mb-4">Track your purchases and sales</p>
              <Button asChild className="w-full" variant="outline">
                <Link href={user?.role === 'seller' ? '/seller-dashboard' : '/buyer-dashboard'}>
                  View Orders
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="quick-action-messages">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-chart-4 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Messages</h3>
              <p className="text-sm text-muted-foreground mb-4">Communicate with buyers and sellers</p>
              <Button asChild className="w-full" variant="outline">
                <Link href="/messages">Open Messages</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Listings */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Latest Stock Listings</h2>
            <Button asChild variant="outline">
              <Link href="/marketplace">View All</Link>
            </Button>
          </div>

          {recentListings?.listings ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentListings.listings.map((listing: any) => (
                <Card key={listing.id} className="hover:shadow-lg transition-shadow" data-testid={`listing-${listing.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{listing.title}</CardTitle>
                      <span className="text-xs px-2 py-1 bg-chart-2 text-white rounded-full">
                        {listing.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-3">{listing.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-2xl font-bold text-primary">₹{listing.price}</span>
                        <span className="text-sm text-muted-foreground">/{listing.unit}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Available</p>
                        <p className="text-lg font-semibold">{listing.quantity} {listing.unit}</p>
                      </div>
                    </div>
                    <Button className="w-full" data-testid={`view-listing-${listing.id}`}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No listings available</h3>
              <p className="text-muted-foreground">Check back later for new stock listings</p>
            </div>
          )}
        </div>

        {/* Dashboard Links */}
        <div className="grid md:grid-cols-3 gap-6">
          {user?.role === 'admin' && (
            <Card data-testid="admin-dashboard-link">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Admin Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Manage platform, users, and analytics</p>
                <Button asChild className="w-full">
                  <Link href="/admin">Open Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(user?.role === 'buyer' || user?.role === 'both') && (
            <Card data-testid="buyer-dashboard-link">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Buyer Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Track orders and manage purchases</p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/buyer-dashboard">Open Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {(user?.role === 'seller' || user?.role === 'both') && (
            <Card data-testid="seller-dashboard-link">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Seller Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Manage inventory and sales</p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/seller-dashboard">Open Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
