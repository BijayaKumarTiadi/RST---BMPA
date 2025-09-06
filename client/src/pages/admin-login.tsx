import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Lock, Printer, LogIn, ArrowLeft } from "lucide-react";

const adminLoginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  otp: z.string().optional()
});

type AdminLoginData = z.infer<typeof adminLoginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [otpSent, setOtpSent] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const { toast } = useToast();

  const form = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      identifier: "",
      otp: ""
    }
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const response = await apiRequest("POST", "/api/auth/admin-send-otp", { identifier });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setOtpSent(true);
        setAdminEmail(data.email);
        toast({
          title: "OTP sent",
          description: `Verification code sent to ${data.email}`,
        });
      } else {
        toast({
          title: "Failed to send OTP",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error sending OTP",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: AdminLoginData) => {
      const response = await apiRequest("POST", "/api/auth/admin-login", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.admin.name}!`,
        });
        // Small delay to let the toast show, then redirect
        setTimeout(() => {
          setLocation("/admin-dashboard");
        }, 1000);
      } else {
        toast({
          title: "Login failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed", 
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    }
  });

  const handleSendOtp = () => {
    const identifier = form.getValues("identifier");
    if (!identifier) {
      toast({
        title: "Username required",
        description: "Please enter your username or email first",
        variant: "destructive",
      });
      return;
    }
    sendOtpMutation.mutate(identifier);
  };

  const onSubmit = (data: AdminLoginData) => {
    if (!otpSent) {
      return; // Do nothing, separate button handles OTP sending
    }
    
    if (!data.otp || data.otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }
    
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple navigation */}
      <div className="p-4">
        <Button variant="ghost" asChild>
          <a href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </a>
        </Button>
      </div>
      
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <Printer className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Stock Laabh Admin</h1>
          <p className="text-muted-foreground">
            Administrative portal for Stock Laabh
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="flex items-center justify-center">
              <Lock className="mr-2 h-5 w-5" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username or Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter admin username or email" 
                          {...field}
                          data-testid="input-identifier"
                          autoComplete="username"
                          disabled={otpSent}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {otpSent && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span>OTP sent to {adminEmail}</span>
                      </div>
                      <p className="mt-1 text-xs">Check your email for the 6-digit verification code</p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter 6-digit OTP" 
                              {...field}
                              data-testid="input-otp"
                              autoComplete="one-time-code"
                              maxLength={6}
                              className="text-center text-lg tracking-widest"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {!otpSent ? (
                  <Button 
                    type="button"
                    onClick={handleSendOtp}
                    className="w-full"
                    disabled={sendOtpMutation.isPending}
                    data-testid="button-send-otp"
                  >
                    {sendOtpMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Send OTP
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Verify & Login
                      </>
                    )}
                  </Button>
                )}

                {otpSent && (
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setOtpSent(false);
                      setAdminEmail("");
                      form.reset();
                    }}
                    data-testid="button-reset"
                  >
                    Change Username/Email
                  </Button>
                )}
              </form>
            </Form>

            <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground">
              <p>Enter your username or email to receive OTP</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          Powered by Renuka Print ERP Solutions
        </div>
      </div>
    </div>
  );
}