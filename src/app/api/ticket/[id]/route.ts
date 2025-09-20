
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ message: 'Ticket not found.' }, { status: 404 });
    }
    
    // Here you could add more validation logic, e.g., checking if the ticket status is valid
    // if (booking.status !== 'VALID') {
    //   return NextResponse.json({ message: 'Ticket has been invalidated.' }, { status: 410 });
    // }

    return NextResponse.json({ booking });

  } catch (error) {
    console.error('Failed to validate ticket:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}
