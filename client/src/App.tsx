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
import RegistrationSuccess from "@/pages/registration-success";
import About from "@/pages/about";
import AddProduct from "@/pages/add-product";
import EditProduct from "@/pages/edit-product";
import ProductDetails from "@/pages/product-details";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Membership from "@/pages/membership";
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
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/register" component={Register} />
      
      {/* Protected routes - require authentication */}
      <Route path="/">
        {isAuthenticated ? <Marketplace /> : <Login />}
      </Route>
      <Route path="/home">
        {isAuthenticated ? <Home /> : <Login />}
      </Route>
      <Route path="/marketplace">
        {isAuthenticated ? <Marketplace /> : <Login />}
      </Route>
      <Route path="/buyer-dashboard">
        {isAuthenticated ? <BuyerDashboard /> : <Login />}
      </Route>
      <Route path="/seller-dashboard">
        {isAuthenticated ? <SellerDashboard /> : <Login />}
      </Route>
      <Route path="/add-product">
        {isAuthenticated ? <AddProduct /> : <Login />}
      </Route>
      <Route path="/edit-deal/:id">
        {isAuthenticated ? <EditProduct /> : <Login />}
      </Route>
      <Route path="/edit-product/:id">
        {isAuthenticated ? <EditProduct /> : <Login />}
      </Route>
      <Route path="/product/:id">
        {isAuthenticated ? <ProductDetails /> : <Login />}
      </Route>
      <Route path="/profile">
        {isAuthenticated ? <Profile /> : <Login />}
      </Route>
      <Route path="/settings">
        {isAuthenticated ? <Settings /> : <Login />}
      </Route>
      <Route path="/membership">
        {isAuthenticated ? <Membership /> : <Login />}
      </Route>
      <Route path="/api-docs">
        {isAuthenticated ? <ApiDocs /> : <Login />}
      </Route>
      <Route path="/welcome">
        {isAuthenticated ? <Landing /> : <Login />}
      </Route>
      {/* Semi-protected routes - require authentication but accessible without full approval */}
      <Route path="/subscribe">
        {isAuthenticated ? <Subscribe /> : <Login />}
      </Route>
      <Route path="/registration-success">
        {isAuthenticated ? <RegistrationSuccess /> : <Login />}
      </Route>
      <Route path="/about">
        {isAuthenticated ? <About /> : <Login />}
      </Route>
      
      {/* 404 - Not Found */}
      <Route component={NotFound} />
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
