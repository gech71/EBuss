
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { validateRequest } from '@/app/lib/auth';
import { validateCsrf } from '@/app/lib/actions';

const routeSchema = z.object({
  originId: z.string().min(1, 'Origin is required.'),
  destinationId: z.string().min(1, 'Destination is required.'),
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
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        originId: formData.get('originId'),
        destinationId: formData.get('destinationId'),
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

    const { originId, destinationId, departureDate, departureTime, arrivalDate, arrivalTime, price, busIds, discountId } = validatedData.data;

    const fullDepartureTime = combineDateTime(departureDate, departureTime);
    const fullArrivalTime = combineDateTime(arrivalDate, arrivalTime);

    if (fullArrivalTime <= fullDepartureTime) {
        return { success: false, message: 'Arrival time must be after departure time.' };
    }

    try {
        const busCount = await prisma.bus.count({
            where: {
                id: { in: busIds },
                ownerId: user.busOwnerId
            }
        });

        if (busCount !== busIds.length) {
            return { success: false, message: "You can only create routes for buses you own." };
        }

        const routesToCreate = busIds.map(busId => ({
            originId,
            destinationId,
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
    await validateCsrf(formData.get('csrfToken') as string);
    const { user } = await validateRequest();
    if (!user || !user.busOwnerId) {
        return { success: false, message: 'Unauthorized' };
    }

    const routeId = formData.get('routeId') as string;
    const rawData = {
        originId: formData.get('originId'),
        destinationId: formData.get('destinationId'),
        departureDate: formData.get('departureDate'),
        departureTime: formData.get('departureTime'),
        arrivalDate: formData.get('arrivalDate'),
        arrivalTime: formData.get('arrivalTime'),
        price: formData.get('price'),
        busIds: JSON.parse(formData.get('busIds') as string),
        discountId: formData.get('discountId') || undefined,
    };
    
    const validatedData = routeSchema.extend({
        busIds: z.array(z.string()).length(1, "Exactly one bus must be selected for an update."),
    }).safeParse(rawData);

    if (!validatedData.success) {
        return {
            success: false,
            message: validatedData.error.errors.map(e => e.message).join(', ')
        };
    }

    const { originId, destinationId, departureDate, departureTime, arrivalDate, arrivalTime, price, busIds, discountId } = validatedData.data;
    const busId = busIds[0];

    const fullDepartureTime = combineDateTime(departureDate, departureTime);
    const fullArrivalTime = combineDateTime(arrivalDate, arrivalTime);

     if (fullArrivalTime <= fullDepartureTime) {
        return { success: false, message: 'Arrival time must be after departure time.' };
    }

    try {
       await prisma.$transaction(async (tx) => {
           const routeToUpdate = await tx.route.findFirst({
               where: {
                   id: routeId,
                   bus: {
                       ownerId: user.busOwnerId
                   }
               }
           });

           if (!routeToUpdate) {
               throw new Error("Route not found or you do not have permission to edit it.");
           }

           const newBus = await tx.bus.findFirst({
               where: {
                   id: busId,
                   ownerId: user.busOwnerId
               }
           });

           if (!newBus) {
               throw new Error("The selected bus does not belong to you.");
           }

           await tx.route.update({
               where: { id: routeId },
               data: {
                    originId,
                    destinationId,
                    departureTime: fullDepartureTime,
                    arrivalTime: fullArrivalTime,
                    price,
                    busId,
                    discountId: discountId === 'none' ? null : discountId,
               }
           });
       });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        console.error("Error updating route:", error);
        return { success: false, message };
    }

    revalidatePath('/admin/routes');
    redirect('/admin/routes');
}


export async function deleteRouteAction(routeId: string, csrfToken: string): Promise<{ success: boolean; message: string }> {
  await validateCsrf(csrfToken);

  const { user } = await validateRequest();
  if (!user || !user.busOwnerId) {
      return { success: false, message: 'Unauthorized' };
  }

  try {
    const routeToDelete = await prisma.route.findFirst({
        where: {
            id: routeId,
            bus: {
                ownerId: user.busOwnerId
            }
        }
    });

    if (!routeToDelete) {
        return { success: false, message: 'Route not found or you do not have permission to delete it.' };
    }
    
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
