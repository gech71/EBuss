
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/store";
import { generateSeats } from "@/lib/data";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewBusPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { addBus } = useData();
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState(48);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        // Basic validation
        if (!name || capacity <= 0) {
            toast({
                title: "Invalid Input",
                description: "Please provide a valid name and capacity.",
                variant: "destructive"
            });
            return;
        }

        // In a real app, seat layout would be more configurable
        const newBus = {
            name,
            capacity,
            layout: {
                rows: Math.ceil(capacity / 4), // Simple logic for layout
                cols: 5,
                seats: generateSeats(Math.ceil(capacity / 4), 5, 2),
            }
        };

        addBus(newBus);
        
        toast({
            title: "Success!",
            description: "New bus has been added.",
        });
        router.push("/admin/buses");
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Bus</CardTitle>
                    <CardDescription>Define the properties for the new bus.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Bus Name</Label>
                            <Input id="name" placeholder="e.g., Standard Cruiser" required value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="capacity">Capacity</Label>
                            <Input id="capacity" type="number" placeholder="e.g., 48" required value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit">Save Bus</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
