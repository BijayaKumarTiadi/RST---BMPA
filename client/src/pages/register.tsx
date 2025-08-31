import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, User, Building, MapPin, Lock, Shield, Printer, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface RegistrationData {
  mname: string;
  phone: string;
  company_name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  password: string;
}

export default function Register() {
  const [step, setStep] = useState<'email' | 'otp' | 'form' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState<RegistrationData>({
    mname: '',
    phone: '',
    company_name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/send-registration-otp", { email });
      const data = await response.json();

      if (data.success) {
        setStep('otp');
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: "Please check your email for the verification code",
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setStep('form');
    toast({
      title: "Email Verified",
      description: "Please complete your registration details",
    });
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.mname.trim() || !formData.phone.trim() || !formData.company_name.trim() || 
        !formData.address1.trim() || !formData.city.trim() || !formData.state.trim() || 
        !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/complete-registration", {
        email,
        otp,
        registrationData: formData
      });
      const data = await response.json();

      if (data.success) {
        setStep('success');
        toast({
          title: "Registration Successful",
          description: "Welcome to BMPA Stock Exchange!",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Registration failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/send-registration-otp", { email });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your email",
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Join BMPA Stock Exchange
          </h1>
          <p className="text-xl text-muted-foreground">
            Professional membership with comprehensive verification
          </p>
        </div>

        {step === 'form' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Registration Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Member Registration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        {...form.register('firstName')}
                        placeholder="John"
                        data-testid="input-first-name"
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        {...form.register('lastName')}
                        placeholder="Doe"
                        data-testid="input-last-name"
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      placeholder="john@company.com"
                      data-testid="input-email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <div className="flex">
                      <Select defaultValue="+91">
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+91">+91</SelectItem>
                          <SelectItem value="+1">+1</SelectItem>
                          <SelectItem value="+44">+44</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        {...form.register('mobileNumber')}
                        placeholder="9876543210"
                        className="flex-1 ml-2"
                        data-testid="input-mobile"
                      />
                    </div>
                    {form.formState.errors.mobileNumber && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.mobileNumber.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      {...form.register('companyName')}
                      placeholder="ABC Printing Co."
                      data-testid="input-company"
                    />
                    {form.formState.errors.companyName && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      {...form.register('designation')}
                      placeholder="Managing Director"
                      data-testid="input-designation"
                    />
                    {form.formState.errors.designation && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.designation.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="businessCategory">Business Category</Label>
                    <Select onValueChange={(value) => form.setValue('businessCategory', value)}>
                      <SelectTrigger data-testid="select-business-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial-printing">Commercial Printing</SelectItem>
                        <SelectItem value="packaging">Packaging</SelectItem>
                        <SelectItem value="digital-printing">Digital Printing</SelectItem>
                        <SelectItem value="publishing">Publishing</SelectItem>
                        <SelectItem value="supplies-equipment">Supplies & Equipment</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.businessCategory && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.businessCategory.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      {...form.register('gstNumber')}
                      placeholder="22AAAAA0000A1Z5"
                      data-testid="input-gst"
                    />
                    {form.formState.errors.gstNumber && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.gstNumber.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select onValueChange={(value: any) => form.setValue('role', value)}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                        <SelectItem value="both">Both Buyer & Seller</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.role && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.role.message}
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Phone className="mr-2 h-4 w-4" />
                        Send OTP for Verification
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Membership Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                    <FileText className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Professional Network</h4>
                    <p className="text-sm text-muted-foreground">Connect with 2,500+ verified printing professionals</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-chart-2 rounded-full flex items-center justify-center mt-1">
                    <Mail className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Secure Trading</h4>
                    <p className="text-sm text-muted-foreground">Verified transactions with built-in dispute resolution</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-chart-1 rounded-full flex items-center justify-center mt-1">
                    <Building className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">BMPA Integration</h4>
                    <p className="text-sm text-muted-foreground">Access to BMPA events, resources, and industry insights</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Annual Membership Fee</h4>
                  <div className="bg-secondary rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">BMPA Membership (Annual)</span>
                      <span className="font-bold text-primary">₹15,000</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">GST (18%)</span>
                      <span className="text-muted-foreground">₹2,700</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Amount</span>
                      <span className="text-xl font-bold text-primary">₹17,700</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'otp' && formData && (
          <OtpVerification
            email={formData.email}
            mobileNumber={formData.mobileNumber}
            onVerified={handleOtpVerified}
          />
        )}

        {step === 'payment' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Complete Your Membership</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Your verification is complete. Please proceed to payment to activate your BMPA membership.
              </p>
              <Button asChild size="lg" data-testid="button-proceed-payment">
                <Link href="/subscribe">
                  Proceed to Payment
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
