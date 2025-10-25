
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Zap, Ticket, Calendar as CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "../ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Booking, Route, Bus, Location } from "@prisma/client";
import { ScrollArea } from "../ui/scroll-area";

type SanitizedRoute = Route & { price: number; origin: Location, destination: Location };

interface AnalyticsProps {
    bookings: (Booking & { bookedSeats: { seatNumber: string }[] })[];
    routes: SanitizedRoute[];
    buses: Bus[];
}

interface RouteStat {
    routeId: string;
    origin: string;
    destination: string;
    price: number;
    ticketsSold: number;
    revenue: number;
    potentialRevenue: number;
}

export function Analytics({ bookings, routes, buses }: AnalyticsProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    
    const todayStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const todayRoutes = routes.filter(r => {
            const departureDate = new Date(r.departureTime);
            return departureDate >= today && departureDate < tomorrow;
        });

        const todayRouteIds = todayRoutes.map(r => r.id);
        const todayBookings = bookings.filter(b => todayRouteIds.includes(b.routeId));
        
        const potentialRevenue = todayRoutes.reduce((acc, route) => {
            const bus = buses.find(b => b.id === route.busId);
            const capacity = bus?.capacity || 0;
            return acc + (capacity * route.price);
        }, 0);

        const actualRevenue = todayBookings.reduce((acc, booking) => acc + Number(booking.totalPrice), 0);

        const effectiveness = potentialRevenue > 0 ? (actualRevenue / potentialRevenue) * 100 : 0;

        return { potentialRevenue, actualRevenue, effectiveness };

    }, [routes, bookings, buses]);

    const routeStats = useMemo(() => {
        const stats: Record<string, RouteStat> = {};

        const filteredBookings = bookings.filter(booking => {
            if (!dateRange?.from) return true; // No start date, include all
            const bookingDate = new Date(booking.bookingTime);
            const from = new Date(dateRange.from);
            from.setHours(0,0,0,0);
            const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
            to.setHours(23,59,59,999);
            return bookingDate >= from && bookingDate <= to;
        });

        filteredBookings.forEach(booking => {
            const route = routes.find(r => r.id === booking.routeId);
            if (!route) return;
            
            const bus = buses.find(b => b.id === route.busId);
            const capacity = bus?.capacity || 0;
            const price = route.price;

            if (!stats[route.id]) {
                stats[route.id] = {
                    routeId: route.id,
                    origin: route.origin.name,
                    destination: route.destination.name,
                    price: price,
                    ticketsSold: 0,
                    revenue: 0,
                    potentialRevenue: capacity * price,
                };
            }

            stats[route.id].ticketsSold += booking.bookedSeats.length;
            stats[route.id].revenue += Number(booking.totalPrice);
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);

    }, [bookings, routes, dateRange, buses]);

    const { totalRevenue, totalPotentialRevenue } = useMemo(() => {
        return routeStats.reduce(
            (acc, stat) => {
                acc.totalRevenue += stat.revenue;
                acc.totalPotentialRevenue += stat.potentialRevenue;
                return acc;
            },
            { totalRevenue: 0, totalPotentialRevenue: 0 }
        );
    }, [routeStats]);

    const totalEffectiveness = totalPotentialRevenue > 0 ? (totalRevenue / totalPotentialRevenue) * 100 : 0;

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-primary">Today's Snapshot</CardTitle>
                    <CardDescription>Performance metrics for routes departing today.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 border rounded-lg">
                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center mb-2">
                                <span className="font-bold mr-2">ETB</span>Actual Revenue
                            </h4>
                            <p className="text-3xl font-bold text-primary">{todayStats.actualRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            <p className="text-xs text-muted-foreground">Revenue from tickets sold for today.</p>
                        </div>
                         <div className="p-4 border rounded-lg">
                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center mb-2">
                                <span className="font-bold mr-2">ETB</span>Potential Revenue
                            </h4>
                            <p className="text-3xl font-bold">{todayStats.potentialRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            <p className="text-xs text-muted-foreground">If all seats for today's routes were sold.</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                             <h4 className="text-sm font-semibold text-muted-foreground flex items-center mb-2"><TrendingUp className="w-4 h-4 mr-2"/>Effectiveness</h4>
                             <div className="flex items-center gap-4">
                                <Progress value={todayStats.effectiveness} className="w-full h-3" />
                                <span className="text-2xl font-bold">{todayStats.effectiveness.toFixed(1)}%</span>
                             </div>
                             <p className="text-xs text-muted-foreground mt-2">Today's actual vs. potential revenue.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Zap className="text-primary"/>
                                <CardTitle className="font-headline text-2xl text-primary">Popular Routes</CardTitle>
                            </div>
                            <CardDescription>Performance breakdown of your most successful routes based on revenue.</CardDescription>
                        </div>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full md:w-[300px] justify-start text-left font-normal",
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
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                                 <div className="p-2 border-t">
                                    <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setDateRange(undefined)}>
                                        Clear
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    {routeStats.length > 0 ? (
                        <div className="w-full">
                            {/* Mobile View - Card List */}
                            <div className="md:hidden space-y-4">
                                {routeStats.map(stat => (
                                    <div key={stat.routeId} className="p-4 border rounded-lg">
                                        <div className="font-medium mb-2">{stat.origin} → {stat.destination}</div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold">Revenue:</span>{stat.revenue.toFixed(2)} ETB
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold">Sold:</span> <Badge variant="outline">{stat.ticketsSold}</Badge>
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <span className="font-semibold">Potential:</span>{stat.potentialRevenue.toFixed(2)} ETB
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold">% of Total:</span> 
                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                    {totalRevenue > 0 ? ((stat.revenue / totalRevenue) * 100).toFixed(1) : '0.0'}%
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 border rounded-lg bg-muted/50 font-bold space-y-2">
                                    <div className="flex justify-between"><span>Total Revenue:</span><span>{totalRevenue.toFixed(2)} ETB</span></div>
                                    <div className="flex justify-between"><span>Total Potential:</span><span>{totalPotentialRevenue.toFixed(2)} ETB</span></div>
                                    <div className="flex justify-between items-center"><span>Total Effectiveness:</span><Badge className="bg-blue-600 hover:bg-blue-700 text-base">{totalEffectiveness.toFixed(1)}%</Badge></div>
                                </div>
                            </div>
                            
                            {/* Desktop View - Table */}
                            <div className="hidden md:block">
                                <ScrollArea className="max-h-[500px] w-full">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Route</TableHead>
                                                <TableHead className="text-center">Tickets Sold</TableHead>
                                                <TableHead className="text-right">Revenue (ETB)</TableHead>
                                                <TableHead className="text-right">Potential (ETB)</TableHead>
                                                <TableHead className="text-right">% of Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {routeStats.map(stat => (
                                                <TableRow key={stat.routeId}>
                                                    <TableCell className="font-medium">{stat.origin} → {stat.destination}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline">{stat.ticketsSold}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">{stat.revenue.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{stat.potentialRevenue.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge className="bg-green-600 hover:bg-green-700">
                                                            {totalRevenue > 0 ? ((stat.revenue / totalRevenue) * 100).toFixed(1) : '0.0'}%
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                                                <TableCell className="text-right font-bold">{totalRevenue.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-bold text-muted-foreground">{totalPotentialRevenue.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-bold">
                                                    <Badge className="bg-blue-600 hover:bg-blue-700 text-base">
                                                        {totalEffectiveness.toFixed(1)}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </div>
                    ) : (
                        <div className="col-span-full">
                            <div className="p-10 flex flex-col items-center justify-center text-center">
                                <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
                                <h3 className="font-headline text-xl font-semibold mb-2">No Bookings Found</h3>
                                <p className="text-muted-foreground text-sm">No bookings were found for the selected date range.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
