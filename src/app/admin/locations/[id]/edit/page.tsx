"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditLocationPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const id = params.id ? decodeURIComponent(params.id as string) : '';
    const [locationName, setLocationName] = useState(id);

    // In a real app, you would fetch the location data from your backend using the id.
    // For now, we'll just use the id from the URL.
    useEffect(() => {
        setLocationName(id);
    }, [id]);


    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // In a real app, you would handle form submission to update the data on your backend.
        toast({
            title: "Success!",
            description: `Location "${locationName}" has been updated.`,
        });
        router.push("/admin/locations");
    };

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
