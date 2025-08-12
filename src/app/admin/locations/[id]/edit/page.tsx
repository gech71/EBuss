
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
    const [initialLocationFound, setInitialLocationFound] = useState(false);

    useEffect(() => {
        if (id && locations.includes(id)) {
            setLocationName(id);
            setInitialLocationFound(true);
        } else if (!initialLocationFound) {
            // Only call notFound on initial load if location doesn't exist
            // This prevents a 404 after a successful update
        }
    }, [id, locations, initialLocationFound]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (locationName && locationName !== id) {
             if (locations.some(loc => loc.toLowerCase() === locationName.toLowerCase() && loc !== id)) {
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

    // We check `initialLocationFound` which is set on the first successful load.
    // If the component is still mounted and the URL param `id` is no longer in `locations`,
    // it's because we just updated it, so we don't call notFound().
    if (!id || (!initialLocationFound && !locations.includes(id))) {
        // A check to see if the component is just loading
        const isStillLoading = !locations.length;
        if (!isStillLoading) {
            notFound();
        }
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
