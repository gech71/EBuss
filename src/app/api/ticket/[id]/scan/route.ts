
'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/app/lib/auth';
import { BookingStatus } from '@prisma/client';
import { headers } from 'next/headers';

const MAX_SCAN_ATTEMPTS_PER_MINUTE = 20;

async function getIP(request: NextRequest) {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = headersList.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    // For local development, request.ip might be available
    return request.ip ?? '127.0.0.1';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = getIP(request);
  
  if (ip) {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      const attempts = await prisma.apiRequestAttempt.count({
          where: {
              ipAddress: ip,
              timestamp: { gte: oneMinuteAgo }
          }
      });
      
      if (attempts >= MAX_SCAN_ATTEMPTS_PER_MINUTE) {
          console.warn(`Rate limit exceeded for IP: ${ip}`);
          return NextResponse.json({ message: 'Too many requests. Please try again in a minute.' }, { status: 429 });
      }

      await prisma.apiRequestAttempt.create({ data: { ipAddress: ip }});
  }


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
