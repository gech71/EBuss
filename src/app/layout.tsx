import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { DataContext, useDataProvider } from '@/lib/store';
import React from 'react';

// This can't be in the component itself because it's a server component
// and we can't have metadata inside a client component.
export const metadata: Metadata = {
  title: 'EZBus',
  description: 'The easiest way to book your bus tickets.',
};

// This provider component will be marked as a client component
const DataProvider = ({ children }: { children: React.ReactNode }) => {
    "use client"
    const data = useDataProvider();
    return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <DataProvider>
          <div className="flex-grow">{children}</div>
        </DataProvider>
        <Toaster />
      </body>
    </html>
  );
}
