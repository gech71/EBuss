
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { endOfDay, startOfDay } from 'date-fns';
import { toDate } from 'date-fns-tz';

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
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    if (!routes) {
      return NextResponse.json([], { status: 200 });
    }

    // Sanitize decimal fields for the client
    const sanitizedRoutes = routes.map(route => ({
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
