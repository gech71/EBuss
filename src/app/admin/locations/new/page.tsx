
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewLocationPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { addLocation, locations } = useData();
    const [name, setName] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name) {
            toast({ title: "Error", description: "Location name cannot be empty.", variant: "destructive" });
            return;
        }
        if (locations.some(loc => loc.toLowerCase() === name.toLowerCase())) {
             toast({ title: "Error", description: "This location already exists.", variant: "destructive" });
             return;
        }
        addLocation(name);
        toast({
            title: "Success!",
            description: `Location "${name}" has been added.`,
        });
        router.push("/admin/locations");
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Location</CardTitle>
                    <CardDescription>Enter the details for the new location.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Location Name</Label>
                            <Input 
                                id="name" 
                                placeholder="e.g., New York, NY" 
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit">Save Location</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
