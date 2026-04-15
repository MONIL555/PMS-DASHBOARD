import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5,   // 5 minutes garbage collection
      retry: 3,
    },
  },
});

export default queryClient;
