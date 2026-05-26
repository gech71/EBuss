import { BookingsTable, type AdminBooking } from "@/components/admin/BookingsTable";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/lib/server/auth";
import { redirect } from "next/navigation";

export default async function AdminBookingsPage() {
  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
    return redirect("/login");
  }

  const bookingsData = await prisma.booking.findMany({
    where: {
      route: {
        bus: {
          ownerId: user.busOwnerId,
        },
      },
    },
    include: {
      route: {
        include: {
          origin: true,
          destination: true,
        },
      },
      tickets: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      bookingTime: "desc",
    },
  });

  const bookings: AdminBooking[] = bookingsData.map((booking) => ({
    id: booking.id,
    passengerName: booking.passengerName,
    passengerPhone: booking.passengerPhone,
    bookingTime: booking.bookingTime,
    totalPrice: Number(booking.totalPrice),
    paymentStatus: booking.paymentStatus,
    route: {
      origin: { name: booking.route.origin.name },
      destination: { name: booking.route.destination.name },
    },
    tickets: booking.tickets,
  }));

  return <BookingsTable bookings={bookings} />;
}
