import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import AdminNavigation from "@/components/admin-navigation";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  CreditCard, 
  BarChart3, 
  Search,
  LogOut,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Edit,
  IndianRupee,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

interface Member {
  member_id: number;
  mname: string;
  email: string;
  phone: string;
  company_name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  membership_paid: number;
  membership_valid_till: string;
  mstatus: number;
  created_at: string;
  approval_datetime: string;
  last_login?: string;
}

interface DashboardStats {
  totalMembers: number;
  pendingMembers: number;
  approvedMembers: number;
  rejectedMembers: number;
  paidMembers: number;
}

interface PaymentStats {
  totalCollected: number;
  activeMembers: number;
  expiredMembers: number;
  expiringThisMonth: number;
}

interface PaymentHistory {
  member_id: number;
  mname: string;
  email: string;
  company_name: string;
  membership_paid: number;
  membership_valid_till: string;
  membership_status: string;
  days_remaining: number;
  payment_date: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Member>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check admin authentication
  const { data: adminUser, isLoading: isAdminLoading, error: adminError } = useQuery<{ admin: AdminUser }>({
    queryKey: ["/api/auth/admin-user"],
    retry: false,
  });

  // Get dashboard stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard-stats"],
    enabled: !!adminUser,
  });

  // Get payment stats
  const { data: paymentStats } = useQuery<PaymentStats>({
    queryKey: ["/api/admin/payment-stats"],
    enabled: !!adminUser,
  });

  // Get all members
  const { data: members = [], isLoading: isMembersLoading } = useQuery<Member[]>({
    queryKey: ["/api/admin/members"],
    enabled: !!adminUser,
  });

  // Get payment history
  const { data: paymentHistory = [] } = useQuery<PaymentHistory[]>({
    queryKey: ["/api/admin/payment-history"],
    enabled: !!adminUser,
  });

  // Filter members based on search term
  const filteredMembers = members.filter(member =>
    member.mname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAdminLoading && (adminError || !adminUser)) {
      setLocation("/admin");
    }
  }, [isAdminLoading, adminError, adminUser, setLocation]);

  // Admin logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/admin-logout", {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      setLocation("/admin");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "An error occurred during logout",
        variant: "destructive",
      });
    }
  });

  // Approve member mutation
  const approveMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return await apiRequest("POST", `/api/admin/members/${memberId}/approve`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Member approved",
        description: "Member has been successfully approved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve member",
        variant: "destructive",
      });
    },
  });

  // Reject member mutation
  const rejectMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return await apiRequest("POST", `/api/admin/members/${memberId}/reject`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Member rejected",
        description: "Member has been successfully rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject member",
        variant: "destructive",
      });
    },
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: number; data: Partial<Member> }) => {
      return await apiRequest("PUT", `/api/admin/members/${memberId}`, data);
    },
    onSuccess: (data) => {
      toast({
        title: "Member updated",
        description: "Member profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      // Refresh the form with updated data
      if (data && editingMember) {
        const updatedMember = { ...editingMember, ...editFormData };
        setEditingMember(updatedMember);
        setEditFormData(updatedMember);
      } else {
        setEditingMember(null);
        setEditFormData({});
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member",
        variant: "destructive",
      });
    },
  });

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setEditFormData({
      mname: member.mname,
      email: member.email,
      phone: member.phone,
      company_name: member.company_name,
      address1: member.address1,
      address2: member.address2,
      city: member.city,
      state: member.state,
    });
  };

  const handleUpdateMember = () => {
    if (!editingMember) return;
    updateMemberMutation.mutate({
      memberId: editingMember.member_id,
      data: editFormData,
    });
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 0:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case -1:
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getMembershipBadge = (paid: number) => {
    return paid === 1 
      ? <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Paid</Badge>
      : <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Unpaid</Badge>;
  };

  const getExpiryBadge = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysRemaining <= 30) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Expiring Soon</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    }
  };

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="dashboard-title">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {adminUser.admin.name}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold" data-testid="stat-total-members">
                    {stats?.totalMembers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold" data-testid="stat-pending-members">
                    {stats?.pendingMembers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold" data-testid="stat-approved-members">
                    {stats?.approvedMembers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Paid Members</p>
                  <p className="text-2xl font-bold" data-testid="stat-paid-members">
                    {stats?.paidMembers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <IndianRupee className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                  <p className="text-2xl font-bold" data-testid="stat-total-collected">
                    ₹{paymentStats?.totalCollected?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members" data-testid="tab-members">All Members</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">Pending Users</TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payment History</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Member Management</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                      data-testid="input-search"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Membership</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isMembersLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No members found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((member) => (
                          <TableRow key={member.member_id} data-testid={`row-member-${member.member_id}`}>
                            <TableCell className="font-medium" data-testid={`text-name-${member.member_id}`}>
                              {member.mname}
                            </TableCell>
                            <TableCell data-testid={`text-email-${member.member_id}`}>
                              {member.email}
                            </TableCell>
                            <TableCell data-testid={`text-phone-${member.member_id}`}>
                              {member.phone}
                            </TableCell>
                            <TableCell data-testid={`text-company-${member.member_id}`}>
                              {member.company_name}
                            </TableCell>
                            <TableCell data-testid={`text-location-${member.member_id}`}>
                              {member.city}, {member.state}
                            </TableCell>
                            <TableCell data-testid={`badge-status-${member.member_id}`}>
                              {getStatusBadge(member.mstatus)}
                            </TableCell>
                            <TableCell data-testid={`badge-membership-${member.member_id}`}>
                              {getMembershipBadge(member.membership_paid)}
                            </TableCell>
                            <TableCell data-testid={`text-registered-${member.member_id}`}>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(member.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleEditMember(member)}
                                      data-testid={`button-edit-${member.member_id}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Edit Member Profile</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="mname">Name</Label>
                                        <Input
                                          id="mname"
                                          value={editFormData.mname || ''}
                                          onChange={(e) => setEditFormData({ ...editFormData, mname: e.target.value })}
                                          data-testid="input-edit-name"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                          id="email"
                                          type="email"
                                          value={editFormData.email || ''}
                                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                          data-testid="input-edit-email"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                          id="phone"
                                          value={editFormData.phone || ''}
                                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                          data-testid="input-edit-phone"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="company_name">Company Name</Label>
                                        <Input
                                          id="company_name"
                                          value={editFormData.company_name || ''}
                                          onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                                          data-testid="input-edit-company"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                          id="city"
                                          value={editFormData.city || ''}
                                          onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                          data-testid="input-edit-city"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                          id="state"
                                          value={editFormData.state || ''}
                                          onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                                          data-testid="input-edit-state"
                                        />
                                      </div>
                                      <div className="flex justify-end space-x-2">
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setEditingMember(null);
                                            setEditFormData({});
                                          }}
                                          data-testid="button-cancel-edit"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          onClick={handleUpdateMember}
                                          disabled={updateMemberMutation.isPending}
                                          data-testid="button-save-edit"
                                        >
                                          {updateMemberMutation.isPending ? "Saving..." : "Save"}
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                {member.mstatus === 0 && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      onClick={() => approveMutation.mutate(member.member_id)}
                                      disabled={approveMutation.isPending}
                                      data-testid={`button-approve-${member.member_id}`}
                                    >
                                      {approveMutation.isPending ? (
                                        <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                      ) : (
                                        <CheckCircle className="w-3 h-3" />
                                      )}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => rejectMutation.mutate(member.member_id)}
                                      disabled={rejectMutation.isPending}
                                      data-testid={`button-reject-${member.member_id}`}
                                    >
                                      {rejectMutation.isPending ? (
                                        <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                      ) : (
                                        <XCircle className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </>
                                )}
                                {member.mstatus === -1 && (
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => approveMutation.mutate(member.member_id)}
                                    disabled={approveMutation.isPending}
                                    data-testid={`button-approve-${member.member_id}`}
                                  >
                                    {approveMutation.isPending ? (
                                      <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                      <>
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                )}
                                {member.mstatus === 1 && (
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => rejectMutation.mutate(member.member_id)}
                                    disabled={rejectMutation.isPending}
                                    data-testid={`button-reject-${member.member_id}`}
                                  >
                                    {rejectMutation.isPending ? (
                                      <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                      <>
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Reject
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Users Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Pending Users</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pending users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                      data-testid="input-search-pending"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isMembersLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredMembers.filter(m => m.mstatus === 0).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No pending users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.filter(m => m.mstatus === 0).map((member) => (
                          <TableRow key={member.member_id} data-testid={`row-pending-${member.member_id}`}>
                            <TableCell className="font-medium text-foreground">
                              {member.mname}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {member.email}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {member.phone}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {member.company_name}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {member.city}, {member.state}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(member.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => approveMutation.mutate(member.member_id)}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${member.member_id}`}
                                >
                                  {approveMutation.isPending ? (
                                    <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => rejectMutation.mutate(member.member_id)}
                                  disabled={rejectMutation.isPending}
                                  data-testid={`button-reject-${member.member_id}`}
                                >
                                  {rejectMutation.isPending ? (
                                    <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Reject
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approved Users Tab */}
          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Approved Users</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search approved users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                      data-testid="input-search-approved"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Membership</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isMembersLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredMembers.filter(m => m.mstatus === 1).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No approved users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.filter(m => m.mstatus === 1).map((member) => (
                          <TableRow key={member.member_id} data-testid={`row-approved-${member.member_id}`}>
                            <TableCell className="font-medium text-foreground">
                              {member.mname}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {member.email}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {member.phone}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {member.company_name}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {member.city}, {member.state}
                            </TableCell>
                            <TableCell>
                              {getMembershipBadge(member.membership_paid)}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleEditMember(member)}
                                    data-testid={`button-edit-${member.member_id}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Edit Member Profile</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="mname">Name</Label>
                                      <Input
                                        id="mname"
                                        value={editFormData.mname || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, mname: e.target.value })}
                                        data-testid="input-edit-name"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="email">Email</Label>
                                      <Input
                                        id="email"
                                        type="email"
                                        value={editFormData.email || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                        data-testid="input-edit-email"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="phone">Phone</Label>
                                      <Input
                                        id="phone"
                                        value={editFormData.phone || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                        data-testid="input-edit-phone"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="company_name">Company Name</Label>
                                      <Input
                                        id="company_name"
                                        value={editFormData.company_name || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                                        data-testid="input-edit-company"
                                      />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setEditingMember(null);
                                          setEditFormData({});
                                        }}
                                        data-testid="button-cancel-edit"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={handleUpdateMember}
                                        disabled={updateMemberMutation.isPending}
                                        data-testid="button-save-edit"
                                      >
                                        {updateMemberMutation.isPending ? "Saving..." : "Save"}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment History Tab */}
          <TabsContent value="payments">
            <div className="space-y-6">
              {/* Payment Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                        <p className="text-xl font-bold" data-testid="payment-stat-active">
                          {paymentStats?.activeMembers || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-muted-foreground">Expired</p>
                        <p className="text-xl font-bold" data-testid="payment-stat-expired">
                          {paymentStats?.expiredMembers || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Clock className="h-6 w-6 text-orange-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                        <p className="text-xl font-bold" data-testid="payment-stat-expiring">
                          {paymentStats?.expiringThisMonth || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <IndianRupee className="h-6 w-6 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold" data-testid="payment-stat-revenue">
                          ₹{paymentStats?.totalCollected?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Payment Date</TableHead>
                          <TableHead>Valid Till</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Days Remaining</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment) => (
                          <TableRow key={payment.member_id} data-testid={`payment-row-${payment.member_id}`}>
                            <TableCell className="font-medium">
                              {payment.mname}
                            </TableCell>
                            <TableCell>
                              {payment.company_name}
                            </TableCell>
                            <TableCell>
                              {payment.email}
                            </TableCell>
                            <TableCell>
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(payment.membership_valid_till).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {getExpiryBadge(payment.days_remaining)}
                            </TableCell>
                            <TableCell>
                              {payment.days_remaining < 0 
                                ? `${Math.abs(payment.days_remaining)} days overdue`
                                : `${payment.days_remaining} days left`
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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