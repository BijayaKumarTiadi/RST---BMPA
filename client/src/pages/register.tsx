import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Logo } from "@/components/ui/logo";
import { useLocation } from "wouter";
import { 
  Mail, 
  Lock, 
  User, 
  Building, 
  MapPin, 
  CheckCircle, 
  Loader2,
  Shield
} from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({
    mname: '',
    phone: '',
    company_name: '',
    address1: '',
    address2: '',
    city: '',
    state: ''
  });
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Helper function to show email already registered toast
  const showEmailAlreadyRegisteredToast = () => {
    toast({
      title: "Email Already Registered",
      description: (
        <div className="space-y-2">
          <p>This email is already registered with us.</p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-blue-600 underline"
            onClick={() => setLocation('/login')}
            data-testid="link-login-toast"
          >
            Please login using OTP instead.
          </Button>
        </div>
      ),
      variant: "default",
      duration: 8000,
    });
  };

  const handleSendOTP = async () => {
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
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: "Check your email for the verification code",
        });
      } else {
        // Check if it's an email already registered error
        if (data.message && (data.message.toLowerCase().includes('already registered') || data.message.toLowerCase().includes('email exists') || data.message.toLowerCase().includes('email is already') || data.message.toLowerCase().includes('already exists'))) {
          showEmailAlreadyRegisteredToast();
        } else {
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      // Check if error response contains email already registered message
      let errorMessage = "Failed to send OTP. Please try again.";
      let isEmailAlreadyRegistered = false;
      
      // Handle Response object thrown by apiRequest
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          if (errorData.message) {
            if (errorData.message.toLowerCase().includes('already registered') || errorData.message.toLowerCase().includes('email exists') || errorData.message.toLowerCase().includes('email is already') || errorData.message.toLowerCase().includes('already exists')) {
              isEmailAlreadyRegistered = true;
            } else {
              errorMessage = errorData.message;
            }
          }
        } catch (parseError) {
          // If we can't parse the error response, use generic message
          errorMessage = "Failed to send OTP. Please try again.";
        }
      } else if (error?.message?.toLowerCase().includes('already registered') || error?.message?.toLowerCase().includes('email exists')) {
        isEmailAlreadyRegistered = true;
      }
      
      if (isEmailAlreadyRegistered) {
        showEmailAlreadyRegisteredToast();
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
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
        setOtp('');
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your email",
        });
      } else {
        // Check if it's an email already registered error
        if (data.message && (data.message.toLowerCase().includes('already registered') || data.message.toLowerCase().includes('email exists') || data.message.toLowerCase().includes('email is already') || data.message.toLowerCase().includes('already exists'))) {
          showEmailAlreadyRegisteredToast();
        } else {
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      // Check if error response contains email already registered message
      let errorMessage = "Failed to resend OTP. Please try again.";
      let isEmailAlreadyRegistered = false;
      
      // Handle Response object thrown by apiRequest
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          if (errorData.message) {
            if (errorData.message.toLowerCase().includes('already registered') || errorData.message.toLowerCase().includes('email exists') || errorData.message.toLowerCase().includes('email is already') || errorData.message.toLowerCase().includes('already exists')) {
              isEmailAlreadyRegistered = true;
            } else {
              errorMessage = errorData.message;
            }
          }
        } catch (parseError) {
          // If we can't parse the error response, use generic message
          errorMessage = "Failed to resend OTP. Please try again.";
        }
      } else if (error?.message?.toLowerCase().includes('already registered') || error?.message?.toLowerCase().includes('email exists')) {
        isEmailAlreadyRegistered = true;
      }
      
      if (isEmailAlreadyRegistered) {
        showEmailAlreadyRegisteredToast();
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !otp) {
      toast({ title: "Error", description: "Please enter your email and OTP verification code", variant: "destructive" });
      return;
    }

    if (otp.length !== 6) {
      toast({ title: "Error", description: "Please enter the complete 6-digit verification code", variant: "destructive" });
      return;
    }
    
    if (!formData.mname.trim() || !formData.phone.trim() || !formData.company_name.trim() || 
        !formData.address1.trim() || !formData.city.trim() || !formData.state.trim()) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setRegistering(true);
    try {
      const response = await apiRequest("POST", "/api/auth/complete-registration", {
        email,
        otp,
        registrationData: formData
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        toast({
          title: "Success! 🎉",
          description: data.message || "Registration successful! Please wait for admin approval.",
        });
      } else {
        // Handle specific error cases - check for OTP in message
        if (data.message && (data.message.toLowerCase().includes('otp') || data.message.toLowerCase().includes('invalid otp'))) {
          toast({
            title: "Invalid OTP",
            description: data.message || "The verification code you entered is incorrect. Please check and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration Failed",
            description: data.message || "Registration failed. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      // Check if error response contains OTP-related message
      let errorMessage = "Registration failed. Please try again.";
      let errorTitle = "Error";
      
      // Handle Response object thrown by apiRequest
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          if (errorData.message) {
            if (errorData.message.toLowerCase().includes('otp') || errorData.message.toLowerCase().includes('invalid otp')) {
              errorTitle = "Invalid OTP";
              errorMessage = errorData.message || "The verification code you entered is incorrect. Please check and try again.";
            } else {
              errorMessage = errorData.message;
              errorTitle = "Registration Failed";
            }
          }
        } catch (parseError) {
          // If we can't parse the error response, use generic message
          errorMessage = "Registration failed. Please try again.";
        }
      } else if (error?.message?.toLowerCase().includes('otp')) {
        errorTitle = "Invalid OTP";
        errorMessage = "The verification code you entered is incorrect. Please check and try again.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Stock Laabh! 🎉</h1>
              <p className="text-gray-600 mb-6">
                Account created for <strong>{email}</strong>
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Next Steps:</strong><br />
                  1. Pay membership fee (₹2,499)<br />
                  2. Wait for admin approval<br />
                  3. Start trading!
                </p>
              </div>

              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full"
                data-testid="button-login"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Account Registration</h1>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center text-xl">
              <User className="mr-2 h-5 w-5 text-blue-600" />
              Create Your Account
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleCompleteRegistration} className="space-y-6">
              {/* Email & OTP Section */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-blue-600" />
                  Email Verification
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        data-testid="input-email"
                        disabled={otpSent}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      type="button"
                      onClick={handleSendOTP}
                      disabled={loading || !email || otpSent}
                      className="w-full"
                      data-testid="button-send-otp"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : otpSent ? (
                        'OTP Sent ✓'
                      ) : (
                        'Send OTP'
                      )}
                    </Button>
                  </div>
                </div>

                {otpSent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code *</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-lg tracking-widest font-mono"
                        data-testid="input-otp"
                        maxLength={6}
                        required
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        type="button"
                        onClick={handleResendOTP}
                        disabled={loading}
                        variant="outline"
                        className="w-full"
                        data-testid="button-resend-otp"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resending...
                          </>
                        ) : (
                          'Resend OTP'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

              </div>

              {/* Registration Form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <User className="h-4 w-4 mr-2 text-blue-600" />
                  Member Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      value={formData.mname}
                      onChange={(e) => setFormData({...formData, mname: e.target.value})}
                      data-testid="input-name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Your phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      data-testid="input-phone"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="company"
                      type="text"
                      placeholder="Your company name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      className="pl-10"
                      data-testid="input-company"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address1">Address Line 1 *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="address1"
                      type="text"
                      placeholder="Street address"
                      value={formData.address1}
                      onChange={(e) => setFormData({...formData, address1: e.target.value})}
                      className="pl-10"
                      data-testid="input-address1"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input
                    id="address2"
                    type="text"
                    placeholder="Apartment, suite, etc. (optional)"
                    value={formData.address2}
                    onChange={(e) => setFormData({...formData, address2: e.target.value})}
                    data-testid="input-address2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      data-testid="input-city"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      data-testid="input-state"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Secure OTP-Based Access</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Your account will use OTP (One-Time Password) verification for secure login. 
                    No password required - we'll send a verification code to your email whenever you log in.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg" 
                  disabled={registering || !otpSent || !otp || otp.length !== 6}
                  data-testid="button-register"
                >
                  {registering ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying & Creating Account...
                    </>
                  ) : (
                    'Verify OTP & Complete Registration'
                  )}
                </Button>

                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Button 
                      type="button"
                      variant="link" 
                      className="p-0 h-auto text-blue-600"
                      onClick={() => window.location.href = '/'}
                      data-testid="link-login"
                    >
                      Login here
                    </Button>
                  </p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>© 2025 Stock Laabh. All rights reserved.</p>
          <p className="mt-1">Designed by Renuka Print ERP Solutions</p>
        </div>
      </div>
    </div>
  );
}