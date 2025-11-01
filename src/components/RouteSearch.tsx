

"use client";

import { useState, useMemo } from 'react';
import type { Route, Bus, Location, BusOwner, Discount } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Search, Bus as BusIcon, ArrowLeft, Check, ChevronsUpDown, Building } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { GroupedRouteCard } from './GroupedRouteCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type EnrichedRoute = Route & { 
  bus: Bus & { owner: BusOwner }, 
  origin: Location, 
  destination: Location,
  discount: Discount | null
};

interface GroupedRoutes {
  [key: string]: EnrichedRoute[];
}

interface RouteSearchProps {
    routes: EnrichedRoute[];
    locations: Location[];
    owners: BusOwner[];
}

export function RouteSearch({ routes, locations, owners }: RouteSearchProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [searchResults, setSearchResults] = useState<EnrichedRoute[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const { toast } = useToast();

  const [openDate, setOpenDate] = useState(false);
  const [openOwners, setOpenOwners] = useState(false);

  const handleSearch = () => {
    if (origin && origin === destination) {
        toast({
            title: "Invalid Search",
            description: "Origin and destination cannot be the same.",
            variant: "destructive"
        });
        return;
    }
    const results = routes.filter(route => {
      const isOwnerMatch = selectedOwnerIds.length === 0 || selectedOwnerIds.includes(route.bus.ownerId);
      const isOriginMatch = !origin || route.origin.name === origin;
      const isDestinationMatch = !destination || route.destination.name === destination;
      const isDateMatch = !date || format(new Date(route.departureTime), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      return isOwnerMatch && isOriginMatch && isDestinationMatch && isDateMatch;
    });
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleModifySearch = () => {
    setHasSearched(false);
    setSearchResults([]);
  };

  const toggleOwnerSelection = (ownerId: string) => {
    setSelectedOwnerIds(prev =>
      prev.includes(ownerId)
        ? prev.filter(id => id !== ownerId)
        : [...prev, ownerId]
    );
  };

  const filteredLocations = useMemo(() => {
    if (selectedOwnerIds.length === 0) {
      return locations;
    }
    const locationIdsInFilteredRoutes = new Set<string>();
    routes.forEach(route => {
      if (selectedOwnerIds.includes(route.bus.ownerId)) {
        locationIdsInFilteredRoutes.add(route.originId);
        locationIdsInFilteredRoutes.add(route.destinationId);
      }
    });
    return locations.filter(location => locationIdsInFilteredRoutes.has(location.id));
  }, [selectedOwnerIds, locations, routes]);

  const selectedOwners = owners.filter(o => selectedOwnerIds.includes(o.id));

  const groupedSearchResults = useMemo(() => {
    return searchResults.reduce((acc: GroupedRoutes, route) => {
      const key = `${route.origin.name}-${route.destination.name}-${new Date(route.departureTime).toISOString()}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(route);
      return acc;
    }, {});
  }, [searchResults]);

  return (
    <section>
        {!hasSearched && (
            <Card className="mb-8 shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-primary">Search for Routes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">Bus Companies</label>
                            <Popover open={openOwners} onOpenChange={setOpenOwners}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openOwners}
                                    className="w-full justify-between font-normal"
                                    >
                                    <span className="truncate">
                                        {selectedOwners.length > 0 ? selectedOwners.map(b => b.name).join(', ') : "Select companies..."}
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Origin</label>
                            <Select value={origin} onValueChange={setOrigin}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select origin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredLocations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.name}>
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Destination</label>
                            <Select value={destination} onValueChange={setDestination}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select destination..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredLocations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.name}>
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2 lg:col-span-3">
                            <label className="text-sm font-medium text-muted-foreground">Date</label>
                            <Popover open={openDate} onOpenChange={setOpenDate}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className="w-full justify-start text-left font-normal"
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(selectedDate) => {
                                        setDate(selectedDate);
                                        setOpenDate(false);
                                    }}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button onClick={handleSearch} className="w-full lg:w-auto lg:col-span-1">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}
      
      {hasSearched && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="font-headline text-3xl font-semibold text-primary">Search Results</h2>
            <Button variant="outline" onClick={handleModifySearch} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4"/>
              Modify Search
            </Button>
          </div>

          {Object.keys(groupedSearchResults).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.values(groupedSearchResults).map((routeGroup, index) => {
                  return <GroupedRouteCard key={index} routes={routeGroup} />;
              })}
            </div>
          ) : (
            <Card className="col-span-full">
               <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                  <BusIcon className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="font-headline text-2xl font-semibold mb-2">No Routes Found</h3>
                  <p className="text-muted-foreground">Your search did not match any available routes. Try broadening your search criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

    </section>
  );
}
