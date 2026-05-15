
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/server/auth';

// This endpoint is for fetching details of a SINGLE ticket.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await validateRequest();

    const { id: ticketId } = await params;
    if (!ticketId) {
        return NextResponse.json({ message: 'Ticket ID is required.' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        booking: true,
        route: {
          include: {
            origin: true,
            destination: true,
            bus: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket not found.' }, { status: 404 });
    }

    // If an admin is logged in, perform an ownership check.
    if (user && user.busOwnerId) {
        if (ticket.route.bus.ownerId !== user.busOwnerId) {
            return NextResponse.json({ message: 'You do not have permission to view this ticket.' }, { status: 403 });
        }
    } else {
        // Here you might add logic for public users, e.g., checking phone number from session against booking.
        // For now, if not an admin, we assume they have the right to view if they have the ID.
    }

    return NextResponse.json({ ticket });

  } catch (error) {
    console.error('Failed to fetch ticket:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}
