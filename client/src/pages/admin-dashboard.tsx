import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/navigation";
import DashboardStats from "@/components/dashboard-stats";
import { Users, Package, DollarSign, Clock, Check, X, ShieldCheck, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Admin privileges required to access this page.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    totalUsers: number;
    activeListings: number;
    totalOrders: number;
    monthlyRevenue: number;
  }>({
    queryKey: ['/api/analytics'],
    retry: false,
    enabled: !!user && user.role === 'admin',
  });

  const { data: pendingMembers } = useQuery({
    queryKey: ['/api/admin/pending-members'],
    retry: false,
    enabled: !!user && user.role === 'admin',
    queryFn: async () => {
      // This would be implemented in the backend
      return [];
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['/api/admin/recent-payments'],
    retry: false,
    enabled: !!user && user.role === 'admin',
    queryFn: async () => {
      // This would be implemented in the backend
      return [];
    },
  });

  const approveMemberMutation = useMutation({
    mutationFn: async ({ memberId, action }: { memberId: string; action: 'approve' | 'reject' }) => {
      const response = await fetch(`/api/admin/members/${memberId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update member status');
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Member Updated",
        description: `Member has been ${variables.action}d successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-members'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="admin-dashboard-title">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Platform management and analytics overview
          </p>
        </div>

        {/* Dashboard Stats */}
        {analytics && (
          <DashboardStats
            stats={[
              {
                title: "Total Members",
                value: analytics.totalUsers.toString(),
                change: "+12%",
                icon: Users,
                color: "primary"
              },
              {
                title: "Active Listings",
                value: analytics.activeListings.toString(),
                change: "+8%",
                icon: Package,
                color: "chart-2"
              },
              {
                title: "Monthly Revenue",
                value: `₹${(analytics.monthlyRevenue / 100000).toFixed(1)}L`,
                change: "+15%",
                icon: DollarSign,
                color: "chart-1"
              },
              {
                title: "Total Orders",
                value: analytics.totalOrders.toString(),
                change: "+5%",
                icon: Package,
                color: "chart-4"
              }
            ]}
            loading={analyticsLoading}
          />
        )}

        {/* Main Content */}
        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-members">Members</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Registrations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Recent Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingMembers && pendingMembers.length > 0 ? (
                    <div className="space-y-3">
                      {pendingMembers.slice(0, 5).map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-foreground">
                                {member.companyName?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{member.companyName}</p>
                              <p className="text-xs text-muted-foreground">{member.businessCategory}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No pending registrations</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Payment Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Membership Fees</span>
                      <span className="text-sm font-medium">₹12,45,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Transaction Fees</span>
                      <span className="text-sm font-medium">₹3,78,500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Listing Fees</span>
                      <span className="text-sm font-medium">₹89,250</span>
                    </div>
                    <hr className="border-border" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Revenue</span>
                      <span className="text-lg font-bold text-primary">₹17,12,750</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Management</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingMembers && pendingMembers.length > 0 ? (
                  <div className="space-y-4">
                    {pendingMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-foreground">
                              {member.companyName?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold">{member.companyName}</h4>
                            <p className="text-sm text-muted-foreground">{member.firstName} {member.lastName}</p>
                            <p className="text-xs text-muted-foreground">{member.businessCategory}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{member.membershipStatus}</Badge>
                          <Button
                            size="sm"
                            onClick={() => approveMemberMutation.mutate({ memberId: member.id, action: 'approve' })}
                            disabled={approveMemberMutation.isPending}
                            data-testid={`approve-member-${member.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => approveMemberMutation.mutate({ memberId: member.id, action: 'reject' })}
                            disabled={approveMemberMutation.isPending}
                            data-testid={`reject-member-${member.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Pending Members</h3>
                    <p className="text-muted-foreground">All member applications have been processed</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {recentPayments && recentPayments.length > 0 ? (
                  <div className="space-y-3">
                    {recentPayments.map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                        <div>
                          <p className="text-sm font-medium">₹{payment.amount}</p>
                          <p className="text-xs text-muted-foreground">{payment.paymentType}</p>
                        </div>
                        <Badge variant={payment.status === 'succeeded' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Recent Payments</h3>
                    <p className="text-muted-foreground">Payment history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                    <p className="text-muted-foreground">Detailed analytics and reporting features will be available here</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Charts Coming Soon</h3>
                    <p className="text-muted-foreground">Revenue trends and financial analytics will be displayed here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
