
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { createLocationAction } from "@/app/admin/locations/actions";
import { SubmitButton } from "@/components/SubmitButton";


export default async function NewLocationPage() {
    
    return (
        <form action={createLocationAction}>
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Location</CardTitle>
                    <CardDescription>Enter the details for the new location. Note: this adds the location to the list of available places but does not create a route.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Location Name</Label>
                            <Input 
                                id="name" 
                                name="name"
                                placeholder="e.g., New York, NY" 
                                required
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/admin/locations">Cancel</Link>
                    </Button>
                    <SubmitButton>Save Location</SubmitButton>
                </CardFooter>
            </Card>
        </form>
    );
}
