import { useEffect, useState } from 'react';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/navigation";
import { CreditCard, Shield, Check, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Subscribe() {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      // Check if Razorpay SDK is loaded
      if (!window.Razorpay) {
        throw new Error('Payment system is loading. Please try again in a moment.');
      }

      // Create Razorpay order
      const response = await apiRequest("POST", "/api/razorpay/create-order");
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to create payment order. Please try again.');
      }

      const data = await response.json();
      console.log('Create order response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      const { order_id, amount, currency, key_id } = data;

      if (!order_id || !key_id) {
        throw new Error('Invalid payment order data received');
      }

      console.log('Initializing Razorpay with:', { order_id, amount, currency, key_id });

      // Initialize Razorpay
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'STOCK LAABH',
        description: 'BMPA Annual Membership',
        order_id: order_id,
        handler: async function (response: any) {
          setIsProcessing(true);
          
          try {
            // Verify payment
            const verifyResponse = await apiRequest("POST", "/api/razorpay/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              // Invalidate the auth query to force a fresh fetch
              await queryClient.invalidateQueries({ 
                queryKey: ['/api/auth/current-member'], 
                type: 'all' 
              });
              
              // Fetch fresh auth data and wait for it to complete
              const refreshed = await queryClient.fetchQuery({ 
                queryKey: ['/api/auth/current-member'] 
              }) as any;
              
              // Verify membership flags are set before navigating
              const member = refreshed?.member;
              const hasPaid = member?.membership_paid === 1 || member?.membershipPaid === 1;
              const isApproved = member?.mstatus === 1 || member?.status === 1;
              
              if (hasPaid && isApproved) {
                toast({
                  title: "Payment Successful!",
                  description: "Your payment has been confirmed. Welcome to the marketplace!",
                });
                setLocation('/');
              } else {
                // Fallback - user is paid but awaiting approval
                toast({
                  title: "Payment Successful!",
                  description: "Your payment has been confirmed. Redirecting...",
                });
                setLocation('/registration-success');
              }
            } else {
              throw new Error(verifyData.message || 'Payment verification failed');
            }
          } catch (error: any) {
            toast({
              title: "Verification Failed",
              description: error.message || "Payment verification failed. Please contact support.",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment process.",
              variant: "destructive",
            });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Verifying payment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Complete Your BMPA Membership
          </h1>
          <p className="text-xl text-muted-foreground">
            Secure payment processing with Razorpay
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Payment Card */}
          <div>
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Complete Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Secure Payment</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Click the button below to pay securely via Razorpay. All payment information is encrypted and secure.
                    </p>
                  </div>

                  <Button 
                    onClick={handlePayment}
                    className="w-full h-12 text-lg" 
                    disabled={isLoading}
                    data-testid="submit-payment"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-5 w-5" />
                        Pay ₹2,499 Securely
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By proceeding, you agree to our terms and conditions
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary and Benefits */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">STOCK LAABH Annual Membership</span>
                    <span className="font-medium">₹2,118</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">GST (18%)</span>
                    <span className="text-muted-foreground">₹381</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-xl font-bold text-primary">₹2,499</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Membership Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Membership Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-chart-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Verified Trading Platform</h4>
                    <p className="text-sm text-muted-foreground">Access to secure B2B marketplace with verified suppliers</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-chart-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium">BMPA Network Access</h4>
                    <p className="text-sm text-muted-foreground">Connect with 2,500+ printing industry professionals</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-chart-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Priority Support</h4>
                    <p className="text-sm text-muted-foreground">Dedicated customer support and dispute resolution</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-chart-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Industry Events</h4>
                    <p className="text-sm text-muted-foreground">Exclusive access to trading events and training programs</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-chart-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Analytics & Insights</h4>
                    <p className="text-sm text-muted-foreground">Market intelligence and pricing analytics</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-chart-2">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-chart-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-chart-2">Secure Payment</h4>
                    <p className="text-sm text-muted-foreground">
                      Your payment is processed securely by Razorpay. We don't store your payment information.
                      Membership activation happens after successful payment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Button asChild variant="outline">
            <Link href="/register">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Registration
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Designed by Renuka Print ERP Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
