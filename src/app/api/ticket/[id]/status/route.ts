
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';

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
      select: { paymentStatus: true },
    });

    if (!booking) {
      return NextResponse.json({ message: 'Booking not found.' }, { status: 404 });
    }

    return NextResponse.json({ paymentStatus: booking.paymentStatus });

  } catch (error) {
    console.error('Failed to fetch payment status:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
