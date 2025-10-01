
"use client";

import type { Route, Bus, Location, Discount } from '@prisma/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Clock, Ticket, Percent } from 'lucide-react';
import { Badge } from './ui/badge';

interface RouteCardProps {
  route: Route & { origin: Location, destination: Location, bus: Bus, discount: Discount | null };
}

export function RouteCard({ route }: RouteCardProps) {
  const { origin, destination, bus, discount } = route;
  const isExpired = new Date(route.departureTime) < new Date();

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300 relative overflow-hidden">
       {isExpired && <Badge variant="destructive" className="absolute top-3 right-3 z-10">Expired</Badge>}
       {discount && !isExpired && (
         <Badge className="absolute top-3 right-3 z-10 bg-green-600 hover:bg-green-700">
          <Percent className="h-3 w-3 mr-1" />
          Discount
        </Badge>
       )}
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-xl flex items-center pr-20">
                    <span>{destination?.name || 'Unknown'}</span>
                </CardTitle>
                <CardDescription>From {origin?.name || 'Unknown'}</CardDescription>
            </div>
            <div className="text-2xl font-bold text-primary">${route.price.toFixed(2)}</div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 p-4 pt-0">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 mr-2 text-primary/70" />
          <span>{new Date(route.departureTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(route.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Ticket className="w-4 h-4 mr-2 text-primary/70" />
          <span>{bus?.name || 'Standard Bus'}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isExpired}>
          <Link href={!isExpired ? `/book/${route.id}` : '#'}>
            {isExpired ? 'Expired' : 'Book Now'} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
