
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";
import type { Discount, DiscountTier } from "@prisma/client";
import { updateDiscountAction } from "@/app/admin/discounts/actions";

type DiscountWithTiers = Discount & { tiers: DiscountTier[] };

interface EditDiscountFormProps {
    discount: DiscountWithTiers;
}

const initialState = {
    success: false,
    message: ""
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Changes"}
        </Button>
    )
}

export function EditDiscountForm({ discount: initialDiscount }: EditDiscountFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [state, formAction] = useFormState(updateDiscountAction, initialState);

    const [name, setName] = useState(initialDiscount.name);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(initialDiscount.startDate), to: new Date(initialDiscount.endDate) });
    const [tiers, setTiers] = useState(initialDiscount.tiers);

    useEffect(() => {
        if(state.message) {
            if(state.success) {
                toast({ title: "Success!", description: "Discount has been updated."});
                router.push('/admin/discounts');
            } else {
                toast({ title: "Update Failed", description: state.message, variant: "destructive" });
            }
        }
    }, [state, toast, router]);


    const handleTierChange = (index: number, field: keyof Omit<DiscountTier, 'id' | 'discountId'>, value: number) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTiers(newTiers);
    };

    const addTier = () => {
        const newTier: DiscountTier = { 
            id: `new-tier-${Date.now()}`, 
            minTickets: 0, 
            maxTickets: 0, 
            percentage: 0,
            discountId: initialDiscount.id,
        };
        setTiers([...tiers, newTier]);
    };

    const removeTier = (index: number) => {
        if (tiers.length > 1) {
            setTiers(tiers.filter((_, i) => i !== index));
        } else {
             toast({ title: "Error", description: "You must have at least one tier.", variant: "destructive" });
        }
    };
    

    return (
        <form action={formAction}>
            <input type="hidden" name="id" value={initialDiscount.id} />
            <input type="hidden" name="name" value={name} />
            {dateRange?.from && <input type="hidden" name="startDate" value={dateRange.from.toISOString()} />}
            {dateRange?.to && <input type="hidden" name="endDate" value={dateRange.to.toISOString()} />}
            <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Tiered Discount</CardTitle>
                    <CardDescription>Update the rules and tiers for this promotional discount.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="name">Discount Name</Label>
                        <Input id="name" placeholder="e.g., Summer Group Offer" required value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                         <Label>Validity Period</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from && dateRange.to ? 
                                    `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` :
                                    <span>Select a date range</span>
                                }
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Discount Tiers</h3>
                            <Button type="button" size="sm" onClick={addTier}>
                                <PlusCircle className="mr-2 h-4 w-4"/>
                                Add Tier
                            </Button>
                        </div>

                        {tiers.map((tier, index) => (
                            <div key={tier.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
                                <Label className="font-semibold">Tier {index + 1}</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`minTickets-${index}`}>Min Tickets</Label>
                                        <Input id={`minTickets-${index}`} type="number" placeholder="e.g., 5" required value={tier.minTickets || ''} onChange={e => handleTierChange(index, 'minTickets', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`maxTickets-${index}`}>Max Tickets</Label>
                                        <Input id={`maxTickets-${index}`} type="number" placeholder="e.g., 10" required value={tier.maxTickets || ''} onChange={e => handleTierChange(index, 'maxTickets', Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`percentage-${index}`}>Discount (%)</Label>
                                        <Input id={`percentage-${index}`} type="number" placeholder="e.g., 10" required value={tier.percentage || ''} onChange={e => handleTierChange(index, 'percentage', Number(e.target.value))} />
                                    </div>
                                </div>
                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeTier(index)} disabled={tiers.length <= 1}>
                                    <Trash2 className="h-4 w-4"/>
                                    <span className="sr-only">Remove Tier</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.push('/admin/discounts')}>Cancel</Button>
                    <SubmitButton />
                </CardFooter>
            </Card>
        </form>
    );
}
