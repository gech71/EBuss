
import { RecentBookings } from "@/components/admin/RecentBookings";
import { Analytics } from "@/components/admin/Analytics";
import prisma from "@/lib/prisma";

export default async function SuperAdminDashboard() {
  const bookings = await prisma.booking.findMany({
    include: {
      bookedSeats: true
    },
    orderBy: {
      bookingTime: 'desc'
    }
  });

  const routes = await prisma.route.findMany();
  const buses = await prisma.bus.findMany();

  return (
    <div className="space-y-8">
      <Analytics bookings={bookings} routes={routes} buses={buses} />
      <div>
        <RecentBookings bookings={bookings} routes={routes} />
      </div>
    </div>
  );
}
