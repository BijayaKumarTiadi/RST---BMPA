import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Printer, Menu, X, Shield, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { apiRequest } from "@/lib/queryClient";

interface AdminUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Check admin authentication
  const { data: adminAuth } = useQuery<{ success: boolean; admin: AdminUser }>({
    queryKey: ["/api/auth/admin-user"],
    retry: false,
  });

  const isAdminAuthenticated = adminAuth?.success && adminAuth?.admin;


  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/admin-dashboard" className="flex items-center space-x-3" data-testid="logo-link">
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
            <Link href="/admin-dashboard" className="text-foreground hover:text-primary transition-colors" data-testid="nav-dashboard">
              Dashboard
            </Link>
            <Link href="/" className="text-foreground hover:text-primary transition-colors" data-testid="nav-home">
              Home
            </Link>
            <a href="#about" className="text-foreground hover:text-primary transition-colors" data-testid="nav-about">
              About Us
            </a>
          </nav>

          {/* Admin Actions */}
          <div className="flex items-center space-x-4">
            {isAdminAuthenticated && (
              <div className="hidden md:flex items-center space-x-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground" data-testid="admin-greeting">
                  Welcome, {adminAuth.admin.name}
                </span>
              </div>
            )}
            
            {/* Cool Theme Toggle */}
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
                      <span className="text-sm font-medium">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span className="text-sm font-medium">Dark</span>
                    </>
                  )}
                </div>
                <div className="w-8 h-4 bg-white/20 rounded-full relative">
                  <div 
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${
                      theme === "dark" ? "transform translate-x-4" : "transform translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>
            
            {!isAdminAuthenticated && (
              <Button asChild data-testid="button-admin-login">
                <Link href="/admin">Admin Login</Link>
              </Button>
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
              href="/admin-dashboard" 
              className="block text-foreground hover:text-primary py-2" 
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="mobile-nav-dashboard"
            >
              Dashboard
            </Link>
            <Link 
              href="/" 
              className="block text-foreground hover:text-primary py-2" 
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="mobile-nav-home"
            >
              Home
            </Link>
            <a 
              href="#about" 
              className="block text-foreground hover:text-primary py-2"
              data-testid="mobile-nav-about"
            >
              About Us
            </a>
            
            {isAdminAuthenticated && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Welcome, {adminAuth.admin.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}