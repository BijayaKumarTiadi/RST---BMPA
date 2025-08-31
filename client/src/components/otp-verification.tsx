import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Phone, RefreshCw } from "lucide-react";

interface OtpVerificationProps {
  email: string;
  mobileNumber: string;
  onVerified: () => void;
}

export default function OtpVerification({ email, mobileNumber, onVerified }: OtpVerificationProps) {
  const [emailOtp, setEmailOtp] = useState("");
  const [smsOtp, setSmsOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const { toast } = useToast();

  const sendOtpMutation = useMutation({
    mutationFn: async ({ identifier, type }: { identifier: string; type: string }) => {
      const payload = type === 'email' 
        ? { email: identifier, type }
        : { mobileNumber: identifier, type };
      
      const response = await apiRequest('POST', '/api/otp/send', payload);
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "OTP Sent",
        description: `Verification code sent to your ${variables.type}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Send OTP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ identifier, otp, type }: { identifier: string; otp: string; type: string }) => {
      const response = await apiRequest('POST', '/api/otp/verify', { identifier, otp, type });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (variables.type === 'email') {
        setEmailVerified(true);
        toast({
          title: "Email Verified",
          description: "Your email has been successfully verified.",
        });
      } else {
        setSmsVerified(true);
        toast({
          title: "Mobile Verified",
          description: "Your mobile number has been successfully verified.",
        });
      }

      // Check if both are verified
      if ((variables.type === 'email' && smsVerified) || (variables.type === 'sms' && emailVerified)) {
        onVerified();
      }
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendOtp = (type: string) => {
    const identifier = type === 'email' ? email : mobileNumber;
    sendOtpMutation.mutate({ identifier, type });
  };

  const handleVerifyOtp = (type: string) => {
    const identifier = type === 'email' ? email : mobileNumber;
    const otp = type === 'email' ? emailOtp : smsOtp;
    
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP code.",
        variant: "destructive",
      });
      return;
    }
    
    verifyOtpMutation.mutate({ identifier, otp, type });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Verify Your Contact Information</CardTitle>
          <p className="text-center text-muted-foreground">
            We've sent verification codes to your email and mobile number
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Verification */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                Email Verification
              </Label>
              {emailVerified && (
                <span className="text-xs px-2 py-1 bg-chart-2 text-white rounded-full">
                  Verified
                </span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                maxLength={6}
                disabled={emailVerified}
                data-testid="input-email-otp"
              />
              <Button
                variant="outline"
                onClick={() => handleVerifyOtp('email')}
                disabled={emailOtp.length !== 6 || emailVerified || verifyOtpMutation.isPending}
                data-testid="button-verify-email-otp"
              >
                Verify
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sent to: {email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSendOtp('email')}
                disabled={emailVerified || sendOtpMutation.isPending}
                data-testid="button-resend-email-otp"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Resend
              </Button>
            </div>
          </div>

          {/* SMS Verification */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center">
                <Phone className="mr-2 h-4 w-4" />
                SMS Verification
              </Label>
              {smsVerified && (
                <span className="text-xs px-2 py-1 bg-chart-2 text-white rounded-full">
                  Verified
                </span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={smsOtp}
                onChange={(e) => setSmsOtp(e.target.value)}
                maxLength={6}
                disabled={smsVerified}
                data-testid="input-sms-otp"
              />
              <Button
                variant="outline"
                onClick={() => handleVerifyOtp('sms')}
                disabled={smsOtp.length !== 6 || smsVerified || verifyOtpMutation.isPending}
                data-testid="button-verify-sms-otp"
              >
                Verify
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sent to: +91 {mobileNumber}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSendOtp('sms')}
                disabled={smsVerified || sendOtpMutation.isPending}
                data-testid="button-resend-sms-otp"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Resend
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="text-center pt-4">
            <div className="text-sm text-muted-foreground mb-2">
              Verification Progress: {(emailVerified ? 1 : 0) + (smsVerified ? 1 : 0)}/2
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((emailVerified ? 1 : 0) + (smsVerified ? 1 : 0)) * 50}%` }}
              />
            </div>
            {emailVerified && smsVerified && (
              <p className="text-sm text-chart-2 mt-2 font-medium">
                Both verifications complete! Proceeding to payment...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
