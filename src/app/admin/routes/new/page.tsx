"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allBuses, allRoutes } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";

export default function NewRoutePage() {
    const { toast } = useToast();
    const router = useRouter();
    const [departureDate, setDepartureDate] = useState<Date>();

    const uniqueLocations = [...new Set([...allRoutes.map(r => r.origin), ...allRoutes.map(r => r.destination)])];

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // In a real app, you would handle form submission to your backend here.
        toast({
            title: "Success!",
            description: "New route has been added.",
        });
        router.push("/admin/routes");
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Route</CardTitle>
                    <CardDescription>Define the details for the new bus route.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="origin">Origin</Label>
                                <Select required>
                                    <SelectTrigger id="origin">
                                        <SelectValue placeholder="Select origin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="destination">Destination</Label>
                                <Select required>
                                    <SelectTrigger id="destination">
                                        <SelectValue placeholder="Select destination" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="departureTime">Departure Date & Time</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !departureDate && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={departureDate}
                                    onSelect={setDepartureDate}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="busId">Bus</Label>
                            <Select required>
                                <SelectTrigger id="busId">
                                    <SelectValue placeholder="Select a bus" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allBuses.map(bus => <SelectItem key={bus.id} value={bus.id}>{bus.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price</Label>
                            <Input id="price" type="number" step="0.01" placeholder="e.g., 45.00" required />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit">Save Route</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
