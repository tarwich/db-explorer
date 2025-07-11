'use client';

import { ToastProvider } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import browserLogger from '@/lib/browser-logger';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import Boot from './boot';

// Create a client with global error handling
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Global error handler for queries
      browserLogger.error('Query error:', {
        error: error.message || error,
        queryKey: query.queryKey,
        stack: error.stack,
      });
      
      // You can customize error handling based on query key or error type
      if (query.queryKey.includes('connection')) {
        toast({
          title: 'Connection Error',
          description: error?.message || 'Failed to connect to database',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Query Error',
          description: error?.message || 'Failed to fetch data',
          variant: 'destructive',
        });
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, variables, context, mutation) => {
      // Global error handler for mutations
      browserLogger.error('Mutation error:', {
        error: error.message || error,
        mutationKey: mutation.options.mutationKey,
        variables,
        stack: error.stack,
      });
      
      // Only show toast for errors that don't have local handlers
      // You can check if the mutation has a local onError handler
      const hasLocalHandler = mutation.options.onError;
      
      if (!hasLocalHandler) {
        toast({
          title: 'Error',
          description: error?.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    },
  }),
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <ToastProvider>{children}</ToastProvider>
      <Boot />
    </QueryClientProvider>
  );
}
