
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/store";
import { generateSeats } from "@/lib/data";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

export default function NewBusPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { addBus } = useData();
    const [name, setName] = useState('');
    const [rows, setRows] = useState(12);
    const [cols, setCols] = useState(5);
    const [aisleCol, setAisleCol] = useState(2);
    
    const capacity = useMemo(() => {
        if (cols > 0) {
            return rows * (cols - 1);
        }
        return 0;
    }, [rows, cols]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        // Basic validation
        if (!name || rows <= 0 || cols <= 0 || aisleCol < 0 || aisleCol >= cols) {
            toast({
                title: "Invalid Input",
                description: "Please provide valid details for the bus layout.",
                variant: "destructive"
            });
            return;
        }

        const newBus = {
            name,
            capacity,
            layout: {
                rows,
                cols,
                seats: generateSeats(rows, cols, aisleCol),
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
                    <CardDescription>Define the properties and seat layout for the new bus.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Bus Name</Label>
                            <Input id="name" placeholder="e.g., Standard Cruiser" required value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rows">Rows</Label>
                                <Input id="rows" type="number" placeholder="e.g., 12" required value={rows} onChange={e => setRows(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cols">Columns</Label>
                                <Input id="cols" type="number" placeholder="e.g., 5" required value={cols} onChange={e => setCols(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="aisleCol">Aisle Column (0-indexed)</Label>
                                <Input id="aisleCol" type="number" placeholder="e.g., 2" required value={aisleCol} onChange={e => setAisleCol(Number(e.target.value))} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>Calculated Capacity</Label>
                            <Input value={capacity} disabled className="font-bold" />
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
