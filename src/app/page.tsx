import { Header } from "@/components/Header";
import { RouteCard } from "@/components/RouteCard";
import { Card, CardContent } from "@/components/ui/card";
import { allRoutes } from "@/lib/data";
import { Bus, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <section className="text-center mb-12">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-primary mb-4">
            Find Your Next Journey
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Effortless bus booking at your fingertips. Explore our routes and book your ticket today.
          </p>
        </section>

        <section>
          <h2 className="font-headline text-3xl font-semibold text-primary mb-6">Available Routes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
          {allRoutes.length === 0 && (
            <Card className="col-span-full">
               <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                  <Bus className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="font-headline text-2xl font-semibold mb-2">No Routes Available</h3>
                  <p className="text-muted-foreground">Please check back later for available routes.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
