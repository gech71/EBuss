
"use client";

import { Header } from '@/components/Header';
import { SeatMap } from '@/components/booking/SeatMap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/lib/store';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock, Bus } from 'lucide-react';

export default function BookPage({ params }: { params: { id: string } }) {
  const { routes, buses } = useData();
  const route = routes.find((r) => r.id === params.id);
  
  if (!route) {
    notFound();
  }
  
  const bus = buses.find((b) => b.id === route.busId);
  if (!bus) {
    // Handle case where bus might not be found, maybe show an error or default
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-3xl">Select Your Seat</CardTitle>
                <CardDescription>Choose your preferred seat from the layout below.</CardDescription>
              </CardHeader>
              <CardContent>
                <SeatMap bus={bus} route={route} />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Trip Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center font-semibold text-lg">
                  <span>{route.origin}</span>
                  <ArrowRight className="mx-2 h-5 w-5 text-primary" />
                  <span>{route.destination}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-2">
                    <p className="flex items-center"><Clock className="mr-2 h-4 w-4" />{new Date(route.departureTime).toLocaleString()}</p>
                    <p className="flex items-center"><Bus className="mr-2 h-4 w-4" />{bus.name}</p>
                </div>
                 <div className="border-t pt-4">
                    <p className="flex justify-between text-lg font-bold text-primary">
                        <span>Price per seat:</span>
                        <span>${route.price.toFixed(2)}</span>
                    </p>
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
