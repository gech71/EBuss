
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { createBusAction } from "@/app/admin/buses/actions";
import { useFormState, useFormStatus } from "react-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Helper function to generate seat layouts
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
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Bus"}</Button>
    )
}

export default function NewBusPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [state, formAction] = useFormState(createBusAction, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    const [name, setName] = useState('');
    const [rows, setRows] = useState(12);
    const [cols, setCols] = useState(5);
    const [aisleCols, setAisleCols] = useState('3'); // Default to '3' which is index 2
    const [lastRowFull, setLastRowFull] = useState(false);
    
    const parsedAisleCols = useMemo(() => {
        return aisleCols.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n));
    }, [aisleCols]);

    const capacity = useMemo(() => {
        if (cols <= 0 || rows <= 0) return 0;
        
        let aisleSeatsCount = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isLastRow = r === rows - 1;
                const isAisle = parsedAisleCols.includes(c) && !(lastRowFull && isLastRow);
                if (isAisle) {
                    aisleSeatsCount++;
                }
            }
        }
        return (rows * cols) - aisleSeatsCount;

    }, [rows, cols, parsedAisleCols, lastRowFull]);
    
    useEffect(() => {
        if (state.success) {
            toast({ title: "Success!", description: state.message });
            formRef.current?.reset();
            // Resetting form fields
            setName('');
            setRows(12);
            setCols(5);
            setAisleCols('3');
            setLastRowFull(false);
             // Redirect after a short delay to allow toast to be seen
            setTimeout(() => router.push('/admin/buses'), 1000);
        } else if (state.message) {
            toast({ title: "Creation Failed", description: state.message, variant: "destructive" });
        }
    }, [state, toast, router]);

    return (
        <form ref={formRef} action={(formData) => {
            const seats = generateSeats(rows, cols, parsedAisleCols, lastRowFull);
            formData.append('capacity', capacity.toString());
            formData.append('rows', rows.toString());
            formData.append('cols', cols.toString());
            formData.append('seats', JSON.stringify(seats));
            formAction(formData);
        }}>
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
                                    <Input id="rows" type="number" name="rows" min="1" placeholder="e.g., 12" required value={rows} onChange={e => setRows(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cols">Columns</Label>
                                    <Input id="cols" type="number" name="cols" min="1" placeholder="e.g., 5" required value={cols} onChange={e => setCols(Number(e.target.value))} />
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
                            <Input value={capacity} name="capacity" readOnly className="font-bold bg-muted/50" />
                        </div>

                        {state.message && !state.success && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        )}
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
