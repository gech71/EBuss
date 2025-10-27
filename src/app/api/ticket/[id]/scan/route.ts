
'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/server/auth';
import { BookingStatus } from '@prisma/client';
import { logAction } from '@/app/lib/logger';
import { getIP } from '@/app/lib/get-ip';


const MAX_SCAN_ATTEMPTS_PER_MINUTE = 20;


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = await getIP(request);
  
  if (ip) {
      console.log(`[SCAN TICKET] Detected IP: ${ip}`);
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      const attempts = await prisma.apiRequestAttempt.count({
          where: {
              ipAddress: ip,
              timestamp: { gte: oneMinuteAgo }
          }
      });
      console.log(`[SCAN TICKET] Found ${attempts} attempts in the last minute for IP ${ip}.`);
      
      if (attempts >= MAX_SCAN_ATTEMPTS_PER_MINUTE) {
          await logAction({ ipAddress: ip, actionType: 'RATE_LIMIT_EXCEEDED', description: 'Rate limit exceeded for ticket scan API.' });
          return NextResponse.json({ message: 'Too many requests. Please try again in a minute.' }, { status: 429 });
      }

      try {
        await prisma.apiRequestAttempt.create({ data: { ipAddress: ip }});
        console.log(`[SCAN TICKET] Successfully logged new API request attempt for IP ${ip}.`);
      } catch (dbError) {
        console.error(`[SCAN TICKET] CRITICAL: Failed to write ApiRequestAttempt to database for IP ${ip}.`, dbError);
      }
  } else {
    console.warn('[SCAN TICKET] Could not determine IP address for rate limiting.');
  }


  try {
    const { user } = await validateRequest();

    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'TICKET_SCAN_UNAUTHORIZED', description: 'Unauthorized attempt to scan ticket.' });
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
        
        await logAction({ userId: user.id, actionType: 'TICKET_SCAN_SUCCESS', description: `Ticket ${ticketId} validated and marked as USED.` });
        return updatedBooking;
    });

    return NextResponse.json({ booking });

  } catch (error: any) {
    const { user } = await validateRequest(); // We need user for logging
    await logAction({ userId: user?.id, actionType: 'TICKET_SCAN_FAIL', description: `Failed to scan ticket. Error: ${error?.message || 'Internal server error'}` });
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
