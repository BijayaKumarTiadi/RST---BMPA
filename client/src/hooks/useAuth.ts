import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/auth/current-member"],
    retry: false,
  });

  const user = response?.success ? response.member : null;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
