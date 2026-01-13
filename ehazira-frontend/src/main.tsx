import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import { GOOGLE_CLIENT_ID } from './utils/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Don't retry on 401/403 errors (auth failures)
      retry: (failureCount, error: unknown) => {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError?.response?.status === 401 || axiosError?.response?.status === 403) {
          return false
        }
        return failureCount < 1
      },
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      // Don't retry mutations on auth failures
      retry: (failureCount, error: unknown) => {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError?.response?.status === 401 || axiosError?.response?.status === 403) {
          return false
        }
        return failureCount < 1
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
