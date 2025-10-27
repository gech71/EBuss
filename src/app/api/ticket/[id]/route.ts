
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/server/auth';

// This endpoint is no longer used for scanning, but could be useful for fetching ticket details.
// It is kept for potential future use but the primary scanning logic has moved to /api/ticket/[id]/scan.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await validateRequest();

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
            bus: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ message: 'Ticket not found.' }, { status: 404 });
    }

    // If an admin is logged in, we can perform an ownership check.
    if (user && user.busOwnerId) {
        if (booking.route.bus.ownerId !== user.busOwnerId) {
            return NextResponse.json({ message: 'You do not have permission to view this ticket.' }, { status: 403 });
        }
    } else {
        // If it's a public user, we might want to add logic here to verify they own the ticket,
        // for example by checking against a phone number in their session. For now, it's public.
    }

    return NextResponse.json({ booking });

  } catch (error) {
    console.error('Failed to fetch ticket:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}
