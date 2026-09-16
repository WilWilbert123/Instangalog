import type { Metadata } from 'next';
import './globals.css';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Header } from '@/components/layout/Header';
import { MusicPlayerBar } from '@/components/music/MusicPlayerBar';
import { InstallAppBanner } from '@/components/pwa/InstallAppBanner';
import { AuthModal } from '@/components/ui/AuthModal';
import { ThemeInitializer } from '@/components/layout/ThemeInitializer';
import { SessionProvider } from '@/components/providers/SessionProvider';

import { RealtimeNotificationToast } from '@/components/notifications/RealtimeNotificationToast';

import { IntroSplashScreen } from '@/components/layout/IntroSplashScreen';

export const metadata: Metadata = {
  title: 'Instangalog | Pagpag Lover',
  description: 'An original multimedia social platform for short videos, music streaming, images, status updates, and realtime community chat.',
  keywords: ['instangalog', 'social media', 'short videos', 'music', 'chat', 'pwa'],
  icons: {
    icon: '/pagpag.png',
    shortcut: '/pagpag.png',
    apple: '/pagpag.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/pagpag.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/pagpag.png" type="image/png" />
        <link rel="apple-touch-icon" href="/pagpag.png" />
      </head>
      <body className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 min-h-screen transition-colors duration-200">
        <IntroSplashScreen />
        <ThemeInitializer />
        <div className="flex min-h-screen">
          {/* Desktop Navigation Sidebar */}
          <DesktopSidebar />

          {/* Main Content Viewport */}
          <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
            <Header />
            <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
          </div>
        </div>

        {/* Global Floating Components */}
        <SessionProvider />
        <RealtimeNotificationToast />
        <MusicPlayerBar />
        <InstallAppBanner />
        <MobileBottomNav />
        <AuthModal />
      </body>
    </html>
  );
}
