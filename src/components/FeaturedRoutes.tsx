

"use client";

import { useState, useMemo } from 'react';
import type { Route, Bus, Location, Discount, BusOwner } from '@prisma/client';
import { RouteCard } from './RouteCard';
import { Separator } from './ui/separator';
import { Ticket, Percent, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from './ui/pagination';
import { cn } from '@/lib/utils';

type EnrichedRoute = Route & { 
  bus: Bus & { owner: BusOwner }, 
  origin: Location, 
  destination: Location, 
  discount: Discount | null 
};

interface FeaturedRoutesProps {
  routes: EnrichedRoute[];
}

const ITEMS_PER_PAGE = 8;

export function FeaturedRoutes({ routes }: FeaturedRoutesProps) {
  const owners = useMemo(() => {
    const ownerMap = new Map<string, BusOwner>();
    routes.forEach(route => {
      if (!ownerMap.has(route.bus.owner.id)) {
        ownerMap.set(route.bus.owner.id, route.bus.owner);
      }
    });
    return Array.from(ownerMap.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [routes]);
  
  const [openOwners, setOpenOwners] = useState(false);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);

  const [discountedPage, setDiscountedPage] = useState(1);
  const [otherRoutesPage, setOtherRoutesPage] = useState(1);
  
  const upcomingRoutes = routes.filter(route => new Date(route.departureTime) >= new Date());

  const filteredRoutes = useMemo(() => {
    if (selectedOwnerIds.length === 0) {
      return upcomingRoutes;
    }
    return upcomingRoutes.filter(route => selectedOwnerIds.includes(route.bus.ownerId));
  }, [upcomingRoutes, selectedOwnerIds]);

  const discountedRoutes = filteredRoutes.filter(route => route.discount);
  const otherRoutes = filteredRoutes.filter(route => !route.discount);

  // Pagination for discounted routes
  const totalDiscountedPages = Math.ceil(discountedRoutes.length / ITEMS_PER_PAGE);
  const paginatedDiscountedRoutes = discountedRoutes.slice(
    (discountedPage - 1) * ITEMS_PER_PAGE,
    discountedPage * ITEMS_PER_PAGE
  );

  // Pagination for other routes
  const totalOtherRoutesPages = Math.ceil(otherRoutes.length / ITEMS_PER_PAGE);
  const paginatedOtherRoutes = otherRoutes.slice(
    (otherRoutesPage - 1) * ITEMS_PER_PAGE,
    otherRoutesPage * ITEMS_PER_PAGE
  );
  
  const toggleOwnerSelection = (ownerId: string) => {
    setSelectedOwnerIds(prev =>
      prev.includes(ownerId)
        ? prev.filter(id => id !== ownerId)
        : [...prev, ownerId]
    );
    // Reset page on filter change
    setDiscountedPage(1);
    setOtherRoutesPage(1);
  };
  
  const selectedOwners = owners.filter(o => selectedOwnerIds.includes(o.id));

  const OwnerFilter = () => (
    <div className="mb-6 md:mb-0">
        <Popover open={openOwners} onOpenChange={setOpenOwners}>
            <PopoverTrigger asChild>
                <Button
                variant="outline"
                role="combobox"
                aria-expanded={openOwners}
                className="w-full md:w-[250px] justify-between font-normal"
                >
                <span className="truncate">
                    {selectedOwners.length > 0 ? `${selectedOwners.length} of ${owners.length} selected` : "Filter by company..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search companies..." />
                    <CommandList>
                        <CommandEmpty>No companies found.</CommandEmpty>
                        <CommandGroup>
                            {owners.map((owner) => (
                            <CommandItem
                                key={owner.id}
                                value={owner.name}
                                onSelect={() => toggleOwnerSelection(owner.id)}
                            >
                                <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedOwnerIds.includes(owner.id) ? "opacity-100" : "opacity-0"
                                )}
                                />
                                {owner.name}
                            </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    </div>
  );

  return (
    <div className="space-y-2">
      {discountedRoutes.length > 0 && (
        <section>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Percent className="w-8 h-8 text-primary" />
              <h2 className="font-headline text-3xl font-semibold text-primary">Special Offers</h2>
            </div>
             <OwnerFilter />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedDiscountedRoutes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
           {totalDiscountedPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setDiscountedPage(p => Math.max(p - 1, 1))} 
                    disabled={discountedPage === 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm font-medium p-2">
                    Page {discountedPage} of {totalDiscountedPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setDiscountedPage(p => Math.min(p + 1, totalDiscountedPages))}
                    disabled={discountedPage === totalDiscountedPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </section>
      )}

      {discountedRoutes.length > 0 && otherRoutes.length > 0 && <Separator />}

      {otherRoutes.length > 0 && (
        <section>
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Ticket className="w-8 h-8 text-primary" />
              <h2 className="font-headline text-3xl font-semibold text-primary">All Routes</h2>
            </div>
             {discountedRoutes.length === 0 && <OwnerFilter />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedOtherRoutes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
           {totalOtherRoutesPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setOtherRoutesPage(p => Math.max(p - 1, 1))} 
                    disabled={otherRoutesPage === 1}
                  />
                </PaginationItem>
                 <PaginationItem>
                  <span className="text-sm font-medium p-2">
                    Page {otherRoutesPage} of {totalOtherRoutesPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setOtherRoutesPage(p => Math.min(p + 1, totalOtherRoutesPages))}
                    disabled={otherRoutesPage === totalOtherRoutesPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </section>
      )}
    </div>
  );
}
