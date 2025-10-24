import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Crown, 
  Calendar,
  Shield,
  Users,
  TrendingUp,
  MessageSquare,
  Package,
  BarChart3,
  Zap,
  CreditCard,
  Download,
  FileText
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface PaymentHistory {
  date: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
  invoice_url?: string;
  payment_id?: string;
  order_id?: string;
  payment_method?: string;
}

interface UsageStats {
  totalProducts: number;
  activeProducts: number;
  soldProducts: number;
  inquiriesSent: number;
  inquiriesReceived: number;
}

export default function Membership() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Fetch payment history
  const { data: paymentHistory } = useQuery<PaymentHistory[]>({
    queryKey: ['/api/payment-history'],
    queryFn: async () => {
      const response = await fetch('/api/payment-history', {
        credentials: 'include',
      });
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.payments || [];
    },
    enabled: isAuthenticated,
  });

  // Fetch usage statistics
  const { data: usageStats } = useQuery<UsageStats>({
    queryKey: ['/api/seller/stats'],
    queryFn: async () => {
      const response = await fetch('/api/seller/stats', {
        credentials: 'include',
      });
      if (!response.ok) {
        return {
          totalProducts: 0,
          activeProducts: 0,
          soldProducts: 0,
          inquiriesSent: 0,
          inquiriesReceived: 0
        };
      }
      const data = await response.json();
      return {
        totalProducts: data.totalDeals || 0,
        activeProducts: data.activeDeals || 0,
        soldProducts: data.soldDeals || 0,
        inquiriesSent: data.inquiriesSent || 0,
        inquiriesReceived: data.inquiriesReceived || 0
      };
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const membershipFeatures = [
    { icon: Package, text: "Unlimited product listings" },
    { icon: Users, text: "Direct buyer-seller communication" },
    { icon: MessageSquare, text: "Unlimited enquiries" },
    { icon: BarChart3, text: "Business dashboard & analytics" },
    { icon: Shield, text: "Verified member badge" },
    { icon: TrendingUp, text: "Priority search visibility" },
    { icon: Zap, text: "Real-time notifications" },
    { icon: Crown, text: "Premium support" }
  ];

  // Use payment history to determine start date, otherwise fallback
  const membershipStartDate = paymentHistory && paymentHistory.length > 0
    ? new Date(paymentHistory[paymentHistory.length - 1].date) // First payment date
    : (user?.membership_valid_till
        ? new Date(new Date(user.membership_valid_till).getTime() - 365 * 24 * 60 * 60 * 1000)
        : new Date()); // Default to today if no data

  const membershipEndDate = user?.membership_valid_till
    ? new Date(user.membership_valid_till)
    : new Date(membershipStartDate.getTime() + 365 * 24 * 60 * 60 * 1000);

  const daysRemaining = membershipEndDate 
    ? Math.ceil((membershipEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const hasPaid = user?.membership_paid === 1 || user?.membershipPaid === 1;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Membership Details</h1>
          <p className="text-muted-foreground">
            Your Stock Laabh membership plan and benefits
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Membership Status */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-6 w-6" />
                      <h2 className="text-2xl font-bold">Annual Membership</h2>
                    </div>
                    <p className="text-blue-100 mb-4">Access to all Stock Laabh features</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">₹2,499</span>
                      <span className="text-blue-100">/year</span>
                    </div>
                  </div>
                  <Badge className={hasPaid ? "bg-green-500 text-white" : "bg-white/20 text-white border-white/30"}>
                    {hasPaid ? 'Active' : 'Pending Payment'}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Membership Start</p>
                    <p className="font-semibold">
                      {membershipStartDate 
                        ? membershipStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Not active yet'}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Valid Until</p>
                    <p className="font-semibold">
                      {membershipEndDate 
                        ? membershipEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Not active yet'}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
                    <p className="font-semibold text-green-600">
                      {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                    </p>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Membership Benefits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {membershipFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <feature.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{feature.text}</span>
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
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-medium">Product Listings</Label>
                      <span className="text-sm text-muted-foreground">
                        {usageStats?.totalProducts || 0} total ({usageStats?.activeProducts || 0} active)
                      </span>
                    </div>
                    <Progress value={0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Unlimited</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-medium">Sold Products</Label>
                      <span className="text-sm text-muted-foreground">
                        {usageStats?.soldProducts || 0} sold
                      </span>
                    </div>
                    <Progress value={0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Track your sales</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-medium">Enquiries</Label>
                      <span className="text-sm text-muted-foreground">
                        {usageStats?.inquiriesSent || 0} sent, {usageStats?.inquiriesReceived || 0} received
                      </span>
                    </div>
                    <Progress value={0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Unlimited</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Method */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="font-medium mb-1">
                    {paymentHistory && paymentHistory.length > 0 
                      ? (paymentHistory[0].payment_method || 'Razorpay').toUpperCase()
                      : 'Razorpay'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paymentHistory && paymentHistory.length > 0 && paymentHistory[0].payment_id
                      ? `Payment ID: ${paymentHistory[0].payment_id.slice(0, 15)}...`
                      : 'Online Payment Gateway'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Billing History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {paymentHistory && paymentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {paymentHistory.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">₹{payment.amount.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <Badge className={
                          payment.status === 'success' ? 'bg-green-100 text-green-700' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No payment history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Contact our support team for assistance
                  </p>
                  <div className="space-y-2">
                    <a 
                      href="mailto:support@stocklaabh.com"
                      className="block w-full px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
                    >
                      Email Support
                    </a>
                    <a 
                      href="tel:+911234567890"
                      className="block w-full px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
                    >
                      Call Support
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}