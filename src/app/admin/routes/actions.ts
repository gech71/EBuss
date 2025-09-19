
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const routeSchema = z.object({
  origin: z.string().min(1, 'Origin is required.'),
  destination: z.string().min(1, 'Destination is required.'),
  departureDate: z.string().min(1, 'Departure date is required.'),
  departureTime: z.string().min(1, 'Departure time is required.'),
  arrivalDate: z.string().min(1, 'Arrival date is required.'),
  arrivalTime: z.string().min(1, 'Arrival time is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  busIds: z.array(z.string()).min(1, 'At least one bus must be selected.'),
  discountId: z.string().optional(),
});

const combineDateTime = (dateStr: string, timeStr: string): Date => {
    const date = new Date(dateStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
};


export async function createRouteAction(formData: FormData) {
    const rawData = {
        origin: formData.get('origin'),
        destination: formData.get('destination'),
        departureDate: formData.get('departureDate'),
        departureTime: formData.get('departureTime'),
        arrivalDate: formData.get('arrivalDate'),
        arrivalTime: formData.get('arrivalTime'),
        price: formData.get('price'),
        busIds: JSON.parse(formData.get('busIds') as string),
        discountId: formData.get('discountId') || undefined,
    };
    
    const validatedData = routeSchema.safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { origin, destination, departureDate, departureTime, arrivalDate, arrivalTime, price, busIds, discountId } = validatedData.data;

    const fullDepartureTime = combineDateTime(departureDate, departureTime);
    const fullArrivalTime = combineDateTime(arrivalDate, arrivalTime);

    if (fullArrivalTime <= fullDepartureTime) {
        return { success: false, message: 'Arrival time must be after departure time.' };
    }

    try {
        const routesToCreate = busIds.map(busId => ({
            origin,
            destination,
            departureTime: fullDepartureTime,
            arrivalTime: fullArrivalTime,
            price,
            busId,
            discountId: discountId === 'none' ? null : discountId,
        }));

        await prisma.route.createMany({
            data: routesToCreate,
        });

    } catch (error) {
        console.error("Error creating routes:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }

    revalidatePath('/admin/routes');
    redirect('/admin/routes');
}


export async function updateRouteAction(formData: FormData) {
    const routeId = formData.get('routeId') as string;
    const rawData = {
        origin: formData.get('origin'),
        destination: formData.get('destination'),
        departureDate: formData.get('departureDate'),
        departureTime: formData.get('departureTime'),
        arrivalDate: formData.get('arrivalDate'),
        arrivalTime: formData.get('arrivalTime'),
        price: formData.get('price'),
        busIds: JSON.parse(formData.get('busIds') as string), // Even if it's one, it's passed as an array
        discountId: formData.get('discountId') || undefined,
    };
    
    // a single bus is expected for an update
    const validatedData = routeSchema.extend({
        busIds: z.array(z.string()).length(1, "Exactly one bus must be selected for an update."),
    }).safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { origin, destination, departureDate, departureTime, arrivalDate, arrivalTime, price, busIds, discountId } = validatedData.data;

    const fullDepartureTime = combineDateTime(departureDate, departureTime);
    const fullArrivalTime = combineDateTime(arrivalDate, arrivalTime);

     if (fullArrivalTime <= fullDepartureTime) {
        return { success: false, message: 'Arrival time must be after departure time.' };
    }

    try {
       await prisma.route.update({
           where: { id: routeId },
           data: {
                origin,
                destination,
                departureTime: fullDepartureTime,
                arrivalTime: fullArrivalTime,
                price,
                busId: busIds[0],
                discountId: discountId === 'none' ? null : discountId,
           }
       })

    } catch (error) {
        console.error("Error updating route:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }

    revalidatePath('/admin/routes');
    redirect('/admin/routes');
}


export async function deleteRouteAction(routeId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Optional: Check if the route has any active bookings before deleting
    const bookingCount = await prisma.booking.count({
      where: {
        routeId: routeId,
      },
    });

    if (bookingCount > 0) {
      return {
        success: false,
        message: `This route cannot be deleted because it has ${bookingCount} associated booking(s).`,
      };
    }

    await prisma.route.delete({
      where: {
        id: routeId,
      },
    });

    revalidatePath('/admin/routes');
    return { success: true, message: 'Route has been deleted.' };
  } catch (error) {
    console.error('Error deleting route:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
