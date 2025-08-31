import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Printer, Menu, X, Sun, Moon, User, Clock } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm border-b border-border sticky top-0 z-40">
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
              <Link href="/marketplace" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="nav-marketplace">
                Marketplace
              </Link>
            )}
            <Link href="/register" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="nav-membership">
              Membership
            </Link>
            <a href="#about" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="nav-about">
              About Us
            </a>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle for all users */}
            <div className="relative">
              <button
                onClick={toggleTheme}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-purple-600 dark:to-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                data-testid="theme-toggle"
              >
                <div className="flex items-center space-x-1">
                  {theme === "light" ? (
                    <>
                      <Sun className="h-4 w-4" />
                      <span className="text-sm font-medium hidden md:block">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span className="text-sm font-medium hidden md:block">Dark</span>
                    </>
                  )}
                </div>
                <div className="w-8 h-4 bg-white/20 rounded-full relative hidden md:block">
                  <div 
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${
                      theme === "dark" ? "transform translate-x-4" : "transform translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>

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
              <>
                {/* User Info Display */}
                <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-muted/50 dark:bg-muted rounded-lg border" data-testid="user-info">
                  <User className="h-4 w-4 text-primary" />
                  <div className="text-sm">
                    <div className="font-medium text-foreground">
                      {user?.firstName || user?.name || 'User'}
                    </div>
                    {user?.last_login && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Last: {new Date(user.last_login).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                  className="font-medium"
                >
                  Logout
                </Button>
              </>
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
        <div className="md:hidden border-t border-border bg-white" data-testid="mobile-menu">
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
              <Link 
                href="/marketplace" 
                className="block text-foreground hover:text-primary py-2"
                onClick={() => setIsMobileMenuOpen(false)}
                data-testid="mobile-nav-marketplace"
              >
                Marketplace
              </Link>
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
