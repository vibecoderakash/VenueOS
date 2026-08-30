import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { DataProvider } from '@/lib/data-context';
import { ThemeProvider } from '@/lib/theme-context';
import { AppShell } from '@/components/layout/app-shell';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Venue OS — Banquet Hall Management',
  description: 'Purpose-built lead management and conversation continuity for banquet halls.',
  keywords: ['banquet hall', 'venue management', 'lead management', 'CRM', 'events'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="antialiased min-h-screen flex"
        style={{
          fontFamily: 'var(--font-sans)',
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <AppShell>
                {children}
              </AppShell>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
