import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Shield, Printer, Clock, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPendingApproval, setShowPendingApproval] = useState(false);
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
      const response = await apiRequest("POST", "/api/auth/send-login-otp", { email });
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
    if (!otp.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both OTP and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/verify-login-otp", {
        email,
        otp,
        password
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Login Successful",
          description: "Welcome back to Stock Laabh!",
        });
        // Reload to refresh the app state
        window.location.href = '/home';
      } else {
        // Check if it's a pending approval message
        if (data.message && data.message.toLowerCase().includes('pending') && data.message.toLowerCase().includes('approval')) {
          setShowPendingApproval(true);
          toast({
            title: "Account Under Review",
            description: "Your membership is currently being reviewed by our admin team.",
            variant: "default",
            duration: 6000,
          });
        } else {
          toast({
            title: "Login Failed",
            description: data.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Printer className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Laabh</h1>
          <p className="text-gray-600 text-sm mt-1">Professional Trading Platform</p>
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
                : 'Enter the OTP sent to your email and your password'
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
                      onClick={() => window.location.href = '/register'}
                      data-testid="link-register"
                    >
                      Register here
                    </Button>
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

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      data-testid="input-password"
                      required
                    />
                  </div>
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
                      'Verify & Login'
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

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>© 2025 Stock Laabh. All rights reserved.</p>
          <p className="mt-1">Professional Trading Platform</p>
        </div>
      </div>
    </div>
  );
}