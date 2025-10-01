
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useTransition, useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Bus, Discount, Location } from "@prisma/client";
import { createRouteAction } from "@/app/admin/routes/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface NewRouteFormProps {
    locations: Location[];
    buses: Bus[];
    discounts: Discount[];
}

const initialState = {
    success: false,
    message: '',
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
    const formRef = useRef<HTMLFormElement>(null);
    
    const [originId, setOriginId] = useState<string>('');
    const [destinationId, setDestinationId] = useState<string>('');
    const [departureDate, setDepartureDate] = useState<Date>();
    const [departureTime, setDepartureTime] = useState('12:00');
    const [arrivalDate, setArrivalDate] = useState<Date>();
    const [arrivalTime, setArrivalTime] = useState('16:00');
    const [selectedBusIds, setSelectedBusIds] = useState<string[]>([]);
    
    const [openBuses, setOpenBuses] = useState(false);

    useEffect(() => {
        if (state.success) {
            toast({ title: "Success!", description: state.message });
            formRef.current?.reset();
            setOriginId('');
            setDestinationId('');
            setDepartureDate(undefined);
            setArrivalDate(undefined);
            setSelectedBusIds([]);
            router.push('/admin/routes');
        }
    }, [state, toast, router]);
    
    const handleFormAction = (formData: FormData) => {
        if (!originId || !destinationId || !departureDate || !arrivalDate || selectedBusIds.length === 0) {
            toast({ title: "Error", description: "Please fill out all fields, including selecting at least one bus.", variant: "destructive" });
            return;
        }
         if (originId === destinationId) {
            toast({ title: "Error", description: "Origin and destination cannot be the same.", variant: "destructive" });
            return;
        }

        formData.set('originId', originId);
        formData.set('destinationId', destinationId);
        formData.set('departureDate', format(departureDate, 'yyyy-MM-dd'));
        formData.set('departureTime', departureTime);
        formData.set('arrivalDate', format(arrivalDate, 'yyyy-MM-dd'));
        formData.set('arrivalTime', arrivalTime);
        formData.set('busIds', JSON.stringify(selectedBusIds));

        formAction(formData);
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
        <form ref={formRef} action={handleFormAction}>
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
                                 <Select name="originId" required value={originId} onValueChange={setOriginId}>
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
                                <Select name="destinationId" required value={destinationId} onValueChange={setDestinationId}>
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

                         {state.message && !state.success && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        )}
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
