
"use client";

import { useData } from "@/lib/store";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Zap } from "lucide-react";
import { RouteCard } from "./RouteCard";

export function Analytics() {
    const { routes, bookings, getBusById } = useData();

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

    const suggestedRoutes = useMemo(() => {
        const routeCounts = bookings.reduce((acc, booking) => {
            acc[booking.routeId] = (acc[booking.routeId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sortedRouteIds = Object.keys(routeCounts).sort((a, b) => routeCounts[b] - routeCounts[a]);
        
        const topRouteIds = sortedRouteIds.slice(0, 3);

        return topRouteIds.map(id => routes.find(r => r.id === id)).filter(Boolean) as any[];

    }, [bookings, routes]);

    return (
        <div className="space-y-8 mb-12">
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

            {suggestedRoutes.length > 0 && (
                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                         <Zap className="text-primary"/>
                         <h2 className="font-headline text-2xl font-semibold text-primary">Popular Routes</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {suggestedRoutes.map(route => (
                           <RouteCard key={route.id} route={route} />
                       ))}
                    </div>
                </div>
            )}
        </div>
    )
}
