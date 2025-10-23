
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/app/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log("--- Ticket Validation API Start ---");
  try {
    const { user } = await validateRequest();
    console.log("User validation result:", user);

    if (!user || !user.busOwnerId) {
        console.log("Authorization failed: User is not an admin or has no busOwnerId.");
        return NextResponse.json({ message: 'Unauthorized: You must be logged in as an admin to scan tickets.' }, { status: 401 });
    }
    console.log(`Admin user ${user.email} with ownerId ${user.busOwnerId} is validated.`);

    const ticketId = params.id;
    console.log(`Received request for ticketId: ${ticketId}`);
    if (!ticketId) {
        console.log("Validation failed: No ticket ID provided.");
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
      console.log(`Validation failed: Ticket with ID ${ticketId} not found.`);
      return NextResponse.json({ message: 'Ticket not found.' }, { status: 404 });
    }
    console.log("Booking found:", booking);

    // 1. Ownership Check: Ensure the scanner's company owns the route's bus
    if (booking.route.bus.ownerId !== user.busOwnerId) {
      console.log(`Validation failed: Ownership mismatch. Ticket owner: ${booking.route.bus.ownerId}, Scanner owner: ${user.busOwnerId}`);
      return NextResponse.json({ message: 'Ticket is not valid for this bus operator.' }, { status: 403 });
    }
    console.log("Ownership check passed.");
    
    // 2. Expiration Check: Ensure the travel date has not passed
    const now = new Date();
    const departureTime = new Date(booking.route.departureTime);
    if (now > departureTime) {
      console.log(`Validation failed: Ticket has expired. Departure: ${departureTime}, Current time: ${now}`);
      return NextResponse.json({ message: 'This ticket has expired.' }, { status: 410 });
    }
    console.log("Expiration check passed.");

    // 3. Status Check: Ensure ticket is still valid (not cancelled, etc.)
    if (booking.status !== 'VALID') {
       console.log(`Validation failed: Ticket status is not VALID. Current status: ${booking.status}`);
       return NextResponse.json({ message: `Ticket is not valid. Status: ${booking.status}` }, { status: 410 });
    }
    console.log("Status check passed. Ticket is VALID.");

    console.log("--- Ticket Validation API End: Success ---");
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

    