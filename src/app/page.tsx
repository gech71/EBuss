
'use client';

import { Header } from "@/components/Header";
import { RouteSearch } from "@/components/RouteSearch";
import { FeaturedRoutes } from "@/components/FeaturedRoutes";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route, Bus, Location, BusOwner, Discount, User } from '@prisma/client';
import { Skeleton } from "@/components/ui/skeleton";

type EnrichedRoute = Route & { 
  bus: Bus & { owner: BusOwner }, 
  origin: Location, 
  destination: Location, 
  discount: Discount | null 
};

interface HomeProps {
  user: User | null;
  isMiniApp: boolean;
  routes: EnrichedRoute[];
  locations: Location[];
  owners: BusOwner[];
}

function TicketRedirector() {
    const router = useRouter();
    useEffect(() => {
        const lastBookingId = localStorage.getItem('lastBookingId');
        if (lastBookingId) {
            localStorage.removeItem('lastBookingId');
            router.push(`/ticket/${lastBookingId}`);
        }
    }, [router]);

    return null;
}

function HomePageContent({ user, isMiniApp, routes, locations, owners }: HomeProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TicketRedirector />
      <Header user={user} isMiniApp={isMiniApp} />
       <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[400px] md:h-[500px] flex items-center justify-center text-center text-white">
          <Image
            src="https://www.daimlertruck.com/fileadmin/press/6/5/D654009/cms.jpeg"
            alt="A public bus on a clean road"
            fill
            className="object-cover"
            priority
            data-ai-hint="public bus road"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
          <div className="relative z-10 p-4 max-w-4xl mx-auto">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight">
              Find Your Next Journey
            </h1>
            <p className="mt-4 text-lg md:text-xl">
              Explore thousands of routes and book your ticket to new adventures today.
            </p>
          </div>
        </section>

        {/* Search Section */}
        <div className="container mx-auto px-4 -mt-20 md:-mt-32 relative z-20">
          <RouteSearch routes={routes} locations={locations} owners={owners} />
        </div>

        {/* Featured Routes Section */}
        <div className="container mx-auto px-4 py-12 md:py-16">
          <FeaturedRoutes routes={routes} />
        </div>
      </main>
    </div>
  );
}


export default function Home() {
    const [props, setProps] = useState<HomeProps | null>(null);

    useEffect(() => {
        const fetchProps = async () => {
            const res = await fetch('/api/home-props');
            if (res.ok) {
                const data = await res.json();
                setProps(data);
            }
        }
        fetchProps();
    }, []);

    if (!props) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
              <Header user={null} isMiniApp={false} />
              <main className="flex-1">
                  <Skeleton className="h-[400px] md:h-[500px] w-full" />
                  <div className="container mx-auto px-4 -mt-20 md:-mt-32 relative z-20">
                    <Skeleton className="h-64 w-full" />
                  </div>
                  <div className="container mx-auto px-4 py-12 md:py-16">
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                  </div>
              </main>
            </div>
        )
    }

    return <HomePageContent {...props} />;
}
