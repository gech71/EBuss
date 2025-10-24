
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';
import { format } from 'date-fns';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { validateCsrf } from '@/app/lib/actions';

const createBookingSchema = z.object({
  routeId: z.string().min(1),
  selectedSeatNumbers: z.array(z.string()).min(1, 'At least one seat must be selected.'),
  totalPrice: z.coerce.number(),
  passengerName: z.string().min(1, 'Passenger name is required.'),
  passengerPhone: z.string().min(1, 'Passenger phone is required.'),
  passengerEmail: z.string().email().optional().or(z.literal('')),
});

export async function createBookingAction(formData: FormData) {
  await validateCsrf(formData.get('csrfToken') as string);

  const rawData = {
    routeId: formData.get('routeId'),
    selectedSeatNumbers: JSON.parse(formData.get('selectedSeatNumbers') as string),
    totalPrice: formData.get('totalPrice'),
    passengerName: formData.get('passengerName'),
    passengerPhone: formData.get('passengerPhone'),
    passengerEmail: formData.get('passengerEmail')
  };

  const validatedData = createBookingSchema.safeParse(rawData);

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
    const newBooking = await prisma.$transaction(async (tx) => {
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
      
      if (availableSeats.length !== selectedSeatNumbers.length) {
        throw new Error('One or more selected seats are no longer available.');
      }

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

export async function releaseSeatsOnPaymentTimeoutAction(bookingId: string) {
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

            if (!booking || booking.paymentStatus === PaymentStatus.PAID) {
                return;
            }
            
            const seatNumbersToRelease = booking.bookedSeats.map(bs => bs.seatNumber);
            if (seatNumbersToRelease.length > 0 && booking.route?.bus?.layoutId) {
                await tx.seat.updateMany({
                    where: {
                        layoutId: booking.route.bus.layoutId,
                        seatNumber: { in: seatNumbersToRelease }
                    },
                    data: { status: 'AVAILABLE' }
                });
            }

            await tx.payment.deleteMany({
                where: {
                    bookingId: bookingId,
                    status: { not: PaymentStatus.PAID }
                }
            });

            if (booking.routeId) {
                revalidatePath(`/book/${booking.routeId}`);
            }
        });
    } catch(error) {
        console.error(`Failed to execute cleanup for timed-out booking ${bookingId}:`, error);
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
        console.error(`Could not find bus owner or bank account for booking ID: ${bookingId}`);
        return { success: false, message: 'Bus owner account details not found.' };
    }
    
    const ACCOUNT_NO = bookingWithOwner.route.bus.owner.bankAccountNumber;

    const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    const COMPANY_NAME = process.env.NIB_COMPANY_NAME || 'EBUSS';
    const CALLBACK_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api/portal/payment-callback`;
    
    if (!NIB_PAYMENT_URL || !NIB_PAYMENT_KEY) {
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
            await releaseSeatsOnPaymentTimeoutAction(bookingId);
            return { success: false, message: responseData.message || 'Failed to get payment token.' };
        }
    } catch (error) {
        console.error("Payment request failed:", error);
        await releaseSeatsOnPaymentTimeoutAction(bookingId);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred during payment initiation.';
        return { success: false, message };
    }
}
