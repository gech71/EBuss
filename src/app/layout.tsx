import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import React from 'react';
import { headers } from 'next/headers';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonceHeader = await headers();
  const  nonce =  nonceHeader.get('x-nonce') || '';
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <title>NibTeraBuss</title>
        <meta name="description" content="The easiest way to book your bus tickets." />
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
