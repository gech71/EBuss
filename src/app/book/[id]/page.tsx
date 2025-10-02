
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
    },
  });

  if (!routeData) {
    notFound();
  }
  
  const alternativeRoutesData = await prisma.route.findMany({
      where: {
          originId: routeData.originId,
          destinationId: routeData.destinationId,
          departureTime: routeData.departureTime,
          id: { not: routeData.id }
      },
      include: {
          bus: true
      }
  })

  // Sanitize Decimal to number for client components
  const route = {
    ...routeData,
    price: Number(routeData.price),
    discount: routeData.discount ? {
        ...routeData.discount,
        tiers: routeData.discount.tiers.map(tier => ({...tier, percentage: Number(tier.percentage)}))
    } : null
  };

  const alternativeRoutes = [routeData, ...alternativeRoutesData].map(altRoute => ({
      ...altRoute,
      price: Number(altRoute.price)
  }))


  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header user={user} />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <BookingForm 
            route={route} 
            alternativeRoutes={alternativeRoutes}
          />
        </div>
      </main>
    </div>
  );
}
