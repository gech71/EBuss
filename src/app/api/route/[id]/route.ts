
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: routeId } = await params;
    const route = await prisma.route.findUnique({
        where: { id: routeId },
        include: {
          origin: true,
          destination: true,
          bus: {
            select: {
              id: true,
              name: true,
              capacity: true,
              ownerId: true,
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

    if (!route) {
      return new NextResponse(JSON.stringify({ message: 'Route not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error('Failed to fetch route details:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}
    