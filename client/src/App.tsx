import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Register from "@/pages/register";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import BuyerDashboard from "@/pages/buyer-dashboard";
import SellerDashboard from "@/pages/seller-dashboard";
import Marketplace from "@/pages/marketplace";
import ApiDocs from "@/pages/api-docs";
import Subscribe from "@/pages/subscribe";
import About from "@/pages/about";
import AddProduct from "@/pages/add-product";
import EditProduct from "@/pages/edit-product";
import ProductDetails from "@/pages/product-details";
import Orders from "@/pages/orders";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - accessible without authentication */}
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/register" component={Register} />
      
      {/* All other routes require authentication */}
      {isAuthenticated ? (
        <>
          <Route path="/" component={Home} />
          <Route path="/home" component={Home} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/buyer-dashboard" component={BuyerDashboard} />
          <Route path="/seller-dashboard" component={SellerDashboard} />
          <Route path="/add-product" component={AddProduct} />
          <Route path="/edit-deal/:id" component={EditProduct} />
          <Route path="/edit-product/:id" component={EditProduct} />
          <Route path="/product/:id" component={ProductDetails} />
          <Route path="/deal/:id" component={ProductDetails} />
          <Route path="/orders" component={Orders} />
          <Route path="/api-docs" component={ApiDocs} />
          <Route path="/welcome" component={Landing} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/about" component={About} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          {/* Redirect all unauthenticated users to login */}
          <Route path="/" component={Login} />
          <Route component={Login} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
