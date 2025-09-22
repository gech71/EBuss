
import { Header } from "@/components/Header";
import { RouteSearch } from "@/components/RouteSearch";
import { validateRequest } from "@/app/lib/auth";
import prisma from "@/lib/prisma";

export default async function Home() {
  const { user } = await validateRequest();
  
  const routesData = await prisma.route.findMany({
    include: {
        origin: true,
        destination: true,
        bus: true,
    },
    orderBy: {
      departureTime: 'asc',
    },
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
      <main className="flex-1 container mx-auto py-8 px-4">
        <section className="text-center mb-4">
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-2">
            Find Your Next Journey
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our routes and book your ticket today.
          </p>
        </section>

        <div className="mt-2.5">
          <RouteSearch routes={routes} locations={locations} owners={owners} />
        </div>
        
      </main>
    </div>
  );
}
