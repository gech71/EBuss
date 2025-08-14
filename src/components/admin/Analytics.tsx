
"use client";

import { useData } from "@/lib/store";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Zap, Ticket, Calendar as CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "../ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface RouteStat {
    routeId: string;
    origin: string;
    destination: string;
    price: number;
    ticketsSold: number;
    revenue: number;
    potentialRevenue: number;
}

export function Analytics() {
    const { routes, bookings, getBusById } = useData();
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

        const todayBookings = bookings.filter(b => {
             const route = routes.find(r => r.id === b.routeId);
             if (!route) return false;
             const departureDate = new Date(route.departureTime);
             return departureDate >= today && departureDate < tomorrow;
        });
        
        const potentialRevenue = todayRoutes.reduce((acc, route) => {
            const bus = getBusById(route.busId);
            const capacity = bus?.capacity || 0;
            return acc + (capacity * route.price);
        }, 0);

        const actualRevenue = todayBookings.reduce((acc, booking) => acc + booking.totalPrice, 0);

        const effectiveness = potentialRevenue > 0 ? (actualRevenue / potentialRevenue) * 100 : 0;

        return { potentialRevenue, actualRevenue, effectiveness };

    }, [routes, bookings, getBusById]);

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
            
            const bus = getBusById(route.busId);
            const capacity = bus?.capacity || 0;

            if (!stats[route.id]) {
                stats[route.id] = {
                    routeId: route.id,
                    origin: route.origin,
                    destination: route.destination,
                    price: route.price,
                    ticketsSold: 0,
                    revenue: 0,
                    potentialRevenue: capacity * route.price,
                };
            }

            stats[route.id].ticketsSold += booking.seats.length;
            stats[route.id].revenue += booking.totalPrice;
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);

    }, [bookings, routes, dateRange, getBusById]);

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
                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center mb-2"><DollarSign className="w-4 h-4 mr-2"/>Potential Revenue</h4>
                            <p className="text-3xl font-bold">${todayStats.potentialRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            <p className="text-xs text-muted-foreground">If all seats for today's routes were sold.</p>
                        </div>
                        <div className="p-4 border rounded-lg col-span-1 md:col-span-2">
                             <h4 className="text-sm font-semibold text-muted-foreground flex items-center mb-2"><TrendingUp className="w-4 h-4 mr-2"/>Effectiveness</h4>
                             <div className="flex items-center gap-4">
                                <Progress value={todayStats.effectiveness} className="w-full h-3" />
                                <span className="text-2xl font-bold">{todayStats.effectiveness.toFixed(1)}%</span>
                             </div>
                             <p className="text-xs text-muted-foreground mt-2">Based on today's actual vs. potential revenue.</p>
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Route</TableHead>
                                <TableHead className="text-center">Tickets Sold</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Potential</TableHead>
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
                                    <TableCell className="text-right font-semibold">${stat.revenue.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">${stat.potentialRevenue.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge className="bg-green-600 hover:bg-green-700">
                                            {totalRevenue > 0 ? ((stat.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                                <TableCell className="text-right font-bold">${totalRevenue.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold text-muted-foreground">${totalPotentialRevenue.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold">100%</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
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
