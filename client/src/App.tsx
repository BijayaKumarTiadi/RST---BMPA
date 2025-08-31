import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Register from "@/pages/register";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import BuyerDashboard from "@/pages/buyer-dashboard";
import SellerDashboard from "@/pages/seller-dashboard";
import Marketplace from "@/pages/marketplace";
import ApiDocs from "@/pages/api-docs";
import Subscribe from "@/pages/subscribe";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Default landing page for login/signup */}
      <Route path="/" component={Landing} />
      
      {/* Admin login page - accessible to all */}
      <Route path="/admin" component={AdminLogin} />
      
      {/* Registration and subscription pages */}
      <Route path="/register" component={Register} />
      <Route path="/subscribe" component={Subscribe} />
      
      {/* Protected routes - only visible after login */}
      {isAuthenticated && (
        <>
          <Route path="/home" component={Home} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/buyer-dashboard" component={BuyerDashboard} />
          <Route path="/seller-dashboard" component={SellerDashboard} />
          <Route path="/api-docs" component={ApiDocs} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
