
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { updateLocationAction } from "@/app/admin/locations/actions";
import { SubmitButton } from "@/components/SubmitButton";

interface EditLocationPageProps {
    params: { id: string };
}

export default async function EditLocationPage({ params }: EditLocationPageProps) {
    const locationName = decodeURIComponent(params.id);

    // In a real app with a dedicated `locations` table, you would fetch by ID.
    // Here, we just use the name from the URL.
    if (!locationName) {
        notFound();
    }

    return (
        <form action={updateLocationAction}>
            <input type="hidden" name="oldName" value={locationName} />
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Location</CardTitle>
                    <CardDescription>
                        Update the name for "{locationName}". This will update all routes that use this location.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newName">New Location Name</Label>
                            <Input 
                                id="newName" 
                                name="newName"
                                defaultValue={locationName}
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
                    <SubmitButton>Save Changes</SubmitButton>
                </CardFooter>
            </Card>
        </form>
    );
}

