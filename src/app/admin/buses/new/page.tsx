
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export default function NewBusPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { addBus } = useData();
    const [name, setName] = useState('');
    const [rows, setRows] = useState(12);
    const [cols, setCols] = useState(5);
    const [aisleCols, setAisleCols] = useState('2');
    const [lastRowFull, setLastRowFull] = useState(false);
    
    const parsedAisleCols = useMemo(() => {
        return aisleCols.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    }, [aisleCols]);

    const capacity = useMemo(() => {
        if (cols <= 0 || rows <= 0) return 0;
        
        const baseCapacity = rows * (cols - parsedAisleCols.length);
        
        // If the last row is a full bench, add back a seat for each aisle.
        if (lastRowFull) {
            return baseCapacity + parsedAisleCols.length;
        }
        
        return baseCapacity;
    }, [rows, cols, parsedAisleCols, lastRowFull]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (!name || rows <= 0 || cols <= 0 || aisleCols.trim() === '' || parsedAisleCols.some(ac => ac < 0 || ac >= cols)) {
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
                seats: generateSeats(rows, cols, parsedAisleCols, lastRowFull),
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
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <Label htmlFor="name">Bus Name</Label>
                            <Input id="name" placeholder="e.g., Standard Cruiser" required value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        
                        <Separator />

                        <div>
                            <h3 className="text-lg font-medium mb-2">Seat Layout</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rows">Rows</Label>
                                    <Input id="rows" type="number" placeholder="e.g., 12" required value={rows} onChange={e => setRows(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cols">Columns</Label>
                                    <Input id="cols" type="number" placeholder="e.g., 5" required value={cols} onChange={e => setCols(Number(e.target.value))} />
                                </div>
                            </div>
                             <div className="space-y-2 mt-4">
                                <Label htmlFor="aisleCols">Aisle Columns (0-indexed, comma-separated)</Label>
                                <Input id="aisleCols" type="text" placeholder="e.g., 2" required value={aisleCols} onChange={e => setAisleCols(e.target.value)} />
                            </div>
                            <div className="flex items-center space-x-2 mt-4">
                                <Checkbox id="last-row-full" checked={lastRowFull} onCheckedChange={(checked) => setLastRowFull(Boolean(checked))} />
                                <Label htmlFor="last-row-full">Last row is a full bench (no aisle)</Label>
                            </div>
                        </div>

                        <Separator />

                         <div className="space-y-2">
                            <Label>Calculated Capacity</Label>
                            <Input value={capacity} disabled className="font-bold bg-muted/50" />
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
