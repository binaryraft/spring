
import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from "@/contexts/AppContext";

export const metadata: Metadata = {
  title: 'Spring',
  description: 'A modern application built with Next.js and Firebase.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💎</text></svg>" />
      </head>
      <body className="font-sans antialiased">
        <AppProvider>
          <div id="app-root">
            {children}
          </div>
          <div id="print-root" />
        </AppProvider>
      </body>
    </html>
  );
}
