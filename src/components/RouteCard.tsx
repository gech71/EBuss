import type { Route } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Ticket } from 'lucide-react';
import { allBuses } from '@/lib/data';

interface RouteCardProps {
  route: Route;
}

export function RouteCard({ route }: RouteCardProps) {
  const bus = allBuses.find(b => b.id === route.busId);

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center justify-between">
          <span>{route.destination}</span>
          <span className="text-3xl font-bold text-primary">${route.price.toFixed(2)}</span>
        </CardTitle>
        <CardDescription>From {route.origin}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mr-2 text-primary/70" />
          <span>{route.origin} to {route.destination}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 mr-2 text-primary/70" />
          <span>Departs: {route.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Ticket className="w-4 h-4 mr-2 text-primary/70" />
          <span>{bus?.name || 'Standard Bus'}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href={`/book/${route.id}`}>
            Book Now <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
