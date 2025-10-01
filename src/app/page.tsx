
import { Header } from "@/components/Header";
import { RouteSearch } from "@/components/RouteSearch";
import { validateRequest } from "@/app/lib/auth";
import prisma from "@/lib/prisma";
import { FeaturedRoutes } from "@/components/FeaturedRoutes";
import Image from "next/image";
import { Card } from "@/components/ui/card";

export default async function Home() {
  const { user } = await validateRequest();
  
  const routesData = await prisma.route.findMany({
    include: {
        origin: true,
        destination: true,
        bus: true,
        discount: true,
    },
    orderBy: {
      departureTime: 'asc',
    },
    take: 20, // Limit the number of routes for performance
  });

  // Sanitize Decimal fields for client components
  const routes = routesData.map(route => ({
    ...route,
    price: Number(route.price),
  }));
  
  const locations = await prisma.location.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  const owners = await prisma.busOwner.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />
       <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[400px] md:h-[500px] flex items-center justify-center text-center text-white">
          <Image
            src="https://picsum.photos/seed/bus-modern/1800/600"
            alt="A modern bus on the road"
            fill
            className="object-cover"
            priority
            data-ai-hint="modern bus"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
          <div className="relative z-10 p-4 max-w-4xl mx-auto">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-shadow-lg">
              Find Your Next Journey
            </h1>
            <p className="mt-4 text-lg md:text-xl text-shadow">
              Explore thousands of routes and book your ticket to new adventures today.
            </p>
          </div>
        </section>

        {/* Search Section */}
        <div className="container mx-auto px-4 -mt-24 md:-mt-32 relative z-20">
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
