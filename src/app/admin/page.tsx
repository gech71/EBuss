
import { RecentBookings } from "@/components/admin/RecentBookings";
import { Analytics } from "@/components/admin/Analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Route as RouteIcon, Bus } from "lucide-react";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/app/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect('/login');
  }

  const buses = await prisma.bus.findMany({
    where: { ownerId: user.busOwnerId },
  });

  const routes = await prisma.route.findMany({
    where: {
      bus: {
        ownerId: user.busOwnerId,
      },
    },
    include: {
        origin: true,
        destination: true,
    }
  });

  const routeIds = routes.map(r => r.id);

  const bookings = await prisma.booking.findMany({
    where: {
      routeId: {
        in: routeIds,
      },
    },
    include: {
      bookedSeats: true,
    },
    orderBy: {
      bookingTime: 'desc',
    },
  });

  const totalRevenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);
  
  // To pass to client components, we need to make sure complex types are simplified
  const sanitizedRoutes = routes.map(r => ({
      ...r,
      origin: r.origin.name,
      destination: r.destination.name,
      departureTime: r.departureTime.toISOString(),
      arrivalTime: r.arrivalTime.toISOString(),
      price: Number(r.price)
  }));


  return (
    <div className="space-y-8">

      <Analytics bookings={bookings} routes={sanitizedRoutes} buses={buses} />

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
              Based on your company's bookings
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
              Total routes your company operates
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
              Total buses in your fleet
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <RecentBookings bookings={bookings} routes={sanitizedRoutes} />
      </div>
    </div>
  );
}
