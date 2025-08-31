import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/navigation";
import { Shield, Lock, Printer } from "lucide-react";

export default function AdminLogin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to admin dashboard if already logged in as admin
  useEffect(() => {
    if (user && user.role === 'admin') {
      window.location.href = '/';
      return;
    }
  }, [user]);

  const handleAdminLogin = () => {
    window.location.href = '/api/login';
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Printer className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">BMPA Admin Access</h1>
          <p className="text-muted-foreground">
            Administrative portal for BMPA Stock Exchange
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="flex items-center justify-center">
              <Lock className="mr-2 h-5 w-5" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated && user ? (
              user.role === 'admin' ? (
                <div className="text-center">
                  <p className="text-green-600 mb-4">✓ Admin access verified</p>
                  <Button 
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                    data-testid="go-to-dashboard"
                  >
                    Go to Admin Dashboard
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-destructive mb-4">Access denied. Admin privileges required.</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Your account: {user.email} ({user.role})
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/api/logout'}
                    className="w-full"
                    data-testid="logout-button"
                  >
                    Logout & Try Different Account
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Sign in with your admin credentials to access the administrative dashboard.
                </p>
                <Button 
                  onClick={handleAdminLogin}
                  className="w-full"
                  data-testid="admin-login-button"
                >
                  Admin Sign In
                </Button>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Only authorized BMPA administrators can access this portal. 
                Unauthorized access attempts are logged and monitored.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => window.location.href = '/'}>
            ← Back to Main Site
          </Button>
        </div>
      </div>
    </div>
  );
}