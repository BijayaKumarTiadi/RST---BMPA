import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Crown, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Package, 
  Users, 
  Star,
  Calendar,
  Zap,
  Shield,
  Headphones,
  Download,
  BarChart3,
  AlertCircle
} from "lucide-react";
import { useLocation } from "wouter";

interface MembershipData {
  current_plan: {
    name: string;
    type: 'free' | 'basic' | 'premium' | 'enterprise';
    price: number;
    billing_cycle: 'monthly' | 'yearly';
    features: string[];
    limits: {
      products: number;
      inquiries: number;
      api_calls: number;
    };
  };
  usage: {
    products_used: number;
    inquiries_sent: number;
    inquiries_received: number;
    api_calls_used: number;
  };
  billing: {
    next_billing_date: string;
    payment_method: string;
    billing_history: Array<{
      date: string;
      amount: number;
      status: 'paid' | 'pending' | 'failed';
      invoice_url?: string;
    }>;
  };
  subscription: {
    status: 'active' | 'inactive' | 'cancelled' | 'trial';
    started_at: string;
    trial_ends_at?: string;
  };
}

const membershipPlans = [
  {
    name: 'Free',
    type: 'free' as const,
    price: 0,
    billing_cycle: 'monthly' as const,
    description: 'Perfect for getting started',
    features: [
      '5 Product listings',
      '10 Inquiries per month',
      'Basic search filters',
      'Email support'
    ],
    limits: { products: 5, inquiries: 10, api_calls: 100 },
    popular: false,
  },
  {
    name: 'Basic',
    type: 'basic' as const,
    price: 999,
    billing_cycle: 'monthly' as const,
    description: 'For growing businesses',
    features: [
      '50 Product listings',
      '100 Inquiries per month',
      'Advanced search filters',
      'Priority email support',
      'Basic analytics',
      'WhatsApp integration'
    ],
    limits: { products: 50, inquiries: 100, api_calls: 1000 },
    popular: false,
  },
  {
    name: 'Premium',
    type: 'premium' as const,
    price: 2499,
    billing_cycle: 'monthly' as const,
    description: 'Most popular for serious traders',
    features: [
      'Unlimited Product listings',
      'Unlimited Inquiries',
      'Advanced analytics & reports',
      'Priority phone support',
      'API access',
      'Custom branding',
      'Bulk operations',
      'Export data'
    ],
    limits: { products: -1, inquiries: -1, api_calls: 10000 },
    popular: true,
  },
  {
    name: 'Enterprise',
    type: 'enterprise' as const,
    price: 9999,
    billing_cycle: 'monthly' as const,
    description: 'For large enterprises',
    features: [
      'Everything in Premium',
      'Dedicated account manager',
      'Custom integrations',
      'White-label solution',
      'Advanced security',
      'SLA guarantee',
      'Custom training',
      'Priority feature requests'
    ],
    limits: { products: -1, inquiries: -1, api_calls: -1 },
    popular: false,
  },
];

export default function Membership() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Fetch membership data
  const { data: membershipData, isLoading: membershipLoading } = useQuery<MembershipData>({
    queryKey: ['/api/membership'],
    queryFn: async () => {
      const response = await fetch('/api/membership', {
        credentials: 'include',
      });
      if (!response.ok) {
        // Return default data for demo purposes
        return {
          current_plan: {
            name: 'Free',
            type: 'free' as const,
            price: 0,
            billing_cycle: 'monthly' as const,
            features: ['5 Product listings', '10 Inquiries per month', 'Basic search filters', 'Email support'],
            limits: { products: 5, inquiries: 10, api_calls: 100 }
          },
          usage: {
            products_used: 2,
            inquiries_sent: 5,
            inquiries_received: 8,
            api_calls_used: 45
          },
          billing: {
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            payment_method: 'Credit Card ending in 4242',
            billing_history: []
          },
          subscription: {
            status: 'active' as const,
            started_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
          }
        };
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'trial': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPlanIcon = (type: string) => {
    switch (type) {
      case 'free': return <Package className="h-5 w-5" />;
      case 'basic': return <TrendingUp className="h-5 w-5" />;
      case 'premium': return <Crown className="h-5 w-5" />;
      case 'enterprise': return <Shield className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (membershipLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!membershipData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Unable to load membership data</h3>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  const membership = membershipData;
  const currentPlan = membership.current_plan;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Membership Details</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage statistics
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Current Plan Overview */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  {getPlanIcon(currentPlan.type)}
                  Current Plan: {currentPlan.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getStatusColor(membership.subscription.status)}>
                        {membership.subscription.status.charAt(0).toUpperCase() + membership.subscription.status.slice(1)}
                      </Badge>
                      <Badge variant="outline">
                        {currentPlan.billing_cycle.charAt(0).toUpperCase() + currentPlan.billing_cycle.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold">
                      ₹{currentPlan.price.toLocaleString('en-IN')}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{currentPlan.billing_cycle}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Next billing</p>
                    <p className="font-medium">
                      {new Date(membership.billing.next_billing_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                <Separator className="mb-6" />

                <div>
                  <h3 className="font-semibold mb-4">Plan Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentPlan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <BarChart3 className="h-5 w-5" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Products */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-medium">Product Listings</Label>
                      <span className="text-sm text-muted-foreground">
                        {membership.usage.products_used} / {currentPlan.limits.products === -1 ? '∞' : currentPlan.limits.products}
                      </span>
                    </div>
                    {currentPlan.limits.products !== -1 && (
                      <Progress 
                        value={getUsagePercentage(membership.usage.products_used, currentPlan.limits.products)}
                        className="h-2"
                      />
                    )}
                  </div>

                  {/* Inquiries */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-medium">Monthly Inquiries</Label>
                      <span className="text-sm text-muted-foreground">
                        {membership.usage.inquiries_sent} sent, {membership.usage.inquiries_received} received
                      </span>
                    </div>
                    {currentPlan.limits.inquiries !== -1 && (
                      <Progress 
                        value={getUsagePercentage(membership.usage.inquiries_sent, currentPlan.limits.inquiries)}
                        className="h-2"
                      />
                    )}
                  </div>

                  {/* API Calls */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-medium">API Calls</Label>
                      <span className="text-sm text-muted-foreground">
                        {membership.usage.api_calls_used} / {currentPlan.limits.api_calls === -1 ? '∞' : currentPlan.limits.api_calls}
                      </span>
                    </div>
                    {currentPlan.limits.api_calls !== -1 && (
                      <Progress 
                        value={getUsagePercentage(membership.usage.api_calls_used, currentPlan.limits.api_calls)}
                        className="h-2"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                <CardTitle className="text-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Button className="w-full flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Upgrade Plan
                  </Button>
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Invoice
                  </Button>
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Method
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Summary */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <CardTitle className="text-foreground">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Member since</span>
                    <span className="font-medium">
                      {new Date(membership.subscription.started_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment method</span>
                    <span className="font-medium text-sm">{membership.billing.payment_method}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plan status</span>
                    <Badge className={getStatusColor(membership.subscription.status)}>
                      {membership.subscription.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="text-center">
                  <Headphones className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-medium mb-1">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Our support team is here to help
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Available Plans */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {membershipPlans.map((plan) => (
              <Card 
                key={plan.type}
                className={`border-0 shadow-lg relative ${
                  plan.popular ? 'ring-2 ring-primary' : ''
                } ${
                  currentPlan.type === plan.type ? 'bg-blue-50' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-2">
                    {getPlanIcon(plan.type)}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">₹{plan.price.toLocaleString('en-IN')}</span>
                    <span className="text-muted-foreground">/{plan.billing_cycle}</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {currentPlan.type === plan.type ? (
                    <Button disabled className="w-full" variant="outline">
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {currentPlan.price < plan.price ? 'Upgrade' : 'Switch'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}