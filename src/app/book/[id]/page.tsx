
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { BookingForm } from '@/components/booking/BookingForm';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/server/auth';
import { cookies } from 'next/headers';
import { TicketStatus } from '@prisma/client';

interface BookPageProps {
  params: { id: string };
}

async function getMiniAppData() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('miniapp_session');
  if (sessionCookie) {
    try {
      const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('ascii');
      const sessionData = JSON.parse(decodedSession);
      return { 
        isMiniApp: sessionData.isAuthenticated, 
        authToken: sessionData.authToken,
        phoneNumber: sessionData.phoneNumber,
      };
    } catch (error) {
      return { isMiniApp: false, authToken: undefined, phoneNumber: undefined };
    }
  }
  return { isMiniApp: false, authToken: undefined, phoneNumber: undefined };
}

async function releaseExpiredBookings(routeId: string) {
    const expiredBookings = await prisma.booking.findMany({
        where: {
            routeId: routeId,
            paymentStatus: 'PENDING',
            expiresAt: {
                lt: new Date(),
            },
        },
        select: { id: true }
    });

    if (expiredBookings.length === 0) {
        return;
    }
    
    const expiredBookingIds = expiredBookings.map(b => b.id);
    
    await prisma.$transaction([
        prisma.ticket.updateMany({
            where: { bookingId: { in: expiredBookingIds } },
            data: { status: TicketStatus.EXPIRED },
        }),
        prisma.booking.updateMany({
            where: { id: { in: expiredBookingIds } },
            data: { paymentStatus: 'FAILED' },
        })
    ]);
}


export default async function BookPage({ params }: BookPageProps) {
  const { user } = await validateRequest();
  const { isMiniApp, authToken, phoneNumber } = await getMiniAppData();
  const routeId = params.id;

  // Release expired seats before fetching route data
  await releaseExpiredBookings(routeId);

  const routeData = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      origin: true,
      destination: true,
      bus: {
        include: {
          layout: {
            include: {
              seats: true,
            },
          },
        },
      },
      discount: {
        include: {
          tiers: true,
        },
      },
       tickets: { // Fetch tickets to determine seat availability
        where: {
          status: { in: ['PENDING', 'VALID'] }
        },
        select: { seatNumber: true }
      }
    },
  });

  if (!routeData) {
    notFound();
  }
  
  const [alternativeRoutesData, potentialReturnRoutesData] = await Promise.all([
    prisma.route.findMany({
      where: {
          originId: routeData.originId,
          destinationId: routeData.destinationId,
          departureTime: routeData.departureTime,
          id: { not: routeData.id }
      },
      include: {
          bus: true
      }
    }),
    prisma.route.findMany({
      where: {
        originId: routeData.destinationId,
        destinationId: routeData.originId,
        departureTime: {
          gt: routeData.departureTime // Return trips must be after the outbound trip
        }
      },
      select: {
        departureTime: true
      },
      orderBy: {
        departureTime: 'asc'
      }
    })
  ]);

  // Sanitize Decimal to number for client components
  const route = {
    ...routeData,
    price: Number(routeData.price),
    roundTripDiscountValue: routeData.roundTripDiscountValue ? Number(routeData.roundTripDiscountValue) : null,
    discount: routeData.discount ? {
        ...routeData.discount,
        percentage: routeData.discount.percentage ? Number(routeData.discount.percentage) : null,
        tiers: routeData.discount.tiers.map(tier => ({...tier, percentage: Number(tier.percentage)}))
    } : null
  };

  const alternativeRoutes = [routeData, ...alternativeRoutesData].map(altRoute => ({
      ...altRoute,
      price: Number(altRoute.price)
  }))

  const potentialReturnRoutes = potentialReturnRoutesData.map(r => ({
      departureTime: r.departureTime.toISOString()
  }));


  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header user={user} isMiniApp={isMiniApp} />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <BookingForm 
            route={route} 
            alternativeRoutes={alternativeRoutes}
            potentialReturnRoutes={potentialReturnRoutes}
            authToken={authToken}
            phoneNumber={phoneNumber}
          />
        </div>
      </main>
    </div>
  );
}
