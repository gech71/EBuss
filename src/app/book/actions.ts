
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const createBookingSchema = z.object({
  routeId: z.string().min(1),
  selectedSeatNumbers: z.array(z.string()).min(1, 'At least one seat must be selected.'),
  totalPrice: z.coerce.number(),
  passengerName: z.string().min(1, 'Passenger name is required.'),
  passengerEmail: z.string().email('Invalid email address.'),
});

export async function createBookingAction(prevState: any, formData: FormData) {

  const data = {
    routeId: formData.get('routeId'),
    // The seats are sent as a stringified array
    selectedSeatNumbers: JSON.parse(formData.get('selectedSeatNumbers') as string),
    totalPrice: formData.get('totalPrice'),
    passengerName: formData.get('passengerName'),
    passengerEmail: formData.get('passengerEmail'),
  }

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

      if (!route || !route.bus.layout) {
        throw new Error('Route or bus layout not found.');
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
          routeId,
          totalPrice,
          passengerName,
          passengerEmail,
          status: 'VALID',
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
    // Redirect to the ticket page after a successful booking
    redirect(`/ticket/${newBooking.id}`);
    
  } catch (error) {
    console.error('Booking failed:', error);
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error;
    }
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message };
  }
}
