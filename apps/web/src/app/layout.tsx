import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { LayoutClient } from './_layout-client';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Langafy - Learn Languages Through Conversation',
  description:
    'Master languages with CEFR-aligned lessons, conversational AI practice, and interactive games',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to the API origin so the TCP + TLS handshake is done before the
            first authenticated request, shaving ~100-300ms on initial data fetches. */}
        {process.env.NEXT_PUBLIC_API_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Skip-to-content link — first focusable element; visible only on focus */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2">
          Skip to main content
        </a>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
