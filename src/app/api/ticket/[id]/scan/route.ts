
'use server';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/server/auth';
import { TicketStatus } from '@prisma/client';
import { logAction } from '@/app/lib/logger';
import { getIP } from '@/app/lib/get-ip';


const MAX_SCAN_ATTEMPTS_PER_MINUTE = 20;


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = await getIP(request);
  const ticketId = params.id;
  
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
          await logAction({ ipAddress: ip, actionType: 'RATE_LIMIT_EXCEEDED', description: 'Rate limit exceeded for ticket scan API.' });
          return NextResponse.json({ message: 'Too many requests. Please try again in a minute.' }, { status: 429 });
      }

      try {
        await prisma.apiRequestAttempt.create({ data: { ipAddress: ip }});
      } catch (dbError) {
        console.error(`[SCAN TICKET] CRITICAL: Failed to write ApiRequestAttempt to database for IP ${ip}.`, dbError);
      }
  } else {
    console.warn('[SCAN TICKET] Could not determine IP address for rate limiting.');
  }


  try {
    const { user } = await validateRequest();

    if (!user || !user.busOwnerId) {
        await logAction({ actionType: 'TICKET_SCAN_UNAUTHORIZED', description: `Unauthorized attempt to scan ticket ${ticketId}.`, ipAddress: ip });
        return NextResponse.json({ message: 'Unauthorized: You must be logged in as an admin to scan tickets.' }, { status: 401 });
    }

    if (!ticketId) {
        await logAction({ userId: user.id, actionType: 'TICKET_SCAN_FAIL', description: 'Ticket ID was missing from request.' });
        return NextResponse.json({ message: 'Ticket ID is required.' }, { status: 400 });
    }
    
    const ticket = await prisma.$transaction(async (tx) => {
        const ticketToScan = await tx.ticket.findUnique({
            where: { id: ticketId },
            include: {
                route: { include: { bus: true, origin: true, destination: true } },
                booking: true,
            },
        });

        if (!ticketToScan) {
            throw { status: 404, message: 'Ticket not found.', details: { ticketId } };
        }

        if (ticketToScan.route.bus.ownerId !== user.busOwnerId) {
            throw { status: 403, message: 'Ticket is not valid for this bus operator.', details: { ticketId, scannedBy: user.id, actualOwner: ticketToScan.route.bus.ownerId } };
        }

        const now = new Date();
        const departureTime = new Date(ticketToScan.route.departureTime);
        if (now > departureTime) {
            throw { status: 410, message: 'This ticket has expired.', details: { ticket: ticketToScan } };
        }

        if (ticketToScan.status === TicketStatus.USED) {
            throw { status: 409, message: 'This ticket has already been used.', details: { ticket: ticketToScan } };
        }
        
        if (ticketToScan.status !== TicketStatus.VALID) {
            throw { status: 400, message: `Ticket is not valid. Current status: ${ticketToScan.status}`, details: { ticket: ticketToScan } };
        }

        const updatedTicket = await tx.ticket.update({
            where: { id: ticketId },
            data: { status: TicketStatus.USED },
             include: {
                route: { include: { bus: true, origin: true, destination: true } },
                booking: true,
            },
        });
        
        await logAction({ userId: user.id, actionType: 'TICKET_SCAN_SUCCESS', description: `Ticket ${ticketId} validated and marked as USED.`, details: { ticket: updatedTicket } });
        return updatedTicket;
    });

    return NextResponse.json({ ticket });

  } catch (error: any) {
    const { user } = await validateRequest(); // We need user for logging
    await logAction({ userId: user?.id, actionType: 'TICKET_SCAN_FAIL', description: `Failed to scan ticket. Error: ${error?.message || 'Internal server error'}`, details: error.details || { error: error.message } });
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
