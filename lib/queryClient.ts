import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

/** Retrying can't help with client errors, maintenance or a required update. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && (error.status < 500 || error.code === 'maintenance')) {
    return false;
  }
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
