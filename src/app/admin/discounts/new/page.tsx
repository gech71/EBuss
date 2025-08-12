
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export default function NewDiscountPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { addDiscount } = useData();
    
    const [name, setName] = useState('');
    const [minTickets, setMinTickets] = useState<number>(0);
    const [maxTickets, setMaxTickets] = useState<number>(0);
    const [percentage, setPercentage] = useState<number>(0);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!name || !minTickets || !maxTickets || !percentage || !dateRange?.from || !dateRange?.to) {
            toast({ title: "Error", description: "Please fill out all fields.", variant: "destructive" });
            return;
        }
        if(minTickets > maxTickets) {
            toast({ title: "Error", description: "Min tickets cannot be greater than max tickets.", variant: "destructive" });
            return;
        }

        addDiscount({
            name,
            minTickets,
            maxTickets,
            percentage,
            startDate: dateRange.from,
            endDate: dateRange.to
        });

        toast({
            title: "Success!",
            description: "New discount has been added.",
        });
        router.push("/admin/discounts");
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Discount</CardTitle>
                    <CardDescription>Define the rules for a new promotional discount.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <Label htmlFor="name">Discount Name</Label>
                            <Input id="name" placeholder="e.g., Summer Group Offer" required value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minTickets">Min Tickets</Label>
                                <Input id="minTickets" type="number" placeholder="e.g., 5" required value={minTickets || ''} onChange={e => setMinTickets(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxTickets">Max Tickets</Label>
                                <Input id="maxTickets" type="number" placeholder="e.g., 10" required value={maxTickets || ''} onChange={e => setMaxTickets(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="percentage">Discount (%)</Label>
                                <Input id="percentage" type="number" placeholder="e.g., 10" required value={percentage || ''} onChange={e => setPercentage(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label>Validity Period</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date range</span>
                                    )}
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
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit">Save Discount</Button>
                </CardFooter>
            </Card>
        </form>
    );
}
