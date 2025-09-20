
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { BookingForm } from '@/components/booking/BookingForm';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/app/lib/auth';

interface BookPageProps {
  params: { id: string };
}

export default async function BookPage({ params }: BookPageProps) {
  const { user } = await validateRequest();
  const routeId = params.id;

  const route = await prisma.route.findUnique({
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
    },
  });

  if (!route) {
    notFound();
  }
  
  const alternativeRoutes = await prisma.route.findMany({
      where: {
          originId: route.originId,
          destinationId: route.destinationId,
          departureTime: route.departureTime,
          id: { not: route.id }
      },
      include: {
          bus: true
      }
  })

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header user={user} />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <BookingForm 
            route={route} 
            alternativeRoutes={[route, ...alternativeRoutes]}
          />
        </div>
      </main>
    </div>
  );
}
