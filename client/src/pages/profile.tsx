import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Building2, Mail, Phone, MapPin, Calendar, Edit, Save, X, Shield, CheckCircle, FileText, Download, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import indianCitiesStates from "@/data/indian-cities-states.json";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  pan_number?: string;
  role: string;
  membership_type?: string;
  created_at: string;
  user_type?: 'parent' | 'child';
  membership_valid_till?: string;
  membership_paid?: number;
}

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Fetch user profile details
  const { data: profileData, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<UserProfile>) => {
      return apiRequest('PUT', '/api/profile', profileData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/current-member'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    // Use profileData if available, otherwise use user data from auth
    const dataToEdit = profileData || user;
    
    if (dataToEdit) {
      setEditedProfile({ ...dataToEdit });
      setIsEditing(true);
    } else {
      toast({
        title: "Error",
        description: "Unable to load profile data. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    // Validate required fields
    if (!editedProfile.name?.trim()) {
      toast({
        title: "Error",
        description: "Full Name is required",
        variant: "destructive"
      });
      return;
    }
    if (!editedProfile.phone?.trim()) {
      toast({
        title: "Error",
        description: "Phone Number is required",
        variant: "destructive"
      });
      return;
    }
    if (!editedProfile.email?.trim()) {
      toast({
        title: "Error",
        description: "Email ID is required",
        variant: "destructive"
      });
      return;
    }
    if (!editedProfile.company?.trim()) {
      toast({
        title: "Error",
        description: "Company Name is required",
        variant: "destructive"
      });
      return;
    }
    updateProfileMutation.mutate(editedProfile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profileData || {});
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };
  
  // Initialize editedProfile when profileData loads
  useEffect(() => {
    if (profileData && !isEditing) {
      setEditedProfile(profileData);
    }
  }, [profileData, isEditing]);

  if (!isAuthenticated) {
    return null;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const profile = profileData || user;
  
  const isChildUser = profile?.user_type === 'child' || user?.user_type === 'child';
  const membershipEndDate = profile?.membership_valid_till
    ? new Date(profile.membership_valid_till)
    : user?.membership_valid_till
    ? new Date(user.membership_valid_till)
    : null;
  
  const daysRemaining = membershipEndDate
    ? Math.ceil((membershipEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
              <p className="text-muted-foreground">
                Manage your account information and business details
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {profile?.role || 'Member'}
              </Badge>
              {profile?.membership_type && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {profile.membership_type}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={editedProfile.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {profile?.name || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {profile?.email || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={editedProfile.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                      required
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {profile?.phone || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Member Since</Label>
                  <div className="mt-1 p-2 bg-muted rounded-md flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Not available'
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company">Company Name <span className="text-red-500">*</span></Label>
                  {isEditing ? (
                    <Input
                      id="company"
                      value={editedProfile.company || ''}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Enter your company name"
                      required
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {profile?.company || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="gst_number">GST Number</Label>
                  {isEditing ? (
                    <Input
                      id="gst_number"
                      value={editedProfile.gst_number || ''}
                      onChange={(e) => handleInputChange('gst_number', e.target.value)}
                      placeholder="Enter GST number"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {profile?.gst_number || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="pan_number">PAN Number</Label>
                  {isEditing ? (
                    <Input
                      id="pan_number"
                      value={editedProfile.pan_number || ''}
                      onChange={(e) => handleInputChange('pan_number', e.target.value)}
                      placeholder="Enter PAN number"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md">
                      {profile?.pan_number || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="address">Business Address</Label>
                  {isEditing ? (
                    <Textarea
                      id="address"
                      value={editedProfile.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter your business address"
                      rows={3}
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        {profile?.address || 'Not provided'}
                        {profile?.city && (
                          <div className="text-sm text-muted-foreground">
                            {profile.city}
                            {profile.state && `, ${profile.state}`}
                            {profile.pincode && ` - ${profile.pincode}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={editedProfile.state || ''}
                        onValueChange={(value) => {
                          handleInputChange('state', value);
                          handleInputChange('city', '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(indianCitiesStates).map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Select
                        value={editedProfile.city || ''}
                        onValueChange={(value) => handleInputChange('city', value)}
                        disabled={!editedProfile.state}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                          {editedProfile.state &&
                            indianCitiesStates[editedProfile.state as keyof typeof indianCitiesStates]?.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pincode">PIN Code</Label>
                      <Input
                        id="pincode"
                        value={editedProfile.pincode || ''}
                        onChange={(e) => handleInputChange('pincode', e.target.value)}
                        placeholder="PIN Code"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Membership Information for Associate Users */}
        {isChildUser && (
          <Card className="border-0 shadow-xl overflow-hidden mt-6">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-6 w-6" />
                    <h2 className="text-2xl font-bold">Inherited Membership</h2>
                  </div>
                  <p className="text-purple-100 mb-4">Shared from parent company account</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">₹2,499</span>
                    <span className="text-purple-100">/year</span>
                  </div>
                </div>
                <Badge className="bg-green-500 text-white">
                  Active
                </Badge>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Valid Until</p>
                  <p className="font-semibold">
                    {membershipEndDate
                      ? membershipEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Not available'}
                  </p>
                </div>

                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
                  <p className="font-semibold text-green-600">
                    {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> As an Associate user, you inherit all membership benefits from the parent company account. This includes unlimited product listings, buyer-seller communication, and all premium features.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={handleEdit}
              className="flex items-center gap-2"
              data-testid="button-edit-profile"
              type="button"
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* SOP Section */}
        <Card className="border-0 shadow-lg mt-8">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-amber-600" />
              Standard Operating Procedure (SOP)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-muted-foreground mb-4">
              Access the STOCK LAABH Standard Operating Procedure document that outlines the rules, 
              guidelines, and best practices for using our platform.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View SOP
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Standard Operating Procedure - STOCK LAABH
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden">
                    <iframe 
                      src="/BMPA_SLaP_SOP_V1.pdf" 
                      className="w-full h-[70vh] border rounded-lg"
                      title="STOCK LAABH SOP"
                    />
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <a 
                      href="/BMPA_SLaP_SOP_V1.pdf" 
                      download="BMPA_SLaP_SOP.pdf"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  </div>
                </DialogContent>
              </Dialog>
              
              <a 
                href="/BMPA_SLaP_SOP_V1.pdf" 
                download="BMPA_SLaP_SOP.pdf"
                className="inline-flex"
              >
                <Button 
                  variant="default" 
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  <Download className="h-4 w-4" />
                  Download SOP
                </Button>
              </a>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Keep a copy of the SOP for your reference. 
                Following these guidelines ensures a smooth experience on STOCK LAABH.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}