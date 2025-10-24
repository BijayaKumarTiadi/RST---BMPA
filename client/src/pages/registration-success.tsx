import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield } from "lucide-react";
import { Link } from "wouter";

export default function RegistrationSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful! 🎉</h1>
            <p className="text-gray-600 mb-6">
              Your payment of <strong>₹2,499</strong> has been received successfully.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Account Pending Approval</span>
              </div>
              <p className="text-blue-700 mb-4">
                Your registration and payment have been submitted successfully! Here's what happens next:
              </p>
              <div className="space-y-2 text-sm text-blue-700 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Admin will review your application</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>You'll receive email notification once approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Once approved, you can login and start trading on STOCK LAABH!</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4">
                Please allow 1-2 business days for approval process.
              </p>
              <Button asChild className="w-full">
                <Link href="/">
                  Go to Login
                </Link>
              </Button>
              <p className="text-gray-500 text-xs mt-4">
                For urgent matters, contact our support team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}