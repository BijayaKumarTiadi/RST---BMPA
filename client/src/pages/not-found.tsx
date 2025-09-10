import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">404 - Page Not Found</h1>
            <p className="text-sm text-gray-600 mb-6">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Go Back Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
