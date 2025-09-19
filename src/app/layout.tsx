import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { DataContext, useDataProvider } from '@/lib/store';
import React from 'react';

// Note: Metadata is commented out but kept here to show it would be in a server component.
/*
import type {Metadata} from 'next';
export const metadata: Metadata = {
  title: 'EZBus',
  description: 'The easiest way to book your bus tickets.',
};
*/

function DataProvider({ children }: { children: React.ReactNode }) {
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
        <title>EZBus</title>
        <meta name="description" content="The easiest way to book your bus tickets." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <DataProvider>
          {children}
        </DataProvider>
        <Toaster />
      </body>
    </html>
  );
}
