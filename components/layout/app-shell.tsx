'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Building2, AlertTriangle, RefreshCw } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/setup', '/forgot-password', '/reset-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, authStatus, authError, retryAuth, profile } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Client-side route guarding only after initial mounting and state resolution
  useEffect(() => {
    if (!mounted || authStatus === 'initializing') return;

    if (authStatus === 'unauthenticated' && !isPublicRoute) {
      const returnTo = pathname !== '/' ? pathname : '';
      const targetUrl = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';
      router.replace(targetUrl);
    } else if (authStatus === 'authenticated' && pathname === '/login') {
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get('returnTo');
      const targetUrl = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
      router.replace(targetUrl);
    }
  }, [mounted, authStatus, isPublicRoute, pathname, router]);

  // Render public auth/setup pages directly without app shell sidebar
  if (isPublicRoute) {
    return (
      <main className="min-h-screen w-full flex flex-col">
        {children}
      </main>
    );
  }

  // 1. Initializing State: Show sleek session verification spinner
  if (!mounted || authStatus === 'initializing') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#080b18] text-white">
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute inset-0 bg-cyan-500/30 rounded-3xl blur-xl opacity-60 animate-pulse" />
          <div className="relative w-16 h-16 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="VenueOS Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain drop-shadow-xl"
              priority
            />
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-slate-300 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>Verifying Venue OS Session...</span>
        </div>
      </div>
    );
  }

  // 2. Error State: Show safe error card with Try Again button
  if (authStatus === 'error') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#080b18] text-white p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#0f172a] border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Unable to verify your session</h3>
            <p className="text-xs text-slate-400 mt-1">
              {authError || 'A network error occurred while verifying your credentials. Please try again.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => retryAuth()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <button
              onClick={() => router.replace('/login')}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated State on protected route: Show redirecting indicator
  if (authStatus === 'unauthenticated' || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#080b18] text-white">
        <div className="flex items-center gap-2.5 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Redirecting to login...</span>
        </div>
      </div>
    );
  }

  // 4. Authenticated State: Full App Shell rendered directly on requested route
  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden transition-colors duration-150"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <Header />
        {(profile?.is_active === false || profile?.active === false) && (
          <div className="mx-4 sm:mx-6 mt-3 rounded-lg border border-red-800 bg-red-950 px-4 py-2.5 text-sm font-bold text-white">
            This account is inactive. You can view venue data, but changes are disabled until an administrator reactivates your account.
          </div>
        )}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-7 max-w-[1400px] w-full mx-auto pb-24 md:pb-7">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
