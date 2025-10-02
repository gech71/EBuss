

import { Header } from '@/components/Header';
import { TicketDisplay } from '@/components/booking/TicketDisplay';
import { validateRequest } from '@/app/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface TicketPageProps {
  params: { id: string };
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { user } = await validateRequest();
  const ticketId = params.id;

  const booking = await prisma.booking.findUnique({
    where: { id: ticketId },
    include: {
      bookedSeats: true,
      route: {
        include: {
          origin: true,
          destination: true,
          bus: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <Header user={user} />
      <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
        <TicketDisplay booking={booking} />
      </main>
    </div>
  );
}
