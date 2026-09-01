'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  Users2,
  CalendarCheck,
  CreditCard,
  LineChart,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  LogIn,
  Check,
  AlertCircle,
  HelpCircle,
  Phone,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#080b18] text-white">
          <div className="flex items-center gap-2.5 text-slate-300 text-sm">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading Venue OS...</span>
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const destination = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';

  const { signIn, isAuthenticated, isLoading: isAuthLoading, checkOwnerExists } = useAuth();

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);

  // Modals
  const [showContactModal, setShowContactModal] = useState(false);

  // If already authenticated, redirect directly to destination without dashboard flashing
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace(destination);
    }

    async function checkSetup() {
      const exists = await checkOwnerExists();
      setHasOwner(exists);
    }
    checkSetup();
  }, [isAuthenticated, isAuthLoading, router, destination, checkOwnerExists]);

  // Handle Form Submission with Supabase Auth
  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      // Check if venue has been initialized
      const ownerExists = await checkOwnerExists();
      setHasOwner(ownerExists);

      if (!ownerExists) {
        setErrorMsg('No venue or owner account exists in the database. Please initialize your Venue Owner account first.');
        setIsLoading(false);
        return;
      }

      const res = await signIn(identifier.trim().toLowerCase(), password);

      if (!res.success) {
        setErrorMsg(res.error || 'Email or password is incorrect.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Signed in successfully! Redirecting...');
      setTimeout(() => {
        // Use a full navigation after authentication so the middleware sees
        // the freshly persisted Supabase auth cookies. Client-side routing
        // can remain on /login while the auth/session transition is settling.
        window.location.replace(destination);
      }, 300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#080b18] text-slate-900 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      
      {/* =========================================================================
          LEFT HERO PANEL: Luxury Venue Background + Branding + 4 Feature Cards
          ========================================================================= */}
      <div className="relative lg:w-[58%] xl:w-[60%] min-h-[580px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
        {/* Background Image with Layered Gradients */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: "url('/images/banquet-hall-bg.jpg')",
          }}
        />
        {/* Rich dark luxury atmospheric gradient overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#070a16]/95 via-[#0a0f26]/90 to-[#0c102a]/85" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-950/60 via-transparent to-black/80" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col justify-between h-full">
          
          {/* Top Logo & Title */}
          <div>
            <div className="flex items-center gap-3.5">
              {/* Glowing VenueOS Official Logo */}
              <div className="relative flex items-center justify-center flex-shrink-0">
                <div className="absolute inset-0 bg-cyan-500/30 rounded-2xl blur-xl opacity-60 animate-pulse" />
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="VenueOS Logo"
                    width={56}
                    height={56}
                    className="w-full h-full object-contain drop-shadow-xl"
                    priority
                  />
                </div>
              </div>

              <div>
                <span className="text-2xl font-bold tracking-tight text-white flex items-center">
                  Venue<span className="text-[#818cf8]">OS</span>
                </span>
                <p className="text-xs text-slate-300 font-medium tracking-wide">
                  Banquet Hall Management System
                </p>
              </div>
            </div>
          </div>

          {/* Main Hero Value Proposition */}
          <div className="my-10 lg:my-auto max-w-xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
              Manage Every Event.{' '}
              <span className="block mt-1">
                Delight{' '}
                <span className="text-[#6366f1] drop-shadow-[0_0_24px_rgba(99,102,241,0.6)]">
                  Every Guest.
                </span>
              </span>
            </h1>

            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg">
              All-in-one platform to simplify bookings, leads, events, payments and operations.
            </p>

            {/* 4 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-8">
              
              {/* Feature 1: Lead Management */}
              <div className="group bg-slate-900/65 hover:bg-slate-800/80 backdrop-blur-md border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-200 shadow-lg shadow-black/20 hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#7c3aed] flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                  <Users2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-[14px] leading-tight">
                    Lead Management
                  </h3>
                  <p className="text-slate-300 text-xs mt-1 leading-snug">
                    Track, follow-up & convert more leads
                  </p>
                </div>
              </div>

              {/* Feature 2: Bookings & Events */}
              <div className="group bg-slate-900/65 hover:bg-slate-800/80 backdrop-blur-md border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-200 shadow-lg shadow-black/20 hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#2563eb] flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-[14px] leading-tight">
                    Bookings & Events
                  </h3>
                  <p className="text-slate-300 text-xs mt-1 leading-snug">
                    Manage bookings, events & calendars
                  </p>
                </div>
              </div>

              {/* Feature 3: Payments & Invoices */}
              <div className="group bg-slate-900/65 hover:bg-slate-800/80 backdrop-blur-md border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-200 shadow-lg shadow-black/20 hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-[14px] leading-tight">
                    Payments & Invoices
                  </h3>
                  <p className="text-slate-300 text-xs mt-1 leading-snug">
                    Invoices, payments & dues management
                  </p>
                </div>
              </div>

              {/* Feature 4: Reports & Insights */}
              <div className="group bg-slate-900/65 hover:bg-slate-800/80 backdrop-blur-md border border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-200 shadow-lg shadow-black/20 hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                  <LineChart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-[14px] leading-tight">
                    Reports & Insights
                  </h3>
                  <p className="text-slate-300 text-xs mt-1 leading-snug">
                    Analytics to grow your venue business
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="pt-6 flex items-center gap-2.5 text-[#93c5fd] text-xs font-medium tracking-wide border-t border-white/10">
            <ShieldCheck className="w-4 h-4 text-[#818cf8]" />
            <span>Secure. Reliable. Always Accessible.</span>
          </div>

        </div>
      </div>

      {/* =========================================================================
          RIGHT AUTHENTICATION PANEL: Clean White Floating Login Card
          ========================================================================= */}
      <div className="lg:w-[42%] xl:w-[40%] bg-[#f4f6fb] flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[440px] bg-white rounded-[26px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] border border-slate-100 p-8 sm:p-10">
          
          {/* Card Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
              Welcome Back!
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Sign in to your VenueOS account
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1.5 flex-1">
                <span>{errorMsg}</span>
                {hasOwner === false && (
                  <Link
                    href="/setup"
                    className="inline-flex items-center gap-1 font-semibold text-rose-800 hover:text-rose-950 underline text-xs mt-0.5"
                  >
                    <span>Click here to set up your Venue Owner account</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* First-time Owner Setup Helper Banner */}
          {hasOwner === false && (
            <div className="mb-5 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>First Time Venue Setup</span>
              </div>
              <p className="text-xs text-indigo-700 leading-relaxed">
                No Owner account is initialized yet for this venue.
              </p>
              <Link
                href="/setup"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <span>Initialise Venue Owner Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label 
                htmlFor="identifier" 
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  type="email"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@grandimperial.com"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-normal"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Options Row (Remember Me + Forgot Password) */}
            <div className="flex items-center justify-between pt-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer accent-indigo-600"
                />
                <span className="text-xs sm:text-sm text-slate-600 font-medium">
                  Remember me
                </span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-all"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4338ca] hover:bg-[#3730a3] active:scale-[0.99] text-white font-medium py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Contact Administrator Footer */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs sm:text-sm text-slate-500">
              Need a staff account?{' '}
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline cursor-pointer"
              >
                Contact Administrator
              </button>
            </p>
          </div>

        </div>
      </div>

      {/* =========================================================================
          MODAL: Contact Administrator
          ========================================================================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Banquet Staff Access</h3>
            <p className="text-sm text-slate-600 mt-2">
              Venue OS is a private single-organization system. New staff and manager accounts are issued directly by your venue Owner.
            </p>
            <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <p>• Speak to your Venue General Manager or Owner</p>
              <p>• They can create your staff account under <strong>Settings → Team</strong></p>
              <p>• You will receive a password invitation email</p>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
