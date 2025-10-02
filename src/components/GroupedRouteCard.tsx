

"use client";

import type { Route, Bus, Location, BusOwner } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

interface GroupedRouteCardProps {
  routes: (Route & { bus: Bus & { owner: BusOwner }, origin: Location, destination: Location })[];
}

export function GroupedRouteCard({ routes }: GroupedRouteCardProps) {
  const firstRoute = routes[0];
  const { origin, destination } = firstRoute;
  const isExpired = new Date(firstRoute.departureTime) < new Date();

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300 relative">
       {isExpired && <Badge variant="destructive" className="absolute top-2 right-2 z-10">Expired</Badge>}
      <CardHeader className="p-4">
        <CardTitle className="text-xl font-semibold flex items-center">
          <span>{destination?.name || 'Unknown'}</span>
        </CardTitle>
        <CardDescription>From {origin?.name || 'Unknown'}</CardDescription>
        <div className="flex items-center text-sm text-muted-foreground pt-1">
          <Clock className="w-4 h-4 mr-2 text-primary/70" />
          <span>{new Date(firstRoute.departureTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(firstRoute.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 p-4 pt-0">
        <p className="text-sm font-medium">Select your bus type:</p>
        <div className='space-y-3'>
            {routes.map((route, index) => {
                const bus = route.bus;
                return (
                    <div key={route.id}>
                        {index > 0 && <Separator className="mb-3" />}
                        <div className="flex justify-between items-center gap-2">
                           <div>
                                <div className="flex items-center text-sm font-semibold">
                                    <span>{bus?.name || 'Standard Bus'}</span>
                                </div>
                                 <div className="text-xs text-muted-foreground">by {bus.owner.name}</div>
                                 <div className="text-lg font-bold text-primary">${Number(route.price).toFixed(2)}</div>
                           </div>
                            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground" size="sm" disabled={isExpired}>
                                <Link href={!isExpired ? `/book/${route.id}` : '#'}>
                                    {isExpired ? 'Expired' : 'Book'} <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                )
            })}
        </div>
      </CardContent>
    </Card>
  );
}
