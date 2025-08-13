
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams, notFound } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { useState, useEffect } from "react";
import type { Route } from "@/lib/types";


export default function EditRoutePage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const { locations, buses, routes, updateRoute } = useData();

    const id = params.id as string;
    const [route, setRoute] = useState<Route | null>(null);
    
    const [origin, setOrigin] = useState<string>('');
    const [destination, setDestination] = useState<string>('');
    const [departureDate, setDepartureDate] = useState<Date>();
    const [departureTime, setDepartureTime] = useState('12:00');
    const [arrivalDate, setArrivalDate] = useState<Date>();
    const [arrivalTime, setArrivalTime] = useState('16:00');
    const [selectedBusId, setSelectedBusId] = useState<string>('');
    const [price, setPrice] = useState<number>(0);

    const [openOrigin, setOpenOrigin] = useState(false)
    const [openDestination, setOpenDestination] = useState(false)
    const [openBuses, setOpenBuses] = useState(false);

    useEffect(() => {
        const routeToEdit = routes.find(r => r.id === id);
        if (routeToEdit) {
            setRoute(routeToEdit);
            setOrigin(routeToEdit.origin);
            setDestination(routeToEdit.destination);
            setDepartureDate(new Date(routeToEdit.departureTime));
            setDepartureTime(format(new Date(routeToEdit.departureTime), "HH:mm"));
            setArrivalDate(new Date(routeToEdit.arrivalTime));
            setArrivalTime(format(new Date(routeToEdit.arrivalTime), "HH:mm"));
            setSelectedBusId(routeToEdit.busId);
            setPrice(routeToEdit.price);
        } else {
            // notFound();
        }
    }, [id, routes]);


    const combineDateTime = (date: Date, time: string): Date => {
        const [hours, minutes] = time.split(':').map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate;
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!route || !origin || !destination || !departureDate || !arrivalDate || !selectedBusId || price <= 0) {
            toast({ title: "Error", description: "Please fill out all fields.", variant: "destructive" });
            return;
        }

        if (origin === destination) {
            toast({ title: "Error", description: "Origin and destination cannot be the same.", variant: "destructive" });
            return;
        }

        const fullDepartureTime = combineDateTime(departureDate, departureTime);
        const fullArrivalTime = combineDateTime(arrivalDate, arrivalTime);

        if (fullArrivalTime <= fullDepartureTime) {
            toast({ title: "Error", description: "Arrival time must be after departure time.", variant: "destructive" });
            return;
        }

        const updatedRoute: Route = {
            ...route,
            origin,
            destination,
            departureTime: fullDepartureTime,
            arrivalTime: fullArrivalTime,
            busId: selectedBusId,
            price,
        };
        updateRoute(updatedRoute);


        toast({
            title: "Success!",
            description: "Route has been updated.",
        });
        router.push("/admin/routes");
    };

    if (!route) {
        return <p>Loading route...</p>
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Route</CardTitle>
                    <CardDescription>Update the details for this bus route.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="origin">Origin</Label>
                                 <Popover open={openOrigin} onOpenChange={setOpenOrigin}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={openOrigin} className="w-full justify-between">
                                            {origin ? locations.find((l) => l === origin) : "Select origin..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search location..." />
                                            <CommandList>
                                                <CommandEmpty>No location found.</CommandEmpty>
                                                <CommandGroup>
                                                    {locations.map((location) => (
                                                        <CommandItem
                                                            key={location}
                                                            value={location}
                                                            onSelect={(currentValue) => {
                                                                setOrigin(currentValue === origin ? "" : currentValue)
                                                                setOpenOrigin(false)
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", origin === location ? "opacity-100" : "opacity-0")} />
                                                            {location}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="destination">Destination</Label>
                                <Popover open={openDestination} onOpenChange={setOpenDestination}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={openDestination} className="w-full justify-between">
                                            {destination ? locations.find((l) => l === destination) : "Select destination..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search location..." />
                                            <CommandList>
                                                <CommandEmpty>No location found.</CommandEmpty>
                                                <CommandGroup>
                                                    {locations.map((location) => (
                                                        <CommandItem
                                                            key={location}
                                                            value={location}
                                                            onSelect={(currentValue) => {
                                                                setDestination(currentValue === destination ? "" : currentValue)
                                                                setOpenDestination(false)
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", destination === location ? "opacity-100" : "opacity-0")} />
                                                            {location}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="departureTime">Departure</Label>
                                <div className="flex gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !departureDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={departureDate} onSelect={setDepartureDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="arrivalTime">Arrival</Label>
                                <div className="flex gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !arrivalDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {arrivalDate ? format(arrivalDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={arrivalDate} onSelect={setArrivalDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                     <Input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} />
                                </div>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="busId">Bus</Label>
                            <Popover open={openBuses} onOpenChange={setOpenBuses}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openBuses}
                                    className="w-full justify-between"
                                    >
                                    <span className="truncate">
                                        {selectedBusId ? buses.find(b => b.id === selectedBusId)?.name : "Select a bus..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search bus types..." />
                                        <CommandList>
                                            <CommandEmpty>No bus types found.</CommandEmpty>
                                            <CommandGroup>
                                                {buses.map((bus) => (
                                                <CommandItem
                                                    key={bus.id}
                                                    value={bus.name}
                                                    onSelect={() => {
                                                        setSelectedBusId(bus.id);
                                                        setOpenBuses(false);
                                                    }}
                                                >
                                                    <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedBusId === bus.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                    />
                                                    {bus.name}
                                                </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price</Label>
                            <Input id="price" type="number" step="0.01" placeholder="e.g., 45.00" required value={price || ''} onChange={e => setPrice(Number(e.target.value))} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.push('/admin/routes')}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
