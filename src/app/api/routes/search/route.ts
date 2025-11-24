
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { endOfDay, startOfDay } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { TripSeatStatus } from '@prisma/client';

async function provisionTripSeatsForRoute(route: any) {
    if (route.tripSeats.length === 0 && route.bus.layout.seats.length > 0) {
        const seatsToCreate = route.bus.layout.seats
            .filter((seat: any) => seat.type === 'SEAT')
            .map((seat: any) => ({
                routeId: route.id,
                seatNumber: seat.seatNumber,
                status: TripSeatStatus.AVAILABLE,
            }));

        if (seatsToCreate.length > 0) {
            await prisma.tripSeat.createMany({
                data: seatsToCreate,
                skipDuplicates: true, // Avoid errors if another request creates them simultaneously
            });
            // Return a flag indicating that seats were provisioned
            return true;
        }
    }
    return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const originId = searchParams.get('originId');
    const destinationId = searchParams.get('destinationId');
    const date = searchParams.get('date');

    if (!originId || !destinationId || !date) {
      return NextResponse.json({ message: 'originId, destinationId, and date are required.' }, { status: 400 });
    }

    // Interpret the incoming date string as a UTC date
    const searchDate = toDate(`${date}T00:00:00Z`);
    const startDate = startOfDay(searchDate);
    const endDate = endOfDay(searchDate);

    const routes = await prisma.route.findMany({
      where: {
        originId,
        destinationId,
        departureTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        bus: {
          include: {
            owner: {
              select: {
                name: true,
              },
            },
            layout: {
                include: {
                    seats: true
                }
            }
          },
        },
        tripSeats: true, // Include trip seats
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    if (!routes || routes.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

     // Provision TripSeats for any routes that don't have them yet.
    let needsRefetch = false;
    for (const route of routes) {
        const provisioned = await provisionTripSeatsForRoute(route);
        if (provisioned) {
            needsRefetch = true;
        }
    }

    let finalRoutes = routes;
    if (needsRefetch) {
      finalRoutes = await prisma.route.findMany({
        where: { id: { in: routes.map(r => r.id) } },
        include: {
          bus: { include: { owner: { select: { name: true } }, layout: { include: { seats: true } } } },
          tripSeats: true,
        },
        orderBy: { departureTime: 'asc' },
      });
    }

    // Sanitize decimal fields for the client
    const sanitizedRoutes = finalRoutes.map(route => ({
        ...route,
        price: Number(route.price)
    }));

    return NextResponse.json(sanitizedRoutes);

  } catch (error) {
    console.error('Failed to search routes:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
