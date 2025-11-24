
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TripSeatStatus } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
                  seats: {
                    orderBy: {
                        seatNumber: 'asc'
                    }
                  },
                },
              },
            },
          },
          tripSeats: true, // Eager load the trip seats
          discount: {
            include: {
              tiers: {
                orderBy: {
                    minTickets: 'asc'
                }
              },
            },
          },
        },
      });

    if (!routeData) {
      return new NextResponse(JSON.stringify({ message: 'Route not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If no TripSeats exist for this route, create them now.
    if (routeData.tripSeats.length === 0 && routeData.bus.layout.seats.length > 0) {
        const seatsToCreate = routeData.bus.layout.seats
          .filter(seat => seat.type === 'SEAT')
          .map(seat => ({
            routeId: routeId,
            seatNumber: seat.seatNumber,
            status: TripSeatStatus.AVAILABLE,
          }));

        if (seatsToCreate.length > 0) {
          await prisma.tripSeat.createMany({
            data: seatsToCreate,
          });
        }
        
        // Refetch the route data to include the newly created tripSeats
        const updatedRoute = await prisma.route.findUnique({
             where: { id: routeId },
             include: {
                origin: true,
                destination: true,
                bus: { include: { layout: { include: { seats: true } } } },
                tripSeats: true,
                discount: { include: { tiers: true } },
             }
        });
        return NextResponse.json(updatedRoute);
    }


    return NextResponse.json(routeData);
  } catch (error) {
    console.error('Failed to fetch route details:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}
