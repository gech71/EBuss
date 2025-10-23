
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';
import { format } from 'date-fns';
import { BookingStatus } from '@prisma/client';

const createBookingSchema = z.object({
  routeId: z.string().min(1),
  selectedSeatNumbers: z.array(z.string()).min(1, 'At least one seat must be selected.'),
  totalPrice: z.coerce.number(),
  passengerName: z.string().min(1, 'Passenger name is required.'),
  passengerPhone: z.string().min(1, 'Passenger phone is required.'),
  passengerEmail: z.string().email().optional().or(z.literal('')),
});

export async function createBookingAction(data: unknown) {
  const validatedData = createBookingSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      success: false,
      message: validatedData.error.errors.map(e => e.message).join(', '),
    };
  }

  const {
    routeId,
    selectedSeatNumbers,
    totalPrice,
    passengerName,
    passengerPhone,
    passengerEmail
  } = validatedData.data;

  try {
    // Use a transaction to ensure data consistency
    const newBooking = await prisma.$transaction(async (tx) => {
      // 1. Fetch the route and its seats to lock the rows for update
      const route = await tx.route.findUnique({
        where: { id: routeId },
        include: {
          bus: {
            include: {
              layout: {
                include: {
                  seats: true
                }
              }
            }
          }
        }
      });

      if (!route) {
        throw new Error('Route not found.');
      }

      const availableSeats = route.bus.layout.seats.filter(seat =>
        selectedSeatNumbers.includes(seat.seatNumber) && seat.status === 'AVAILABLE'
      );
      
      // 2. Check if all selected seats are actually available
      if (availableSeats.length !== selectedSeatNumbers.length) {
        throw new Error('One or more selected seats are no longer available.');
      }

      // 3. Create the booking
      const booking = await tx.booking.create({
        data: {
          passengerName,
          passengerPhone,
          passengerEmail: passengerEmail || null,
          totalPrice,
          routeId,
          status: BookingStatus.PENDING,
          paymentStatus: 'PENDING',
          bookedSeats: {
            create: selectedSeatNumbers.map(seatNumber => ({
              seatNumber,
            })),
          },
        },
      });

      // 4. Update the status of the selected seats to OCCUPIED
      const seatIdsToUpdate = availableSeats.map(seat => seat.id);
      await tx.seat.updateMany({
        where: {
          id: { in: seatIdsToUpdate }
        },
        data: {
          status: 'OCCUPIED'
        }
      });

      return booking;
    });

    revalidatePath(`/book/${routeId}`);
    return { success: true, bookingId: newBooking.id };
    
  } catch (error) {
    console.error('Booking failed:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message };
  }
}

async function releaseSeatsForBooking(bookingId: string) {
    try {
        await prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
                where: { id: bookingId },
                include: { 
                    bookedSeats: true, 
                    route: {
                        include: {
                            bus: {
                                include: {
                                    layout: true
                                }
                            }
                        }
                    } 
                }
            });

            if (!booking || !booking.route?.bus?.layoutId) {
                console.error(`Cannot release seats: Booking, route, bus, or layout not found for ID ${bookingId}`);
                return;
            }
            
            // Get the seat numbers that were booked
            const seatNumbersToRelease = booking.bookedSeats.map(bs => bs.seatNumber);
            
            if (seatNumbersToRelease.length === 0) {
                return; // Nothing to release
            }
            
            // Revert seat status to AVAILABLE
            await tx.seat.updateMany({
                where: {
                    layoutId: booking.route.bus.layoutId,
                    seatNumber: { in: seatNumbersToRelease }
                },
                data: { status: 'AVAILABLE' }
            });

            // Mark booking as cancelled
            await tx.booking.update({
                where: { id: bookingId },
                data: { status: 'CANCELLED', paymentStatus: 'FAILED' }
            });
            
             revalidatePath(`/book/${booking.routeId}`);
        });
    } catch(error) {
        console.error(`Failed to release seats for booking ${bookingId}:`, error);
        // We don't throw here to avoid crashing the payment failure flow
    }
}

export async function releaseSeatsOnPaymentTimeoutAction(bookingId: string) {
    await releaseSeatsForBooking(bookingId);
}


export async function createPaymentRequestAction(bookingId: string, amount: number, authToken: string | undefined) {
    if (!authToken) {
        return { success: false, message: 'Authentication token is missing.' };
    }

    const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    const ACCOUNT_NO = process.env.NIB_ACCOUNT_NO;
    const COMPANY_NAME = process.env.NIB_COMPANY_NAME || 'EBUSS';
    const CALLBACK_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api/portal/payment-callback`;
    
    if (!NIB_PAYMENT_URL || !NIB_PAYMENT_KEY || !ACCOUNT_NO) {
        console.error("Payment environment variables are not set.");
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
            return { success: true, paymentToken: responseData.token };
        } else {
             // If getting the payment token fails, release the seats.
            await prisma.payment.update({
                where: { transactionId },
                data: { status: 'FAILED' }
            });
            await releaseSeatsForBooking(bookingId);
            return { success: false, message: responseData.message || 'Failed to get payment token.' };
        }
    } catch (error) {
        console.error("Payment request failed:", error);
         await releaseSeatsForBooking(bookingId);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during payment initiation.';
        return { success: false, message };
    }
}
