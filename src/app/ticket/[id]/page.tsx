

import { Header } from '@/components/Header';
import { TicketDisplay } from '@/components/booking/TicketDisplay';
import { validateRequest } from '@/app/lib/auth';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Ticket, Info } from 'lucide-react';


interface TicketPageProps {
  params: { id: string };
}

function getIsMiniApp() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('miniapp_session');
  if (sessionCookie) {
    try {
      const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('ascii');
      const sessionData = JSON.parse(decodedSession);
      return sessionData.isAuthenticated;
    } catch (error) {
      return false;
    }
  }
  return false;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { user } = await validateRequest();
  const isMiniApp = getIsMiniApp();
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
      payments: {
        orderBy: {
            createdAt: 'desc',
        },
        take: 1,
      }
    },
  });

  if (!booking) {
    notFound();
  }
  
  if (booking.paymentStatus !== 'PAID') {
     return (
        <div className="flex flex-col min-h-screen bg-muted/30">
            <Header user={user} isMiniApp={isMiniApp} />
            <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
                 <Alert variant="destructive" className="max-w-md">
                    <Ticket className="h-4 w-4" />
                    <AlertTitle>Booking Not Paid</AlertTitle>
                    <AlertDescription>
                        This booking is not yet paid for. The ticket and QR code will be available once the payment is completed successfully.
                    </AlertDescription>
                </Alert>
            </main>
        </div>
     )
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <Header user={user} isMiniApp={isMiniApp} />
      <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
        <TicketDisplay booking={booking} />
      </main>
    </div>
  );
}
