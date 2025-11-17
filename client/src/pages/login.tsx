import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Shield, Clock, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Logo } from "@/components/ui/logo";
import { useLocation } from "wouter";

export default function Login() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  const [showTestLogin, setShowTestLogin] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Helper function to show email not found toast
  const showEmailNotFoundToast = () => {
    toast({
      title: "Welcome to STOCK LAABH!",
      description: (
        <div className="space-y-2">
          <p>We're excited to have you on board! Unfortunately, we couldn't find your email address.</p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-blue-600 underline"
            onClick={() => setLocation('/register')}
            data-testid="link-register-toast"
          >
            Click Register here to get started.
          </Button>
        </div>
      ),
      variant: "default",
      duration: 8000,
    });
  };

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
      const response = await apiRequest("POST", "/api/auth/send-login-otp", { email });
      const data = await response.json();

      if (data.success) {
        setStep('otp');
        setOtpSent(true);
        if (data.maskedPhone) {
          setMaskedPhone(data.maskedPhone);
        }
        toast({
          title: "OTP Sent",
          description: data.message || "Please check your email for the verification code",
        });
      } else {
        // Check if it's an email not found error
        if (data.message && (data.message.toLowerCase().includes('email not found') || data.message.toLowerCase().includes('user not found') || data.message.toLowerCase().includes('not registered') || data.message.toLowerCase().includes('email does not exist'))) {
          showEmailNotFoundToast();
        } else {
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      // Check if error response contains specific messages
      let errorMessage = "Failed to send OTP. Please try again.";
      let errorTitle = "Error";
      let isEmailNotFound = false;
      
      // Handle Error object thrown by apiRequest
      if (error instanceof Error) {
        // The error message format is "status: response body"
        // Extract the JSON part after the status code
        const errorText = error.message;
        const jsonMatch = errorText.match(/^\d+:\s*(.+)$/);
        
        if (jsonMatch) {
          try {
            const errorData = JSON.parse(jsonMatch[1]);
            if (errorData.message) {
              errorMessage = errorData.message;
              
              // Check for email not found error
              if (errorMessage.toLowerCase().includes('email not found') || 
                  errorMessage.toLowerCase().includes('user not found') || 
                  errorMessage.toLowerCase().includes('not registered') || 
                  errorMessage.toLowerCase().includes('email does not exist')) {
                isEmailNotFound = true;
              }
            }
          } catch (parseError) {
            // If we can't parse the JSON, try to extract a meaningful message
            errorMessage = jsonMatch[1] || "Failed to send OTP. Please try again.";
          }
        }
      }
      
      if (isEmailNotFound) {
        showEmailNotFoundToast();
      } else {
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
      }
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

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/verify-login-otp", {
        email,
        otp
      });
      const data = await response.json();

      if (data.success) {
        // Check if user has paid membership
        if (data.member && data.member.membershipPaid === 0) {
          // User hasn't paid, redirect to payment page
          toast({
            title: "Payment Required",
            description: "Please complete your membership payment to continue",
          });
          window.location.href = '/subscribe';
        } else {
          // User has paid, proceed to dashboard
          toast({
            title: "Login Successful",
            description: "Welcome back to STOCK LAABH!",
          });
          window.location.href = '/';
        }
      } else {
        // Check if it's a pending approval or not approved message
        if (data.message && (
          (data.message.toLowerCase().includes('pending') && data.message.toLowerCase().includes('approval')) ||
          data.message.toLowerCase().includes('not yet approved') ||
          data.message.toLowerCase().includes('not approved')
        )) {
          setShowPendingApproval(true);
          toast({
            title: "Account Not Approved",
            description: data.message,  // Display the actual message from the API
            variant: "default",
            duration: 8000,
          });
        } else {
          // Check if it's an invalid OTP error
          if (data.message && (data.message.toLowerCase().includes('invalid otp') || data.message.toLowerCase().includes('incorrect otp') || data.message.toLowerCase().includes('wrong otp') || data.message.toLowerCase().includes('invalid code') || data.message.toLowerCase().includes('verification code'))) {
            toast({
              title: "Invalid OTP",
              description: "The verification code you entered is incorrect. Please check and try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Failed",
              description: data.message || "Login failed. Please try again.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error: any) {
      // Check if error response contains specific messages
      let errorMessage = "Login failed. Please try again.";
      let errorTitle = "Error";
      let isInvalidOTP = false;
      let isPendingApproval = false;
      
      // Handle Error object thrown by apiRequest
      if (error instanceof Error) {
        // The error message format is "status: response body"
        // Extract the JSON part after the status code
        const errorText = error.message;
        const jsonMatch = errorText.match(/^\d+:\s*(.+)$/);
        
        if (jsonMatch) {
          try {
            const errorData = JSON.parse(jsonMatch[1]);
            if (errorData.message) {
              errorMessage = errorData.message;
              
              // Check for specific error types
              if (errorMessage.toLowerCase().includes('invalid otp') || 
                  errorMessage.toLowerCase().includes('incorrect otp') || 
                  errorMessage.toLowerCase().includes('wrong otp') || 
                  errorMessage.toLowerCase().includes('invalid code') || 
                  errorMessage.toLowerCase().includes('verification code')) {
                isInvalidOTP = true;
              } else if (errorMessage.toLowerCase().includes('not yet approved') ||
                         errorMessage.toLowerCase().includes('not approved') ||
                         (errorMessage.toLowerCase().includes('pending') && errorMessage.toLowerCase().includes('approval'))) {
                isPendingApproval = true;
              }
            }
          } catch (parseError) {
            // If we can't parse the JSON, try to extract a meaningful message
            errorMessage = jsonMatch[1] || "Login failed. Please try again.";
          }
        }
      }
      
      if (isInvalidOTP) {
        toast({
          title: "Invalid OTP",
          description: "The verification code you entered is incorrect. Please check and try again.",
          variant: "destructive",
        });
      } else if (isPendingApproval) {
        setShowPendingApproval(true);
        toast({
          title: "Account Not Approved",
          description: errorMessage,
          variant: "default",
          duration: 8000,
        });
      } else {
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== 'admin123') {
      toast({
        title: "Invalid Password",
        description: "Test password is 'admin123'",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/test-login", { password });
      const data = await response.json();

      if (data.success) {
        // Check if user has paid membership
        if (data.member && data.member.membershipPaid === 0) {
          // User hasn't paid, redirect to payment page
          toast({
            title: "Payment Required",
            description: "Please complete your membership payment to continue",
          });
          window.location.href = '/subscribe';
        } else {
          // User has paid, proceed to dashboard
          toast({
            title: "Test Login Successful",
            description: "Logged in as test user",
          });
          window.location.href = '/';
        }
      } else {
        toast({
          title: "Login Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Test login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/send-login-otp", { email });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "OTP Resent",
          description: data.message || "A new verification code has been sent",
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center text-xl">
              <Shield className="mr-2 h-5 w-5 text-blue-600" />
              Member Login
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              {step === 'email'
                ? 'Enter your email to receive a verification code'
                : 'Enter OTP sent to email and phone'
              }
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === 'email' ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
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
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                  data-testid="button-send-otp"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>

                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-blue-600"
                      onClick={() => setLocation('/register')}
                      data-testid="link-register"
                    >
                      Register here
                    </Button>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: You can only login with emails that are already registered
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                {otpSent && !showPendingApproval && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Verification code sent to <strong>{email}</strong>
                      {maskedPhone && <> and <strong>{maskedPhone}</strong></>}
                    </AlertDescription>
                  </Alert>
                )}

                {showPendingApproval && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <div className="space-y-2">
                        <div className="font-medium">Account Under Review</div>
                        <div className="text-sm">
                          Your BMPA membership application is currently being reviewed by our admin team. 
                          Once approved, you'll receive an email notification and can access the marketplace.
                        </div>
                        <div className="text-xs text-yellow-700 mt-2">
                          Review process typically takes 1-2 business days.
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-lg tracking-widest font-mono"
                    data-testid="input-otp"
                    maxLength={6}
                    required
                  />
                </div>


                {!showPendingApproval && (
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    data-testid="button-verify-login"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP & Login'
                    )}
                  </Button>
                )}

                {showPendingApproval && (
                  <div className="space-y-3">
                    <Button 
                      type="button"
                      onClick={() => {
                        setShowPendingApproval(false);
                        setStep('email');
                        setOtp('');
                        setPassword('');
                      }}
                      className="w-full"
                      variant="outline"
                      data-testid="button-try-different-account"
                    >
                      Try Different Account
                    </Button>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <Button 
                    type="button"
                    variant="ghost" 
                    onClick={() => {
                      setStep('email');
                      setShowPendingApproval(false);
                    }}
                    data-testid="button-back"
                  >
                    ← Back
                  </Button>
                  {!showPendingApproval && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={handleResendOTP}
                      disabled={loading}
                      data-testid="button-resend"
                    >
                      Resend OTP
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Test Login for Development - COMMENTED OUT FOR PRODUCTION DEMO */}
        {/*
        <Card className="shadow-lg border-0 mt-4 bg-yellow-50 border-yellow-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center text-lg text-yellow-800">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Test Login (Development Only)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showTestLogin ? (
              <Button
                onClick={() => setShowTestLogin(true)}
                variant="outline"
                className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                Show Test Login
              </Button>
            ) : (
              <form onSubmit={handleTestLogin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="test-password" className="text-yellow-800">Test Password</Label>
                  <Input
                    id="test-password"
                    type="password"
                    placeholder="admin123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-yellow-300"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Test Login'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowTestLogin(false)}
                  variant="ghost"
                  className="w-full text-yellow-800"
                >
                  Hide Test Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        */}

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>© 2025 STOCK LAABH. All rights reserved.</p>
          <p className="mt-1">Designed by Renuka Print ERP Solutions</p>
        </div>
      </div>
    </div>
  );
}