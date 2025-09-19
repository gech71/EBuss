
import { RecentBookings } from "@/components/admin/RecentBookings";
import { Analytics } from "@/components/admin/Analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Route as RouteIcon, Bus } from "lucide-react";
import prisma from "@/lib/prisma";

export default async function AdminDashboard() {
  const bookings = await prisma.booking.findMany({
    include: {
      bookedSeats: true,
    },
    orderBy: {
      bookingTime: 'desc',
    },
  });
  
  const routes = await prisma.route.findMany();
  const buses = await prisma.bus.findMany();
  
  const totalRevenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);

  return (
    <div className="space-y-8">

      <Analytics bookings={bookings} routes={routes} buses={buses} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Based on all completed bookings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <RouteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routes.length}</div>
            <p className="text-xs text-muted-foreground">
              Total routes available for booking
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buses in Fleet</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buses.length}</div>
            <p className="text-xs text-muted-foreground">
              Total buses configured
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <RecentBookings bookings={bookings} routes={routes} />
      </div>
    </div>
  );
}
