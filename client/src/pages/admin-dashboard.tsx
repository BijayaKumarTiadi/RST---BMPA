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
  AlertTriangle,
  FileText,
  Package,
  MessageSquare,
  Filter
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface SummaryReport {
  totalPostings: number;
  totalKgs: number;
  totalValue: number;
  totalSold: number;
  totalExpired: number;
  totalActive: number;
  activeMembers: number;
  totalResponses: number;
}

interface MaterialHierarchyEntry {
  id: number;
  grade_of_material: string;
  material_kind: string;
  manufacturer: string;
  brand_name: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Member>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Summary Report filters
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [reportCategory, setReportCategory] = useState("all");

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
  
  // Get summary report
  const { data: summaryReport, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery<SummaryReport>({
    queryKey: ["/api/admin/summary-report", reportFromDate, reportToDate, reportCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportFromDate) params.append('fromDate', reportFromDate);
      if (reportToDate) params.append('toDate', reportToDate);
      if (reportCategory) params.append('category', reportCategory);
      const response = await fetch(`/api/admin/summary-report?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch summary');
      return response.json();
    },
    enabled: !!adminUser,
  });

  // Material Hierarchy state
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [editingMaterial, setEditingMaterial] = useState<MaterialHierarchyEntry | null>(null);
  const [isAddMaterialDialogOpen, setIsAddMaterialDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    grade_of_material: "",
    material_kind: "",
    manufacturer: "",
    brand_name: ""
  });
  // Multi-brand state for batch creation
  const [newBatchMaterial, setNewBatchMaterial] = useState({
    grade_of_material: "",
    material_kind: "",
    manufacturer: "",
    brand_names: [""] // Array of brand names
  });

  // Get all material hierarchy entries
  const { data: materialHierarchyData, isLoading: isMaterialsLoading } = useQuery<{ success: boolean; data: MaterialHierarchyEntry[] }>({
    queryKey: ["/api/admin/material-hierarchy"],
    enabled: !!adminUser,
  });

  const materialHierarchyEntries = materialHierarchyData?.data || [];

  // Filter material hierarchy entries
  const filteredMaterials = materialHierarchyEntries.filter(entry =>
    entry.grade_of_material.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
    entry.material_kind.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
    entry.manufacturer.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
    entry.brand_name.toLowerCase().includes(materialSearchTerm.toLowerCase())
  );

  // Create material hierarchy entry mutation
  const createMaterialMutation = useMutation({
    mutationFn: async (data: typeof newMaterial) => {
      const response = await apiRequest("POST", "/api/admin/material-hierarchy", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Success", description: "Material hierarchy entry created successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/material-hierarchy"] });
        setIsAddMaterialDialogOpen(false);
        setNewMaterial({ grade_of_material: "", material_kind: "", manufacturer: "", brand_name: "" });
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create material hierarchy entry", variant: "destructive" });
    }
  });

  // Track if we should keep dialog open after save
  const [keepDialogOpen, setKeepDialogOpen] = useState(false);

  // Batch create material hierarchy entries mutation (multiple brands)
  const batchCreateMaterialMutation = useMutation({
    mutationFn: async (data: typeof newBatchMaterial) => {
      const response = await apiRequest("POST", "/api/admin/material-hierarchy/batch", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success || data.created > 0) {
        toast({ 
          title: "Success", 
          description: `Created ${data.created} entries${data.skipped > 0 ? `, ${data.skipped} already existed` : ''}` 
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/material-hierarchy"] });
        
        if (keepDialogOpen) {
          // Keep dialog open and preserve parent fields, only reset brand names
          setNewBatchMaterial(prev => ({ 
            ...prev, 
            brand_names: [""] 
          }));
          setKeepDialogOpen(false);
        } else {
          // Close dialog and reset everything
          setIsAddMaterialDialogOpen(false);
          setNewBatchMaterial({ grade_of_material: "", material_kind: "", manufacturer: "", brand_names: [""] });
        }
      } else {
        toast({ title: "Info", description: data.message || "No new entries created", variant: "default" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create material hierarchy entries", variant: "destructive" });
    }
  });

  // Update material hierarchy entry mutation
  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof newMaterial }) => {
      const response = await apiRequest("PUT", `/api/admin/material-hierarchy/${id}`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Success", description: "Material hierarchy entry updated successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/material-hierarchy"] });
        setEditingMaterial(null);
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update material hierarchy entry", variant: "destructive" });
    }
  });

  // Delete material hierarchy entry mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/material-hierarchy/${id}`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Success", description: "Material hierarchy entry deleted successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/material-hierarchy"] });
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete material hierarchy entry", variant: "destructive" });
    }
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
      
      <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="dashboard-title">
              Admin Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="members" data-testid="tab-members">All Members</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
            <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
            <TabsTrigger value="materials" data-testid="tab-materials">Materials</TabsTrigger>
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
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="min-w-[180px]">Email</TableHead>
                        <TableHead className="min-w-[110px] hidden sm:table-cell">Phone</TableHead>
                        <TableHead className="min-w-[150px]">Company</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">Location</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">Membership</TableHead>
                        <TableHead className="min-w-[100px] hidden xl:table-cell">Registered</TableHead>
                        <TableHead className="min-w-[120px] sticky right-0 bg-background z-10 shadow-sm">Actions</TableHead>
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
                            <TableCell className="font-medium min-w-[120px]" data-testid={`text-name-${member.member_id}`}>
                              <div className="truncate">{member.mname}</div>
                            </TableCell>
                            <TableCell className="min-w-[180px]" data-testid={`text-email-${member.member_id}`}>
                              <div className="truncate">{member.email}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell min-w-[110px]" data-testid={`text-phone-${member.member_id}`}>
                              {member.phone}
                            </TableCell>
                            <TableCell className="min-w-[150px]" data-testid={`text-company-${member.member_id}`}>
                              <div className="truncate">{member.company_name}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell min-w-[120px]" data-testid={`text-location-${member.member_id}`}>
                              {member.city}, {member.state}
                            </TableCell>
                            <TableCell className="min-w-[100px]" data-testid={`badge-status-${member.member_id}`}>
                              {getStatusBadge(member.mstatus)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell min-w-[100px]" data-testid={`badge-membership-${member.member_id}`}>
                              {getMembershipBadge(member.membership_paid)}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell min-w-[100px]" data-testid={`text-registered-${member.member_id}`}>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(member.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="sticky right-0 bg-background min-w-[120px] z-10 shadow-sm">
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
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="min-w-[180px]">Email</TableHead>
                        <TableHead className="min-w-[110px] hidden sm:table-cell">Phone</TableHead>
                        <TableHead className="min-w-[150px]">Company</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">Location</TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">Registered</TableHead>
                        <TableHead className="min-w-[140px] sticky right-0 bg-background z-10 shadow-sm">Actions</TableHead>
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
                            <TableCell className="font-medium text-foreground min-w-[120px]">
                              <div className="truncate">{member.mname}</div>
                            </TableCell>
                            <TableCell className="text-foreground min-w-[180px]">
                              <div className="truncate">{member.email}</div>
                            </TableCell>
                            <TableCell className="text-foreground hidden sm:table-cell min-w-[110px]">
                              {member.phone}
                            </TableCell>
                            <TableCell className="text-foreground min-w-[150px]">
                              <div className="truncate">{member.company_name}</div>
                            </TableCell>
                            <TableCell className="text-foreground hidden md:table-cell min-w-[120px]">
                              {member.city}, {member.state}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell min-w-[100px]">
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(member.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="sticky right-0 bg-background min-w-[140px] z-10 shadow-sm">
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
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="min-w-[180px]">Email</TableHead>
                        <TableHead className="min-w-[110px] hidden sm:table-cell">Phone</TableHead>
                        <TableHead className="min-w-[150px]">Company</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">Location</TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">Membership</TableHead>
                        <TableHead className="min-w-[100px] hidden xl:table-cell">Last Login</TableHead>
                        <TableHead className="min-w-[120px] sticky right-0 bg-background z-10 shadow-sm">Actions</TableHead>
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
                            <TableCell className="font-medium text-foreground min-w-[120px]">
                              <div className="truncate">{member.mname}</div>
                            </TableCell>
                            <TableCell className="text-foreground min-w-[180px]">
                              <div className="truncate">{member.email}</div>
                            </TableCell>
                            <TableCell className="text-foreground hidden sm:table-cell min-w-[110px]">
                              {member.phone}
                            </TableCell>
                            <TableCell className="text-foreground min-w-[150px]">
                              <div className="truncate">{member.company_name}</div>
                            </TableCell>
                            <TableCell className="text-foreground hidden md:table-cell min-w-[120px]">
                              {member.city}, {member.state}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell min-w-[100px]">
                              {getMembershipBadge(member.membership_paid)}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell min-w-[100px]">
                              <div className="text-sm text-muted-foreground">
                                {member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}
                              </div>
                            </TableCell>
                            <TableCell className="sticky right-0 bg-background min-w-[120px] z-10 shadow-sm">
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
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Member</TableHead>
                          <TableHead className="min-w-[150px] hidden md:table-cell">Company</TableHead>
                          <TableHead className="min-w-[180px]">Email</TableHead>
                          <TableHead className="min-w-[110px] hidden lg:table-cell">Payment Date</TableHead>
                          <TableHead className="min-w-[100px] hidden xl:table-cell">Valid Till</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="min-w-[120px] hidden sm:table-cell">Days Remaining</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment) => (
                          <TableRow key={payment.member_id} data-testid={`payment-row-${payment.member_id}`}>
                            <TableCell className="font-medium min-w-[120px]">
                              <div className="truncate">{payment.mname}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell min-w-[150px]">
                              <div className="truncate">{payment.company_name}</div>
                            </TableCell>
                            <TableCell className="min-w-[180px]">
                              <div className="truncate">{payment.email}</div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell min-w-[110px]">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell min-w-[100px]">
                              {new Date(payment.membership_valid_till).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="min-w-[100px]">
                              {getExpiryBadge(payment.days_remaining)}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell min-w-[120px]">
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

          {/* Summary Report Tab */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Summary Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/50 rounded-lg">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="fromDate">From Date</Label>
                    <Input
                      id="fromDate"
                      type="date"
                      value={reportFromDate}
                      onChange={(e) => setReportFromDate(e.target.value)}
                      className="w-40"
                      data-testid="input-report-from-date"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="toDate">To Date</Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={reportToDate}
                      onChange={(e) => setReportToDate(e.target.value)}
                      className="w-40"
                      data-testid="input-report-to-date"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={reportCategory} onValueChange={setReportCategory}>
                      <SelectTrigger className="w-40" data-testid="select-report-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="paper">Paper</SelectItem>
                        <SelectItem value="board">Board</SelectItem>
                        <SelectItem value="kraft">Kraft</SelectItem>
                        <SelectItem value="spare_part">Spare Parts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => refetchSummary()} 
                    variant="default"
                    data-testid="button-generate-report"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>

                {/* Summary Stats */}
                {isSummaryLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">No. of Postings</p>
                            <p className="text-2xl font-bold" data-testid="stat-total-postings">
                              {summaryReport?.totalPostings?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Package className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Kgs</p>
                            <p className="text-2xl font-bold" data-testid="stat-total-kgs">
                              {summaryReport?.totalKgs?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <IndianRupee className="h-8 w-8 text-yellow-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Value</p>
                            <p className="text-2xl font-bold" data-testid="stat-total-value">
                              ₹{summaryReport?.totalValue?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-8 w-8 text-emerald-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Closed as Sold</p>
                            <p className="text-2xl font-bold" data-testid="stat-total-sold">
                              {summaryReport?.totalSold?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8 text-orange-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Closed on Expiry</p>
                            <p className="text-2xl font-bold" data-testid="stat-total-expired">
                              {summaryReport?.totalExpired?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-8 w-8 text-purple-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Active Postings</p>
                            <p className="text-2xl font-bold" data-testid="stat-total-active">
                              {summaryReport?.totalActive?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Users className="h-8 w-8 text-indigo-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Active Members</p>
                            <p className="text-2xl font-bold" data-testid="stat-active-members">
                              {summaryReport?.activeMembers?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-8 w-8 text-cyan-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Responses</p>
                            <p className="text-2xl font-bold" data-testid="stat-total-responses">
                              {summaryReport?.totalResponses?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <CardTitle>Paper Material Hierarchy</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search materials..."
                        value={materialSearchTerm}
                        onChange={(e) => setMaterialSearchTerm(e.target.value)}
                        className="w-64"
                        data-testid="input-material-search"
                      />
                    </div>
                    <Dialog open={isAddMaterialDialogOpen} onOpenChange={(open) => {
                      setIsAddMaterialDialogOpen(open);
                      if (!open) {
                        setNewBatchMaterial({ grade_of_material: "", material_kind: "", manufacturer: "", brand_names: [""] });
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-material">
                          Add New Entries
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Material Hierarchy Entries</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label htmlFor="new-grade">Grade of Material</Label>
                            <Input
                              id="new-grade"
                              value={newBatchMaterial.grade_of_material}
                              onChange={(e) => setNewBatchMaterial({ ...newBatchMaterial, grade_of_material: e.target.value.toUpperCase() })}
                              placeholder="e.g., VIRGIN, RECYCLED"
                              data-testid="input-new-grade"
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-kind">Material Kind</Label>
                            <Input
                              id="new-kind"
                              value={newBatchMaterial.material_kind}
                              onChange={(e) => setNewBatchMaterial({ ...newBatchMaterial, material_kind: e.target.value.toUpperCase() })}
                              placeholder="e.g., FBB, SBS, DUPLEX"
                              data-testid="input-new-kind"
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-manufacturer">Manufacturer</Label>
                            <Input
                              id="new-manufacturer"
                              value={newBatchMaterial.manufacturer}
                              onChange={(e) => setNewBatchMaterial({ ...newBatchMaterial, manufacturer: e.target.value.toUpperCase() })}
                              placeholder="e.g., ITC, EMAMI"
                              data-testid="input-new-manufacturer"
                            />
                          </div>
                          <div>
                            <Label>Brand Names (add multiple)</Label>
                            <div className="space-y-2 mt-2">
                              {newBatchMaterial.brand_names.map((brand, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    value={brand}
                                    onChange={(e) => {
                                      const updated = [...newBatchMaterial.brand_names];
                                      updated[index] = e.target.value.toUpperCase();
                                      setNewBatchMaterial({ ...newBatchMaterial, brand_names: updated });
                                    }}
                                    placeholder={`Brand ${index + 1}`}
                                    data-testid={`input-new-brand-${index}`}
                                  />
                                  {newBatchMaterial.brand_names.length > 1 && (
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="destructive"
                                      onClick={() => {
                                        const updated = newBatchMaterial.brand_names.filter((_, i) => i !== index);
                                        setNewBatchMaterial({ ...newBatchMaterial, brand_names: updated });
                                      }}
                                      data-testid={`button-remove-brand-${index}`}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setNewBatchMaterial({ 
                                    ...newBatchMaterial, 
                                    brand_names: [...newBatchMaterial.brand_names, ""] 
                                  });
                                }}
                                data-testid="button-add-brand-row"
                              >
                                + Add Another Brand
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                const validBrands = newBatchMaterial.brand_names
                                  .map(b => b.trim().toUpperCase())
                                  .filter(b => b !== "");
                                const uniqueBrands = [...new Set(validBrands)];
                                setKeepDialogOpen(false);
                                batchCreateMaterialMutation.mutate({
                                  ...newBatchMaterial,
                                  brand_names: uniqueBrands
                                });
                              }}
                              disabled={
                                batchCreateMaterialMutation.isPending || 
                                !newBatchMaterial.grade_of_material.trim() || 
                                !newBatchMaterial.material_kind.trim() || 
                                !newBatchMaterial.manufacturer.trim() || 
                                [...new Set(newBatchMaterial.brand_names.map(b => b.trim().toUpperCase()).filter(b => b !== ""))].length === 0
                              }
                              className="flex-1"
                              data-testid="button-save-new-material"
                            >
                              {batchCreateMaterialMutation.isPending && !keepDialogOpen
                                ? "Saving..." 
                                : `Save (${[...new Set(newBatchMaterial.brand_names.map(b => b.trim().toUpperCase()).filter(b => b !== ""))].length})`}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const validBrands = newBatchMaterial.brand_names
                                  .map(b => b.trim().toUpperCase())
                                  .filter(b => b !== "");
                                const uniqueBrands = [...new Set(validBrands)];
                                setKeepDialogOpen(true);
                                batchCreateMaterialMutation.mutate({
                                  ...newBatchMaterial,
                                  brand_names: uniqueBrands
                                });
                              }}
                              disabled={
                                batchCreateMaterialMutation.isPending || 
                                !newBatchMaterial.grade_of_material.trim() || 
                                !newBatchMaterial.material_kind.trim() || 
                                !newBatchMaterial.manufacturer.trim() || 
                                [...new Set(newBatchMaterial.brand_names.map(b => b.trim().toUpperCase()).filter(b => b !== ""))].length === 0
                              }
                              className="flex-1"
                              data-testid="button-save-add-another"
                            >
                              {batchCreateMaterialMutation.isPending && keepDialogOpen
                                ? "Saving..." 
                                : "Save & Add More"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[50px]">ID</TableHead>
                        <TableHead className="min-w-[120px]">Grade of Material</TableHead>
                        <TableHead className="min-w-[120px]">Material Kind</TableHead>
                        <TableHead className="min-w-[120px]">Manufacturer</TableHead>
                        <TableHead className="min-w-[120px]">Brand Name</TableHead>
                        <TableHead className="min-w-[120px] sticky right-0 bg-background z-10 shadow-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isMaterialsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredMaterials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No material hierarchy entries found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMaterials.map((entry) => (
                          <TableRow key={entry.id} data-testid={`row-material-${entry.id}`}>
                            <TableCell>{entry.id}</TableCell>
                            <TableCell>
                              {editingMaterial?.id === entry.id ? (
                                <Input
                                  value={editingMaterial.grade_of_material}
                                  onChange={(e) => setEditingMaterial({ ...editingMaterial, grade_of_material: e.target.value.toUpperCase() })}
                                  data-testid={`input-edit-grade-${entry.id}`}
                                />
                              ) : (
                                entry.grade_of_material
                              )}
                            </TableCell>
                            <TableCell>
                              {editingMaterial?.id === entry.id ? (
                                <Input
                                  value={editingMaterial.material_kind}
                                  onChange={(e) => setEditingMaterial({ ...editingMaterial, material_kind: e.target.value.toUpperCase() })}
                                  data-testid={`input-edit-kind-${entry.id}`}
                                />
                              ) : (
                                entry.material_kind
                              )}
                            </TableCell>
                            <TableCell>
                              {editingMaterial?.id === entry.id ? (
                                <Input
                                  value={editingMaterial.manufacturer}
                                  onChange={(e) => setEditingMaterial({ ...editingMaterial, manufacturer: e.target.value.toUpperCase() })}
                                  data-testid={`input-edit-manufacturer-${entry.id}`}
                                />
                              ) : (
                                entry.manufacturer
                              )}
                            </TableCell>
                            <TableCell>
                              {editingMaterial?.id === entry.id ? (
                                <Input
                                  value={editingMaterial.brand_name}
                                  onChange={(e) => setEditingMaterial({ ...editingMaterial, brand_name: e.target.value.toUpperCase() })}
                                  data-testid={`input-edit-brand-${entry.id}`}
                                />
                              ) : (
                                entry.brand_name
                              )}
                            </TableCell>
                            <TableCell className="sticky right-0 bg-background z-10 shadow-sm">
                              <div className="flex gap-1">
                                {editingMaterial?.id === entry.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => updateMaterialMutation.mutate({ id: entry.id, data: editingMaterial })}
                                      disabled={updateMaterialMutation.isPending}
                                      data-testid={`button-save-material-${entry.id}`}
                                    >
                                      {updateMaterialMutation.isPending ? "..." : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingMaterial(null)}
                                      data-testid={`button-cancel-material-${entry.id}`}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingMaterial(entry)}
                                      data-testid={`button-edit-material-${entry.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this entry?")) {
                                          deleteMaterialMutation.mutate(entry.id);
                                        }
                                      }}
                                      disabled={deleteMaterialMutation.isPending}
                                      data-testid={`button-delete-material-${entry.id}`}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Total entries: {filteredMaterials.length}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}