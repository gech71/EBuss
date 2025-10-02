

"use client";

import type { Route, Bus, Location, Discount, BusOwner } from '@prisma/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Clock, Ticket, Percent, Building } from 'lucide-react';
import { Badge } from './ui/badge';

interface RouteCardProps {
  route: Route & { 
    origin: Location, 
    destination: Location, 
    bus: Bus & { owner: BusOwner }, 
    discount: Discount | null 
  };
}

export function RouteCard({ route }: RouteCardProps) {
  const { origin, destination, bus, discount } = route;
  const isExpired = new Date(route.departureTime) < new Date();

  return (
    <Card className="flex flex-col hover:shadow-xl transition-shadow duration-300 relative overflow-hidden group">
       {isExpired && <Badge variant="destructive" className="absolute top-3 right-3 z-10">Expired</Badge>}
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-sans text-2xl font-semibold">
                    <span>{destination?.name || 'Unknown'}</span>
                </CardTitle>
                <CardDescription>From {origin?.name || 'Unknown'}</CardDescription>
            </div>
             <div className="text-right flex flex-col items-end">
                {discount && !isExpired && (
                    <Badge className="bg-accent text-accent-foreground mb-1">
                        <Percent className="h-3 w-3 mr-1" />
                        Discount
                    </Badge>
                )}
                <div className="text-2xl font-bold text-primary">${Number(route.price).toFixed(2)}</div>
             </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 p-4 pt-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 mr-2" />
          <span>{new Date(route.departureTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(route.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Ticket className="w-4 h-4 mr-2" />
          <span>{bus?.name || 'Standard Bus'}</span>
        </div>
         <div className="flex items-center text-sm text-muted-foreground">
          <Building className="w-4 h-4 mr-2" />
          <span>{bus?.owner.name || 'Unknown Operator'}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors" disabled={isExpired}>
          <Link href={!isExpired ? `/book/${route.id}` : '#'}>
            {isExpired ? 'Expired' : 'Book Now'} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
