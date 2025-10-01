
"use client";

import type { Route, Bus, Location, Discount } from '@prisma/client';
import { RouteCard } from './RouteCard';
import { Separator } from './ui/separator';
import { Ticket, Percent } from 'lucide-react';

interface FeaturedRoutesProps {
  routes: (Route & { bus: Bus, origin: Location, destination: Location, discount: Discount | null })[];
}

export function FeaturedRoutes({ routes }: FeaturedRoutesProps) {
  const upcomingRoutes = routes.filter(route => new Date(route.departureTime) >= new Date());
  const discountedRoutes = upcomingRoutes.filter(route => route.discount);
  const otherRoutes = upcomingRoutes.filter(route => !route.discount);

  return (
    <div className="space-y-12">
      {discountedRoutes.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Percent className="w-8 h-8 text-primary" />
            <h2 className="font-headline text-3xl font-semibold text-primary">Special Offers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {discountedRoutes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </section>
      )}

      {discountedRoutes.length > 0 && otherRoutes.length > 0 && <Separator />}

      {otherRoutes.length > 0 && (
        <section>
           <div className="flex items-center gap-3 mb-6">
            <Ticket className="w-8 h-8 text-primary" />
            <h2 className="font-headline text-3xl font-semibold text-primary">All Routes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {otherRoutes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
