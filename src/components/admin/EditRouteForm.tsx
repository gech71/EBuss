
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState, useTransition } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Route, Bus, Discount, Location } from "@prisma/client";
import { updateRouteAction } from "@/app/admin/routes/actions";
import { Separator } from "@/components/ui/separator";

interface EditRouteFormProps {
    route: Route;
    locations: Location[];
    buses: Bus[];
    discounts: Discount[];
}

export function EditRouteForm({ route, locations, buses, discounts }: EditRouteFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [departureDate, setDepartureDate] = useState<Date | undefined>(new Date(route.departureTime));
    const [departureTime, setDepartureTime] = useState(format(new Date(route.departureTime), "HH:mm"));
    const [arrivalDate, setArrivalDate] = useState<Date | undefined>(new Date(route.arrivalTime));
    const [arrivalTime, setArrivalTime] = useState(format(new Date(route.arrivalTime), "HH:mm"));

    const handleSubmit = (formData: FormData) => {
        if (!departureDate || !arrivalDate) {
            toast({ title: "Error", description: "Please fill out all fields.", variant: "destructive" });
            return;
        }

        const originId = formData.get('originId') as string;
        const destinationId = formData.get('destinationId') as string;
        if (originId === destinationId) {
            toast({ title: "Error", description: "Origin and destination cannot be the same.", variant: "destructive" });
            return;
        }
        
        formData.append('routeId', route.id);
        formData.append('departureDate', format(departureDate, 'yyyy-MM-dd'));
        formData.append('departureTime', departureTime);
        formData.append('arrivalDate', format(arrivalDate, 'yyyy-MM-dd'));
        formData.append('arrivalTime', arrivalTime);
        // The form only submits the one busId, but we pass it as an array to match the schema
        const selectedBusId = formData.get('busId');
        formData.append('busIds', JSON.stringify(selectedBusId ? [selectedBusId] : []));
        formData.delete('busId');


        startTransition(async () => {
            const result = await updateRouteAction(formData);
            if (result?.success === false) {
                 toast({ title: "Update Failed", description: result.message, variant: "destructive" });
            } else {
                 toast({ title: "Success!", description: "Route has been updated."});
            }
        });
    };

    return (
        <form action={handleSubmit}>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Route</CardTitle>
                    <CardDescription>Update the details for this bus route.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="originId">Origin</Label>
                             <Select name="originId" defaultValue={route.originId}>
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
                            <Label htmlFor="destinationId">Destination</Label>
                            <Select name="destinationId" defaultValue={route.destinationId}>
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
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                         <Select name="busId" defaultValue={route.busId}>
                            <SelectTrigger id="busId">
                                <SelectValue placeholder="Select a bus..." />
                            </SelectTrigger>
                            <SelectContent>
                                {buses.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price</Label>
                            <Input id="price" name="price" type="number" step="0.01" placeholder="e.g., 45.00" required defaultValue={Number(route.price)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="discount">Discount Offer</Label>
                             <Select name="discountId" defaultValue={route.discountId || 'none'}>
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
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.push('/admin/routes')}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
