

import { RecentBookings } from "@/components/admin/RecentBookings";
import { Analytics } from "@/components/admin/Analytics";
import prisma from "@/lib/prisma";

export default async function SuperAdminDashboard() {
  const bookingsData = await prisma.booking.findMany({
    include: {
      bookedSeats: true,
    },
    orderBy: {
      bookingTime: "desc",
    },
  });

  const routesData = await prisma.route.findMany({
    include: {
      origin: true,
      destination: true,
    }
  });

  const buses = await prisma.bus.findMany();
  
  const bookings = bookingsData.map(booking => ({
    ...booking,
    totalPrice: Number(booking.totalPrice),
  }));

  const routes = routesData.map(r => ({ ...r, price: Number(r.price)}));

  return (
    <div className="space-y-8">
      <Analytics bookings={bookings} routes={routes} buses={buses} />
      <div>
        <RecentBookings bookings={bookings} routes={routes} />
      </div>
    </div>
  );
}
