
"use client";

import { useState, useMemo } from 'react';
import type { Route } from '@/lib/types';
import { useData } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Search, Bus, Check, ChevronsUpDown, ArrowLeft } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from 'date-fns';
import { RouteCard } from './RouteCard';
import { cn } from '@/lib/utils';

export function RouteSearch() {
  const { routes } = useData();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [searchResults, setSearchResults] = useState<Route[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [openOrigin, setOpenOrigin] = useState(false)
  const [openDestination, setOpenDestination] = useState(false)

  const uniqueOrigins = useMemo(() => [...new Set(routes.map(route => route.origin))], [routes]);
  const uniqueDestinations = useMemo(() => [...new Set(routes.map(route => route.destination))], [routes]);


  const handleSearch = () => {
    const results = routes.filter(route => {
      const isOriginMatch = !origin || route.origin.toLowerCase() === origin.toLowerCase();
      const isDestinationMatch = !destination || route.destination.toLowerCase() === destination.toLowerCase();
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
                            <Popover open={openOrigin} onOpenChange={setOpenOrigin}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openOrigin}
                                    className="w-full justify-between"
                                    >
                                    {origin
                                        ? uniqueOrigins.find((o) => o.toLowerCase() === origin.toLowerCase())
                                        : "Select origin..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                    <CommandInput placeholder="Search origin..." />
                                    <CommandList>
                                    <CommandEmpty>No origin found.</CommandEmpty>
                                    <CommandGroup>
                                        {uniqueOrigins.map((o) => (
                                        <CommandItem
                                            key={o}
                                            value={o}
                                            onSelect={(currentValue) => {
                                            setOrigin(currentValue === origin ? "" : currentValue)
                                            setOpenOrigin(false)
                                            }}
                                        >
                                            <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                origin === o ? "opacity-100" : "opacity-0"
                                            )}
                                            />
                                            {o}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Destination</label>
                            <Popover open={openDestination} onOpenChange={setOpenDestination}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openDestination}
                                    className="w-full justify-between"
                                    >
                                    {destination
                                        ? uniqueDestinations.find((d) => d.toLowerCase() === destination.toLowerCase())
                                        : "Select destination..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                    <CommandInput placeholder="Search destination..." />
                                    <CommandList>
                                    <CommandEmpty>No destination found.</CommandEmpty>
                                    <CommandGroup>
                                        {uniqueDestinations.map((d) => (
                                        <CommandItem
                                            key={d}
                                            value={d}
                                            onSelect={(currentValue) => {
                                            setDestination(currentValue === destination ? "" : currentValue)
                                            setOpenDestination(false)
                                            }}
                                        >
                                            <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                destination === d ? "opacity-100" : "opacity-0"
                                            )}
                                            />
                                            {d}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Date</label>
                            <Popover>
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
                                    onSelect={setDate}
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

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </div>
          ) : (
            <Card className="col-span-full">
               <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                  <Bus className="w-16 h-16 text-muted-foreground mb-4" />
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
