import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Code, Database, Key, Users } from "lucide-react";

export default function ApiDocs() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to access API documentation.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need to be logged in to access API documentation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="api-docs-title">
            Stock Laabh API Documentation
          </h1>
          <p className="text-muted-foreground">
            Complete API reference for the Stock Laabh trading platform
          </p>
        </div>

        <div className="grid gap-6">
          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Login</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    GET /api/login
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">Redirects to Replit authentication</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Logout</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    GET /api/logout
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">Logs out user and redirects to home</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Get Current User</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    GET /api/auth/user
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">Returns current authenticated user data</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Listings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Stock Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Get All Listings</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    GET /api/stock/listings
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">
                    Query params: categoryId, search, location, page, limit
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Get Single Listing</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    GET /api/stock/listings/:id
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Create Listing <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    POST /api/stock/listings
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Update Listing <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    PUT /api/stock/listings/:id
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Delete Listing <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    DELETE /api/stock/listings/:id
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="mr-2 h-5 w-5" />
                Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Get My Orders <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    GET /api/orders
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">Query param: role (buyer/seller)</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Create Order <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    POST /api/orders
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Update Order Status <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    PUT /api/orders/:id/status
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Get All Categories</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    GET /api/categories
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Get My Messages <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    GET /api/messages
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Send Message <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    POST /api/messages
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Mark as Read <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    PUT /api/messages/:id/read
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                Payments & Membership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Create Payment Intent <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    POST /api/create-payment-intent
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Create Subscription <Badge variant="outline">Auth Required</Badge></h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    POST /api/get-or-create-subscription
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">For annual membership (₹2,499)</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Stripe Webhook</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    POST /api/stripe/webhook
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Routes */}
          {user?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Admin Routes <Badge variant="destructive">Admin Only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Get Analytics</h3>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm">
                      GET /api/analytics
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Manage Members</h3>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm">
                      POST /api/admin/members/:id/approve<br />
                      POST /api/admin/members/:id/reject
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          <p>© 2025 Stock Laabh. All rights reserved.</p>
          <p className="mt-1">Designed by Renuka Print ERP Solutions</p>
        </div>
      </div>
    </div>
  );
}