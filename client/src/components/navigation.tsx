import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Printer, Menu, X } from "lucide-react";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

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
            <Link href="/" className="text-foreground hover:text-primary transition-colors" data-testid="nav-home">
              Home
            </Link>
            {isAuthenticated && (
              <Link href="/marketplace" className="text-foreground hover:text-primary transition-colors" data-testid="nav-marketplace">
                Marketplace
              </Link>
            )}
            {!isAuthenticated && (
              <Link href="/register" className="text-foreground hover:text-primary transition-colors" data-testid="nav-membership">
                Membership
              </Link>
            )}
            <a href="#about" className="text-foreground hover:text-primary transition-colors" data-testid="nav-about">
              About Us
            </a>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login"
                >
                  Login
                </Button>
                <Button asChild data-testid="button-register">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground hidden md:block" data-testid="user-greeting">
                  Welcome, {user?.firstName}
                </span>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
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
            {!isAuthenticated && (
              <Link 
                href="/register" 
                className="block text-foreground hover:text-primary py-2"
                onClick={() => setIsMobileMenuOpen(false)}
                data-testid="mobile-nav-membership"
              >
                Membership
              </Link>
            )}
            <a 
              href="https://bmpa.org" 
              className="block text-foreground hover:text-primary py-2"
              data-testid="mobile-nav-bmpa"
            >
              About BMPA
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
