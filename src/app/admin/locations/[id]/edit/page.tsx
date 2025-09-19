
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
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
    const location = await prisma.location.findUnique({
        where: { id: params.id }
    });

    if (!location) {
        notFound();
    }

    return (
        <form action={updateLocationAction}>
            <input type="hidden" name="id" value={location.id} />
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Location</CardTitle>
                    <CardDescription>
                        Update the name for "{location.name}".
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">New Location Name</Label>
                            <Input 
                                id="name" 
                                name="name"
                                defaultValue={location.name}
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
