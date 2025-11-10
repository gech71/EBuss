
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
import { useState, useTransition, useRef } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Bus, Discount, Location } from "@prisma/client";
import { createRouteAction } from "@/app/admin/routes/actions";
import { useCsrf } from "@/hooks/useCsrf";
import { BackButton } from "../BackButton";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { TicketType } from "@prisma/client";

interface NewRouteFormProps {
    locations: Location[];
    buses: Bus[];
    discounts: Discount[];
}

export function NewRouteForm({ locations, buses, discounts }: NewRouteFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);
    const { csrfToken, loading: csrfLoading } = useCsrf();
    
    const [departureDate, setDepartureDate] = useState<Date>();
    const [arrivalDate, setArrivalDate] = useState<Date>();
    const [selectedBusIds, setSelectedBusIds] = useState<string[]>([]);
    
    const [openBuses, setOpenBuses] = useState(false);
    
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        const originId = formData.get('originId') as string;
        const destinationId = formData.get('destinationId') as string;
        
        if (originId && originId === destinationId) {
            toast({ title: "Invalid Selection", description: "Origin and destination cannot be the same.", variant: "destructive" });
            return;
        }

        if (!originId || !destinationId || !departureDate || !arrivalDate || selectedBusIds.length === 0) {
            toast({ title: "Error", description: "Please fill out all fields, including selecting at least one bus.", variant: "destructive" });
            return;
        }

        formData.append('departureDate', format(departureDate, 'yyyy-MM-dd'));
        formData.append('arrivalDate', format(arrivalDate, 'yyyy-MM-dd'));
        formData.append('busIds', JSON.stringify(selectedBusIds));

        startTransition(async () => {
            const result = await createRouteAction(formData);
            if (result?.success === false) {
                 toast({ title: "Creation Failed", description: result.message, variant: "destructive" });
            } else {
                 toast({ title: "Success!", description: `${selectedBusIds.length} new route(s) have been added.` });
                 formRef.current?.reset();
                 setDepartureDate(undefined);
                 setArrivalDate(undefined);
                 setSelectedBusIds([]);
            }
        });
    };
    
    const toggleBusSelection = (busId: string) => {
        setSelectedBusIds(prev => 
        prev.includes(busId) 
            ? prev.filter(id => id !== busId)
            : [...prev, busId]
        );
    };

    const selectedBuses = buses.filter(b => selectedBusIds.includes(b.id));

    return (
        <form ref={formRef} onSubmit={handleSubmit}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <CardTitle>Add New Route</CardTitle>
                            <CardDescription>Define the details for the new bus route. You can select multiple buses to create the same route for each of them.</CardDescription>
                        </div>
                        <BackButton />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="origin">Origin</Label>
                                 <Select name="originId" required>
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
                                <Select name="destinationId" required>
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
                        <div className="space-y-4">
                           <div className="space-y-2">
                                <Label htmlFor="departureTime">Departure</Label>
                                <div className="flex flex-col sm:flex-row gap-2">
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
                                    <Input name="departureTime" type="time" defaultValue="12:00" />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="arrivalTime">Arrival</Label>
                                <div className="flex flex-col sm:flex-row gap-2">
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
                                     <Input name="arrivalTime" type="time" defaultValue="16:00" />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="space-y-3">
                            <Label>Ticket Type</Label>
                            <RadioGroup name="ticketType" defaultValue={TicketType.ONE_WAY} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={TicketType.ONE_WAY} id="one_way" />
                                    <Label htmlFor="one_way">One-Way</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={TicketType.ROUND_TRIP} id="round_trip" />
                                    <Label htmlFor="round_trip">Round-Trip</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="submit" disabled={isPending || csrfLoading}>{isPending ? "Saving..." : "Save Route"}</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
