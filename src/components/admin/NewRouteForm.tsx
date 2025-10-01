
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Bus, Discount, Location } from "@prisma/client";
import { createRouteAction } from "@/app/admin/routes/actions";

interface NewRouteFormProps {
    locations: Location[];
    buses: Bus[];
    discounts: Discount[];
}

const initialState = {
    success: false,
    message: ''
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Route"}</Button>
    )
}

export function NewRouteForm({ locations, buses, discounts }: NewRouteFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [state, formAction] = useFormState(createRouteAction, initialState);
    
    const [originId, setOriginId] = useState<string>('');
    const [destinationId, setDestinationId] = useState<string>('');
    const [departureDate, setDepartureDate] = useState<Date>();
    const [departureTime, setDepartureTime] = useState('12:00');
    const [arrivalDate, setArrivalDate] = useState<Date>();
    const [arrivalTime, setArrivalTime] = useState('16:00');
    const [selectedBusIds, setSelectedBusIds] = useState<string[]>([]);
    
    const [openBuses, setOpenBuses] = useState(false);

    useEffect(() => {
        if(state.message) {
            if (!state.success) {
                toast({ title: "Creation Failed", description: state.message, variant: "destructive" });
            }
        }
    }, [state, toast, router]);
    
    const toggleBusSelection = (busId: string) => {
        setSelectedBusIds(prev => 
        prev.includes(busId) 
            ? prev.filter(id => id !== busId)
            : [...prev, busId]
        );
    };

    const selectedBuses = buses.filter(b => selectedBusIds.includes(b.id));

    return (
        <form action={formAction}>
            <input type="hidden" name="originId" value={originId} />
            <input type="hidden" name="destinationId" value={destinationId} />
            {departureDate && <input type="hidden" name="departureDate" value={format(departureDate, 'yyyy-MM-dd')} />}
            <input type="hidden" name="departureTime" value={departureTime} />
            {arrivalDate && <input type="hidden" name="arrivalDate" value={format(arrivalDate, 'yyyy-MM-dd')} />}
            <input type="hidden" name="arrivalTime" value={arrivalTime} />
            <input type="hidden" name="busIds" value={JSON.stringify(selectedBusIds)} />

            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Route</CardTitle>
                    <CardDescription>Define the details for the new bus route. You can select multiple buses to create the same route for each of them.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="origin">Origin</Label>
                                 <Select required value={originId} onValueChange={setOriginId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an origin..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((location) => (
                                            <SelectItem key={location.id} value={location.id}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="destination">Destination</Label>
                                <Select required value={destinationId} onValueChange={setDestinationId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a destination..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((location) => (
                                            <SelectItem key={location.id} value={location.id}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    <Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} required />
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
                                     <Input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} required />
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
                                        {selectedBuses.length > 0 ? selectedBuses.map(b => b.name).join(', ') : "Select buses..."}
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
                                                        toggleBusSelection(bus.id);
                                                    }}
                                                >
                                                    <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedBusIds.includes(bus.id) ? "opacity-100" : "opacity-0"
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price</Label>
                                <Input id="price" name="price" type="number" step="0.01" placeholder="e.g., 45.00" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="discount">Discount Offer</Label>
                                 <Select name="discountId">
                                    <SelectTrigger id="discount">
                                        <SelectValue placeholder="Select a discount..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Discount</SelectItem>
                                        {discounts.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <SubmitButton />
                </CardFooter>
            </Card>
        </form>
    );
}
