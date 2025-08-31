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
  Calendar
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
  city: string;
  state: string;
  membership_paid: number;
  membership_valid_till: string;
  mstatus: number;
  created_at: string;
  approval_datetime: string;
}

interface DashboardStats {
  totalMembers: number;
  pendingMembers: number;
  approvedMembers: number;
  rejectedMembers: number;
  paidMembers: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
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

  // Get all members
  const { data: members = [], isLoading: isMembersLoading } = useQuery<Member[]>({
    queryKey: ["/api/admin/members"],
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

  // Approve member mutation
  const approveMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return await apiRequest("POST", `/api/admin/members/${memberId}/approve`, {});
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Member approved",
          description: "Member has been successfully approved.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve member",
        variant: "destructive",
      });
    }
  });

  // Reject member mutation
  const rejectMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return await apiRequest("POST", `/api/admin/members/${memberId}/reject`, {});
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Member rejected",
          description: "Member has been rejected.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject member",
        variant: "destructive",
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/admin-logout", {});
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      setLocation("/admin");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    }
  });

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Stock Laabh Admin Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {adminUser.admin.name}</p>
              </div>
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card data-testid="card-total-members">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-pending-members">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.pendingMembers || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-approved-members">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.approvedMembers || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-rejected-members">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.rejectedMembers || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-paid-members">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Members</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.paidMembers || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Members Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Member Management
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                  data-testid="input-search-members"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Members ({filteredMembers.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({filteredMembers.filter(m => m.mstatus === 0).length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({filteredMembers.filter(m => m.mstatus === 1).length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({filteredMembers.filter(m => m.mstatus === -1).length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <MembersTable 
                  members={filteredMembers}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                  isLoading={isMembersLoading}
                  approvingId={approveMutation.variables}
                  rejectingId={rejectMutation.variables}
                />
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                <MembersTable 
                  members={filteredMembers.filter(m => m.mstatus === 0)}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                  isLoading={isMembersLoading}
                  approvingId={approveMutation.variables}
                  rejectingId={rejectMutation.variables}
                />
              </TabsContent>

              <TabsContent value="approved" className="mt-6">
                <MembersTable 
                  members={filteredMembers.filter(m => m.mstatus === 1)}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                  isLoading={isMembersLoading}
                  approvingId={approveMutation.variables}
                  rejectingId={rejectMutation.variables}
                />
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                <MembersTable 
                  members={filteredMembers.filter(m => m.mstatus === -1)}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                  isLoading={isMembersLoading}
                  approvingId={approveMutation.variables}
                  rejectingId={rejectMutation.variables}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          Powered by Renuka Print ERP Solutions
        </div>
      </div>
    </div>
  );
}

interface MembersTableProps {
  members: Member[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isLoading: boolean;
  approvingId?: number;
  rejectingId?: number;
}

function MembersTable({ members, onApprove, onReject, isLoading, approvingId, rejectingId }: MembersTableProps) {
  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 0:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case -1:
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const getMembershipBadge = (paid: number) => {
    return paid === 1 ? 
      <Badge variant="default" className="bg-blue-500"><CreditCard className="w-3 h-3 mr-1" />Paid</Badge> :
      <Badge variant="outline"><CreditCard className="w-3 h-3 mr-1" />Unpaid</Badge>;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground mt-4">Loading members...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No members found.
      </div>
    );
  }

  return (
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
          {members.map((member) => (
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
                  {member.mstatus === 0 && (
                    <>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => onApprove(member.member_id)}
                        disabled={approvingId === member.member_id}
                        data-testid={`button-approve-${member.member_id}`}
                      >
                        {approvingId === member.member_id ? (
                          <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => onReject(member.member_id)}
                        disabled={rejectingId === member.member_id}
                        data-testid={`button-reject-${member.member_id}`}
                      >
                        {rejectingId === member.member_id ? (
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
                      onClick={() => onApprove(member.member_id)}
                      disabled={approvingId === member.member_id}
                      data-testid={`button-approve-${member.member_id}`}
                    >
                      {approvingId === member.member_id ? (
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
                      onClick={() => onReject(member.member_id)}
                      disabled={rejectingId === member.member_id}
                      data-testid={`button-reject-${member.member_id}`}
                    >
                      {rejectingId === member.member_id ? (
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}