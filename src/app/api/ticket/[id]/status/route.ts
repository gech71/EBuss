
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ message: 'Booking ID is required.' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
