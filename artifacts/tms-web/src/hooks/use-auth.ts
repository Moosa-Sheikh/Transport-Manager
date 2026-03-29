import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";

export function useAuth() {
  const queryClient = useQueryClient();

  // Fetch current user
  const meQuery = useGetMe({
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  });

  // Login mutation
  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        // Update the 'me' cache directly on success to avoid an extra network request
        queryClient.setQueryData(getGetMeQueryKey(), data);
      }
    }
  });

  // Logout mutation
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        // Clear user from cache and trigger a refetch to ensure clean state
        queryClient.setQueryData(getGetMeQueryKey(), null);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    }
  });

  const loginErrorMsg = loginMutation.error
    ? ((loginMutation.error as any)?.data?.error as string | undefined) ?? "Invalid credentials. Please try again."
    : null;

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    isError: meQuery.isError,
    
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginErrorMsg,
    
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending
  };
}
