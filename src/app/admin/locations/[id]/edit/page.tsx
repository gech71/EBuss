
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/store";
import { useRouter, useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditLocationPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const { locations, updateLocation } = useData();

    const id = params.id ? decodeURIComponent(params.id as string) : '';
    const [locationName, setLocationName] = useState('');

    useEffect(() => {
        if (id && locations.includes(id)) {
            setLocationName(id);
        } else {
             // Or handle as a not found case
        }
    }, [id, locations]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (locationName && locationName !== id) {
             if (locations.some(loc => loc.toLowerCase() === locationName.toLowerCase())) {
                toast({ title: "Error", description: "A location with this name already exists.", variant: "destructive" });
                return;
            }
            updateLocation(id, locationName);
            toast({
                title: "Success!",
                description: `Location has been updated to "${locationName}".`,
            });
            router.push("/admin/locations");
        } else {
            router.push("/admin/locations");
        }
    };

    if (!id || !locations.includes(id)) {
        notFound();
    }


    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Location</CardTitle>
                    <CardDescription>Update the details for this location.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Location Name</Label>
                            <Input 
                                id="name" 
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                placeholder="e.g., New York, NY" 
                                required 
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push('/admin/locations')}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
