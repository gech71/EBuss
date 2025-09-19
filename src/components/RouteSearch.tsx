
"use client";

import { useState, useMemo } from 'react';
import type { Route, Bus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Search, Bus as BusIcon, ArrowLeft } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { RouteCard } from './RouteCard';
import { GroupedRouteCard } from './GroupedRouteCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface GroupedRoutes {
  [key: string]: Route[];
}

interface RouteSearchProps {
    routes: Route[];
    buses: Bus[];
    locations: string[];
}

export function RouteSearch({ routes, buses, locations }: RouteSearchProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [searchResults, setSearchResults] = useState<Route[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [openDate, setOpenDate] = useState(false);

  const handleSearch = () => {
    const results = routes.filter(route => {
      const isOriginMatch = !origin || route.origin === origin;
      const isDestinationMatch = !destination || route.destination === destination;
      const isDateMatch = !date || format(new Date(route.departureTime), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      return isOriginMatch && isDestinationMatch && isDateMatch;
    });
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleModifySearch = () => {
    setHasSearched(false);
    setSearchResults([]);
  };

  const groupedSearchResults = useMemo(() => {
    return searchResults.reduce((acc: GroupedRoutes, route) => {
      const key = `${route.origin}-${route.destination}-${route.departureTime.toISOString()}`;
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Origin</label>
                            <Select value={origin} onValueChange={setOrigin}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select origin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc} value={loc}>
                                            {loc}
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
                                    {locations.map((loc) => (
                                        <SelectItem key={loc} value={loc}>
                                            {loc}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
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
                        <Button onClick={handleSearch} className="md:col-span-full lg:col-span-3">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}
      
      {hasSearched && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline text-3xl font-semibold text-primary">Search Results</h2>
            <Button variant="outline" onClick={handleModifySearch}>
              <ArrowLeft className="mr-2 h-4 w-4"/>
              Modify Search
            </Button>
          </div>

          {Object.keys(groupedSearchResults).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.values(groupedSearchResults).map((routeGroup, index) => {
                if (routeGroup.length > 1) {
                  return <GroupedRouteCard key={index} routes={routeGroup} buses={buses} />;
                }
                return <RouteCard key={routeGroup[0].id} route={routeGroup[0]} buses={buses}/>;
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
