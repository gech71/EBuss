
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/store";
import { useRouter, useParams, notFound } from "next/navigation";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Discount, DiscountTier } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

export default function EditDiscountPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const { discounts, updateDiscount } = useData();

    const id = params.id as string;
    const [discount, setDiscount] = useState<Discount | null>(null);

    useEffect(() => {
        const d = discounts.find(d => d.id === id);
        if (d) {
            setDiscount(d);
        } else {
           // notFound(); // Keep this disabled to avoid 404 on update before redirect
        }
    }, [id, discounts]);

    const handleTierChange = (index: number, field: keyof Omit<DiscountTier, 'id'>, value: number) => {
        if (!discount) return;
        const newTiers = [...discount.tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setDiscount({ ...discount, tiers: newTiers });
    };

    const addTier = () => {
        if (!discount) return;
        const newTiers = [...discount.tiers, { id: `tier-${Date.now()}`, minTickets: 0, maxTickets: 0, percentage: 0 }];
        setDiscount({ ...discount, tiers: newTiers });
    };

    const removeTier = (index: number) => {
        if (!discount) return;
        if (discount.tiers.length > 1) {
            const newTiers = discount.tiers.filter((_, i) => i !== index);
            setDiscount({ ...discount, tiers: newTiers });
        } else {
             toast({ title: "Error", description: "You must have at least one tier.", variant: "destructive" });
        }
    };
    
    const handleDateChange = (range: DateRange | undefined) => {
        if (!discount || !range?.from || !range.to) return;
        setDiscount({
            ...discount,
            startDate: range.from,
            endDate: range.to,
        });
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!discount) {
            toast({ title: "Error", description: "Discount not found.", variant: "destructive" });
            return;
        }

        if (!discount.name) {
            toast({ title: "Error", description: "Please fill out the discount name.", variant: "destructive" });
            return;
        }

        for (const tier of discount.tiers) {
            if (tier.minTickets <= 0 || tier.maxTickets <= 0 || tier.percentage <= 0) {
                toast({ title: "Error", description: "Please fill out all tier fields with valid numbers.", variant: "destructive" });
                return;
            }
            if(tier.minTickets > tier.maxTickets) {
                toast({ title: "Error", description: "Min tickets cannot be greater than max tickets in a tier.", variant: "destructive" });
                return;
            }
        }

        updateDiscount(discount);

        toast({
            title: "Success!",
            description: "Discount has been updated.",
        });
        router.push("/admin/discounts");
    };

    if (!discount) {
        // You might want to show a loading skeleton here
        return <p>Loading...</p>;
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Tiered Discount</CardTitle>
                    <CardDescription>Update the rules and tiers for this promotional discount.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="name">Discount Name</Label>
                        <Input id="name" placeholder="e.g., Summer Group Offer" required value={discount.name} onChange={e => setDiscount({...discount, name: e.target.value})} />
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
                                {format(discount.startDate, "LLL dd, y")} - {format(discount.endDate, "LLL dd, y")}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={discount.startDate}
                                selected={{ from: discount.startDate, to: discount.endDate }}
                                onSelect={handleDateChange}
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

                        {discount.tiers.map((tier, index) => (
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
                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeTier(index)} disabled={discount.tiers.length <= 1}>
                                    <Trash2 className="h-4 w-4"/>
                                    <span className="sr-only">Remove Tier</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.push('/admin/discounts')}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
