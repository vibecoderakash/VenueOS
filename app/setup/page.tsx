'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function SetupPage() {
  const router = useRouter();
  const { signIn, isAuthenticated, isOwner } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [venueName, setVenueName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [ownerAlreadyExists, setOwnerAlreadyExists] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(59);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Guard check: If an owner already exists, show a friendly message then redirect
  useEffect(() => {
    let isMounted = true;

    async function verifySetupAvailable() {
      try {
        const res = await fetch('/api/auth/setup-status');
        if (res.ok) {
          const data = await res.json();
          if (data.ownerExists && isMounted) {
            setOwnerAlreadyExists(true);
            setIsCheckingStatus(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Setup status check error:', err);
      } finally {
        if (isMounted) {
          setIsCheckingStatus(false);
        }
      }
    }

    if (isAuthenticated && isOwner) {
      router.replace('/');
      return;
    }

    verifySetupAvailable();

    return () => {
      isMounted = false;
    };
  }, [router, isAuthenticated, isOwner]);

  // 2. Auto-redirect countdown when owner already exists
  useEffect(() => {
    if (!ownerAlreadyExists) return;

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [ownerAlreadyExists, router]);

  // ... (handleSubmit stays the same — shown later in the file)

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#070a16] text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-300">Checking system setup status...</span>
        </div>
      </div>
    );
  }

  // Friendly "already set up" screen
  if (ownerAlreadyExists) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#070a16] text-white p-6">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Icon */}
          <div className="relative inline-flex items-center justify-center mx-auto">
            <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-lg opacity-40 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 border border-emerald-400/40 flex items-center justify-center shadow-xl">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Venue OS is Already Set Up
            </h1>
            <p className="mt-2 text-slate-400 text-sm sm:text-base leading-relaxed">
              Your venue owner account has already been created. This setup page is a one-time process and cannot be used again.
            </p>
          </div>

          {/* Info card */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Security Note</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Only one owner account can exist per Venue OS installation. Additional staff and manager accounts can be created by the owner from <strong className="text-white">Settings → Team Management</strong>.
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2.5 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all group"
            >
              <span>Go to Login</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <p className="text-xs text-slate-500">
              Redirecting to login in <span className="text-indigo-400 font-semibold">{redirectCountdown}s</span>...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Field Validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (!venueName.trim()) {
      setErrorMsg('Please enter your banquet or venue name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          venue_name: venueName.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to initialize owner account.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Owner account created successfully! Signing you in...');

      // Auto sign-in to establish authenticated session
      const signInResult = await signIn(email.trim().toLowerCase(), password);

      setTimeout(() => {
        if (signInResult.success) {
          router.replace('/');
        } else {
          router.replace('/login');
        }
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error during setup';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#080b18] text-slate-900 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      
      {/* LEFT BRAND SECTION */}
      <div className="relative lg:w-[50%] min-h-[460px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
        {/* Background Image with Layered Gradients */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: "url('/images/banquet-hall-bg.jpg')",
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#070a16]/95 via-[#0a0f26]/90 to-[#0c102a]/85" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-950/60 via-transparent to-black/80" />

        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            {/* VenueOS Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center flex-shrink-0">
                <div className="absolute inset-0 bg-indigo-500 rounded-xl blur-md opacity-60 animate-pulse" />
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#312e81] border border-indigo-400/40 flex items-center justify-center shadow-lg shadow-indigo-950/50">
                  <Building2 className="w-6 h-6 text-white" />
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

          <div className="my-10 lg:my-auto max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Initial Setup
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Create Your Venue{' '}
              <span className="text-[#6366f1] drop-shadow-[0_0_20px_rgba(99,102,241,0.6)]">
                Owner Account
              </span>
            </h1>

            <p className="mt-4 text-slate-300 text-sm leading-relaxed">
              This controlled setup initialises the primary administrator account for your banquet hall.
              Once created, staff accounts can be invited and managed inside Venue OS.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3 text-slate-300 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <span>Full access to banquet inquiries, team permissions, and settings</span>
              </div>
              <div className="flex items-start gap-3 text-slate-300 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <span>Strict security with Row-Level Security (RLS) enabled</span>
              </div>
              <div className="flex items-start gap-3 text-slate-300 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <span>Automatic route locking prevents unauthorized registrations</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center gap-2.5 text-[#93c5fd] text-xs font-medium tracking-wide border-t border-white/10">
            <ShieldCheck className="w-4 h-4 text-[#818cf8]" />
            <span>Secure. Single-Tenant V1. Always Accessible.</span>
          </div>
        </div>
      </div>

      {/* RIGHT SETUP FORM SECTION */}
      <div className="lg:w-[50%] bg-[#f4f6fb] flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px] bg-white rounded-[26px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] border border-slate-100 p-7 sm:p-9">
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Venue Owner Setup
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Enter your information to register as the primary Venue Owner.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Akash Sharma"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-normal"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@yourvenue.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-normal"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                You will use this work email to sign in to VenueOS.
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-normal"
                />
              </div>
            </div>

            {/* Venue Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Banquet / Venue Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="The Grand Imperial Banquet"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-normal"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password <span className="text-rose-500">* (min 8 chars)</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-normal"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#4338ca] hover:bg-[#3730a3] active:scale-[0.99] text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Owner Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Setup & Launch Venue OS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Already configured?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
