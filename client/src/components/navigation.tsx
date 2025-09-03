import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Printer, Menu, X, Sun, Moon, User, Clock, ChevronDown, ShoppingBag, LogOut, Settings, Package, CreditCard, Info } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();


  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      
      // Clear all query cache
      queryClient.clear();
      
      // Redirect to home page
      setLocation('/');
      
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-border dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3" data-testid="logo-link">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Printer className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Stock Laabh</h1>
              <p className="text-xs text-muted-foreground">Professional Trading Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="nav-home">
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/marketplace" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="nav-marketplace">
                  Marketplace
                </Link>
                {(user?.role === 'seller' || user?.role === 'both') && (
                  <Link href="/seller-dashboard" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="nav-seller-dashboard">
                    Seller Dashboard
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login"
                  className="font-medium"
                >
                  Login
                </Button>
                <Button asChild data-testid="button-register" className="bg-primary hover:bg-primary/90">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors"
                    data-testid="user-profile-dropdown"
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground">
                        {user?.firstName || user?.name || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user?.role || 'Member'}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center space-x-2 p-3 border-b">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user?.firstName || user?.name || user?.email}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                      {user?.last_login && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            Last login: {new Date(user.last_login).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center space-x-2 w-full">
                      <User className="h-4 w-4" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  {(user?.role === 'seller' || user?.role === 'both') && (
                    <DropdownMenuItem asChild>
                      <Link href="/add-product" className="flex items-center space-x-2 w-full">
                        <Package className="h-4 w-4" />
                        <span>Add Product</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="flex items-center space-x-2 w-full">
                      <ShoppingBag className="h-4 w-4" />
                      <span>My Orders</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center space-x-2 w-full">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/register" className="flex items-center space-x-2 w-full">
                      <CreditCard className="h-4 w-4" />
                      <span>Membership</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <a href="#about" className="flex items-center space-x-2 w-full">
                      <Info className="h-4 w-4" />
                      <span>About Us</span>
                    </a>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={toggleTheme}
                    className="flex items-center space-x-2"
                  >
                    {theme === "light" ? (
                      <>
                        <Moon className="h-4 w-4" />
                        <span>Dark Mode</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4" />
                        <span>Light Mode</span>
                      </>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-red-600 dark:text-red-400 cursor-pointer"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={toggleMobileMenu}
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border dark:border-gray-700 bg-white dark:bg-gray-900" data-testid="mobile-menu">
          <div className="px-4 py-6 space-y-4">
            <Link 
              href="/" 
              className="block text-foreground hover:text-primary py-2" 
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="mobile-nav-home"
            >
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link 
                  href="/marketplace" 
                  className="block text-foreground hover:text-primary py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid="mobile-nav-marketplace"
                >
                  Marketplace
                </Link>
              </>
            )}
            <Link 
              href="/register" 
              className="block text-foreground hover:text-primary py-2 font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="mobile-nav-membership"
            >
              Membership
            </Link>
            <a 
              href="#about" 
              className="block text-foreground hover:text-primary py-2"
              data-testid="mobile-nav-about"
            >
              About Us
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
