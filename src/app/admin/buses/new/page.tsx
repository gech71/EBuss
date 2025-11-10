
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useMemo, useTransition, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { createBusAction } from "@/app/admin/buses/actions";
import { useCsrf } from "@/hooks/useCsrf";
import { BackButton } from "@/components/BackButton";

// Helper function to generate seat layouts, adapted from the original data file.
const generateSeats = (rows: number, cols: number, aisleCols: number[], lastRowFull: boolean = false) => {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLastRow = r === rows - 1;
      const isAisle = aisleCols.includes(c) && !(lastRowFull && isLastRow);
      
      seats.push({
        seatNumber: `${String.fromCharCode(65 + r)}${c + 1}`,
        status: 'AVAILABLE',
        type: isAisle ? 'AISLE' : 'SEAT',
      });
    }
  }
  return seats;
};


export default function NewBusPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);
    const { csrfToken, loading: csrfLoading } = useCsrf();

    const [name, setName] = useState('');
    const [rows, setRows] = useState(12);
    const [cols, setCols] = useState(5);
    const [aisleCols, setAisleCols] = useState('3');
    const [lastRowFull, setLastRowFull] = useState(false);
    
    const parsedAisleCols = useMemo(() => {
        return aisleCols.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n));
    }, [aisleCols]);

    const capacity = useMemo(() => {
        if (cols <= 0 || rows <= 0) return 0;
        
        const baseCapacity = rows * cols;
        let aisleSeats = rows * parsedAisleCols.length;
        
        if (lastRowFull && rows > 0) {
            aisleSeats -= parsedAisleCols.length;
        }
        
        return baseCapacity - aisleSeats;
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

        const seats = generateSeats(rows, cols, parsedAisleCols, lastRowFull);
        
        const formData = new FormData(event.currentTarget);
        formData.append('name', name);
        formData.append('capacity', capacity.toString());
        formData.append('rows', rows.toString());
        formData.append('cols', cols.toString());
        formData.append('seats', JSON.stringify(seats));
        
        startTransition(async () => {
            const result = await createBusAction(formData);
             if (result?.success === false) {
                 toast({ title: "Creation Failed", description: result.message, variant: "destructive" });
            } else {
                 toast({ title: "Success!", description: "New bus has been added."});
                 formRef.current?.reset();
                 router.push('/admin/buses');
            }
        });
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit}>
             <input type="hidden" name="csrfToken" value={csrfToken || ''} />
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Add New Bus</CardTitle>
                            <CardDescription>Define the properties and seat layout for the new bus.</CardDescription>
                        </div>
                        <BackButton showText={false} variant="ghost" className="w-8 h-8 p-0" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <Label htmlFor="name">Bus Name</Label>
                            <Input id="name" name="name" placeholder="e.g., Standard Cruiser" required value={name} onChange={e => setName(e.target.value)} />
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
                                <Label htmlFor="aisleCols">Aisle Columns (1-indexed, comma-separated)</Label>
                                <Input id="aisleCols" type="text" placeholder="e.g., 3" required value={aisleCols} onChange={e => setAisleCols(e.target.value)} />
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
                    <Button type="submit" disabled={isPending || csrfLoading}>{isPending ? "Saving..." : "Save Bus"}</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
