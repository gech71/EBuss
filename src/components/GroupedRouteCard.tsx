
"use client";

import type { Route, Bus } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { Separator } from './ui/separator';

interface GroupedRouteCardProps {
  routes: Route[];
  buses: Bus[];
}

export function GroupedRouteCard({ routes, buses }: GroupedRouteCardProps) {
  const firstRoute = routes[0];

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="p-4">
        <CardTitle className="font-headline text-xl flex items-center">
          <span>{firstRoute.destination}</span>
        </CardTitle>
        <CardDescription>From {firstRoute.origin}</CardDescription>
        <div className="flex items-center text-sm text-muted-foreground pt-1">
          <Clock className="w-4 h-4 mr-2 text-primary/70" />
          <span>{new Date(firstRoute.departureTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(firstRoute.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 p-4 pt-0">
        <p className="text-sm font-medium">Select your bus type:</p>
        <div className='space-y-3'>
            {routes.map((route, index) => {
                const bus = buses.find(b => b.id === route.busId);
                return (
                    <div key={route.id}>
                        {index > 0 && <Separator className="mb-3" />}
                        <div className="flex justify-between items-center gap-2">
                           <div>
                                <div className="flex items-center text-sm font-semibold">
                                    <span>{bus?.name || 'Standard Bus'}</span>
                                </div>
                                 <div className="text-lg font-bold text-primary">${route.price.toFixed(2)}</div>
                           </div>
                            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground" size="sm">
                                <Link href={`/book/${route.id}`}>
                                    Book <ArrowRight className="ml-2 h-4 w-4" />
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
