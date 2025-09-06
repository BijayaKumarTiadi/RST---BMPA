import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Printer, Menu, X, Sun, Moon, User, Clock, ChevronDown, ShoppingBag, LogOut, Settings, Package, CreditCard, Info, LayoutDashboard, Store } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

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
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-border dark:border-gray-700 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3" data-testid="logo-link">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
              <Printer className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-primary">Stock Laabh</h1>
              <p className="text-xs text-muted-foreground">Professional Trading Platform</p>
            </div>
            <h1 className="sm:hidden text-lg font-bold text-primary">Stock Laabh</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {isAuthenticated && (
              <>
                <Link href="/marketplace" className={`${location === '/marketplace' || location === '/' ? 'text-primary font-bold border-b-2 border-primary' : 'text-foreground hover:text-primary'} transition-colors font-medium`} data-testid="nav-marketplace">
                  Marketplace
                </Link>
                {(user?.role === 'seller' || user?.role === 'both') && (
                  <Link href="/seller-dashboard" className={`${location === '/seller-dashboard' ? 'text-primary font-bold border-b-2 border-primary' : 'text-foreground hover:text-primary'} transition-colors font-medium`} data-testid="nav-member-dashboard">
                    Member Dashboard
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Theme Toggle for Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="md:hidden"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
            
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
            
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="icon"
                  data-testid="mobile-menu-toggle"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px] p-0">
                <SheetHeader className="border-b px-6 py-4">
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-6">
                  {isAuthenticated && user && (
                    <div className="mb-6 pb-6 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user.firstName || user.name || user.email}</span>
                          <span className="text-xs text-muted-foreground">{user.role || 'Member'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    
                    {isAuthenticated && (
                      <>
                        <Button 
                          variant={location === '/marketplace' ? 'default' : 'ghost'}
                          className={`w-full justify-start ${location === '/marketplace' ? 'bg-primary text-primary-foreground' : ''}`}
                          onClick={() => {
                            setLocation('/marketplace');
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Store className="mr-2 h-4 w-4" />
                          Marketplace
                        </Button>
                        
                        {(user?.role === 'seller' || user?.role === 'both') && (
                          <Button 
                            variant={location === '/seller-dashboard' ? 'default' : 'ghost'}
                            className={`w-full justify-start ${location === '/seller-dashboard' ? 'bg-primary text-primary-foreground' : ''}`}
                            onClick={() => {
                              setLocation('/seller-dashboard');
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Member Dashboard
                          </Button>
                        )}
                        
                        {(user?.role === 'buyer' || user?.role === 'both') && (
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start"
                            onClick={() => {
                              setLocation('/buyer-dashboard');
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Buyer Dashboard
                          </Button>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          onClick={() => {
                            setLocation('/profile');
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start"
                          onClick={() => {
                            setLocation('/orders');
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Orders
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => {
                        setLocation('/about');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Info className="mr-2 h-4 w-4" />
                      About
                    </Button>
                    
                    {/* Theme Toggle */}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={toggleTheme}
                    >
                      {theme === "light" ? (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          Dark Mode
                        </>
                      ) : (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          Light Mode
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {isAuthenticated ? (
                    <div className="mt-6 pt-6 border-t">
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 pt-6 border-t space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          window.location.href = '/api/login';
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        Login
                      </Button>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          setLocation('/register');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        Register
                      </Button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

    </header>
  );
}
