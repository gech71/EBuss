
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { createBusAction } from "@/app/admin/buses/actions";

// Helper function to generate seat layouts, adapted from the original data file.
const generateSeats = (rows: number, cols: number, aisleCols: number[], lastRowFull: boolean = false) => {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLastRow = r === rows - 1;
      const isAisle = aisleCols.includes(c) && !(lastRowFull && isLastRow);
      
      seats.push({
        seatNumber: `${c + 1}${String.fromCharCode(65 + r)}`,
        status: 'AVAILABLE',
        type: isAisle ? 'AISLE' : 'SEAT',
      });
    }
  }
  return seats;
};

const initialState = {
    success: false,
    message: '',
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Bus"}
        </Button>
    )
}

export default function NewBusPage() {
    const { toast } = useToast();
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useFormState(createBusAction, initialState);

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

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast({ title: "Success!", description: state.message });
                router.push('/admin/buses');
            } else {
                toast({ title: "Creation Failed", description: state.message, variant: "destructive" });
            }
        }
    }, [state, toast, router]);
    
    const seats = useMemo(() => generateSeats(rows, cols, parsedAisleCols, lastRowFull), [rows, cols, parsedAisleCols, lastRowFull]);

    return (
        <form ref={formRef} action={formAction}>
            <input type="hidden" name="capacity" value={capacity} />
            <input type="hidden" name="rows" value={rows} />
            <input type="hidden" name="cols" value={cols} />
            <input type="hidden" name="seats" value={JSON.stringify(seats)} />

            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Bus</CardTitle>
                    <CardDescription>Define the properties and seat layout for the new bus.</CardDescription>
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
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <SubmitButton />
                </CardFooter>
            </Card>
        </form>
    );
}
