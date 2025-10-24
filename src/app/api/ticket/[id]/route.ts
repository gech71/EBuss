
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/app/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await validateRequest();

    if (!user || !user.busOwnerId) {
        return NextResponse.json({ message: 'Unauthorized: You must be logged in as an admin to scan tickets.' }, { status: 401 });
    }

    const ticketId = params.id;
    if (!ticketId) {
        return NextResponse.json({ message: 'Ticket ID is required.' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: ticketId },
      include: {
        bookedSeats: true,
        route: {
          include: {
            origin: true,
            destination: true,
            bus: true, // Include bus to get ownerId
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ message: 'Ticket not found.' }, { status: 404 });
    }

    // 1. Ownership Check: Ensure the scanner's company owns the route's bus
    if (booking.route.bus.ownerId !== user.busOwnerId) {
      return NextResponse.json({ message: 'Ticket is not valid for this bus operator.' }, { status: 403 });
    }
    
    // 2. Expiration Check: Ensure the travel date has not passed
    const now = new Date();
    const departureTime = new Date(booking.route.departureTime);
    if (now > departureTime) {
      return NextResponse.json({ message: 'This ticket has expired.' }, { status: 410 });
    }

    // 3. Status Check: Ensure ticket is still valid (not cancelled, etc.)
    if (booking.status !== 'VALID') {
       return NextResponse.json({ message: `Ticket is not valid. Status: ${booking.status}` }, { status: 410 });
    }

    return NextResponse.json({ booking });

  } catch (error) {
    console.error('--- Ticket Validation API End: Error ---');
    console.error('Failed to validate ticket:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}

    