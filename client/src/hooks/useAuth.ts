import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function useAuth() {
  const [, setLocation] = useLocation();
  
  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/auth/current-member"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const user = (response as any)?.success ? (response as any).member : null;
  const isAuthenticated = !!user;
  const hasPaid = user?.membership_paid === 1 || user?.membershipPaid === 1;
  const isApproved = user?.status === 1 || user?.mstatus === 1;

  // Redirect logic based on authentication, payment, and approval status
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const currentPath = window.location.pathname;
      
      // If user hasn't paid, redirect to payment (unless already on payment page)
      if (!hasPaid && currentPath !== '/subscribe') {
        setLocation('/subscribe');
        return;
      }

      // If user has paid but not approved yet, redirect to waiting page (unless already there)
      if (hasPaid && !isApproved && currentPath !== '/registration-success') {
        setLocation('/registration-success');
        return;
      }

      // If user is fully approved, don't allow access to payment/success pages
      if (hasPaid && isApproved && (currentPath === '/subscribe' || currentPath === '/registration-success')) {
        setLocation('/');
        return;
      }
    }
  }, [isLoading, isAuthenticated, hasPaid, isApproved, setLocation]);

  return {
    user,
    isLoading,
    isAuthenticated,
    hasPaid,
    isApproved,
    needsPayment: isAuthenticated && !hasPaid,
    needsApproval: isAuthenticated && hasPaid && !isApproved,
  };
}
