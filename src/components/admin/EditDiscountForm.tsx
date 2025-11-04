
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Separator } from "@/components/ui/separator";
import type { Discount, DiscountTier } from "@prisma/client";
import { updateDiscountAction } from "@/app/admin/discounts/actions";
import { useCsrf } from "@/hooks/useCsrf";

type DiscountWithTiers = Discount & { tiers: DiscountTier[] };

interface EditDiscountFormProps {
    discount: DiscountWithTiers;
}

export function EditDiscountForm({ discount: initialDiscount }: EditDiscountFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { csrfToken, loading: csrfLoading } = useCsrf();

    const [name, setName] = useState(initialDiscount.name);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(initialDiscount.startDate), to: new Date(initialDiscount.endDate) });
    const [tiers, setTiers] = useState(initialDiscount.tiers);


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
    

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!name || !dateRange?.from || !dateRange.to) {
            toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
            return;
        }

        for (const tier of tiers) {
            if (tier.minTickets <= 0 || tier.maxTickets <= 0 || tier.percentage <= 0) {
                toast({ title: "Error", description: "Please fill out all tier fields with valid numbers.", variant: "destructive" });
                return;
            }
            if(tier.minTickets > tier.maxTickets) {
                toast({ title: "Error", description: "Min tickets cannot be greater than max tickets in a tier.", variant: "destructive" });
                return;
            }
        }

        const formData = new FormData(event.currentTarget);
        formData.append('id', initialDiscount.id);
        formData.append('name', name);
        // Format date as yyyy-MM-dd to send a timezone-agnostic date to the server
        formData.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        formData.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
        formData.append('tiers', JSON.stringify(tiers));

        startTransition(async () => {
            const result = await updateDiscountAction(formData);
             if (result?.success === false) {
                 toast({ title: "Update Failed", description: result.message, variant: "destructive" });
            } else {
                 toast({ title: "Success!", description: "Discount has been updated."});
                 router.push("/admin/discounts");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit}>
             <input type="hidden" name="csrfToken" value={csrfToken} />
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
                     <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={isPending || csrfLoading}>{isPending ? "Saving..." : "Save Changes"}</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
