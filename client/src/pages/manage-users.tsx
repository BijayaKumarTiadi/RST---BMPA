import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Users, Plus, Trash2, Mail, User, Building2, Shield, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ChildUser {
  member_id: number;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  last_login?: string;
  product_count?: number;
}

interface CompanyStats {
  total_inquiries: number;
  child_user_count: number;
  total_products: number;
  active_products: number;
}

export default function ManageUsers() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");

  // Fetch child users
  const { data: childUsersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/child-users'],
    queryFn: async () => {
      const response = await fetch('/api/child-users', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch child users');
      return response.json();
    },
    enabled: isAuthenticated && user?.user_type === 'parent',
  });

  const childUsers = childUsersResponse?.childUsers || [];

  // Fetch company stats
  const { data: companyStatsResponse } = useQuery({
    queryKey: ['/api/company/stats'],
    queryFn: async () => {
      const response = await fetch('/api/company/stats', {
        credentials: 'include',
        cache: 'no-store', // Disable caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch company stats');
      return response.json();
    },
    enabled: isAuthenticated && user?.user_type === 'parent',
    refetchOnMount: 'always', // Always refetch when component mounts
    staleTime: 0, // Consider data stale immediately
  });

  const companyStats = companyStatsResponse?.stats;

  // Create child user mutation
  const createChildUserMutation = useMutation({
    mutationFn: async (userData: { name: string; email: string; phone: string }) => {
      return apiRequest('POST', '/api/child-users', userData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Associate user created successfully! They will receive a welcome email and can log in using OTP.",
      });
      setIsAddDialogOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPhone("");
      queryClient.invalidateQueries({ queryKey: ['/api/child-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create child user",
        variant: "destructive",
      });
    },
  });

  // Delete child user mutation
  const deleteChildUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('DELETE', `/api/child-users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Associate user deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/child-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete child user",
        variant: "destructive",
      });
    },
  });

  const handleCreateChildUser = () => {
    if (!newUserName.trim()) {
      toast({
        title: "Error",
        description: "User name is required",
        variant: "destructive",
      });
      return;
    }
    if (!newUserEmail.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    if (!newUserPhone.trim()) {
      toast({
        title: "Error",
        description: "Phone number is required for OTP authentication",
        variant: "destructive",
      });
      return;
    }

    createChildUserMutation.mutate({
      name: newUserName,
      email: newUserEmail,
      phone: newUserPhone,
    });
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    if (confirm(`Are you sure you want to delete Associate user "${userName}"? This action cannot be undone.`)) {
      deleteChildUserMutation.mutate(userId);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>Please log in to manage users.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Check if user is a child account
  const isChildUser = user?.user_type === 'child';
  
  // SIMPLIFIED: Anyone with paid membership is a parent account (unless explicitly marked as child)
  const isPaidMember = user?.membershipPaid === 1 || user?.status === 1;
  const isParent = (user?.user_type === 'parent' || isPaidMember) && !isChildUser;
  
  if (isChildUser || !isParent) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              {isChildUser
                ? "Associate users cannot manage other users. Only the parent account holder can add or remove Associate users."
                : "Only parent accounts with paid membership can manage Associate users."
              }
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const canAddMoreUsers = !childUsers || childUsers.length < 2;

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
              <p className="text-muted-foreground">
                Manage Associate users for your company account
              </p>
            </div>
            {isParent && !isChildUser && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!canAddMoreUsers}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Associate User
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Associate User</DialogTitle>
                  <DialogDescription>
                    Create a new Associate user account. They will share your company's membership and log in using OTP.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">
                      User Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="user-name"
                      placeholder="Enter user's name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="Enter email address"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-phone">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="user-phone"
                      type="tel"
                      placeholder="Enter phone number (for OTP)"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                    />
                  </div>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Associate users will inherit your company's membership and log in using OTP sent to their phone/email. All inquiries will be routed to your email.
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateChildUser}
                    disabled={createChildUserMutation.isPending}
                  >
                    {createChildUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Company Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Associate Users</CardTitle>
              <Users className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{companyStats?.child_user_count || 0} / 2</div>
              <p className="text-xs text-blue-100 mt-1">Maximum allowed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Total Products</CardTitle>
              <Building2 className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{companyStats?.total_products || 0}</div>
              <p className="text-xs text-green-100 mt-1">All listings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Active Products</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{companyStats?.active_products || 0}</div>
              <p className="text-xs text-purple-100 mt-1">Currently listed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Total Inquiries</CardTitle>
              <Mail className="h-5 w-5 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{companyStats?.total_inquiries || 0}</div>
              <p className="text-xs text-orange-100 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card className="border-2 border-border shadow-lg">
          <CardHeader className="bg-muted border-b-2 border-border">
            <CardTitle className="text-foreground">Associate Users</CardTitle>
            <CardDescription>
              Manage Associate user accounts for your company. Maximum 2 Associate users allowed.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : !childUsers || childUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Associate users yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add up to 2 Associate users to help manage your company's products
                </p>
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add First Associate User
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b-4 border-primary/20">
                        <TableHead className="font-semibold text-foreground">User Name</TableHead>
                        <TableHead className="font-semibold text-foreground">Contact</TableHead>
                        <TableHead className="font-semibold text-foreground">Products</TableHead>
                        <TableHead className="font-semibold text-foreground">Membership</TableHead>
                        <TableHead className="font-semibold text-foreground">Created</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childUsers.map((childUser: ChildUser) => (
                        <TableRow 
                          key={childUser.member_id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="font-medium text-foreground">
                                {childUser.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {childUser.email}
                              </div>
                              {childUser.phone && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  📱 {childUser.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="text-2xl font-bold text-blue-600">
                                {childUser.product_count || 0}
                              </div>
                              <span className="text-xs text-muted-foreground">listings</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              <Shield className="h-3 w-3 mr-1" />
                              Inherited
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-foreground">
                              {new Date(childUser.created_at).toLocaleDateString('en-IN')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteUser(childUser.member_id, childUser.name)}
                              disabled={deleteChildUserMutation.isPending}
                              className="h-8 w-8 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                  {childUsers.map((childUser: ChildUser) => (
                    <Card key={childUser.member_id} className="border border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {childUser.name}
                              </h3>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {childUser.email}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(childUser.member_id, childUser.name)}
                            disabled={deleteChildUserMutation.isPending}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t">
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <Shield className="h-3 w-3 mr-1" />
                            Inherited
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            Created {new Date(childUser.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Shared Membership</AlertTitle>
            <AlertDescription>
              Associate users automatically inherit your company's membership status and benefits.
            </AlertDescription>
          </Alert>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertTitle>Inquiry Routing</AlertTitle>
            <AlertDescription>
              All product inquiries are sent to your email ({user?.email}), regardless of which user added the product.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}