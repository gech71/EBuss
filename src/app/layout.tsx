
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import React from 'react';

export const metadata: Metadata = {
  title: 'EZBus',
  description: 'The easiest way to book your bus tickets.',
  icons: {
    icon: 'data:;base64,iVBORw0KGgo=', // Empty data URI to prevent favicon 404
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
          {children}
        <Toaster />
      </body>
    </html>
  );
}
