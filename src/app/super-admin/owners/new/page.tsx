
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewOwnerPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { addOwner, owners } = useData();
    const [name, setName] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name) {
            toast({ title: "Error", description: "Owner name cannot be empty.", variant: "destructive" });
            return;
        }
        if (owners.some(o => o.name.toLowerCase() === name.toLowerCase())) {
             toast({ title: "Error", description: "An owner with this name already exists.", variant: "destructive" });
             return;
        }
        addOwner(name);
        toast({
            title: "Success!",
            description: `Owner "${name}" has been added.`,
        });
        router.push("/super-admin/owners");
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Bus Owner</CardTitle>
                    <CardDescription>Enter the name for the new bus owner account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Owner Name</Label>
                            <Input 
                                id="name" 
                                placeholder="e.g., Metro Transit Inc." 
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit">Save Owner</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
