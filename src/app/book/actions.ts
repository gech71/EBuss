
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';
import { format } from 'date-fns';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { validateCsrf } from '@/app/lib/actions';
import { logAction } from '@/app/lib/logger';

const tripSchema = z.object({
  routeId: z.string().min(1),
  selectedSeatNumbers: z.array(z.string()).min(1, 'At least one seat must be selected.'),
});

const createBookingSchema = z.object({
  isRoundTrip: z.string().transform(val => val === 'true'),
  totalPrice: z.coerce.number(),
  passengerName: z.string().min(1, 'Passenger name is required.'),
  passengerPhone: z.string().min(1, 'Passenger phone is required.'),
  outboundTrip: z.string().transform(str => tripSchema.parse(JSON.parse(str))),
  returnTrip: z.string().nullable().optional().transform(str => str ? tripSchema.parse(JSON.parse(str)) : undefined),
});

async function createSingleBooking(tx: any, trip: z.infer<typeof tripSchema>, passengerName: string, passengerPhone: string, totalPriceForTrip: number, commonExpiresAt: Date, isReturn: boolean = false) {
    const route = await tx.route.findUnique({
        where: { id: trip.routeId },
        include: { bus: { include: { layout: { include: { seats: true } } } } }
    });

    if (!route) throw new Error(`Route not found for trip: ${trip.routeId}`);

    const availableSeats = route.bus.layout.seats.filter(seat =>
        trip.selectedSeatNumbers.includes(seat.seatNumber) && seat.status === 'AVAILABLE'
    );
      
    if (availableSeats.length !== trip.selectedSeatNumbers.length) {
        throw new Error(`One or more seats for the ${isReturn ? 'return' : 'outbound'} trip are no longer available.`);
    }

    const booking = await tx.booking.create({
        data: {
            passengerName,
            passengerPhone,
            totalPrice: totalPriceForTrip,
            routeId: trip.routeId,
            status: BookingStatus.PENDING,
            paymentStatus: 'PENDING',
            expiresAt: commonExpiresAt,
            bookedSeats: {
                create: trip.selectedSeatNumbers.map(seatNumber => ({ seatNumber })),
            },
        },
    });

    await tx.seat.updateMany({
        where: { id: { in: availableSeats.map(s => s.id) } },
        data: { status: 'OCCUPIED' }
    });
    
    await logAction({ actionType: 'CREATE_BOOKING', description: `Booking ${booking.id} created for passenger ${passengerName} on route ${trip.routeId}. Seats: ${trip.selectedSeatNumbers.join(', ')}` });
    return booking;
}


export async function createBookingAction(formData: FormData) {
  await validateCsrf(formData);

  const rawData = {
    isRoundTrip: formData.get('isRoundTrip'),
    totalPrice: formData.get('totalPrice'),
    passengerName: formData.get('passengerName'),
    passengerPhone: formData.get('passengerPhone'),
    outboundTrip: formData.get('outboundTrip'),
    returnTrip: formData.get('returnTrip'),
  };

  const validatedData = createBookingSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      success: false,
      message: validatedData.error.errors.map(e => e.message).join(', '),
    };
  }

  const {
    isRoundTrip,
    totalPrice,
    passengerName,
    passengerPhone,
    outboundTrip,
    returnTrip,
  } = validatedData.data;

  try {
    const expiresAt = new Date(Date.now() + 30 * 1000); // 30 second reservation for all tickets
    
    const [outboundBooking] = await prisma.$transaction(async (tx) => {
        const outboundRoute = await tx.route.findUnique({ where: { id: outboundTrip.routeId } });
        if (!outboundRoute) throw new Error("Outbound route not found.");
        const outboundPrice = Number(outboundRoute.price) * outboundTrip.selectedSeatNumbers.length;

        if (isRoundTrip && returnTrip) {
            const returnRoute = await tx.route.findUnique({ where: { id: returnTrip.routeId } });
            if (!returnRoute) throw new Error("Return route not found.");
            const returnPrice = Number(returnRoute.price) * returnTrip.selectedSeatNumbers.length;

            // Simplified price check
            if (Math.abs((outboundPrice + returnPrice) - totalPrice) > 0.01) {
                 // In a real app, you'd apply discounts here too for a precise match
                 console.warn(`Price mismatch: a=${outboundPrice + returnPrice}, b=${totalPrice}. Allowing booking for now.`);
            }

            const ob = await createSingleBooking(tx, outboundTrip, passengerName, passengerPhone, outboundPrice, expiresAt, false);
            const rb = await createSingleBooking(tx, returnTrip, passengerName, passengerPhone, returnPrice, expiresAt, true);
            return [ob, rb];
        } else {
             if (Math.abs(outboundPrice - totalPrice) > 0.01) {
                 console.warn(`Price mismatch: a=${outboundPrice}, b=${totalPrice}. Allowing booking for now.`);
            }
            const ob = await createSingleBooking(tx, outboundTrip, passengerName, passengerPhone, outboundPrice, expiresAt, false);
            return [ob];
        }
    });

    revalidatePath(`/book/${outboundTrip.routeId}`);
    if (returnTrip) {
        revalidatePath(`/book/${returnTrip.routeId}`);
    }
    
    return { success: true, bookingId: outboundBooking.id };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    await logAction({ actionType: 'CREATE_BOOKING_FAIL', description: `Booking failed for passenger ${passengerName}. Error: ${message}` });
    return { success: false, message };
  }
}

export async function createPaymentRequestAction(bookingId: string, amount: number, authToken: string | undefined) {
    if (!authToken) {
        return { success: false, message: 'Authentication token is missing.' };
    }

    const bookingWithOwner = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            route: {
                include: {
                    bus: {
                        include: {
                            owner: true
                        }
                    }
                }
            }
        }
    });

    if (!bookingWithOwner?.route?.bus?.owner?.bankAccountNumber) {
        await logAction({ actionType: 'PAYMENT_REQUEST_FAIL', description: `Could not find bus owner or bank account for booking ID: ${bookingId}` });
        return { success: false, message: 'Bus owner account details not found.' };
    }
    
    const ACCOUNT_NO = bookingWithOwner.route.bus.owner.bankAccountNumber;

    const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    const COMPANY_NAME = process.env.NIB_COMPANY_NAME || 'EBUSS';
    const CALLBACK_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api/portal/payment-callback`;
    
    if (!NIB_PAYMENT_URL || !NIB_PAYMENT_KEY) {
        await logAction({ actionType: 'PAYMENT_REQUEST_FAIL', description: 'Server not configured for payments (missing NIB_PAYMENT_URL or NIB_PAYMENT_KEY).' });
        return { success: false, message: 'Server is not configured for payments.' };
    }

    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');

    try {
        await prisma.payment.create({
            data: {
                bookingId,
                amount,
                transactionId,
                status: 'PENDING',
            }
        });
        await logAction({ actionType: 'PAYMENT_REQUEST_INIT', description: `Payment request created for booking ${bookingId} with transactionId ${transactionId}.` });

        const signatureString = [
            `accountNo=${ACCOUNT_NO}`,
            `amount=${amount}`,
            `callBackURL=${CALLBACK_URL}`,
            `companyName=${COMPANY_NAME}`,
            `Key=${NIB_PAYMENT_KEY}`,
            `token=${authToken}`,
            `transactionId=${transactionId}`,
            `transactionTime=${transactionTime}`
        ].join('&');

        const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

        const payload = {
            accountNo: ACCOUNT_NO,
            amount: String(amount),
            callBackURL: CALLBACK_URL,
            companyName: COMPANY_NAME,
            token: authToken,
            transactionId: transactionId,
            transactionTime: transactionTime,
            signature: signature
        };

        const response = await fetch(NIB_PAYMENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (response.ok && responseData.token) {
            await prisma.payment.update({
                where: { transactionId },
                data: { paymentToken: responseData.token }
            });
            await logAction({ actionType: 'PAYMENT_TOKEN_SUCCESS', description: `Received payment token for transaction ${transactionId}.` });
            return { success: true, paymentToken: responseData.token };
        } else {
             await logAction({ actionType: 'PAYMENT_TOKEN_FAIL', description: `Failed to get payment token for transaction ${transactionId}. Response: ${JSON.stringify(responseData)}` });
            return { success: false, message: responseData.message || 'Failed to get payment token.' };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during payment initiation.';
        await logAction({ actionType: 'PAYMENT_REQUEST_FAIL', description: `Payment request failed for transaction ${transactionId}: ${message}` });
        return { success: false, message };
    }
}
