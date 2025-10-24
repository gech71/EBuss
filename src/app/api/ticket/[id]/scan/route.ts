
'use server';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/app/lib/auth';
import { BookingStatus } from '@prisma/client';

export async function POST(
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

    const booking = await prisma.$transaction(async (tx) => {
        const bookingToScan = await tx.booking.findUnique({
            where: { id: ticketId },
            include: {
                route: { include: { bus: true } },
            },
        });

        if (!bookingToScan) {
            throw { status: 404, message: 'Ticket not found.' };
        }

        if (bookingToScan.route.bus.ownerId !== user.busOwnerId) {
            throw { status: 403, message: 'Ticket is not valid for this bus operator.' };
        }

        const now = new Date();
        const departureTime = new Date(bookingToScan.route.departureTime);
        if (now > departureTime) {
            throw { status: 410, message: 'This ticket has expired.' };
        }

        if (bookingToScan.status === BookingStatus.USED) {
            throw { status: 409, message: 'This ticket has already been used.' };
        }
        
        if (bookingToScan.status !== BookingStatus.VALID) {
            throw { status: 400, message: `Ticket is not valid. Current status: ${bookingToScan.status}` };
        }

        const updatedBooking = await tx.booking.update({
            where: { id: ticketId },
            data: { status: BookingStatus.USED },
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

        return updatedBooking;
    });

    return NextResponse.json({ booking });

  } catch (error: any) {
    console.error('Failed to scan ticket:', error);
    if (error.status && error.message) {
        return new NextResponse(JSON.stringify({ message: error.message }), {
            status: error.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
