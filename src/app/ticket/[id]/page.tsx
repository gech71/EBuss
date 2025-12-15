
import { Header } from '@/components/Header';
import { TicketDisplay } from '@/components/booking/TicketDisplay';
import { PaymentStatusChecker } from '@/components/booking/PaymentStatusChecker';
import { validateRequest } from '@/lib/server/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

interface TicketPageProps {
  params: { id: string };
}

async function getIsMiniApp() {
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
  const isMiniApp = await getIsMiniApp();
  const bookingId = params.id; // This is now a booking ID from the URL

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tickets: {
         include: {
            route: {
                include: {
                    origin: true,
                    destination: true,
                    bus: true
                }
            }
         }
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
                 <PaymentStatusChecker booking={booking} />
            </main>
        </div>
     )
  }

  // Since we have multiple tickets, we'll display the first one for now.
  // A better UI would let the user switch between their tickets for this booking.
  const ticketToShow = booking.tickets[0];

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <Header user={user} isMiniApp={isMiniApp} />
      <main className="flex-1 container mx-auto py-8 px-4 flex items-center justify-center">
        <TicketDisplay booking={booking} ticket={ticketToShow} />
      </main>
    </div>
  );
}
