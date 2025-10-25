
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ message: 'Phone number is required.' }, { status: 400 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        passengerPhone: phone,
        paymentStatus: PaymentStatus.PAID,
      },
      include: {
        bookedSeats: true,
        route: {
          include: {
            origin: true,
            destination: true,
            bus: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
      orderBy: {
        route: {
          departureTime: 'desc',
        },
      },
    });

    if (!bookings) {
      return NextResponse.json([], { status: 200 });
    }

    // Sanitize decimal fields for the client
    const sanitizedBookings = bookings.map(booking => ({
        ...booking,
        totalPrice: Number(booking.totalPrice),
        route: {
            ...booking.route,
            price: Number(booking.route.price)
        }
    }));


    return NextResponse.json(sanitizedBookings);

  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
